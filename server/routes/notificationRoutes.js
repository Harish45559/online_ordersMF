const express = require('express');
const { notifyRestaurant } = require('../controllers/notificationController');
const router = express.Router();

router.post('/notify', notifyRestaurant);

module.exports = router;
