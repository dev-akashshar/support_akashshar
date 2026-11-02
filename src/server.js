const express = require('express');
const cors = require('cors');
require('dotenv').config();

const runMigrations = require('./database/migrate');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

// Initialize database schema
runMigrations();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN === '*' ? true : (process.env.CORS_ORIGIN || true),
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

const path = require('path');
const fs = require('fs');

// Mount API routes
app.use('/api', apiRoutes);

// Find frontend build path (supports standalone cPanel deployment & monorepo dev)
const candidatePaths = [
  path.join(__dirname, '../public'),
  path.join(__dirname, '../dist'),
  path.join(__dirname, '../../frontend/dist'),
];
const frontendDistPath = candidatePaths.find((p) => fs.existsSync(p));

if (frontendDistPath) {
  app.use(express.static(frontendDistPath));
  // Catch-all route to serve index.html for React SPA routing (Express 5 compatible)
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // Root Welcome Route in API-only mode
  app.get('/', (req, res) => {
    res.json({
      message: 'Online Ticket Support Helpdesk System API (Express.js + SQLite)',
      api_documentation: '/api/health',
      version: '1.0.0',
    });
  });
}

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found.`,
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server when executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Helpdesk Express.js Backend is running!`);
    console.log(`🌐 Base URL: http://127.0.0.1:${PORT}`);
    console.log(`🔌 API URL:  http://127.0.0.1:${PORT}/api`);
    console.log(`💾 Database: SQLite (WAL mode enabled)`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
