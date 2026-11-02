const { Model } = require('./Model');
const Category = require('./Category');
const User = require('./User');
const TicketReply = require('./TicketReply');
const TicketActivity = require('./TicketActivity');

class Ticket extends Model {
  static table = 'tickets';

  // Status checks
  isOpen() {
    return this.status === 'open';
  }

  isClosed() {
    return this.status === 'closed';
  }

  isResolved() {
    return this.status === 'resolved';
  }

  // Scopes
  static open() {
    return this.where('status', 'open');
  }

  static inProgress() {
    return this.where('status', 'in_progress');
  }

  static pending() {
    return this.where('status', 'pending');
  }

  static resolved() {
    return this.where('status', 'resolved');
  }

  static closed() {
    return this.where('status', 'closed');
  }

  // Relationships
  category() {
    return this.belongsTo(Category, 'category_id');
  }

  customer() {
    return this.belongsTo(User, 'customer_id');
  }

  agent() {
    return this.belongsTo(User, 'agent_id');
  }

  replies(currentUser = null) {
    let query = this.hasMany(TicketReply, 'ticket_id').oldest('created_at');
    if (currentUser && currentUser.isCustomer()) {
      query = query.where('is_internal', 0);
    }
    return query;
  }

  activities() {
    return this.hasMany(TicketActivity, 'ticket_id').latest('created_at');
  }

  /**
   * Load complete ticket with related customer, agent, category, replies, and activities
   */
  static findWithDetails(id, currentUser = null) {
    const ticket = this.find(id);
    if (!ticket) return null;

    ticket.category = ticket.category();
    ticket.customer = ticket.customer();
    ticket.agent = ticket.agent();

    // Load replies with user object
    const repliesList = ticket.replies(currentUser).get();
    ticket.replies = repliesList.map((r) => {
      const u = r.user();
      return {
        id: r.id,
        ticket_id: r.ticket_id,
        message: r.message,
        is_internal: r.is_internal,
        created_at: r.created_at,
        updated_at: r.updated_at,
        user: u ? { id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone } : null,
      };
    });

    // Load activities with user object
    const activitiesList = ticket.activities().get();
    ticket.activities = activitiesList.map((a) => {
      const u = a.user();
      return {
        id: a.id,
        ticket_id: a.ticket_id,
        action: a.action,
        metadata: a.metadata,
        created_at: a.created_at,
        user: u ? { id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone } : null,
      };
    });

    return ticket;
  }
}

module.exports = Ticket;
