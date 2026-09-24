/**
 * SentinelAPI Vulnerable Target API (Demo Sandbox)
 * Intentionally contains BOLA/IDOR, Excessive Data Exposure, and Missing Rate Limiting.
 * Built strictly with Node.js built-in modules (Zero external dependencies).
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOST = '127.0.0.1';
const PORT = process.env.PORT || 4000;
const JWT_SECRET = 'sentinelapi-demo-insecure-secret-key-2026';

// In-memory mock database
const users = {
  1: {
    id: 1,
    username: 'alice',
    password: 'alice123', // VULNERABILITY: Plaintext password stored and returned
    email: 'alice@example.com',
    phone: '+1-555-0101',
    address: '100 Demo Lane',
    internalNotes: 'Sandbox account: premium support enabled',
    role: 'customer',
    is_admin: false,
    bio: 'Senior developer and coffee enthusiast'
  },
  2: {
    id: 2,
    username: 'bob',
    password: 'bob123', // VULNERABILITY: Plaintext password stored and returned
    email: 'bob@example.com',
    phone: '+1-555-0102',
    address: '200 Sample Street',
    internalNotes: 'Sandbox account: billing review pending',
    role: 'customer',
    is_admin: false,
    bio: 'DevOps engineer and automation geek'
  }
};

const orders = {
  1: {
    id: 1,
    user_id: 1,
    items: ['Mechanical Keyboard', 'USB-C Hub'],
    amount: 189.99,
    status: 'completed',
    card_number: '4532015698741235', // VULNERABILITY: Unmasked Luhn-valid credit card number
    payment_id: 501, invoice_id: 901, shipment_id: 701,
    created_at: '2026-09-20T10:15:00Z'
  },
  2: {
    id: 2,
    user_id: 1,
    items: ['Ergonomic Mouse'],
    amount: 79.50,
    status: 'processing',
    card_number: '4532015698741235', // VULNERABILITY: Unmasked Luhn-valid credit card number
    payment_id: 503, invoice_id: 903, shipment_id: 703,
    created_at: '2026-09-21T14:30:00Z'
  },
  3: {
    id: 3,
    user_id: 2,
    items: ['4K UltraWide Monitor'],
    amount: 649.00,
    status: 'shipped',
    card_number: '4242424242424242', // VULNERABILITY: Unmasked Luhn-valid credit card number
    payment_id: 502, invoice_id: 902, shipment_id: 702,
    created_at: '2026-09-22T09:12:00Z'
  },
  4: {
    id: 4,
    user_id: 2,
    items: ['Noise Cancelling Headphones'],
    amount: 299.99,
    status: 'completed',
    card_number: '4242424242424242', // VULNERABILITY: Unmasked Luhn-valid credit card number
    payment_id: 504, invoice_id: 904, shipment_id: 704,
    created_at: '2026-09-23T16:45:00Z'
  }
};

const payments = {
  501: { id: 501, order_id: 1, user_id: 1, amount: 189.99, card_number: '4532015698741235', payment_token: 'sandbox-pay-501' },
  502: { id: 502, order_id: 3, user_id: 2, amount: 649, card_number: '4242424242424242', payment_token: 'sandbox-pay-502' },
  503: { id: 503, order_id: 2, user_id: 1, amount: 79.5, card_number: '4532015698741235', payment_token: 'sandbox-pay-503' },
  504: { id: 504, order_id: 4, user_id: 2, amount: 299.99, card_number: '4242424242424242', payment_token: 'sandbox-pay-504' }
};
const invoices = {
  901: { id: 901, order_id: 1, user_id: 1, billing_address: '100 Demo Lane', internal_metadata: 'tax-exempt-review' },
  902: { id: 902, order_id: 3, user_id: 2, billing_address: '200 Sample Street', internal_metadata: 'manual-review' },
  903: { id: 903, order_id: 2, user_id: 1, billing_address: '100 Demo Lane', internal_metadata: 'standard' },
  904: { id: 904, order_id: 4, user_id: 2, billing_address: '200 Sample Street', internal_metadata: 'standard' }
};
const shipments = {
  701: { id: 701, order_id: 1, user_id: 1, tracking_number: 'DEMO-TRACK-701', destination_address: '100 Demo Lane' },
  702: { id: 702, order_id: 3, user_id: 2, tracking_number: 'DEMO-TRACK-702', destination_address: '200 Sample Street' },
  703: { id: 703, order_id: 2, user_id: 1, tracking_number: 'DEMO-TRACK-703', destination_address: '100 Demo Lane' },
  704: { id: 704, order_id: 4, user_id: 2, tracking_number: 'DEMO-TRACK-704', destination_address: '200 Sample Street' }
};

/**
 * Creates a lightweight JWT-formatted token using HMAC SHA-256
 */
function createToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      username: user.username,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

/**
 * Validates and decodes a JWT token
 */
function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch (err) {
    return null;
  }
}

/**
 * Extracts and verifies bearer token from HTTP Authorization header
 */
function authenticate(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  return verifyToken(parts[1]);
}

/**
 * Helper to send JSON responses with CORS headers
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Reads request body helper
 */
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Request entity too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // Root endpoint
  if (pathname === '/' && method === 'GET') {
    return sendJson(res, 200, {
      name: 'SentinelAPI Vulnerable Target API',
      status: 'online',
      version: '1.0.0',
      description: 'Educational vulnerable test sandbox. Do NOT expose to public networks.',
      documentation: '/openapi.json',
      endpoints: [
        'POST /login',
        'GET /orders/{id}',
        'GET /users/{id}',
        'GET /me/orders',
        'GET /openapi.json'
      ]
    });
  }

  // OpenAPI Specification endpoint
  if (pathname === '/openapi.json' && method === 'GET') {
    try {
      const specPath = path.join(__dirname, 'openapi.json');
      const content = fs.readFileSync(specPath, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
      return;
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to read openapi.json' });
    }
  }

  // POST /login: Authenticate user (VULNERABILITY: No rate limiting implemented)
  if (pathname === '/login' && method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const { username, password } = body;

      const user = Object.values(users).find(
        u => u.username === username && u.password === password
      );

      if (!user) {
        return sendJson(res, 401, {
          error: 'Invalid credentials',
          status: 401
        });
      }

      const token = createToken(user);
      return sendJson(res, 200, {
        token: token,
        token_type: 'Bearer',
        user: {
          id: user.id,
          username: user.username
        }
      });
    } catch (err) {
      return sendJson(res, 400, { error: err.message, status: 400 });
    }
  }

  // Restore the in-memory sandbox state for repeatable demonstrations.
  if (pathname === '/__demo/reset' && method === 'POST') {
    users[1].role = 'customer'; users[1].is_admin = false;
    users[2].role = 'customer'; users[2].is_admin = false;
    return sendJson(res, 200, { status: 'reset', message: 'Demo sandbox state restored' });
  }

  // GET /orders/:id (VULNERABILITY: BOLA & Excessive Data Exposure)
  const orderMatch = pathname.match(/^\/orders\/(\d+)$/);
  if (orderMatch && method === 'GET') {
    const authUser = authenticate(req);
    if (!authUser) {
      return sendJson(res, 401, { error: 'Unauthorized: missing or invalid Bearer token', status: 401 });
    }

    const orderId = parseInt(orderMatch[1], 10);
    const order = orders[orderId];
    if (!order) {
      return sendJson(res, 404, { error: `Order ${orderId} not found`, status: 404 });
    }

    // BOLA VULNERABILITY: Does NOT check if order.user_id === authUser.sub
    // Excessive Data Exposure: Returns plaintext credit card number
    return sendJson(res, 200, order);
  }

  // Indirect object access: the order lookup skips ownership enforcement and each child
  // resource is genuinely loaded through the relationship recorded on that order.
  const childMatch = pathname.match(/^\/orders\/(\d+)\/(payment|invoice|shipment)$/);
  if (childMatch && method === 'GET') {
    const authUser = authenticate(req);
    if (!authUser) return sendJson(res, 401, { error: 'Unauthorized', status: 401 });
    const order = orders[Number(childMatch[1])];
    if (!order) return sendJson(res, 404, { error: 'Order not found', status: 404 });
    const resource = childMatch[2] === 'payment' ? payments[order.payment_id] : childMatch[2] === 'invoice' ? invoices[order.invoice_id] : shipments[order.shipment_id];
    return sendJson(res, 200, resource);
  }

  // GET /users/:id (VULNERABILITY: BOLA & Plaintext Password Exposure)
  const userMatch = pathname.match(/^\/users\/(\d+)$/);
  if (userMatch && method === 'GET') {
    const authUser = authenticate(req);
    if (!authUser) {
      return sendJson(res, 401, { error: 'Unauthorized: missing or invalid Bearer token', status: 401 });
    }

    const userId = parseInt(userMatch[1], 10);
    const userProfile = users[userId];
    if (!userProfile) {
      return sendJson(res, 404, { error: `User ${userId} not found`, status: 404 });
    }

    // BOLA VULNERABILITY: Allows any authenticated user to view other user records
    // Plaintext password exposure in response
    return sendJson(res, 200, userProfile);
  }

  // BFLA: the vulnerable route applies no administrator role check.
  const roleMatch = pathname.match(/^\/admin\/users\/(\d+)\/role$/);
  if (roleMatch && method === 'POST') {
    const authUser = authenticate(req);
    if (!authUser) return sendJson(res, 401, { error: 'Unauthorized', status: 401 });
    try {
      const body = await parseRequestBody(req);
      const user = users[Number(roleMatch[1])];
      if (!user) return sendJson(res, 404, { error: 'User not found', status: 404 });
      if (body.role) user.role = String(body.role);
      return sendJson(res, 200, { id: user.id, role: user.role });
    } catch (err) { return sendJson(res, 400, { error: err.message, status: 400 }); }
  }

  // Mass assignment: protected properties are copied from the request body.
  if (userMatch && method === 'PATCH') {
    const authUser = authenticate(req);
    if (!authUser) return sendJson(res, 401, { error: 'Unauthorized', status: 401 });
    try {
      const body = await parseRequestBody(req);
      const user = users[Number(userMatch[1])];
      if (!user) return sendJson(res, 404, { error: 'User not found', status: 404 });
      for (const field of ['username', 'email', 'phone', 'address', 'role', 'is_admin']) if (body[field] !== undefined) user[field] = body[field];
      return sendJson(res, 200, user);
    } catch (err) { return sendJson(res, 400, { error: err.message, status: 400 }); }
  }

  // GET /me/orders (SECURE PATTERN: Enforces ownership through token identity)
  if (pathname === '/me/orders' && method === 'GET') {
    const authUser = authenticate(req);
    if (!authUser) {
      return sendJson(res, 401, { error: 'Unauthorized: missing or invalid Bearer token', status: 401 });
    }

    // Correct pattern: filter orders strictly by requester's user ID and sanitize data
    const userOrders = Object.values(orders)
      .filter(o => o.user_id === authUser.sub)
      .map(o => ({
        id: o.id,
        user_id: o.user_id,
        items: o.items,
        amount: o.amount,
        status: o.status,
        masked_card: `****-****-****-${o.card_number.slice(-4)}`,
        created_at: o.created_at
      }));

    return sendJson(res, 200, userOrders);
  }

  // Fallback 404
  return sendJson(res, 404, { error: 'Not Found', path: pathname, status: 404 });
});

server.listen(PORT, HOST, () => {
  console.log(`[SentinelAPI] Vulnerable Sandbox Target running at http://${HOST}:${PORT}`);
  console.log(`[SentinelAPI] OpenAPI Spec available at http://${HOST}:${PORT}/openapi.json`);
  console.log(`[SentinelAPI] Demo Accounts: alice:alice123, bob:bob123`);
});
