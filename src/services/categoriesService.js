const pool = require('../db/pool');

function mapCategory(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

exports.listCategories = async () => {
  const result = await pool.query(
  `SELECT id, name, type, created_at
   FROM categories
   ORDER BY CASE WHEN type = 'income' THEN 0 ELSE 1 END, name`
  );

  return result.rows.map(mapCategory);
};

exports.createCategory = async ({ name, type }) => {
  const result = await pool.query(
    `INSERT INTO categories (name, type)
     VALUES ($1, $2)
     RETURNING id, name, type, created_at`,
    [name, type]
  );

  return mapCategory(result.rows[0]);
};

exports.updateCategory = async (id, { name, type }) => {
  const result = await pool.query(
    `UPDATE categories
        SET name = $2,
            type = $3
      WHERE id = $1
      RETURNING id, name, type, created_at`,
    [id, name, type]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapCategory(result.rows[0]);
};

exports.deleteCategory = async (id) => {
  const result = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
  return result.rowCount > 0;
};

exports.findByIds = async (ids = []) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  const result = await pool.query(
    `SELECT id, name, type, created_at
     FROM categories
     WHERE id = ANY($1::int[])`,
    [ids]
  );

  return result.rows.map(mapCategory);
};
