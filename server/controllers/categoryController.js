const { Op } = require('sequelize');
const Category = require('../models/Category');

// GET /api/category
exports.getAllCategories = async (_req, res) => {
  try {
    const categories = await Category.findAll({
    order: [['id', 'ASC']],   // show in the same order as your screenshot
    });
    res.json(categories);
  } catch (err) {
    console.error('getAllCategories error:', err);
    res.status(500).json({ message: 'Failed to fetch categories', error: err.message });
  }
};

// POST /api/category/add
exports.addCategory = async (req, res) => {
  try {
    const raw = req.body?.name ?? '';
    const name = String(raw).trim();
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Prevent duplicates (case-insensitive)
    const existing = await Category.findOne({
      where: { name: { [Op.iLike]: name } },
    });
    if (existing) {
      return res.status(409).json({ message: 'Category already exists' });
    }

    const created = await Category.create({ name });
    return res.status(201).json(created);
  } catch (err) {
    console.error('addCategory error:', err);
    // Translate common Sequelize errors
    const msg = (err && err.message) || 'Validation error';
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Category already exists' });
    }
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: 'Failed to add category', error: msg });
  }
};

// PUT /api/category/update/:id
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const raw = req.body?.name ?? '';
    const name = String(raw).trim();
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // If changing name, ensure no conflict (case-insensitive)
    const existing = await Category.findOne({
      where: {
        id: { [Op.ne]: id },
        name: { [Op.iLike]: name },
      },
    });
    if (existing) {
      return res.status(409).json({ message: 'Another category with this name already exists' });
    }

    category.name = name;
    await category.save();
    return res.json(category);
  } catch (err) {
    console.error('updateCategory error:', err);
    const msg = (err && err.message) || 'Validation error';
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Another category with this name already exists' });
    }
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: 'Failed to update category', error: msg });
  }
};

// DELETE /api/category/delete/:id
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    await category.destroy();
    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error('deleteCategory error:', err);
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
};
