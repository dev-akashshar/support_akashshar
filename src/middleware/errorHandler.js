const { error } = require('../utils/response');

function errorHandler(err, req, res, next) {
  console.error('Unhandled Error:', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return error(res, message, statusCode, err.errors || null);
}

module.exports = errorHandler;
