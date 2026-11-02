const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const adminAuth = [auth, requireRole('admin')];

router.get('/agents', ...adminAuth, agentController.index);
router.post('/agents', ...adminAuth, agentController.store);
router.get('/agents/:agent', ...adminAuth, agentController.show);
router.put('/agents/:agent', ...adminAuth, agentController.update);
router.delete('/agents/:agent', ...adminAuth, agentController.destroy);

module.exports = router;
