const walletsService = require('../services/walletsService');

function validateWalletPayload(payload) {
  const errors = [];
  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
  const description = typeof payload?.description === 'string' ? payload.description.trim() : null;
  const icon = typeof payload?.icon === 'string' ? payload.icon.trim() : '';
  const color = typeof payload?.color === 'string' ? payload.color.trim() : '';

  if (!name) {
    errors.push('Nome da carteira é obrigatório.');
  }

  const defaultIcon = 'fa-solid fa-wallet';
  const colorPattern = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

  if (!icon) {
    errors.push('Selecione um ícone para a carteira.');
  }

  if (!colorPattern.test(color)) {
    errors.push('Informe uma cor em hexadecimal válida para a carteira.');
  }

  return {
    errors,
    parsed: {
      name,
      description: description || null,
      icon: icon || defaultIcon,
      color: colorPattern.test(color) ? color : '#22c55e'
    }
  };
}

exports.listWallets = async (_req, res) => {
  try {
    const wallets = await walletsService.listWallets();
    res.json(wallets);
  } catch (error) {
    console.error('Erro ao listar carteiras:', error);
    res.status(500).json({ message: 'Erro ao listar carteiras' });
  }
};

exports.createWallet = async (req, res) => {
  try {
    const { errors, parsed } = validateWalletPayload(req.body ?? {});

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(' ') });
    }

    const wallet = await walletsService.createWallet(parsed);
    res.status(201).json(wallet);
  } catch (error) {
    console.error('Erro ao criar carteira:', error);

    if (error.code === '23505') {
      return res.status(409).json({ message: 'Já existe uma carteira com esse nome.' });
    }

    res.status(500).json({ message: 'Erro ao criar carteira' });
  }
};

function parseId(param) {
  const id = Number(param);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: 'ID inválido.' };
  }
  return { id };
}

exports.updateWallet = async (req, res) => {
  try {
    const { id, error } = parseId(req.params.id);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const { errors, parsed } = validateWalletPayload(req.body ?? {});
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(' ') });
    }

    const wallet = await walletsService.updateWallet(id, parsed);
    if (!wallet) {
      return res.status(404).json({ message: 'Carteira não encontrada' });
    }

    res.json(wallet);
  } catch (error) {
    console.error('Erro ao atualizar carteira:', error);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Já existe uma carteira com esse nome.' });
    }
    res.status(500).json({ message: 'Erro ao atualizar carteira' });
  }
};

exports.deleteWallet = async (req, res) => {
  try {
    const { id, error } = parseId(req.params.id);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const deleted = await walletsService.deleteWallet(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Carteira não encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir carteira:', error);
    res.status(500).json({ message: 'Erro ao excluir carteira' });
  }
};
