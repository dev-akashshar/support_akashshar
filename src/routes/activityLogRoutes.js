const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLogController');
const auth = require('../middleware/auth');

router.get('/activity-logs', auth, activityLogController.index);

module.exports = router;
