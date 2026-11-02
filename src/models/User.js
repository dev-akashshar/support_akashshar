const { Model } = require('./Model');

class User extends Model {
  static table = 'users';

  // Role checks
  isAdmin() {
    return this.role === 'admin';
  }

  isAgent() {
    return this.role === 'agent';
  }

  isCustomer() {
    return this.role === 'customer';
  }

  // Scopes
  static customers() {
    return this.where('role', 'customer');
  }

  static agents() {
    return this.where('role', 'agent');
  }

  static admins() {
    return this.where('role', 'admin');
  }

  // Relationships
  tickets() {
    const Ticket = require('./Ticket');
    return this.hasMany(Ticket, 'customer_id');
  }

  assignedTickets() {
    const Ticket = require('./Ticket');
    return this.hasMany(Ticket, 'agent_id');
  }

  replies() {
    const TicketReply = require('./TicketReply');
    return this.hasMany(TicketReply, 'user_id');
  }
}

module.exports = User;
