const { Model } = require('./Model');

class Category extends Model {
  static table = 'categories';

  static active() {
    return this.where('is_active', 1);
  }

  tickets() {
    const Ticket = require('./Ticket');
    return this.hasMany(Ticket, 'category_id');
  }
}

module.exports = Category;
