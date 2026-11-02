const bcrypt = require('bcryptjs');
const { User, Ticket } = require('../models');
const { success, error, paginated, formatUser, formatTicket } = require('../utils/response');

const customerController = {
  async index(req, res) {
    try {
      const { search, is_active, page = 1, per_page = 15 } = req.query;

      let query = User.customers();

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.whereRaw('(users.name LIKE ? OR users.email LIKE ? OR users.phone LIKE ?)', [term, term, term]);
      }

      if (is_active !== undefined) {
        query = query.where('is_active', is_active === 'true' || is_active === '1' ? 1 : 0);
      }

      query = query.latest();

      const pagination = query.paginate(page, per_page);

      // Hydrate customer tickets count using Eloquent relationship
      const data = pagination.data.map((user) => {
        const ticketsCount = user.tickets().count();
        return formatUser({
          ...user.toJSON(),
          customer_tickets_count: ticketsCount,
        });
      });

      return paginated(res, data, {
        current_page: pagination.current_page,
        last_page: pagination.last_page,
        per_page: pagination.per_page,
        total: pagination.total,
      });
    } catch (err) {
      console.error('Customer index error:', err);
      return error(res, 'Server error retrieving customers.', 500);
    }
  },

  async store(req, res) {
    try {
      const { name, email, password, phone, is_active = true } = req.body;

      const errors = {};
      if (!name || !name.trim()) errors.name = ['The name field is required.'];
      if (!email || !email.includes('@')) errors.email = ['A valid email address is required.'];
      if (!password || password.length < 8) errors.password = ['The password must be at least 8 characters.'];

      if (Object.keys(errors).length > 0) {
        return error(res, 'Validation failed', 422, errors);
      }

      const existing = User.where('email', email.trim().toLowerCase()).first();
      if (existing) {
        return error(res, 'Validation failed', 422, { email: ['The email has already been taken.'] });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      const activeVal = is_active ? 1 : 0;

      const customer = User.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: 'customer',
        phone: phone ? phone.trim() : null,
        is_active: activeVal,
      });

      return success(res, formatUser(customer), 'Customer created successfully.', 201);
    } catch (err) {
      console.error('Create customer error:', err);
      return error(res, 'Server error creating customer.', 500);
    }
  },

  async show(req, res) {
    try {
      const customerId = req.params.customer || req.params.id;

      const customer = User.customers().where('id', customerId).first();
      if (!customer) {
        return error(res, 'Customer not found.', 404);
      }

      const ticketsCount = customer.tickets().count();

      // Load recent 10 tickets for this customer using Ticket model with details
      const ticketRows = customer.tickets().latest().limit(10).get();
      const tickets = ticketRows.map((t) => {
        t.category = t.category();
        t.agent = t.agent();
        return formatTicket(t);
      });

      return res.json({
        success: true,
        data: formatUser({ ...customer.toJSON(), customer_tickets_count: ticketsCount }),
        tickets,
      });
    } catch (err) {
      console.error('Customer show error:', err);
      return error(res, 'Server error retrieving customer details.', 500);
    }
  },

  async update(req, res) {
    try {
      const customerId = req.params.customer || req.params.id;
      const { name, email, password, phone, is_active } = req.body;

      const customer = User.customers().where('id', customerId).first();
      if (!customer) {
        return error(res, 'Customer not found.', 404);
      }

      const updateData = {};

      if (name !== undefined) {
        updateData.name = name.trim();
      }
      if (email !== undefined) {
        const cleanEmail = email.trim().toLowerCase();
        const duplicate = User.where('email', cleanEmail).whereRaw('id != ?', [customerId]).first();
        if (duplicate) {
          return error(res, 'Validation failed', 422, { email: ['The email has already been taken.'] });
        }
        updateData.email = cleanEmail;
      }
      if (password) {
        if (password.length < 8) {
          return error(res, 'Validation failed', 422, { password: ['The password must be at least 8 characters.'] });
        }
        updateData.password = bcrypt.hashSync(password, 10);
      }
      if (phone !== undefined) {
        updateData.phone = phone ? phone.trim() : null;
      }
      if (is_active !== undefined) {
        updateData.is_active = is_active ? 1 : 0;
      }

      if (Object.keys(updateData).length > 0) {
        await customer.update(updateData);
      }

      const updated = User.find(customerId);
      return success(res, formatUser(updated), 'Customer updated successfully.');
    } catch (err) {
      console.error('Customer update error:', err);
      return error(res, 'Server error updating customer.', 500);
    }
  },

  async destroy(req, res) {
    try {
      const customerId = req.params.customer || req.params.id;

      const customer = User.customers().where('id', customerId).first();
      if (!customer) {
        return error(res, 'Customer not found.', 404);
      }

      await customer.delete();
      return success(res, null, 'Customer deleted successfully.');
    } catch (err) {
      console.error('Customer delete error:', err);
      return error(res, 'Server error deleting customer.', 500);
    }
  },
};

module.exports = customerController;
