const BASE_URL = 'http://127.0.0.1:8000/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('🧪 Starting Full Comprehensive API Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraInfo = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${extraInfo}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request('/health');
    assert(health.status === 200 && health.data.status === 'ok', 'Health Check (/api/health)');

    // 2. Public Categories
    const categories = await request('/categories');
    assert(categories.status === 200 && categories.data.success && categories.data.data.length >= 5, 'Public Categories (/api/categories)');

    // 3. Admin Login
    const loginRes = await request('/login', {
      method: 'POST',
      body: { email: 'admin@example.com', password: 'password' },
    });
    assert(loginRes.status === 200 && loginRes.data.data.token, 'Admin Login (/api/login)');
    const adminToken = loginRes.data.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // 4. Admin Auth Profile
    const meRes = await request('/user', { headers: adminHeaders });
    assert(meRes.status === 200 && meRes.data.data.role === 'admin', 'Admin Profile (/api/user)');

    // 5. Dashboard Metrics
    const dashRes = await request('/dashboard', { headers: adminHeaders });
    assert(
      dashRes.status === 200 &&
      dashRes.data.data.kpi &&
      dashRes.data.data.kpi.total > 0 &&
      dashRes.data.data.status_distribution,
      'Admin Dashboard Metrics (/api/dashboard)'
    );

    // 6. Tickets List
    const ticketsRes = await request('/tickets', { headers: adminHeaders });
    assert(
      ticketsRes.status === 200 &&
      ticketsRes.data.success &&
      Array.isArray(ticketsRes.data.data) &&
      ticketsRes.data.meta.total > 0,
      'Tickets List with Pagination & Meta (/api/tickets)'
    );

    // 7. Ticket Details
    const ticketDetails = await request('/tickets/1', { headers: adminHeaders });
    assert(
      ticketDetails.status === 200 &&
      ticketDetails.data.data.ticket_number &&
      Array.isArray(ticketDetails.data.data.replies),
      'Ticket Detail View (/api/tickets/1)'
    );

    // 8. Add Reply
    const replyRes = await request('/tickets/1/replies', {
      method: 'POST',
      headers: adminHeaders,
      body: { message: 'Automated test reply from Express.js backend.' },
    });
    assert(replyRes.status === 201 && replyRes.data.data.message.includes('Automated test reply'), 'Add Ticket Reply (/api/tickets/1/replies)');

    // 9. Add Internal Note
    const noteRes = await request('/tickets/1/notes', {
      method: 'POST',
      headers: adminHeaders,
      body: { message: 'Internal confidential note test.' },
    });
    assert(noteRes.status === 201 && noteRes.data.data.is_internal === true, 'Add Internal Note (Admin/Agent)');

    // 10. Update Status
    const statusRes = await request('/tickets/1/status', {
      method: 'POST',
      headers: adminHeaders,
      body: { status: 'in_progress' },
    });
    assert(statusRes.status === 200 && statusRes.data.data.status === 'in_progress', 'Update Ticket Status (/api/tickets/1/status)');

    // 11. Update Priority
    const priorityRes = await request('/tickets/1/priority', {
      method: 'POST',
      headers: adminHeaders,
      body: { priority: 'urgent' },
    });
    assert(priorityRes.status === 200 && priorityRes.data.data.priority === 'urgent', 'Update Ticket Priority (/api/tickets/1/priority)');

    // 12. Assign Agent
    const assignRes = await request('/tickets/1/assign', {
      method: 'POST',
      headers: adminHeaders,
      body: { agent_id: 2 },
    });
    assert(assignRes.status === 200 && assignRes.data.data.agent && assignRes.data.data.agent.id === 2, 'Assign Agent (/api/tickets/1/assign)');

    // 13. Close Ticket
    const closeRes = await request('/tickets/1/close', {
      method: 'POST',
      headers: adminHeaders,
    });
    assert(closeRes.status === 200 && closeRes.data.data.status === 'closed', 'Close Ticket (/api/tickets/1/close)');

    // 14. Reopen Ticket
    const reopenRes = await request('/tickets/1/reopen', {
      method: 'POST',
      headers: adminHeaders,
    });
    assert(reopenRes.status === 200 && reopenRes.data.data.status === 'open', 'Reopen Ticket (/api/tickets/1/reopen)');

    // 15. Customer Login
    const custLogin = await request('/login', {
      method: 'POST',
      body: { email: 'customer@example.com', password: 'password' },
    });
    assert(custLogin.status === 200 && custLogin.data.data.token, 'Customer Login');
    const custToken = custLogin.data.data.token;
    const custHeaders = { Authorization: `Bearer ${custToken}` };

    // 16. Customer Forbidden From Adding Internal Notes (403)
    const custNoteRes = await request('/tickets/1/notes', {
      method: 'POST',
      headers: custHeaders,
      body: { message: 'Customer trying to add internal note' },
    });
    assert(custNoteRes.status === 403, 'Customer Forbidden From Adding Internal Notes (403)');

    // 17. Customer Privacy Filter (Internal Notes Hidden)
    const custTicketView = await request('/tickets/1', { headers: custHeaders });
    const hasInternalNotes = custTicketView.data.data.replies.some((r) => r.is_internal);
    assert(custTicketView.status === 200 && !hasInternalNotes, 'Customer Cannot See Internal Notes (Privacy Check)');

    // 18. Customer Create Ticket
    const createTicketRes = await request('/tickets', {
      method: 'POST',
      headers: custHeaders,
      body: {
        subject: 'Printer not connecting to local WiFi network',
        description: 'Office printer is displaying an error code E-04 and disconnects every 10 minutes.',
        category_id: 1,
        priority: 'high',
      },
    });
    assert(createTicketRes.status === 201 && createTicketRes.data.data.ticket_number.startsWith('TKT-'), 'Customer Create Ticket');

    // 19. Customer List & Details (Admin)
    const custsRes = await request('/customers', { headers: adminHeaders });
    assert(custsRes.status === 200 && custsRes.data.data.length > 0, 'Customer Management List (/api/customers)');

    const custDetail = await request('/customers/3', { headers: adminHeaders });
    assert(custDetail.status === 200 && custDetail.data.data.id === 3 && Array.isArray(custDetail.data.tickets), 'Customer Details View (/api/customers/3)');

    // 20. Agent List & Details (Admin)
    const agentsRes = await request('/agents', { headers: adminHeaders });
    assert(agentsRes.status === 200 && agentsRes.data.data.length > 0, 'Agent Management List (/api/agents)');

    const agentDetail = await request('/agents/2', { headers: adminHeaders });
    assert(agentDetail.status === 200 && agentDetail.data.data.id === 2 && Array.isArray(agentDetail.data.tickets), 'Agent Details View (/api/agents/2)');

    // 21. Category Management (Create, Update)
    const newCatRes = await request('/categories', {
      method: 'POST',
      headers: adminHeaders,
      body: { name: 'Hardware Replacement', description: 'Request new equipment or peripherals.' },
    });
    assert(newCatRes.status === 201 && newCatRes.data.data.name === 'Hardware Replacement', 'Create Category (Admin)');
    const createdCatId = newCatRes.data.data.id;

    const updateCatRes = await request(`/categories/${createdCatId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { description: 'Updated hardware peripherals and replacements description.' },
    });
    assert(updateCatRes.status === 200 && updateCatRes.data.data.description.includes('Updated'), 'Update Category (Admin)');

    // 22. Category Protection against Deletion
    const deleteCat1Res = await request('/categories/1', {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert(deleteCat1Res.status === 422, 'Category Protection Against Deleting Active Tickets (422)');

    const deleteNewCatRes = await request(`/categories/${createdCatId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert(deleteNewCatRes.status === 200, 'Delete Unused Category (Admin)');

    // 23. Admin Reports Analytics
    const reportsRes = await request('/reports', { headers: adminHeaders });
    assert(
      reportsRes.status === 200 &&
      reportsRes.data.data.tickets_by_status &&
      reportsRes.data.data.resolution_rate !== undefined,
      'Admin Reports Analytics (/api/reports)'
    );

    // 24. Activity Logs Audit Trail
    const actLogs = await request('/activity-logs', { headers: adminHeaders });
    assert(actLogs.status === 200 && Array.isArray(actLogs.data.data) && actLogs.data.meta.total > 0, 'Activity Logs Audit Trail (/api/activity-logs)');

    // 25. Ticket Sync endpoint
    const syncRes = await request('/tickets/1/sync?last_reply_id=0', { headers: adminHeaders });
    assert(syncRes.status === 200 && Array.isArray(syncRes.data.new_replies), 'Ticket Sync Polling Endpoint (/api/tickets/1/sync)');

    console.log(`\n=================================================`);
    console.log(`Final Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`=================================================\n`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
