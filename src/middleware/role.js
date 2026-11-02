const { error } = require('../utils/response');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Unauthenticated.', 401);
    }

    if (!roles.includes(req.user.role)) {
      return error(res, 'This action is unauthorized.', 403);
    }

    next();
  };
}

module.exports = {
  requireRole,
};
