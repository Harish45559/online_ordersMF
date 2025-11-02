const express = require('express');
const {
  getAllMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require('../controllers/menuController');

const router = express.Router();

router.get('/', getAllMenu);
router.post('/add', addMenuItem);
router.put('/update/:id', updateMenuItem);
router.delete('/delete/:id', deleteMenuItem);

module.exports = router;
  