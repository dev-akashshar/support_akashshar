const { TicketActivity, Ticket, User } = require('../models');
const { paginated, error, formatActivity } = require('../utils/response');

const activityLogController = {
  async index(req, res) {
    try {
      const user = req.user;
      const { action, ticket_id, search, page = 1, per_page = 20 } = req.query;

      let query = TicketActivity.query()
        .join('tickets', 'ticket_activities.ticket_id', '=', 'tickets.id')
        .join('users', 'ticket_activities.user_id', '=', 'users.id');

      if (user.isCustomer()) {
        query = query.where('tickets.customer_id', user.id);
      }

      if (action) {
        query = query.where('ticket_activities.action', action);
      }

      if (ticket_id) {
        query = query.where('ticket_activities.ticket_id', ticket_id);
      }

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.whereRaw(
          '(ticket_activities.action LIKE ? OR tickets.ticket_number LIKE ? OR tickets.subject LIKE ?)',
          [term, term, term]
        );
      }

      query = query.orderBy('ticket_activities.created_at', 'DESC');

      const pagination = query.paginate(page, per_page);

      const data = pagination.data.map((activity) => {
        const ticket = activity.ticket();
        const activityUser = activity.user();
        return formatActivity({
          id: activity.id,
          ticket_id: activity.ticket_id,
          ticket_number: ticket ? ticket.ticket_number : null,
          ticket_subject: ticket ? ticket.subject : null,
          user: activityUser
            ? {
                id: activityUser.id,
                name: activityUser.name,
                email: activityUser.email,
                role: activityUser.role,
                phone: activityUser.phone,
              }
            : null,
          action: activity.action,
          metadata: activity.metadata,
          created_at: activity.created_at,
        });
      });

      return paginated(res, data, {
        current_page: pagination.current_page,
        last_page: pagination.last_page,
        per_page: pagination.per_page,
        total: pagination.total,
      });
    } catch (err) {
      console.error('Activity log error:', err);
      return error(res, 'Server error retrieving activity logs.', 500);
    }
  },
};

module.exports = activityLogController;
