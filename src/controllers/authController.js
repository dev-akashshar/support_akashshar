const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { signToken } = require('../config/jwt');
const { success, error, formatUser } = require('../utils/response');

const authController = {
  async register(req, res) {
    try {
      const { name, email, password, password_confirmation, phone } = req.body;

      const errors = {};
      if (!name || typeof name !== 'string' || !name.trim()) {
        errors.name = ['The name field is required.'];
      }
      if (!email || !email.includes('@')) {
        errors.email = ['A valid email address is required.'];
      }
      if (!password || password.length < 8) {
        errors.password = ['The password must be at least 8 characters.'];
      }
      if (password_confirmation && password !== password_confirmation) {
        errors.password = ['The password confirmation does not match.'];
      }

      if (Object.keys(errors).length > 0) {
        return error(res, 'Validation failed', 422, errors);
      }

      const existing = User.where('email', email.trim().toLowerCase()).first();
      if (existing) {
        return error(res, 'Validation failed', 422, { email: ['The email has already been taken.'] });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      const user = User.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: 'customer',
        phone: phone ? phone.trim() : null,
        is_active: 1,
      });

      const token = signToken({ id: user.id, email: user.email, role: user.role });

      return success(
        res,
        {
          user: formatUser(user),
          token,
        },
        'User registered successfully.',
        201
      );
    } catch (err) {
      console.error('Register error:', err);
      return error(res, 'Server error during registration.', 500);
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      const errors = {};
      if (!email) errors.email = ['The email field is required.'];
      if (!password) errors.password = ['The password field is required.'];

      if (Object.keys(errors).length > 0) {
        return error(res, 'Validation failed', 422, errors);
      }

      const user = User.where('email', email.trim().toLowerCase()).first();
      if (!user) {
        return error(res, 'Invalid email or password.', 401);
      }

      const isMatch = bcrypt.compareSync(password, user.password);
      if (!isMatch) {
        return error(res, 'Invalid email or password.', 401);
      }

      if (!user.is_active) {
        return error(res, 'Your account is deactivated. Please contact support.', 403);
      }

      const token = signToken({ id: user.id, email: user.email, role: user.role });

      return success(
        res,
        {
          user: formatUser(user),
          token,
        },
        'Logged in successfully.'
      );
    } catch (err) {
      console.error('Login error:', err);
      return error(res, 'Server error during login.', 500);
    }
  },

  async logout(req, res) {
    return success(res, null, 'Logged out successfully.');
  },

  async me(req, res) {
    const user = User.find(req.user.id);
    return success(res, formatUser(user));
  },
};

module.exports = authController;
