const { Op } = require('sequelize');
const MenuItem = require('../models/MenuItem');   // ✅ fixed file name
const Category = require('../models/Category');

// GET /api/menu
exports.getAllMenu = async (req, res) => {
  try {
    const { q, categoryId } = req.query;

    const where = {};
    if (q && String(q).trim()) {
      where.name = { [Op.iLike]: `%${String(q).trim()}%` };
    }
    if (categoryId) {
      const catIdNum = Number(categoryId);
      if (Number.isInteger(catIdNum)) where.categoryId = catIdNum;
    }

    const items = await MenuItem.findAll({
      where,
      order: [['name', 'ASC']],
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
    });

    res.json(items);
  } catch (err) {
    console.error('getAllMenu error:', err);
    res.status(500).json({ message: 'Failed to fetch menu', error: err.message });
  }
};

// POST /api/menu/add
// POST /api/menu/add
exports.addMenuItem = async (req, res) => {
  try {
    const { name, price, categoryId, description, imageUrl } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'name is required' });
    }

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return res.status(400).json({ message: 'price must be a non-negative number' });
    }

    const catIdNum = Number(categoryId);
    if (!Number.isInteger(catIdNum) || catIdNum <= 0) {
      return res.status(400).json({ message: 'categoryId (number) is required' });
    }

    // auto-generate imageUrl if not provided
    let finalImageUrl = imageUrl;
    if (!finalImageUrl || !String(finalImageUrl).trim()) {
      const slug = String(name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')   // replace spaces/special chars with "-"
        .replace(/^-+|-+$/g, '');      // trim leading/trailing hyphens
      finalImageUrl = `/images/menu/${slug}.jpg`;
    }

    // verify category exists
    const Category = require('../models/Category');
    const cat = await Category.findByPk(catIdNum);
    if (!cat) return res.status(400).json({ message: 'Invalid categoryId' });

    const item = await MenuItem.create({
      name: String(name).trim(),
      price: priceNum,
      categoryId: catIdNum,
      description: description ?? null,
      imageUrl: finalImageUrl, // ✅ always filled
    });

    res.status(201).json(item);
  } catch (err) {
    console.error('addMenuItem error:', err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: err.errors?.[0]?.message || 'Validation error' });
    }
    res.status(500).json({ message: 'Failed to create menu item', error: err.message });
  }
};
  

// PUT /api/menu/update/:id
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findByPk(id);
    if (!item) return res.status(404).json({ message: 'Menu item not found' });

    const { name, price, categoryId, description, imageUrl } = req.body;

    if (typeof name !== 'undefined') {
      if (!String(name).trim()) return res.status(400).json({ message: 'name cannot be empty' });
      item.name = String(name).trim();
    }
    if (typeof price !== 'undefined') {
      const priceNum = Number(price);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        return res.status(400).json({ message: 'price must be a non-negative number' });
      }
      item.price = priceNum;
    }
    if (typeof categoryId !== 'undefined') {
      const catIdNum = Number(categoryId);
      if (!Number.isInteger(catIdNum) || catIdNum <= 0) {
        return res.status(400).json({ message: 'categoryId must be a positive integer' });
      }
      const cat = await Category.findByPk(catIdNum);
      if (!cat) return res.status(400).json({ message: 'Invalid categoryId' });
      item.categoryId = catIdNum;
    }
    if (typeof description !== 'undefined') {
      item.description = description ?? null;
    }
    if (typeof imageUrl !== 'undefined') {
      if (!String(imageUrl).trim()) {
        return res.status(400).json({ message: 'imageUrl cannot be empty' });
      }
      item.imageUrl = String(imageUrl).trim();
    }

    await item.save();
    res.json(item);
  } catch (err) {
    console.error('updateMenuItem error:', err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: err.errors?.[0]?.message || 'Validation error' });
    }
    res.status(500).json({ message: 'Failed to update menu item', error: err.message });
  }
};

// DELETE /api/menu/delete/:id
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findByPk(id);
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    await item.destroy();
    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    console.error('deleteMenuItem error:', err);
    res.status(500).json({ message: 'Failed to delete menu item', error: err.message });
  }
};
