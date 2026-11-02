const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const adminAuth = [auth, requireRole('admin')];

router.get('/customers', ...adminAuth, customerController.index);
router.post('/customers', ...adminAuth, customerController.store);
router.get('/customers/:customer', ...adminAuth, customerController.show);
router.put('/customers/:customer', ...adminAuth, customerController.update);
router.delete('/customers/:customer', ...adminAuth, customerController.destroy);

module.exports = router;
