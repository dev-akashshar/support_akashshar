/**
 * Consistent API Response Helper & Formatters
 * Matches Laravel API Resource output format expected by the React frontend
 */

function success(res, data = null, message = null, statusCode = 200, meta = null) {
  const payload = { success: true };
  if (message) payload.message = message;
  if (data !== null) payload.data = data;
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
}

function error(res, message = 'An error occurred', statusCode = 400, errors = null) {
  const payload = {
    success: false,
    message,
  };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
}

function paginated(res, data, meta, message = null) {
  const payload = {
    success: true,
    data,
    meta,
  };
  if (message) payload.message = message;
  return res.json(payload);
}

function formatUser(user) {
  if (!user) return null;
  const formatted = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || null,
    is_active: Boolean(user.is_active),
    avatar: user.avatar || null,
    created_at: user.created_at ? new Date(user.created_at).toISOString() : null,
    updated_at: user.updated_at ? new Date(user.updated_at).toISOString() : null,
  };

  if ('customer_tickets_count' in user) {
    formatted.tickets_count = Number(user.customer_tickets_count);
  }
  if ('assigned_tickets_count' in user) {
    formatted.assigned_tickets_count = Number(user.assigned_tickets_count);
  }
  if ('open_assigned_tickets_count' in user) {
    formatted.open_assigned_tickets_count = Number(user.open_assigned_tickets_count);
  }

  return formatted;
}

function formatCategory(cat) {
  if (!cat) return null;
  const formatted = {
    id: cat.id,
    name: cat.name,
    description: cat.description || null,
    is_active: Boolean(cat.is_active),
    created_at: cat.created_at ? new Date(cat.created_at).toISOString() : null,
    updated_at: cat.updated_at ? new Date(cat.updated_at).toISOString() : null,
  };

  if ('tickets_count' in cat) {
    formatted.tickets_count = Number(cat.tickets_count);
  }

  return formatted;
}

function formatReply(reply) {
  if (!reply) return null;
  return {
    id: reply.id,
    ticket_id: reply.ticket_id,
    user: reply.user ? formatUser(reply.user) : null,
    message: reply.message,
    is_internal: Boolean(reply.is_internal),
    created_at: reply.created_at ? new Date(reply.created_at).toISOString() : null,
    updated_at: reply.updated_at ? new Date(reply.updated_at).toISOString() : null,
  };
}

function formatActivity(activity) {
  if (!activity) return null;
  let metadata = null;
  if (activity.metadata) {
    try {
      metadata = typeof activity.metadata === 'string' ? JSON.parse(activity.metadata) : activity.metadata;
    } catch (e) {
      metadata = activity.metadata;
    }
  }

  return {
    id: activity.id,
    ticket_id: activity.ticket_id,
    ticket_number: activity.ticket_number || activity.ticket?.ticket_number || null,
    ticket_subject: activity.ticket_subject || activity.ticket?.subject || null,
    user: activity.user ? formatUser(activity.user) : null,
    action: activity.action,
    metadata,
    created_at: activity.created_at ? new Date(activity.created_at).toISOString() : null,
  };
}

function formatTicket(ticket, currentUser = null) {
  if (!ticket) return null;

  let replies = null;
  if (Array.isArray(ticket.replies)) {
    let filtered = ticket.replies;
    if (currentUser && currentUser.role === 'customer') {
      filtered = filtered.filter((r) => !r.is_internal);
    }
    replies = filtered.map(formatReply);
  }

  let activities = null;
  if (Array.isArray(ticket.activities)) {
    activities = ticket.activities.map(formatActivity);
  }

  return {
    id: ticket.id,
    ticket_number: ticket.ticket_number,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category ? formatCategory(ticket.category) : null,
    customer: ticket.customer ? formatUser(ticket.customer) : null,
    agent: ticket.agent ? formatUser(ticket.agent) : null,
    replies,
    activities,
    resolved_at: ticket.resolved_at ? new Date(ticket.resolved_at).toISOString() : null,
    closed_at: ticket.closed_at ? new Date(ticket.closed_at).toISOString() : null,
    created_at: ticket.created_at ? new Date(ticket.created_at).toISOString() : null,
    updated_at: ticket.updated_at ? new Date(ticket.updated_at).toISOString() : null,
  };
}

module.exports = {
  success,
  error,
  paginated,
  formatUser,
  formatCategory,
  formatReply,
  formatActivity,
  formatTicket,
};
