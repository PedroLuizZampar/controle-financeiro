const pool = require('../db/pool');

function mapWallet(row) {
  const totalIncome = Number(row.total_income ?? 0);
  const totalExpense = Number(row.total_expense ?? 0);
  const balance = totalIncome - totalExpense;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    totalIncome,
    totalExpense,
    balance: Number(balance.toFixed(2))
  };
}

exports.listWallets = async () => {
  const result = await pool.query(
    `SELECT w.id, w.name, w.description, w.created_at,
            COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount END), 0) AS total_income,
            COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0) AS total_expense
     FROM wallets w
     LEFT JOIN transactions t ON t.wallet_id = w.id
     GROUP BY w.id
     ORDER BY w.created_at ASC, w.id ASC`
  );

  return result.rows.map(mapWallet);
};

exports.createWallet = async ({ name, description }) => {
  const result = await pool.query(
    `INSERT INTO wallets (name, description)
     VALUES ($1, $2)
     RETURNING id, name, description, created_at,
               0::numeric AS total_income,
               0::numeric AS total_expense`,
    [name, description]
  );

  return mapWallet(result.rows[0]);
};

exports.updateWallet = async (id, { name, description }) => {
  const result = await pool.query(
    `UPDATE wallets
        SET name = $2,
            description = $3
      WHERE id = $1
      RETURNING id, name, description, created_at`,
    [id, name, description]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return mapWallet({
    ...row,
    total_income: 0,
    total_expense: 0
  });
};

exports.deleteWallet = async (id) => {
  const result = await pool.query('DELETE FROM wallets WHERE id = $1', [id]);
  return result.rowCount > 0;
};
