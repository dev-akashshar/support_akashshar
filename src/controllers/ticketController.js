const { Ticket, TicketReply, TicketActivity, Category, User } = require('../models');
const { generateTicketNumber } = require('../utils/ticketNumber');
const { success, error, paginated, formatTicket, formatReply } = require('../utils/response');

function canViewTicket(user, ticket) {
  if (user.isAdmin() || user.isAgent()) return true;
  return ticket.customer_id === user.id;
}

function canUpdateTicket(user, ticket) {
  if (user.isAdmin()) return true;
  if (user.isAgent()) {
    return ticket.agent_id === user.id || ticket.agent_id === null;
  }
  return ticket.customer_id === user.id;
}

const ticketController = {
  async index(req, res) {
    try {
      const user = req.user;
      const {
        search,
        status,
        priority,
        category_id,
        agent_id,
        assigned_only,
        sort_by = 'created_at',
        sort_dir = 'desc',
        page = 1,
        per_page = 15,
      } = req.query;

      let query = Ticket.query();

      // Role Scoping
      if (user.isCustomer()) {
        query = query.where('customer_id', user.id);
      } else if (user.isAgent() && (assigned_only === 'true' || assigned_only === '1')) {
        query = query.where('agent_id', user.id);
      }

      // Search
      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.whereRaw(
          '(tickets.ticket_number LIKE ? OR tickets.subject LIKE ? OR tickets.description LIKE ?)',
          [term, term, term]
        );
      }

      // Filters
      if (status) query = query.where('status', status);
      if (priority) query = query.where('priority', priority);
      if (category_id) query = query.where('category_id', category_id);
      if (agent_id) query = query.where('agent_id', agent_id);

      // Safe sorting column
      const allowedSortColumns = ['created_at', 'updated_at', 'priority', 'status', 'subject', 'ticket_number'];
      const safeSortBy = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
      const safeSortDir = sort_dir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      query = query.orderBy(safeSortBy, safeSortDir);

      const pagination = query.paginate(page, per_page);

      // Hydrate relationships using Eloquent
      const formattedTickets = pagination.data.map((t) => {
        t.category = t.category();
        t.customer = t.customer();
        t.agent = t.agent();
        return formatTicket(t, user);
      });

      return paginated(res, formattedTickets, {
        current_page: pagination.current_page,
        last_page: pagination.last_page,
        per_page: pagination.per_page,
        total: pagination.total,
      });
    } catch (err) {
      console.error('Ticket list error:', err);
      return error(res, 'Server error retrieving tickets.', 500);
    }
  },

  async store(req, res) {
    try {
      const user = req.user;
      const { subject, description, category_id, priority = 'medium', customer_id } = req.body;

      const errors = {};
      if (!subject || !subject.trim()) errors.subject = ['The subject field is required.'];
      if (!description || !description.trim()) errors.description = ['The description field is required.'];
      if (!category_id) errors.category_id = ['The category field is required.'];

      if (Object.keys(errors).length > 0) {
        return error(res, 'Validation failed', 422, errors);
      }

      const category = Category.find(category_id);
      if (!category) {
        return error(res, 'Validation failed', 422, { category_id: ['The selected category is invalid.'] });
      }

      const ticketNumber = generateTicketNumber();
      const finalCustomerId = user.isCustomer() ? user.id : (customer_id || user.id);

      const ticket = Ticket.create({
        ticket_number: ticketNumber,
        subject: subject.trim(),
        description: description.trim(),
        category_id,
        priority,
        status: 'open',
        customer_id: finalCustomerId,
      });

      // Record Activity
      TicketActivity.create({
        ticket_id: ticket.id,
        user_id: user.id,
        action: 'created',
        metadata: JSON.stringify({ subject: subject.trim(), priority }),
      });

      const loadedTicket = Ticket.findWithDetails(ticket.id, user);
      return success(res, formatTicket(loadedTicket, user), 'Ticket created successfully.', 201);
    } catch (err) {
      console.error('Create ticket error:', err);
      return error(res, 'Server error creating ticket.', 500);
    }
  },

  async show(req, res) {
    try {
      const ticketId = req.params.ticket || req.params.id;
      const user = req.user;

      const rawTicket = Ticket.find(ticketId);
      if (!rawTicket) {
        return error(res, 'Ticket not found.', 404);
      }

      if (!canViewTicket(user, rawTicket)) {
        return error(res, 'This action is unauthorized.', 403);
      }

      const ticket = Ticket.findWithDetails(ticketId, user);
      return success(res, formatTicket(ticket, user));
    } catch (err) {
      console.error('Show ticket error:', err);
      return error(res, 'Server error retrieving ticket details.', 500);
    }
  },

  async update(req, res) {
    try {
      const ticketId = req.params.ticket || req.params.id;
      const user = req.user;

      const ticket = Ticket.find(ticketId);
      if (!ticket) {
        return error(res, 'Ticket not found.', 404);
      }

      if (!canUpdateTicket(user, ticket)) {
        return error(res, 'This action is unauthorized.', 403);
      }

      const { subject, description, category_id, status, priority, agent_id } = req.body;
      const updateData = {};
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      if (subject !== undefined) updateData.subject = subject.trim();
      if (description !== undefined) updateData.description = description.trim();
      if (category_id !== undefined) updateData.category_id = category_id;

      if (status !== undefined && status !== ticket.status) {
        updateData.status = status;
        if (status === 'resolved' && !ticket.resolved_at) updateData.resolved_at = now;
        if (status === 'closed' && !ticket.closed_at) updateData.closed_at = now;

        TicketActivity.create({
          ticket_id: ticketId,
          user_id: user.id,
          action: 'status_changed',
          metadata: JSON.stringify({ from: ticket.status, to: status }),
        });
      }

      if (priority !== undefined && priority !== ticket.priority) {
        updateData.priority = priority;

        TicketActivity.create({
          ticket_id: ticketId,
          user_id: user.id,
          action: 'priority_changed',
          metadata: JSON.stringify({ from: ticket.priority, to: priority }),
        });
      }

      if (agent_id !== undefined && agent_id !== ticket.agent_id) {
        updateData.agent_id = agent_id || null;

        TicketActivity.create({
          ticket_id: ticketId,
          user_id: user.id,
          action: 'assigned',
          metadata: JSON.stringify({ agent_id }),
        });
      }

      if (Object.keys(updateData).length > 0) {
        await ticket.update(updateData);
      }

      const updated = Ticket.findWithDetails(ticketId, user);
      return success(res, formatTicket(updated, user), 'Ticket updated successfully.');
    } catch (err) {
      console.error('Update ticket error:', err);
      return error(res, 'Server error updating ticket.', 500);
    }
  },

  async destroy(req, res) {
    try {
      const ticketId = req.params.ticket || req.params.id;
      const user = req.user;

      if (!user.isAdmin()) {
        return error(res, 'This action is unauthorized.', 403);
      }

      const ticket = Ticket.find(ticketId);
      if (!ticket) {
        return error(res, 'Ticket not found.', 404);
      }

      await ticket.delete();
      return success(res, null, 'Ticket deleted successfully.');
    } catch (err) {
      console.error('Delete ticket error:', err);
      return error(res, 'Server error deleting ticket.', 500);
    }
  },

  async sync(req, res) {
    try {
      const ticketId = req.params.ticket || req.params.id;
      const user = req.user;
      const lastReplyId = parseInt(req.query.last_reply_id, 10) || 0;

      const ticket = Ticket.find(ticketId);
      if (!ticket) {
        return error(res, 'Ticket not found.', 404);
      }

      if (!canViewTicket(user, ticket)) {
        return error(res, 'This action is unauthorized.', 403);
      }

      let repliesQuery = ticket.replies(user).whereRaw('ticket_replies.id > ?', [lastReplyId]);
      const newReplies = repliesQuery.get().map((r) => {
        const u = r.user();
        return formatReply({
          id: r.id,
          ticket_id: r.ticket_id,
          message: r.message,
          is_internal: r.is_internal,
          created_at: r.created_at,
          updated_at: r.updated_at,
          user: u ? { id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone } : null,
        });
      });

      const agent = ticket.agent();

      return res.json({
        success: true,
        status: ticket.status,
        priority: ticket.priority,
        agent: agent
          ? {
              id: agent.id,
              name: agent.name,
              email: agent.email,
              role: agent.role,
              phone: agent.phone,
            }
          : null,
        new_replies: newReplies,
      });
    } catch (err) {
      console.error('Ticket sync error:', err);
      return error(res, 'Server error syncing ticket.', 500);
    }
  },

  async addReply(req, res) {
    try {
      const ticketId = req.params.ticket || req.params.id;
      const user = req.user;
      const { message } = req.body;

      if (!message || !message.trim()) {
        return error(res, 'Validation failed', 422, { message: ['The message field is required.'] });
      }

      const ticket = Ticket.find(ticketId);
      if (!ticket) {
        return error(res, 'Ticket not found.', 404);
      }

      if (!canViewTicket(user, ticket)) {
        return error(res, 'This action is unauthorized.', 403);
      }

      const reply = TicketReply.create({
        ticket_id: ticketId,
        user_id: user.id,
        message: message.trim(),
        is_internal: 0,
      });

      TicketActivity.create({
        ticket_id: ticketId,
        user_id: user.id,
        action: 'reply_added',
      });

      // Auto transition status if agent/admin replies on an open ticket
      if (!user.isCustomer() && ticket.status === 'open') {
        await ticket.update({ status: 'in_progress' });
      } else {
        await ticket.update({});
      }

      const replyUser = reply.user();
      const formattedReply = formatReply({
        ...reply.toJSON(),
        user: replyUser
          ? { id: replyUser.id, name: replyUser.name, email: replyUser.email, role: replyUser.role, phone: replyUser.phone }
          : null,
      });

      return success(res, formattedReply, 'Reply posted successfully.', 201);
    } catch (err) {
      console.error('Add reply error:', err);
      return error(res, 'Server error adding reply.', 500);
    }
  },

  async addNote(req, res) {
    try {
      const ticketId = req.params.ticket || req.params.id;
      const user = req.user;
      const { message } = req.body;

      if (user.isCustomer()) {
        return error(res, 'This action is unauthorized.', 403);
      }

      if (!message || !message.trim()) {
        return error(res, 'Validation failed', 422, { message: ['The message field is required.'] });
      }

      const ticket = Ticket.find(ticketId);
      if (!ticket) {
        return error(res, 'Ticket not found.', 404);
      }

      const note = TicketReply.create({
        ticket_id: ticketId,
        user_id: user.id,
        message: message.trim(),
        is_internal: 1,
      });

      TicketActivity.create({
        ticket_id: ticketId,
        user_id: user.id,
        action: 'note_added',
      });

      await ticket.update({});

      const noteUser = note.user();
      const formattedNote = formatReply({
        ...note.toJSON(),
        user: noteUser
          ? { id: noteUser.id, name: noteUser.name, email: noteUser.email, role: noteUser.role, phone: noteUser.phone }
          : null,
      });

      return success(res, formattedNote, 'Internal note added.', 201);
    } catch (err) {
      console.error('Add note error:', err);
      return error(res, 'Server error adding note.', 500);
    }
  },

  async assign(req, res) {
    try {
      const ticketId = req.params.ticket || req.params.id;
      const user = req.user;
      const { agent_id } = req.body;

      if (user.isCustomer()) {
        return error(res, 'This action is unauthorized.', 403);
      }

      const ticket = Ticket.find(ticketId);
      if (!ticket) {
        return error(res, 'Ticket not found.', 404);
      }

      if (agent_id) {
        const agent = User.agents().where('id', agent_id).first();
        if (!agent) {
          return error(res, 'Validation failed', 422, { agent_id: ['The selected agent is invalid.'] });
        }
      }

      await ticket.update({ agent_id: agent_id || null });

      TicketActivity.create({
        ticket_id: ticketId,
        user_id: user.id,
        action: 'assigned',
        metadata: JSON.stringify({ agent_id }),
      });

      const updated = Ticket.findWithDetails(ticketId, user);
      return success(res, formatTicket(updated, user), 'Agent assigned successfully.');
    } catch (err) {
      console.error('Assign error:', err);
      return error(res, 'Server error assigning agent.', 500);
    }
  },

  async updateStatus(req, res) {
    try {
      const ticketId = req.params.ticket || req.params.id;
      const user = req.user;
      const { status } = req.body;

      const validStatuses = ['open', 'in_progress', 'pending', 'resolved', 'closed'];
      if (!status || !validStatuses.includes(status)) {
        return error(res, 'Validation failed', 422, {
          status: ['The status must be one of: open, in_progress, pending, resolved, closed.'],
        });
      }

      const ticket = Ticket.find(ticketId);
      if (!ticket) {
        return error(res, 'Ticket not found.', 404);
      }

      if (!canUpdateTicket(user, ticket)) {
        return error(res, 'This action is unauthorized.', 403);
      }

      const oldStatus = ticket.status;
      const updateData = { status };
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      if (status === 'resolved' && !ticket.resolved_at) {
        updateData.resolved_at = now;
      }
      if (status === 'closed' && !ticket.closed_at) {
        updateData.closed_at = now;
      }

      await ticket.update(updateData);

      TicketActivity.create({
        ticket_id: ticketId,
        user_id: user.id,
        action: 'status_changed',
        metadata: JSON.stringify({ from: oldStatus, to: status }),
      });

      const updated = Ticket.findWithDetails(ticketId, user);
      return success(res, formatTicket(updated, user), 'Ticket status updated.');
    } catch (err) {
      console.error('Update status error:', err);
      return error(res, 'Server error updating ticket status.', 500);
    }
  },

  async updatePriority(req, res) {
    try {
      const ticketId = req.params.ticket || req.params.id;
      const user = req.user;
      const { priority } = req.body;

      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!priority || !validPriorities.includes(priority)) {
        return error(res, 'Validation failed', 422, {
          priority: ['The priority must be one of: low, medium, high, urgent.'],
        });
      }

      const ticket = Ticket.find(ticketId);
      if (!ticket) {
        return error(res, 'Ticket not found.', 404);
      }

      if (!canUpdateTicket(user, ticket)) {
        return error(res, 'This action is unauthorized.', 403);
      }

      const oldPriority = ticket.priority;
      await ticket.update({ priority });

      TicketActivity.create({
        ticket_id: ticketId,
        user_id: user.id,
        action: 'priority_changed',
        metadata: JSON.stringify({ from: oldPriority, to: priority }),
      });

      const updated = Ticket.findWithDetails(ticketId, user);
      return success(res, formatTicket(updated, user), 'Ticket priority updated.');
    } catch (err) {
      console.error('Update priority error:', err);
      return error(res, 'Server error updating ticket priority.', 500);
    }
  },

  async close(req, res) {
    try {
      const ticketId = req.params.ticket || req.params.id;
      const user = req.user;

      const ticket = Ticket.find(ticketId);
      if (!ticket) {
        return error(res, 'Ticket not found.', 404);
      }

      if (!canUpdateTicket(user, ticket)) {
        return error(res, 'This action is unauthorized.', 403);
      }

      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await ticket.update({ status: 'closed', closed_at: now });

      TicketActivity.create({
        ticket_id: ticketId,
        user_id: user.id,
        action: 'closed',
      });

      const updated = Ticket.findWithDetails(ticketId, user);
      return success(res, formatTicket(updated, user), 'Ticket closed successfully.');
    } catch (err) {
      console.error('Close ticket error:', err);
      return error(res, 'Server error closing ticket.', 500);
    }
  },

  async reopen(req, res) {
    try {
      const ticketId = req.params.ticket || req.params.id;
      const user = req.user;

      const ticket = Ticket.find(ticketId);
      if (!ticket) {
        return error(res, 'Ticket not found.', 404);
      }

      if (!canUpdateTicket(user, ticket)) {
        return error(res, 'This action is unauthorized.', 403);
      }

      await ticket.update({ status: 'open', closed_at: null, resolved_at: null });

      TicketActivity.create({
        ticket_id: ticketId,
        user_id: user.id,
        action: 'reopened',
      });

      const updated = Ticket.findWithDetails(ticketId, user);
      return success(res, formatTicket(updated, user), 'Ticket reopened successfully.');
    } catch (err) {
      console.error('Reopen ticket error:', err);
      return error(res, 'Server error reopening ticket.', 500);
    }
  },
};

module.exports = ticketController;
