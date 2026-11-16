/**
 * KitchenCare REST API Router
 * Handles all /api/... endpoints connecting frontend with SQLite database.
 */

const db = require('../data/database.js');
const url = require('url');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

async function handleApiRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return true;
  }

  // Health check
  if (pathname === '/api/health' && method === 'GET') {
    sendJson(res, 200, {
      status: 'healthy',
      database: 'SQLite (node:sqlite)',
      timestamp: new Date().toISOString()
    });
    return true;
  }

  // Full Database State Synchronization
  if (pathname === '/api/sync' && method === 'GET') {
    const state = db.getFullState();
    sendJson(res, 200, state);
    return true;
  }

  // Auth: Login with PIN
  if (pathname === '/api/auth/login' && method === 'POST') {
    const { userId, pin } = await parseBody(req);
    const user = db.authenticateUser(userId, pin);
    if (user) {
      sendJson(res, 200, { success: true, user });
    } else {
      sendJson(res, 401, { success: false, message: 'Invalid credentials or PIN' });
    }
    return true;
  }

  // Users List
  if (pathname === '/api/users' && method === 'GET') {
    const state = db.getFullState();
    sendJson(res, 200, state.users);
    return true;
  }

  // Tables
  if (pathname === '/api/tables' && method === 'GET') {
    const state = db.getFullState();
    sendJson(res, 200, state.tables);
    return true;
  }

  const tablePatchMatch = pathname.match(/^\/api\/tables\/([^/]+)$/);
  if (tablePatchMatch && (method === 'PATCH' || method === 'POST')) {
    const tableId = decodeURIComponent(tablePatchMatch[1]);
    const body = await parseBody(req);
    const updated = db.updateTable(tableId, body);
    sendJson(res, 200, { success: true, table: updated });
    return true;
  }

  const tableSettleMatch = pathname.match(/^\/api\/tables\/([^/]+)\/settle$/);
  if (tableSettleMatch && method === 'POST') {
    const tableId = decodeURIComponent(tableSettleMatch[1]);
    const { paymentMode, amount, staffName } = await parseBody(req);
    const result = db.settleTable(tableId, paymentMode, amount, staffName);
    sendJson(res, 200, result);
    return true;
  }

  // Orders
  if (pathname === '/api/orders' && method === 'GET') {
    const state = db.getFullState();
    sendJson(res, 200, state.orders);
    return true;
  }

  if (pathname === '/api/orders' && method === 'POST') {
    const orderData = await parseBody(req);
    const created = db.createOrder(orderData);
    sendJson(res, 201, { success: true, order: created });
    return true;
  }

  const orderPatchMatch = pathname.match(/^\/api\/orders\/([^/]+)$/);
  if (orderPatchMatch && (method === 'PATCH' || method === 'POST')) {
    const orderId = decodeURIComponent(orderPatchMatch[1]);
    const { status, chefId, chefName } = await parseBody(req);
    const updated = db.updateOrderStatus(orderId, status, chefId, chefName);
    sendJson(res, 200, { success: true, order: updated });
    return true;
  }

  // Dishes & Menu
  if (pathname === '/api/dishes' && method === 'GET') {
    const state = db.getFullState();
    sendJson(res, 200, state.dishes);
    return true;
  }

  // Ingredients & FEFO Auto-Deduction
  if (pathname === '/api/ingredients' && method === 'GET') {
    const state = db.getFullState();
    sendJson(res, 200, state.ingredients);
    return true;
  }

  if (pathname === '/api/ingredients/deduct' && method === 'POST') {
    const { dishId, qty } = await parseBody(req);
    const result = db.deductFEFO(dishId, qty || 1);
    sendJson(res, 200, result);
    return true;
  }

  if (pathname === '/api/ingredients/add-stock' && method === 'POST') {
    const { ingredientId, batchData } = await parseBody(req);
    const result = db.addStockBatch(ingredientId, batchData);
    sendJson(res, 200, result);
    return true;
  }

  // Logs
  if (pathname === '/api/wastage' && method === 'POST') {
    const body = await parseBody(req);
    db.logAudit(body.staff || 'Manager', body.staff || 'Manager', 'Wastage Logged', `${body.qty} of ${body.ingredientName} (${body.reason})`);
    sendJson(res, 200, { success: true });
    return true;
  }

  if (pathname === '/api/temperature-logs' && method === 'POST') {
    const body = await parseBody(req);
    db.logAudit(body.signedBy || 'Manager', body.signedBy || 'Manager', 'Fridge Temp Checked', `${body.unitName}: ${body.temp}°C (${body.status})`);
    sendJson(res, 200, { success: true });
    return true;
  }

  if (pathname === '/api/audit-logs' && method === 'POST') {
    const { userId, userName, action, details } = await parseBody(req);
    db.logAudit(userId, userName, action, details);
    sendJson(res, 200, { success: true });
    return true;
  }

  // Backup Export
  if (pathname === '/api/backup' && method === 'GET') {
    const state = db.getFullState();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="kitchencare_backup_' + new Date().toISOString().split('T')[0] + '.json"'
    });
    res.end(JSON.stringify(state, null, 2));
    return true;
  }

  // Not an API endpoint handled here
  return false;
}

module.exports = { handleApiRequest };
