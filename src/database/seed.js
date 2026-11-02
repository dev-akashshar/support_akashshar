const bcrypt = require('bcryptjs');
const db = require('../config/db');
const runMigrations = require('./migrate');

async function seed() {
  runMigrations();

  console.log('Seeding database with initial data...');

  const passwordHash = bcrypt.hashSync('password', 10);

  // 1. Seed Users
  const users = [
    { name: 'System Admin', email: 'admin@example.com', role: 'admin', phone: '+1 (555) 000-1111' },
    { name: 'Sarah Connor (Lead Agent)', email: 'agent@example.com', role: 'agent', phone: '+1 (555) 222-3333' },
    { name: 'John Doe', email: 'customer@example.com', role: 'customer', phone: '+1 (555) 444-5555' },
    { name: 'Alex Rivera', email: 'alex.rivera@helpdesk.com', role: 'agent', phone: '+1 (555) 222-3334' },
    { name: 'Emily Chen', email: 'emily.chen@helpdesk.com', role: 'agent', phone: '+1 (555) 222-3335' },
    { name: 'Michael Scott', email: 'michael.scott@helpdesk.com', role: 'agent', phone: '+1 (555) 222-3336' },
    { name: 'Jessica Taylor', email: 'jessica.taylor@helpdesk.com', role: 'agent', phone: '+1 (555) 222-3337' },
    { name: 'Alice Johnson', email: 'alice@company.org', role: 'customer', phone: '+1 (555) 444-5556' },
    { name: 'Bob Smith', email: 'bob@acme.net', role: 'customer', phone: '+1 (555) 444-5557' },
    { name: 'Charlie Davis', email: 'charlie@enterprise.io', role: 'customer', phone: '+1 (555) 444-5558' },
    { name: 'Diana Prince', email: 'diana@metropolis.com', role: 'customer', phone: '+1 (555) 444-5559' },
    { name: 'Edward Stark', email: 'edward@winterfell.org', role: 'customer', phone: '+1 (555) 444-5560' },
    { name: 'Fiona Gallagher', email: 'fiona@chicago.app', role: 'customer', phone: '+1 (555) 444-5561' },
    { name: 'George Clark', email: 'george@techcorp.com', role: 'customer', phone: '+1 (555) 444-5562' },
    { name: 'Hannah Abbott', email: 'hannah@designco.com', role: 'customer', phone: '+1 (555) 444-5563' },
    { name: 'Ian Malcolm', email: 'ian@jurassic.org', role: 'customer', phone: '+1 (555) 444-5564' },
    { name: 'Julia Roberts', email: 'julia@cinema.com', role: 'customer', phone: '+1 (555) 444-5565' },
  ];

  for (const u of users) {
    const existing = db.queryOne('SELECT id FROM users WHERE email = ?', [u.email]);
    if (!existing) {
      db.execute(
        `INSERT INTO users (name, email, password, role, phone, is_active, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
        [u.name, u.email, passwordHash, u.role, u.phone]
      );
    }
  }

  // 2. Seed Categories
  const categories = [
    {
      name: 'Technical Support',
      description: 'Assistance with software bugs, installation issues, server errors, and system configuration.',
    },
    {
      name: 'Billing & Payments',
      description: 'Inquiries regarding invoices, credit cards, subscription upgrades, and refund requests.',
    },
    {
      name: 'Feature Request',
      description: 'Suggestions and enhancements for future product releases and user experience improvements.',
    },
    {
      name: 'Account & Access',
      description: 'Help with password resets, 2FA authentication, role permissions, and account management.',
    },
    {
      name: 'General Inquiry',
      description: 'General questions, documentation assistance, and service level agreement inquiries.',
    },
  ];

  for (const cat of categories) {
    const existing = db.queryOne('SELECT id FROM categories WHERE name = ?', [cat.name]);
    if (!existing) {
      db.execute(
        `INSERT INTO categories (name, description, is_active, created_at, updated_at) 
         VALUES (?, ?, 1, datetime('now'), datetime('now'))`,
        [cat.name, cat.description]
      );
    }
  }

  // 3. Seed Sample Tickets
  const sampleTickets = [
    {
      ticket_number: 'TKT-2026-00001',
      subject: 'Unable to access dashboard after password reset',
      description: 'I reset my password yesterday, but every time I log in today, I get redirected back to the login screen with an 401 error. Please help.',
      status: 'open',
      priority: 'high',
      category_name: 'Account & Access',
      customer_email: 'customer@example.com',
      agent_email: 'agent@example.com',
      replies: [
        {
          user_email: 'agent@example.com',
          message: 'Hello John, we are investigating your session cache issue right now. Could you clear your browser cookies?',
          is_internal: 0,
        },
        {
          user_email: 'agent@example.com',
          message: 'Internal Note: Sanctum token expiration setting might be misconfigured on local environment.',
          is_internal: 1,
        },
      ],
    },
    {
      ticket_number: 'TKT-2026-00002',
      subject: 'Double charge on invoice #INV-2026-8902',
      description: 'My credit card was charged twice ($99.00 each) for the Professional Plan monthly subscription on March 1st.',
      status: 'in_progress',
      priority: 'urgent',
      category_name: 'Billing & Payments',
      customer_email: 'alice@company.org',
      agent_email: 'alex.rivera@helpdesk.com',
      replies: [
        {
          user_email: 'alex.rivera@helpdesk.com',
          message: 'Hi Alice, I see the duplicate charge in our Stripe records. Processing a full refund for the secondary transaction now.',
          is_internal: 0,
        },
        {
          user_email: 'alice@company.org',
          message: 'Thank you Alex! Please let me know once the receipt is issued.',
          is_internal: 0,
        },
      ],
    },
    {
      ticket_number: 'TKT-2026-00003',
      subject: 'Requesting dark mode export feature for PDF reports',
      description: 'When exporting analytics reports to PDF, it would be great if we could choose dark mode formatting for presentations.',
      status: 'pending',
      priority: 'low',
      category_name: 'Feature Request',
      customer_email: 'bob@acme.net',
      agent_email: 'emily.chen@helpdesk.com',
      replies: [
        {
          user_email: 'emily.chen@helpdesk.com',
          message: 'Hi Bob, thanks for the feedback! I have forwarded this feature request to our product engineering team.',
          is_internal: 0,
        },
      ],
    },
    {
      ticket_number: 'TKT-2026-00004',
      subject: 'REST API endpoint returning 500 error on POST /api/v1/export',
      description: 'Our automated CI pipeline fails whenever calling the bulk export API endpoint during peak traffic hours.',
      status: 'resolved',
      priority: 'high',
      category_name: 'Technical Support',
      customer_email: 'charlie@enterprise.io',
      agent_email: 'michael.scott@helpdesk.com',
      resolved_offset_hours: 4,
      replies: [
        {
          user_email: 'michael.scott@helpdesk.com',
          message: 'We identified a database lock timeout issue and deployed a query optimization fix in v2.4.1.',
          is_internal: 0,
        },
        {
          user_email: 'charlie@enterprise.io',
          message: 'Confirmed! The pipeline ran smoothly without any errors. Thank you!',
          is_internal: 0,
        },
      ],
    },
    {
      ticket_number: 'TKT-2026-00005',
      subject: 'Question regarding SLA response times for Enterprise tier',
      description: 'What is the expected initial response time for urgent severity tickets under our new enterprise contract?',
      status: 'closed',
      priority: 'medium',
      category_name: 'General Inquiry',
      customer_email: 'diana@metropolis.com',
      agent_email: 'jessica.taylor@helpdesk.com',
      closed_offset_hours: 1,
      replies: [
        {
          user_email: 'jessica.taylor@helpdesk.com',
          message: 'Enterprise SLA guarantees an initial response within 15 minutes for Urgent tickets 24/7/365.',
          is_internal: 0,
        },
      ],
    },
    {
      ticket_number: 'TKT-2026-00006',
      subject: 'Cannot update team member permissions in workspace settings',
      description: 'Whenever I try to promote a user to workspace editor, the save button stays disabled.',
      status: 'open',
      priority: 'medium',
      category_name: 'Account & Access',
      customer_email: 'edward@winterfell.org',
      agent_email: 'agent@example.com',
      replies: [],
    },
    {
      ticket_number: 'TKT-2026-00007',
      subject: 'Webhook notifications delayed by 30+ minutes',
      description: 'Our webhook endpoint receives ticket creation notifications with a significant queue delay.',
      status: 'in_progress',
      priority: 'high',
      category_name: 'Technical Support',
      customer_email: 'fiona@chicago.app',
      agent_email: 'alex.rivera@helpdesk.com',
      replies: [],
    },
  ];

  for (const t of sampleTickets) {
    const existingTicket = db.queryOne('SELECT id FROM tickets WHERE ticket_number = ?', [t.ticket_number]);
    if (!existingTicket) {
      const cat = db.queryOne('SELECT id FROM categories WHERE name = ?', [t.category_name]);
      const cust = db.queryOne('SELECT id FROM users WHERE email = ?', [t.customer_email]);
      const agent = db.queryOne('SELECT id FROM users WHERE email = ?', [t.agent_email]);

      const resolvedAt = t.resolved_offset_hours ? new Date(Date.now() - t.resolved_offset_hours * 3600000).toISOString() : null;
      const closedAt = t.closed_offset_hours ? new Date(Date.now() - t.closed_offset_hours * 3600000).toISOString() : null;

      const res = db.execute(
        `INSERT INTO tickets (ticket_number, subject, description, status, priority, category_id, customer_id, agent_id, resolved_at, closed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 days'), datetime('now', '-1 hours'))`,
        [
          t.ticket_number,
          t.subject,
          t.description,
          t.status,
          t.priority,
          cat ? cat.id : 1,
          cust ? cust.id : 3,
          agent ? agent.id : 2,
          resolvedAt,
          closedAt,
        ]
      );

      const ticketId = Number(res.lastInsertRowid);

      // Add 'created' activity
      db.execute(
        `INSERT INTO ticket_activities (ticket_id, user_id, action, metadata, created_at)
         VALUES (?, ?, 'created', ?, datetime('now', '-2 days'))`,
        [ticketId, cust ? cust.id : 3, JSON.stringify({ subject: t.subject, priority: t.priority })]
      );

      // Add 'assigned' activity
      if (agent) {
        db.execute(
          `INSERT INTO ticket_activities (ticket_id, user_id, action, metadata, created_at)
           VALUES (?, ?, 'assigned', ?, datetime('now', '-2 days', '+10 minutes'))`,
          [ticketId, agent.id, JSON.stringify({ agent_id: agent.id })]
        );
      }

      // Add replies & activities
      for (const rep of t.replies) {
        const replyUser = db.queryOne('SELECT id FROM users WHERE email = ?', [rep.user_email]) || agent;
        db.execute(
          `INSERT INTO ticket_replies (ticket_id, user_id, message, is_internal, created_at, updated_at)
           VALUES (?, ?, ?, ?, datetime('now', '-1 days'), datetime('now', '-1 days'))`,
          [ticketId, replyUser.id, rep.message, rep.is_internal]
        );

        db.execute(
          `INSERT INTO ticket_activities (ticket_id, user_id, action, metadata, created_at)
           VALUES (?, ?, ?, ?, datetime('now', '-1 days'))`,
          [ticketId, replyUser.id, rep.is_internal ? 'note_added' : 'reply_added', null]
        );
      }
    }
  }

  console.log('Database seeded successfully!');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}

module.exports = seed;
