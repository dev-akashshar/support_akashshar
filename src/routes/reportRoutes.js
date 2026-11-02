const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.get('/reports', auth, requireRole('admin'), reportController.index);

module.exports = router;
