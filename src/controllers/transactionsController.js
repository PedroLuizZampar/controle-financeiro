const transactionsService = require('../services/transactionsService');

function validateTransactionPayload(payload) {
  const errors = [];
  const { description, amount, type, date } = payload;

  let categoryIds = [];
  if (payload.categories !== undefined) {
    if (!Array.isArray(payload.categories)) {
      errors.push('Categorias devem ser enviadas como uma lista de IDs.');
    } else {
      const parsedIds = [];
      for (const value of payload.categories) {
        const numericId = Number(value);
        if (!Number.isInteger(numericId) || numericId <= 0) {
          errors.push('Categorias devem conter somente números inteiros positivos.');
          break;
        }
        parsedIds.push(numericId);
      }

      if (errors.length === 0) {
        categoryIds = parsedIds;
      }
    }
  }

  if (!description || typeof description !== 'string' || !description.trim()) {
    errors.push('Descrição é obrigatória.');
  }

  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    errors.push('Valor deve ser um número maior que zero.');
  }

  if (!['income', 'expense'].includes(type)) {
    errors.push('Tipo deve ser "income" ou "expense".');
  }

  if (!date || Number.isNaN(Date.parse(date))) {
    errors.push('Data inválida.');
  }

  return {
    errors,
    parsed: {
      description: description ? description.trim() : description,
      amount: numericAmount,
      type,
      date,
      categories: categoryIds
    }
  };
}

function parseWalletId(value) {
  const walletId = Number(value);
  if (!Number.isInteger(walletId) || walletId <= 0) {
    return { error: 'Carteira inválida.' };
  }

  return { walletId };
}

exports.listTransactions = async (req, res) => {
  try {
    const { walletId, error } = parseWalletId(req.query.walletId);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const transactions = await transactionsService.listTransactions(walletId);
    res.json(transactions);
  } catch (error) {
    console.error('Erro ao listar transações:', error);
    res.status(500).json({ message: 'Erro ao listar transações' });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const { errors, parsed } = validateTransactionPayload(req.body ?? {});

    const { walletId, error } = parseWalletId(req.body?.walletId);
    if (error) {
      errors.push(error);
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(' ') });
    }

    const transaction = await transactionsService.createTransaction({
      ...parsed,
      walletId
    });
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Erro ao criar transação:', error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    res.status(500).json({ message: 'Erro ao criar transação' });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const { walletId, error } = parseWalletId(req.query.walletId);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const deleted = await transactionsService.deleteTransaction(id, walletId);

    if (!deleted) {
      return res.status(404).json({ message: 'Transação não encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir transação:', error);
    res.status(500).json({ message: 'Erro ao excluir transação' });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const { walletId, error } = parseWalletId(req.body?.walletId ?? req.query.walletId);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const { errors, parsed } = validateTransactionPayload(req.body ?? {});
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(' ') });
    }

    const updated = await transactionsService.updateTransaction(id, walletId, parsed);
    if (!updated) {
      return res.status(404).json({ message: 'Transação não encontrada' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar transação:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: 'Erro ao atualizar transação' });
  }
};
