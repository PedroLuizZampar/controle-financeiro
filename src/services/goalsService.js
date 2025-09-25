const pool = require('../db/pool');

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseUTCDate(value) {
  if (!value) {
    return null;
  }

  const [year, month, day] = `${value}`.split('-').map(Number);

  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDays(date, amount) {
  return new Date(date.getTime() + amount * DAY_IN_MS);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function calculateCurrentPeriod(startDateString, intervalDays, referenceDate = todayUTC()) {
  const start = parseUTCDate(startDateString);

  if (!start) {
    throw new Error('Data inicial inválida para a meta.');
  }

  const safeInterval = Math.max(Number(intervalDays) || 1, 1);

  if (referenceDate < start) {
    const end = addDays(start, safeInterval - 1);
    return { start, end };
  }

  const diffDays = Math.floor((referenceDate.getTime() - start.getTime()) / DAY_IN_MS);
  const cycles = Math.floor(diffDays / safeInterval);
  const currentStart = addDays(start, cycles * safeInterval);
  const currentEnd = addDays(currentStart, safeInterval - 1);

  return { start: currentStart, end: currentEnd };
}

function mapGoalRow(row) {
  return {
    id: row.id,
    walletId: row.wallet_id,
    name: row.name,
    type: row.type,
    targetAmount: Number(row.target_amount),
    startDate: row.start_date instanceof Date ? row.start_date.toISOString().split('T')[0] : row.start_date,
    intervalDays: Number(row.interval_days),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

async function fetchProgress(periods) {
  if (periods.length === 0) {
    return {};
  }

  const selects = [];
  const params = [];

  periods.forEach(({ goal, periodStart, periodEnd }, index) => {
    const base = index * 5;
    selects.push(
      `SELECT $${base + 1}::int AS goal_id,
              $${base + 2}::int AS wallet_id,
              $${base + 3}::transaction_type AS type,
              $${base + 4}::date AS start_date,
              $${base + 5}::date AS end_date`
    );

    params.push(goal.id, goal.walletId, goal.type, formatDate(periodStart), formatDate(periodEnd));
  });

  const query = `
    WITH goal_periods AS (
      ${selects.join('\n      UNION ALL\n      ')}
    )
    SELECT gp.goal_id,
           COALESCE(SUM(t.amount), 0) AS progress
      FROM goal_periods gp
      LEFT JOIN transactions t
        ON t.wallet_id = gp.wallet_id
       AND t.type = gp.type
       AND t.date BETWEEN gp.start_date AND gp.end_date
     GROUP BY gp.goal_id
  `;

  const result = await pool.query(query, params);
  const progressMap = {};

  result.rows.forEach((row) => {
    progressMap[row.goal_id] = Number(row.progress);
  });

  return progressMap;
}

function buildGoalResponse(goal, periodStart, periodEnd, progressAmount) {
  const safeProgress = Number(progressAmount) || 0;
  const progressRatio = goal.targetAmount > 0 ? safeProgress / goal.targetAmount : 0;
  const progressPercentage = Math.min(Math.round(progressRatio * 100), 999);
  const remainingAmount = Math.max(goal.targetAmount - safeProgress, 0);
  const status = safeProgress >= goal.targetAmount ? 'achieved' : 'in_progress';

  return {
    ...goal,
    currentPeriodStart: formatDate(periodStart),
    currentPeriodEnd: formatDate(periodEnd),
    progressAmount: Number(safeProgress.toFixed(2)),
    progressPercentage,
    remainingAmount: Number(remainingAmount.toFixed(2)),
    status
  };
}

async function composeGoalsResponse(goals) {
  const periods = goals.map((goal) => {
    const { start, end } = calculateCurrentPeriod(goal.startDate, goal.intervalDays);
    return {
      goal,
      periodStart: start,
      periodEnd: end
    };
  });

  const progressMap = await fetchProgress(periods);

  return periods.map(({ goal, periodStart, periodEnd }) =>
    buildGoalResponse(goal, periodStart, periodEnd, progressMap[goal.id] ?? 0)
  );
}

exports.listGoals = async (walletId) => {
  const result = await pool.query(
    `SELECT id, wallet_id, name, type, target_amount, start_date, interval_days, created_at, updated_at
       FROM goals
      WHERE wallet_id = $1
      ORDER BY created_at DESC, id DESC`,
    [walletId]
  );

  const goals = result.rows.map(mapGoalRow);
  return composeGoalsResponse(goals);
};

exports.getGoalById = async (goalId, walletId) => {
  const result = await pool.query(
    `SELECT id, wallet_id, name, type, target_amount, start_date, interval_days, created_at, updated_at
       FROM goals
      WHERE id = $1 AND wallet_id = $2
      LIMIT 1`,
    [goalId, walletId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const goal = mapGoalRow(result.rows[0]);
  const [response] = await composeGoalsResponse([goal]);
  return response;
};

exports.createGoal = async ({ walletId, name, type, targetAmount, startDate, intervalDays }) => {
  const result = await pool.query(
    `INSERT INTO goals (wallet_id, name, type, target_amount, start_date, interval_days)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [walletId, name, type, targetAmount, startDate, intervalDays]
  );

  const goalId = result.rows[0].id;
  return exports.getGoalById(goalId, walletId);
};

exports.updateGoal = async (id, walletId, { name, type, targetAmount, startDate, intervalDays }) => {
  const result = await pool.query(
    `UPDATE goals
        SET name = $3,
            type = $4,
            target_amount = $5,
            start_date = $6,
            interval_days = $7,
            updated_at = NOW()
      WHERE id = $1 AND wallet_id = $2
      RETURNING id` ,
    [id, walletId, name, type, targetAmount, startDate, intervalDays]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return exports.getGoalById(id, walletId);
};

exports.deleteGoal = async (id, walletId) => {
  const result = await pool.query('DELETE FROM goals WHERE id = $1 AND wallet_id = $2', [id, walletId]);
  return result.rowCount > 0;
};
