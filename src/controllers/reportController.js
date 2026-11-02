const { Ticket, Category, User } = require('../models');
const { success, error } = require('../utils/response');

const reportController = {
  async index(req, res) {
    try {
      const totalTickets = Ticket.count();

      // Status volumes using Eloquent
      const ticketsByStatus = {
        open: Ticket.where('status', 'open').count(),
        in_progress: Ticket.where('status', 'in_progress').count(),
        pending: Ticket.where('status', 'pending').count(),
        resolved: Ticket.where('status', 'resolved').count(),
        closed: Ticket.where('status', 'closed').count(),
      };

      // Priority volumes using Eloquent
      const ticketsByPriority = {
        low: Ticket.where('priority', 'low').count(),
        medium: Ticket.where('priority', 'medium').count(),
        high: Ticket.where('priority', 'high').count(),
        urgent: Ticket.where('priority', 'urgent').count(),
      };

      // Category volumes using Eloquent relationships
      const allCategories = Category.orderBy('name', 'ASC').get();
      const ticketsByCategory = allCategories.map((c) => ({
        id: c.id,
        name: c.name,
        count: c.tickets().count(),
      }));

      // Agent volumes using Eloquent relationships
      const agents = User.agents().get();
      const ticketsByAgent = agents
        .map((a) => {
          const totalAssigned = a.assignedTickets().count();
          const resolved = a.assignedTickets().whereIn('status', ['resolved', 'closed']).count();
          return {
            id: a.id,
            name: a.name,
            email: a.email,
            total_assigned: totalAssigned,
            resolved: resolved,
          };
        })
        .sort((a, b) => b.total_assigned - a.total_assigned);

      // Resolution stats
      const resolvedCount = Ticket.whereNotNull('resolved_at').count();
      const closedCount = Ticket.whereNotNull('closed_at').count();

      const resolutionRate = totalTickets > 0
        ? Math.round((((resolvedCount + closedCount) / totalTickets) * 100) * 10) / 10
        : 0;

      return success(res, {
        total_tickets: totalTickets,
        resolved_count: resolvedCount,
        closed_count: closedCount,
        resolution_rate: resolutionRate,
        tickets_by_status: ticketsByStatus,
        tickets_by_priority: ticketsByPriority,
        tickets_by_category: ticketsByCategory,
        tickets_by_agent: ticketsByAgent,
      });
    } catch (err) {
      console.error('Report index error:', err);
      return error(res, 'Server error generating reports.', 500);
    }
  },
};

module.exports = reportController;
