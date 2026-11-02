const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// Public listing for ticket creation and overview
router.get('/categories', categoryController.index);

// Admin-only category management
router.post('/categories', auth, requireRole('admin'), categoryController.store);
router.put('/categories/:category', auth, requireRole('admin'), categoryController.update);
router.delete('/categories/:category', auth, requireRole('admin'), categoryController.destroy);

module.exports = router;
