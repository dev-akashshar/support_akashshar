const db = require('../config/db');

function generateTicketNumber() {
  const year = new Date().getFullYear();
  const pattern = `TKT-${year}-%`;
  const lastTicket = db.queryOne(
    `SELECT ticket_number FROM tickets WHERE ticket_number LIKE ? ORDER BY id DESC LIMIT 1`,
    [pattern]
  );

  let sequence = 1;
  if (lastTicket && lastTicket.ticket_number) {
    const match = lastTicket.ticket_number.match(/TKT-\d{4}-(\d{5})/);
    if (match) {
      sequence = parseInt(match[1], 10) + 1;
    }
  }

  const padded = String(sequence).padStart(5, '0');
  return `TKT-${year}-${padded}`;
}

module.exports = {
  generateTicketNumber,
};
