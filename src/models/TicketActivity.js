const { Model } = require('./Model');

class TicketActivity extends Model {
  static table = 'ticket_activities';
  static timestamps = false; // Only has created_at

  static create(attributes = {}) {
    const data = { ...attributes };
    if (!data.created_at) {
      data.created_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
    }
    return super.create(data);
  }

  ticket() {
    const Ticket = require('./Ticket');
    return this.belongsTo(Ticket, 'ticket_id');
  }

  user() {
    const User = require('./User');
    return this.belongsTo(User, 'user_id');
  }
}

module.exports = TicketActivity;
