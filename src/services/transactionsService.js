const pool = require('../db/pool');
const categoriesService = require('./categoriesService');

const transactionSelectBase = `
  SELECT t.id,
         t.wallet_id,
         t.description,
         t.amount,
         t.type,
         t.date,
         t.created_at,
         COALESCE(
           json_agg(
             json_build_object(
               'id', c.id,
               'name', c.name,
               'type', c.type,
               'icon', c.icon,
               'color', c.color
             )
             ORDER BY c.name
           ) FILTER (WHERE c.id IS NOT NULL),
           '[]'::json
         ) AS categories
    FROM transactions t
    LEFT JOIN transaction_categories tc ON tc.transaction_id = t.id
    LEFT JOIN categories c ON c.id = tc.category_id
`;

function mapTransaction(row) {
  const categories = Array.isArray(row.categories)
    ? row.categories.map((category) => ({
        id: Number(category.id),
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color
      }))
    : [];

  return {
    id: row.id,
    walletId: row.wallet_id,
    description: row.description,
    amount: Number(row.amount),
    type: row.type,
    date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    categories
  };
}

function sanitizeCategoryIds(categoryIds = []) {
  if (!Array.isArray(categoryIds)) {
    return [];
  }

  const uniqueIds = new Set();
  for (const id of categoryIds) {
    const numericId = Number(id);
    if (Number.isInteger(numericId) && numericId > 0) {
      uniqueIds.add(numericId);
    }
  }

  return Array.from(uniqueIds);
}

async function getTransactionById(transactionId, walletId, executor = pool) {
  const result = await executor.query(
    `${transactionSelectBase}
     WHERE t.id = $1 AND t.wallet_id = $2
     GROUP BY t.id, t.wallet_id, t.description, t.amount, t.type, t.date, t.created_at`,
    [transactionId, walletId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapTransaction(result.rows[0]);
}

exports.listTransactions = async (walletId) => {
  const result = await pool.query(
    `${transactionSelectBase}
     WHERE t.wallet_id = $1
     GROUP BY t.id, t.wallet_id, t.description, t.amount, t.type, t.date, t.created_at
     ORDER BY t.date DESC, t.id DESC`,
    [walletId]
  );

  return result.rows.map(mapTransaction);
};

exports.createTransaction = async ({ description, amount, type, date, walletId, categories = [] }) => {
  const categoryIds = sanitizeCategoryIds(categories);

  if (categoryIds.length > 0) {
    const categoriesFound = await categoriesService.findByIds(categoryIds);

    if (categoriesFound.length !== categoryIds.length) {
      const error = new Error('Uma ou mais categorias informadas são inválidas.');
      error.statusCode = 400;
      error.code = 'CATEGORY_NOT_FOUND';
      throw error;
    }

    const hasTypeMismatch = categoriesFound.some((category) => category.type !== type);
    if (hasTypeMismatch) {
      const error = new Error('Categorias devem ser do mesmo tipo da transação.');
      error.statusCode = 400;
      error.code = 'CATEGORY_TYPE_MISMATCH';
      throw error;
    }
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertResult = await client.query(
      `INSERT INTO transactions (description, amount, type, date, wallet_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id` ,
      [description, amount, type, date, walletId]
    );

    const transactionId = insertResult.rows[0].id;

    if (categoryIds.length > 0) {
      await client.query(
        `INSERT INTO transaction_categories (transaction_id, category_id)
         SELECT $1, UNNEST($2::int[])`,
        [transactionId, categoryIds]
      );
    }

    await client.query('COMMIT');

    const transaction = await getTransactionById(transactionId, walletId);
    return transaction;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

exports.deleteTransaction = async (id, walletId) => {
  const result = await pool.query('DELETE FROM transactions WHERE id = $1 AND wallet_id = $2', [id, walletId]);
  return result.rowCount > 0;
};

exports.updateTransaction = async (id, walletId, { description, amount, type, date, categories = [] }) => {
  const categoryIds = sanitizeCategoryIds(categories);

  if (categoryIds.length > 0) {
    const categoriesFound = await categoriesService.findByIds(categoryIds);
    if (categoriesFound.length !== categoryIds.length) {
      const error = new Error('Uma ou mais categorias informadas são inválidas.');
      error.statusCode = 400;
      error.code = 'CATEGORY_NOT_FOUND';
      throw error;
    }
    const hasTypeMismatch = categoriesFound.some((category) => category.type !== type);
    if (hasTypeMismatch) {
      const error = new Error('Categorias devem ser do mesmo tipo da transação.');
      error.statusCode = 400;
      error.code = 'CATEGORY_TYPE_MISMATCH';
      throw error;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updateResult = await client.query(
      `UPDATE transactions
          SET description = $3,
              amount = $4,
              type = $5,
              date = $6
        WHERE id = $1 AND wallet_id = $2`,
      [id, walletId, description, amount, type, date]
    );

    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('DELETE FROM transaction_categories WHERE transaction_id = $1', [id]);
    if (categoryIds.length > 0) {
      await client.query(
        `INSERT INTO transaction_categories (transaction_id, category_id)
         SELECT $1, UNNEST($2::int[])`,
        [id, categoryIds]
      );
    }

    await client.query('COMMIT');
    return getTransactionById(id, walletId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
