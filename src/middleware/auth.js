const { verifyToken } = require('../config/jwt');
const { User } = require('../models');
const { error } = require('../utils/response');

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Unauthenticated.', 401);
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded || !decoded.id) {
    return error(res, 'Unauthenticated. Invalid or expired token.', 401);
  }

  const user = User.find(decoded.id);
  if (!user) {
    return error(res, 'Unauthenticated. User not found.', 401);
  }

  if (!user.is_active) {
    return error(res, 'Your account is deactivated. Please contact support.', 403);
  }

  req.user = user;
  next();
}

module.exports = auth;
