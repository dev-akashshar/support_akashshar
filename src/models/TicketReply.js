const { Model } = require('./Model');

class TicketReply extends Model {
  static table = 'ticket_replies';

  static publicOnly() {
    return this.where('is_internal', 0);
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

module.exports = TicketReply;
