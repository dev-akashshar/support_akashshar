const { Ticket, User, Category, TicketActivity } = require('../models');
const { success, formatTicket, formatActivity } = require('../utils/response');

const dashboardController = {
  async index(req, res) {
    try {
      const user = req.user;

      // Base query scoped by user role
      const getScopedTicketQuery = () => {
        let q = Ticket.query();
        if (user.isCustomer()) {
          q = q.where('customer_id', user.id);
        } else if (user.isAgent()) {
          q = q.where('agent_id', user.id);
        }
        return q;
      };

      // KPI Counts
      const totalTickets = getScopedTicketQuery().count();

      const openTickets = getScopedTicketQuery().where('status', 'open').count();
      const inProgressTickets = getScopedTicketQuery().where('status', 'in_progress').count();
      const pendingTickets = getScopedTicketQuery().where('status', 'pending').count();
      const resolvedTickets = getScopedTicketQuery().where('status', 'resolved').count();
      const closedTickets = getScopedTicketQuery().where('status', 'closed').count();

      const lowPriority = getScopedTicketQuery().where('priority', 'low').count();
      const mediumPriority = getScopedTicketQuery().where('priority', 'medium').count();
      const highPriorityTickets = getScopedTicketQuery().where('priority', 'high').count();
      const urgentPriorityTickets = getScopedTicketQuery().where('priority', 'urgent').count();

      const totalCustomers = User.customers().count();
      const totalAgents = User.agents().count();

      const statusDistribution = {
        open: openTickets,
        in_progress: inProgressTickets,
        pending: pendingTickets,
        resolved: resolvedTickets,
        closed: closedTickets,
      };

      const priorityDistribution = {
        low: lowPriority,
        medium: mediumPriority,
        high: highPriorityTickets,
        urgent: urgentPriorityTickets,
      };

      // Category Distribution
      const allCategories = Category.all();
      const categoryDistribution = allCategories.map((cat) => {
        let catTicketQuery = cat.tickets();
        if (user.isCustomer()) {
          catTicketQuery = catTicketQuery.where('customer_id', user.id);
        } else if (user.isAgent()) {
          catTicketQuery = catTicketQuery.where('agent_id', user.id);
        }
        return {
          name: cat.name,
          count: catTicketQuery.count(),
        };
      });

      // Recent 5 Tickets
      const recentTicketRows = getScopedTicketQuery().latest().limit(5).get();
      const recentTickets = recentTicketRows.map((t) => {
        t.category = t.category();
        t.customer = t.customer();
        t.agent = t.agent();
        return formatTicket(t, user);
      });

      // Agent Workload (for admin/agent)
      let agentWorkload = [];
      if (!user.isCustomer()) {
        const agents = User.agents().get();
        agentWorkload = agents.map((a) => {
          const activeCount = a.assignedTickets()
            .whereIn('status', ['open', 'in_progress', 'pending'])
            .count();
          return {
            id: a.id,
            name: a.name,
            email: a.email,
            active_tickets_count: activeCount,
          };
        });
      }

      // Recent System Activities
      let actQuery = TicketActivity.query()
        .join('tickets', 'ticket_activities.ticket_id', '=', 'tickets.id')
        .join('users', 'ticket_activities.user_id', '=', 'users.id');

      if (user.isCustomer()) {
        actQuery = actQuery.where('tickets.customer_id', user.id);
      }

      const activityRows = actQuery.orderBy('ticket_activities.created_at', 'DESC').limit(8).get();
      const recentActivities = activityRows.map((a) => {
        const ticket = a.ticket();
        const activityUser = a.user();
        return formatActivity({
          id: a.id,
          ticket_id: a.ticket_id,
          ticket_number: ticket ? ticket.ticket_number : null,
          ticket_subject: ticket ? ticket.subject : null,
          user: activityUser ? { id: activityUser.id, name: activityUser.name, email: activityUser.email, role: activityUser.role } : null,
          action: a.action,
          metadata: a.metadata,
          created_at: a.created_at,
        });
      });

      return success(res, {
        kpi: {
          total: totalTickets,
          open: openTickets,
          in_progress: inProgressTickets,
          pending: pendingTickets,
          resolved: resolvedTickets,
          closed: closedTickets,
          high_priority: highPriorityTickets,
          urgent_priority: urgentPriorityTickets,
          total_customers: totalCustomers,
          total_agents: totalAgents,
        },
        status_distribution: statusDistribution,
        priority_distribution: priorityDistribution,
        category_distribution: categoryDistribution,
        recent_tickets: recentTickets,
        recent_activities: recentActivities,
        agent_workload: agentWorkload,
      });
    } catch (err) {
      console.error('Dashboard error:', err);
      return res.status(500).json({ success: false, message: 'Server error retrieving dashboard statistics.' });
    }
  },
};

module.exports = dashboardController;
