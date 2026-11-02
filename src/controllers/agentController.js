const bcrypt = require('bcryptjs');
const { User, Ticket } = require('../models');
const { success, error, paginated, formatUser, formatTicket } = require('../utils/response');

const agentController = {
  async index(req, res) {
    try {
      const { search, is_active, page = 1, per_page = 15 } = req.query;

      let query = User.agents();

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.whereRaw('(users.name LIKE ? OR users.email LIKE ? OR users.phone LIKE ?)', [term, term, term]);
      }

      if (is_active !== undefined) {
        query = query.where('is_active', is_active === 'true' || is_active === '1' ? 1 : 0);
      }

      query = query.latest();

      const pagination = query.paginate(page, per_page);

      // Hydrate assigned tickets counts using Eloquent relationships
      const data = pagination.data.map((agent) => {
        const assignedCount = agent.assignedTickets().count();
        const openAssignedCount = agent.assignedTickets().whereIn('status', ['open', 'in_progress', 'pending']).count();
        return formatUser({
          ...agent.toJSON(),
          assigned_tickets_count: assignedCount,
          open_assigned_tickets_count: openAssignedCount,
        });
      });

      return paginated(res, data, {
        current_page: pagination.current_page,
        last_page: pagination.last_page,
        per_page: pagination.per_page,
        total: pagination.total,
      });
    } catch (err) {
      console.error('Agent index error:', err);
      return error(res, 'Server error retrieving agents.', 500);
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

      const agent = User.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: 'agent',
        phone: phone ? phone.trim() : null,
        is_active: activeVal,
      });

      return success(res, formatUser(agent), 'Agent created successfully.', 201);
    } catch (err) {
      console.error('Create agent error:', err);
      return error(res, 'Server error creating agent.', 500);
    }
  },

  async show(req, res) {
    try {
      const agentId = req.params.agent || req.params.id;

      const agent = User.agents().where('id', agentId).first();
      if (!agent) {
        return error(res, 'Agent not found.', 404);
      }

      const assignedCount = agent.assignedTickets().count();
      const openAssignedCount = agent.assignedTickets().whereIn('status', ['open', 'in_progress', 'pending']).count();

      // Load recent 10 tickets assigned to this agent using Eloquent
      const ticketRows = agent.assignedTickets().latest().limit(10).get();
      const tickets = ticketRows.map((t) => {
        t.category = t.category();
        t.customer = t.customer();
        return formatTicket(t);
      });

      return res.json({
        success: true,
        data: formatUser({
          ...agent.toJSON(),
          assigned_tickets_count: assignedCount,
          open_assigned_tickets_count: openAssignedCount,
        }),
        tickets,
      });
    } catch (err) {
      console.error('Agent show error:', err);
      return error(res, 'Server error retrieving agent details.', 500);
    }
  },

  async update(req, res) {
    try {
      const agentId = req.params.agent || req.params.id;
      const { name, email, password, phone, is_active } = req.body;

      const agent = User.agents().where('id', agentId).first();
      if (!agent) {
        return error(res, 'Agent not found.', 404);
      }

      const updateData = {};

      if (name !== undefined) {
        updateData.name = name.trim();
      }
      if (email !== undefined) {
        const cleanEmail = email.trim().toLowerCase();
        const duplicate = User.where('email', cleanEmail).whereRaw('id != ?', [agentId]).first();
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
        await agent.update(updateData);
      }

      const updated = User.find(agentId);
      return success(res, formatUser(updated), 'Agent updated successfully.');
    } catch (err) {
      console.error('Agent update error:', err);
      return error(res, 'Server error updating agent.', 500);
    }
  },

  async destroy(req, res) {
    try {
      const agentId = req.params.agent || req.params.id;

      const agent = User.agents().where('id', agentId).first();
      if (!agent) {
        return error(res, 'Agent not found.', 404);
      }

      await agent.delete();
      return success(res, null, 'Agent deleted successfully.');
    } catch (err) {
      console.error('Agent delete error:', err);
      return error(res, 'Server error deleting agent.', 500);
    }
  },
};

module.exports = agentController;
