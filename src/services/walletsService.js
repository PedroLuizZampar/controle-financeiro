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
    icon: row.icon || 'fa-solid fa-wallet',
    color: row.color || '#22c55e',
    totalIncome,
    totalExpense,
    balance: Number(balance.toFixed(2))
  };
}

exports.listWallets = async () => {
  const result = await pool.query(
    `SELECT w.id, w.name, w.description, w.created_at, w.icon, w.color,
            COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount END), 0) AS total_income,
            COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0) AS total_expense
     FROM wallets w
     LEFT JOIN transactions t ON t.wallet_id = w.id
     GROUP BY w.id
     ORDER BY w.created_at ASC, w.id ASC`
  );

  return result.rows.map(mapWallet);
};

exports.createWallet = async ({ name, description, icon, color }) => {
  const result = await pool.query(
    `INSERT INTO wallets (name, description, icon, color)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, description, icon, color, created_at,
               0::numeric AS total_income,
               0::numeric AS total_expense`,
    [name, description, icon, color]
  );

  return mapWallet(result.rows[0]);
};

exports.updateWallet = async (id, { name, description, icon, color }) => {
  const result = await pool.query(
    `UPDATE wallets
        SET name = $2,
            description = $3,
            icon = $4,
            color = $5
      WHERE id = $1
      RETURNING id, name, description, icon, color, created_at`,
    [id, name, description, icon, color]
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
