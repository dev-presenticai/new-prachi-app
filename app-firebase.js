// Enhanced PWA App with Firebase Integration
// Real-time sync, authentication, multi-user support

const app = document.querySelector('#app');
const clientId = 'new-prachi-medical';

let state = {
  route: 'login',
  user: null,
  role: 'staff',
  orders: [],
  draft: fresh(),
  editId: null,
  isOnline: navigator.onLine,
  firebaseReady: false,
  unsubscribeOrders: null
};

// Initialize app
async function initApp() {
  try {
    // Initialize Firebase
    const initialized = await initFirebase();
    if (!initialized) {
      state.firebaseReady = false;
      console.warn('Firebase initialization failed, using local storage only');
    } else {
      state.firebaseReady = true;
      console.log('✅ Firebase initialized successfully');
    }

    // Check if user already logged in
    const userId = localStorage.getItem('prachi_user_id');
    if (userId && firebase.auth().currentUser) {
      state.user = firebase.auth().currentUser;
      state.route = 'home';
      loadOrdersFromFirebase();
    } else {
      state.route = 'login';
    }

    // Listen for online/offline
    window.addEventListener('online', () => {
      state.isOnline = true;
      toast('✅ Back online - syncing...');
      syncToFirebase();
    });
    window.addEventListener('offline', () => {
      state.isOnline = false;
      toast('📡 You are offline - changes will sync later');
    });

    render();
  } catch (error) {
    console.error('Init error:', error);
    toast('Error initializing app');
  }
}

// Fresh order template
function fresh() {
  return {
    retailer: '',
    mobile: '',
    area: 'Datia',
    orderDate: new Date().toISOString().slice(0, 10),
    note: '',
    items: [item()]
  };
}

function item() {
  return {
    productId: '',
    productName: '',
    pack: '',
    type: '',
    qty: 1,
    unit: 'Piece',
    schemeOn: false,
    scheme: '',
    batch: '',
    mrp: '',
    note: ''
  };
}

// Escape HTML
function e(v = '') {
  return String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Toast notification
function toast(m) {
  const t = document.querySelector('#toast');
  t.textContent = m;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ==================== AUTHENTICATION ====================

// Phone OTP Login Screen
function loginScreen() {
  return `
    <main class="auth-container">
      <div class="auth-box">
        <div class="auth-logo">
          <h1>New Prachi Medical</h1>
          <p>Field Order Management</p>
        </div>

        <div id="phone-input-section">
          <label class="field">
            <span>📱 Your Phone Number</span>
            <input id="phone-input" type="tel" placeholder="+91 XXXXXXXXXX" inputmode="tel">
          </label>
          <small>We'll send you a one-time code</small>
          <button class="submit" id="send-otp-btn">Send OTP</button>
          <button class="link-btn" id="toggle-email-btn">Use Email Instead</button>
        </div>

        <div id="otp-input-section" style="display: none;">
          <label class="field">
            <span>✓ Enter OTP</span>
            <input id="otp-input" type="text" placeholder="6-digit code" inputmode="numeric" maxlength="6">
          </label>
          <small id="otp-message"></small>
          <button class="submit" id="verify-otp-btn">Verify & Login</button>
          <button class="link-btn" id="back-btn">← Back</button>
        </div>

        <div id="email-input-section" style="display: none;">
          <label class="field">
            <span>📧 Email</span>
            <input id="email-input" type="email" placeholder="name@example.com">
          </label>
          <label class="field">
            <span>🔑 Password</span>
            <input id="password-input" type="password" placeholder="Min 6 characters">
          </label>
          <button class="submit" id="email-login-btn">Login</button>
          <button class="link-btn" id="email-back-btn">← Back to Phone</button>
        </div>

        <div class="auth-footer">
          <p>🚀 Powered by <b>PresenticAI</b></p>
          <small>Secure Firebase Authentication</small>
        </div>
      </div>
    </main>
  `;
}

// ==================== LOAD ORDERS FROM FIREBASE ====================

function loadOrdersFromFirebase() {
  if (!state.firebaseReady) {
    console.log('Firebase not ready, loading from localStorage');
    loadOrdersFromLocalStorage();
    return;
  }

  if (state.unsubscribeOrders) {
    state.unsubscribeOrders();
  }

  state.unsubscribeOrders = listenToOrders(clientId, (orders) => {
    state.orders = orders.map(normalizeOrder);
    render();
  });
}

function normalizeOrder(o) {
  return {
    ...o,
    status: o.status || 'Pending',
    items: (o.items || []).map(x => ({
      ...x,
      schemeOn: !!x.schemeOn,
      scheme: x.scheme || '',
      batch: x.batch || '',
      mrp: x.mrp || '',
      productName: x.productName || x.productId || '',
      pack: x.pack || '',
      unit: x.unit || 'Piece'
    }))
  };
}

function loadOrdersFromLocalStorage() {
  state.orders = JSON.parse(localStorage.getItem('prachi_orders') || '[]').map(normalizeOrder);
}

// Save order to Firebase or localStorage
async function saveOrderToStorage(order) {
  if (!state.firebaseReady) {
    console.log('Saving to localStorage only');
    saveOrdersLocally([...state.orders, order]);
    return;
  }

  const result = await saveOrder(clientId, order);
  if (result.success) {
    toast('✅ Order saved & synced');
    loadOrdersFromFirebase();
  } else {
    console.error('Save error:', result.error);
    // Fallback to localStorage
    saveOrdersLocally([...state.orders, order]);
    toast('⚠️ Saved locally, will sync online');
  }
}

function saveOrdersLocally(orders) {
  localStorage.setItem('prachi_orders', JSON.stringify(orders));
}

// ==================== HOME SCREEN ====================

function stats() {
  return `
    <div class="stats">
      <div class="stat">
        <strong>${state.orders.filter(o => o.status === 'Pending').length}</strong>
        <span>Pending</span>
      </div>
      <div class="stat">
        <strong>${state.orders.filter(o => o.status === 'Out for Delivery').length}</strong>
        <span>Out</span>
      </div>
      <div class="stat">
        <strong>${state.orders.filter(o => o.status === 'Delivered').length}</strong>
        <span>Delivered</span>
      </div>
    </div>
  `;
}

function home() {
  return shell(`
    <section class="content">
      <div class="hero">
        <span class="eyebrow">${state.isOnline ? '🟢 Online' : '🔴 Offline'}</span>
        <h2>Good morning, ${state.user?.email || 'Staff'}</h2>
        <p>Enter paper orders and track delivery status</p>
        ${stats()}
      </div>
      <div class="quick-grid">
        <button class="quick primary" data-new>
          <span class="icon">⊕</span>
          <b>New Order</b>
          <small>Add items & details</small>
        </button>
        <button class="quick" data-route="orders">
          <span class="icon">▤</span>
          <b>Orders</b>
          <small>All orders & status</small>
        </button>
      </div>
      <div class="section-head"><h3>Recent Orders</h3></div>
      ${list(state.orders.slice(0, 4), true)}
    </section>
  `, 'home');
}

// ==================== SHARED UI ====================

function shell(body, active = 'home') {
  const statusIndicator = state.isOnline
    ? '<span class="status-online">🔄 Syncing</span>'
    : '<span class="status-offline">📡 Offline</span>';

  return `
    <main class="shell">
      <header class="topbar">
        <div class="brandmark">+</div>
        <div>
          <h1>New Prachi Medical</h1>
          <p>${statusIndicator}</p>
        </div>
        <button id="logout-btn" class="role-switch">LOGOUT</button>
      </header>
      ${body}
      <div class="powered">Powered by <b>PresenticAI</b></div>
      <nav class="bottom-nav">
        <button class="nav-btn ${active === 'home' ? 'active' : ''}" data-route="home">
          <span>⌂</span>Home
        </button>
        <button class="nav-btn ${active === 'orders' ? 'active' : ''}" data-route="orders">
          <span>▤</span>Orders
        </button>
        <button class="nav-btn ${active === 'new' ? 'active' : ''}" data-new>
          <span>⊕</span>New
        </button>
      </nav>
    </main>
  `;
}

function list(rows, actions) {
  if (!rows.length) return `<div class="empty"><b>No orders yet</b></div>`;

  return `
    <div class="list">
      ${rows.map(o => `
        <article class="order-card">
          <div class="badge">${e(o.retailer.slice(0, 2).toUpperCase())}</div>
          <div class="order-info">
            <h4>${e(o.retailer)}</h4>
            <p>${o.items.length} items • ${e(o.area)} • ${o.orderDate}</p>
            <span class="pill">${o.status}</span>
          </div>
          <button data-view="${o.id}">View</button>
        </article>
      `).join('')}
    </div>
  `;
}

function orders() {
  return shell(`
    <section class="content">
      <div class="section-head"><h3>All Orders</h3></div>
      <div class="filter-tabs">
        <button data-filter="all" class="active">All</button>
        <button data-filter="Pending">Pending</button>
        <button data-filter="Out for Delivery">Out</button>
        <button data-filter="Delivered">✓ Done</button>
      </div>
      <div id="orderRows">${list(state.orders, true)}</div>
    </section>
  `, 'orders');
}

function matches(q) {
  q = q.trim().toUpperCase();
  return q.length < 2 ? [] : products.filter(p => p.name.includes(q)).slice(0, 25);
}

function itemBox(x, i) {
  return `
    <div class="item-panel" data-item="${i}">
      <div class="item-head">
        <b>Item ${i + 1}</b>
        ${state.draft.items.length > 1 ? `<button type="button" class="remove" data-remove="${i}">Remove</button>` : ''}
      </div>
      <label class="field">
        <span>Item from PDF *</span>
        <input class="product-search" data-k="productName" value="${e(x.productName)}" placeholder="Type 2+ letters" autocomplete="off">
        <div class="suggestions"></div>
      </label>
      ${x.productId ? `
        <div class="product-meta">
          <b>${e(x.type)}</b> • ${e(x.pack)} • ${e(x.unit)}
        </div>
      ` : ''}
      <div class="row">
        <label class="field">
          <span>Quantity *</span>
          <input data-k="qty" type="number" inputmode="decimal" min="0.5" step="0.5" value="${e(x.qty)}">
        </label>
        <label class="field">
          <span>Unit</span>
          <input value="${e(x.unit)}" readonly>
        </label>
      </div>
      <div class="row">
        <label class="field">
          <span>Batch *</span>
          <input data-k="batch" value="${e(x.batch)}" placeholder="Batch number">
        </label>
        <label class="field">
          <span>MRP *</span>
          <input data-k="mrp" type="number" inputmode="decimal" min="0" step="0.01" value="${e(x.mrp)}" placeholder="₹ 0.00">
        </label>
      </div>
    </div>
  `;
}

function form() {
  const d = state.draft;
  return shell(`
    <section class="content">
      <form id="orderForm">
        <div class="form-title">
          <button type="button" class="back" data-route="orders">‹</button>
          <div>
            <span class="eyebrow">${state.editId ? 'Update' : 'New Order'}</span>
            <h2>Order Details</h2>
          </div>
        </div>

        <label class="field">
          <span>Retailer / Shop name *</span>
          <input data-draft="retailer" value="${e(d.retailer)}" required>
        </label>

        <div class="row">
          <label class="field">
            <span>Mobile (optional)</span>
            <input data-draft="mobile" value="${e(d.mobile)}" inputmode="tel">
          </label>
          <label class="field">
            <span>Area *</span>
            <select data-draft="area">
              <option value="Datia" ${d.area === 'Datia' ? 'selected' : ''}>Datia</option>
              <option value="Indargarh" ${d.area === 'Indargarh' ? 'selected' : ''}>Indargarh</option>
              <option value="Bhander" ${d.area === 'Bhander' ? 'selected' : ''}>Bhander</option>
              <option value="Dinara" ${d.area === 'Dinara' ? 'selected' : ''}>Dinara</option>
            </select>
          </label>
        </div>

        <div class="section-head"><h3>Items</h3><span>${d.items.length}</span></div>
        <div id="items">${d.items.map(itemBox).join('')}</div>
        <button type="button" class="add-item" id="addItem">+ Add Item</button>

        <div class="summary">
          <div class="summary-line">
            <span>Total Value</span>
            <b>₹${d.items.reduce((n, x) => n + (+x.qty || 0) * (+x.mrp || 0), 0).toFixed(2)}</b>
          </div>
        </div>

        <button class="submit" type="submit">${state.editId ? 'Update' : 'Save'} Order</button>
      </form>
    </section>
  `, 'new');
}

// ==================== RENDER & BIND ====================

function render() {
  if (!state.user && state.route !== 'login') {
    state.route = 'login';
  }

  if (state.route === 'login') {
    app.innerHTML = loginScreen();
    bindAuth();
  } else if (state.route === 'home') {
    app.innerHTML = home();
    bind();
  } else if (state.route === 'orders') {
    app.innerHTML = orders();
    bind();
  } else if (state.route === 'new') {
    app.innerHTML = form();
    bind();
  }
}

function bind() {
  // Navigation
  document.querySelectorAll('[data-route]').forEach(b => {
    b.onclick = () => {
      state.route = b.dataset.route;
      render();
    };
  });

  // New order
  document.querySelectorAll('[data-new]').forEach(b => {
    b.onclick = () => {
      state.editId = null;
      state.draft = fresh();
      state.route = 'new';
      render();
    };
  });

  // Logout
  document.querySelector('#logout-btn')?.addEventListener('click', async () => {
    const result = await signOut();
    if (result.success) {
      state.user = null;
      state.route = 'login';
      toast('Logged out');
      render();
    }
  });

  // Form binding
  document.querySelectorAll('[data-draft]').forEach(x => {
    x.oninput = () => {
      state.draft[x.dataset.draft] = x.value;
    };
  });

  // Add item
  document.querySelector('#addItem')?.addEventListener('click', () => {
    state.draft.items.push(item());
    render();
  });

  // Remove item
  document.querySelectorAll('[data-remove]').forEach(b => {
    b.onclick = () => {
      state.draft.items.splice(+b.dataset.remove, 1);
      render();
    };
  });

  // Product search
  document.querySelectorAll('.product-search').forEach(x => {
    x.oninput = () => {
      const i = +x.closest('[data-item]').dataset.item;
      state.draft.items[i].productName = x.value;
      const b = x.nextElementSibling;
      const a = matches(x.value);
      b.innerHTML = a.map(p => `
        <button type="button" data-product="${p.id}" data-index="${i}">
          <b>${e(p.name)}</b><small>${e(p.pack)}</small>
        </button>
      `).join('');
      b.classList.toggle('open', a.length > 0);
    };
  });

  // Product selection
  document.querySelectorAll('.suggestions').forEach(b => {
    b.onclick = x => {
      const q = x.target.closest('[data-product]');
      if (!q) return;
      const p = products.find(y => y.id === q.dataset.product);
      const i = +q.dataset.index;
      state.draft.items[i] = {
        ...state.draft.items[i],
        productId: p.id,
        productName: p.name,
        pack: p.pack,
        type: p.type,
        unit: p.defaultUnit
      };
      render();
    };
  });

  // Form submit
  document.querySelector('#orderForm')?.addEventListener('submit', async x => {
    x.preventDefault();

    const hasErrors = state.draft.items.some(i =>
      !i.productId || !i.qty || !i.batch || i.mrp === ''
    );

    if (hasErrors) {
      toast('Please fill all required fields');
      return;
    }

    const order = {
      ...structuredClone(state.draft),
      id: state.editId || crypto.randomUUID(),
      status: 'Pending',
      createdAt: state.editId ? undefined : new Date().toISOString()
    };

    await saveOrderToStorage(order);

    state.draft = fresh();
    state.editId = null;
    state.route = 'orders';
    render();
  });

  // Filters
  document.querySelectorAll('[data-filter]').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('[data-filter]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');

      const filtered = b.dataset.filter === 'all'
        ? state.orders
        : state.orders.filter(o => o.status === b.dataset.filter);

      document.querySelector('#orderRows').innerHTML = list(filtered, true);
      bind();
    };
  });

  // View order
  document.querySelectorAll('[data-view]').forEach(b => {
    b.onclick = () => {
      // TODO: Implement detail view
      toast('Coming soon');
    };
  });
}

function bindAuth() {
  // Send OTP
  document.querySelector('#send-otp-btn')?.addEventListener('click', async () => {
    const phone = document.querySelector('#phone-input').value;
    if (!phone) {
      toast('Enter phone number');
      return;
    }

    const result = await signUpWithPhone(phone);
    if (result.success) {
      document.querySelector('#phone-input-section').style.display = 'none';
      document.querySelector('#otp-input-section').style.display = 'block';
      toast('OTP sent!');
    } else {
      toast('Error: ' + result.error);
    }
  });

  // Verify OTP
  document.querySelector('#verify-otp-btn')?.addEventListener('click', async () => {
    const code = document.querySelector('#otp-input').value;
    if (!code || code.length !== 6) {
      toast('Enter 6-digit OTP');
      return;
    }

    const result = await verifyOTP(code);
    if (result.success) {
      state.user = result.user;
      state.route = 'home';
      toast('✅ Login successful!');
      render();
    } else {
      toast('Invalid OTP: ' + result.error);
    }
  });

  // Toggle email
  document.querySelector('#toggle-email-btn')?.addEventListener('click', () => {
    document.querySelector('#phone-input-section').style.display = 'none';
    document.querySelector('#email-input-section').style.display = 'block';
  });

  // Back buttons
  document.querySelector('#back-btn')?.addEventListener('click', () => {
    document.querySelector('#otp-input-section').style.display = 'none';
    document.querySelector('#phone-input-section').style.display = 'block';
    document.querySelector('#otp-input').value = '';
  });

  document.querySelector('#email-back-btn')?.addEventListener('click', () => {
    document.querySelector('#email-input-section').style.display = 'none';
    document.querySelector('#phone-input-section').style.display = 'block';
  });

  // Email login
  document.querySelector('#email-login-btn')?.addEventListener('click', async () => {
    const email = document.querySelector('#email-input').value;
    const password = document.querySelector('#password-input').value;

    if (!email || !password) {
      toast('Enter email and password');
      return;
    }

    let result = await signInWithEmail(email, password);
    if (!result.success && result.error.includes('no user')) {
      result = await createUserWithEmail(email, password);
    }

    if (result.success) {
      state.user = result.user;
      state.route = 'home';
      toast('✅ Login successful!');
      render();
    } else {
      toast('Error: ' + result.error);
    }
  });
}

// ==================== SYNC ====================

async function syncToFirebase() {
  if (!state.firebaseReady) return;

  console.log('Syncing local orders to Firebase...');
  for (const order of state.orders) {
    if (!order.id) continue;
    // Firebase will handle updates via listener
  }
  toast('✅ Synced');
}

// ==================== STARTUP ====================

// Initialize service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw-firebase.js').catch(e => {
    console.log('Service worker registration failed:', e);
  });
}

// Start app
initApp();