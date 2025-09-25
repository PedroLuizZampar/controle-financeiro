const goalsService = require('../services/goalsService');

function parseWalletId(value) {
  const walletId = Number(value);

  if (!Number.isInteger(walletId) || walletId <= 0) {
    return { error: 'Carteira inválida.' };
  }

  return { walletId };
}

function validateGoalPayload(payload) {
  const errors = [];
  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
  const type = typeof payload?.type === 'string' ? payload.type.trim() : '';

  const rawTargetAmount = payload?.targetAmount ?? payload?.target_amount;
  const targetAmount = Number(rawTargetAmount);

  const rawStartDate = payload?.startDate ?? payload?.start_date;
  const startDate = typeof rawStartDate === 'string' ? rawStartDate.trim() : '';

  const rawInterval = payload?.intervalDays ?? payload?.interval_days;
  const intervalDays = Number(rawInterval);

  if (!name) {
    errors.push('Nome da meta é obrigatório.');
  }

  if (!['income', 'expense'].includes(type)) {
    errors.push('Tipo da meta deve ser "income" ou "expense".');
  }

  if (Number.isNaN(targetAmount) || targetAmount <= 0) {
    errors.push('Valor alvo deve ser maior que zero.');
  }

  if (!startDate || Number.isNaN(Date.parse(startDate))) {
    errors.push('Data inicial inválida.');
  }

  if (!Number.isInteger(intervalDays) || intervalDays <= 0) {
    errors.push('Informe um intervalo de renovação em dias (valor inteiro maior que zero).');
  }

  return {
    errors,
    parsed: {
      name,
      type,
      targetAmount,
      startDate,
      intervalDays
    }
  };
}

exports.listGoals = async (req, res) => {
  try {
    const { walletId, error } = parseWalletId(req.query.walletId);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const goals = await goalsService.listGoals(walletId);
    res.json(goals);
  } catch (error) {
    console.error('Erro ao listar metas:', error);
    res.status(500).json({ message: 'Erro ao listar metas' });
  }
};

exports.createGoal = async (req, res) => {
  try {
    const { walletId, error } = parseWalletId(req.body?.walletId);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const { errors, parsed } = validateGoalPayload(req.body ?? {});

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(' ') });
    }

    const goal = await goalsService.createGoal({
      ...parsed,
      walletId
    });

    res.status(201).json(goal);
  } catch (error) {
    console.error('Erro ao criar meta:', error);
    res.status(500).json({ message: 'Erro ao criar meta' });
  }
};

function parseId(param) {
  const id = Number(param);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: 'ID inválido.' };
  }
  return { id };
}

exports.updateGoal = async (req, res) => {
  try {
    const { id, error: idError } = parseId(req.params.id);
    if (idError) {
      return res.status(400).json({ message: idError });
    }

    const { walletId, error } = parseWalletId(req.body?.walletId);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const { errors, parsed } = validateGoalPayload(req.body ?? {});
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(' ') });
    }

    const goal = await goalsService.updateGoal(id, walletId, parsed);
    if (!goal) {
      return res.status(404).json({ message: 'Meta não encontrada' });
    }

    res.json(goal);
  } catch (error) {
    console.error('Erro ao atualizar meta:', error);
    res.status(500).json({ message: 'Erro ao atualizar meta' });
  }
};

exports.deleteGoal = async (req, res) => {
  try {
    const { id, error: idError } = parseId(req.params.id);
    if (idError) {
      return res.status(400).json({ message: idError });
    }

    const { walletId, error } = parseWalletId(req.query.walletId);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const deleted = await goalsService.deleteGoal(id, walletId);
    if (!deleted) {
      return res.status(404).json({ message: 'Meta não encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir meta:', error);
    res.status(500).json({ message: 'Erro ao excluir meta' });
  }
};
