const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const ticketRoutes = require('./ticketRoutes');
const customerRoutes = require('./customerRoutes');
const agentRoutes = require('./agentRoutes');
const categoryRoutes = require('./categoryRoutes');
const reportRoutes = require('./reportRoutes');
const activityLogRoutes = require('./activityLogRoutes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Online Ticket Support Express Backend',
    database: 'SQLite',
    timestamp: new Date().toISOString(),
  });
});

// Mount all route modules
router.use(authRoutes);
router.use(categoryRoutes);
router.use(dashboardRoutes);
router.use(ticketRoutes);
router.use(customerRoutes);
router.use(agentRoutes);
router.use(reportRoutes);
router.use(activityLogRoutes);

module.exports = router;
