const categoriesService = require('../services/categoriesService');

function validateCategoryPayload(payload) {
  const errors = [];
  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
  const type = typeof payload?.type === 'string' ? payload.type.trim() : '';
  const icon = typeof payload?.icon === 'string' ? payload.icon.trim() : '';
  const color = typeof payload?.color === 'string' ? payload.color.trim() : '';

  if (!name) {
    errors.push('Nome da categoria é obrigatório.');
  }

  if (!['income', 'expense'].includes(type)) {
    errors.push('Tipo da categoria deve ser "income" ou "expense".');
  }

  if (!icon) {
    errors.push('Selecione um ícone para a categoria.');
  }

  const colorPattern = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
  if (!colorPattern.test(color)) {
    errors.push('Informe uma cor hexadecimal válida para a categoria.');
  }

  return {
    errors,
    parsed: {
      name,
      type,
      icon: icon || 'fa-solid fa-tag',
      color: colorPattern.test(color) ? color : '#6366f1'
    }
  };
}

exports.listCategories = async (_req, res) => {
  try {
    const categories = await categoriesService.listCategories();
    res.json(categories);
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({ message: 'Erro ao listar categorias' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { errors, parsed } = validateCategoryPayload(req.body ?? {});

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(' ') });
    }

    const category = await categoriesService.createCategory(parsed);
    res.status(201).json(category);
  } catch (error) {
    console.error('Erro ao criar categoria:', error);

    if (error.code === '23505') {
      return res.status(409).json({ message: 'Já existe uma categoria com esse nome para o tipo informado.' });
    }

    res.status(500).json({ message: 'Erro ao criar categoria' });
  }
};

function parseId(param) {
  const id = Number(param);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: 'ID inválido.' };
  }
  return { id };
}

exports.updateCategory = async (req, res) => {
  try {
    const { id, error } = parseId(req.params.id);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const { errors, parsed } = validateCategoryPayload(req.body ?? {});
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(' ') });
    }

    const category = await categoriesService.updateCategory(id, parsed);
    if (!category) {
      return res.status(404).json({ message: 'Categoria não encontrada' });
    }

    res.json(category);
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Já existe uma categoria com esse nome para o tipo informado.' });
    }
    res.status(500).json({ message: 'Erro ao atualizar categoria' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id, error } = parseId(req.params.id);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const deleted = await categoriesService.deleteCategory(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Categoria não encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    res.status(500).json({ message: 'Erro ao excluir categoria' });
  }
};
