// Firebase Realtime Database Module
// Real-time sync, multi-client support, offline capability

const DB_PATHS = {
  orders: (clientId) => `clients/${clientId}/orders`,
  users: (clientId) => `clients/${clientId}/users`,
  products: (clientId) => `clients/${clientId}/products`,
  settings: (clientId) => `clients/${clientId}/settings`,
  notifications: (clientId) => `clients/${clientId}/notifications`
};

// Initialize database for a client
function initClientDatabase(clientId) {
  const db = firebase.database();

  // Enable offline persistence
  try {
    db.goOffline();
    db.goOnline();
  } catch (e) {
    console.log('Offline persistence not available in this browser');
  }

  return db;
}

// Save order to Firebase
async function saveOrder(clientId, order) {
  try {
    const db = firebase.database();
    const ordersRef = db.ref(DB_PATHS.orders(clientId));

    const newOrderRef = ordersRef.push();
    const orderId = newOrderRef.key;

    const orderData = {
      ...order,
      id: orderId,
      clientId: clientId,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      updatedAt: firebase.database.ServerValue.TIMESTAMP,
      createdBy: firebase.auth().currentUser?.uid || 'unknown',
      status: order.status || 'Pending'
    };

    await newOrderRef.set(orderData);

    console.log('Order saved:', orderId);
    return { success: true, orderId: orderId };
  } catch (error) {
    console.error('Error saving order:', error);
    return { success: false, error: error.message };
  }
}

// Update order status
async function updateOrderStatus(clientId, orderId, status) {
  try {
    const db = firebase.database();
    const orderRef = db.ref(`${DB_PATHS.orders(clientId)}/${orderId}`);

    const updates = {
      status: status,
      updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    if (status === 'Out for Delivery') {
      updates.outAt = firebase.database.ServerValue.TIMESTAMP;
    } else if (status === 'Delivered') {
      updates.deliveredAt = firebase.database.ServerValue.TIMESTAMP;
    }

    await orderRef.update(updates);

    console.log('Order status updated:', status);
    return { success: true };
  } catch (error) {
    console.error('Error updating order:', error);
    return { success: false, error: error.message };
  }
}

// Get all orders (real-time)
function listenToOrders(clientId, callback) {
  const db = firebase.database();
  const ordersRef = db.ref(DB_PATHS.orders(clientId));

  ordersRef.on('value', (snapshot) => {
    const orders = [];
    snapshot.forEach((childSnapshot) => {
      orders.push(childSnapshot.val());
    });

    // Sort by createdAt descending
    orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    callback(orders);
  });

  // Return unsubscribe function
  return () => ordersRef.off();
}

// Get orders by status (real-time)
function listenToOrdersByStatus(clientId, status, callback) {
  const db = firebase.database();
  const ordersRef = db.ref(DB_PATHS.orders(clientId));

  ordersRef.orderByChild('status').equalTo(status).on('value', (snapshot) => {
    const orders = [];
    snapshot.forEach((childSnapshot) => {
      orders.push(childSnapshot.val());
    });

    callback(orders);
  });

  return () => ordersRef.off();
}

// Save product catalog
async function saveProductCatalog(clientId, products) {
  try {
    const db = firebase.database();
    const productsRef = db.ref(DB_PATHS.products(clientId));

    await productsRef.set(products);

    console.log('Catalog saved:', products.length, 'products');
    return { success: true };
  } catch (error) {
    console.error('Error saving catalog:', error);
    return { success: false, error: error.message };
  }
}

// Get product catalog
function listenToProducts(clientId, callback) {
  const db = firebase.database();
  const productsRef = db.ref(DB_PATHS.products(clientId));

  productsRef.once('value', (snapshot) => {
    const products = snapshot.val() || [];
    callback(products);
  });
}

// Save user profile
async function saveUserProfile(clientId, userId, profile) {
  try {
    const db = firebase.database();
    const userRef = db.ref(`${DB_PATHS.users(clientId)}/${userId}`);

    const userData = {
      ...profile,
      updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    await userRef.set(userData);

    console.log('User profile saved');
    return { success: true };
  } catch (error) {
    console.error('Error saving user profile:', error);
    return { success: false, error: error.message };
  }
}

// Send notification
async function sendNotification(clientId, notification) {
  try {
    const db = firebase.database();
    const notifRef = db.ref(DB_PATHS.notifications(clientId)).push();

    const notifData = {
      ...notification,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      read: false
    };

    await notifRef.set(notifData);

    console.log('Notification sent');
    return { success: true };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
}

// Listen to notifications (for owner)
function listenToNotifications(clientId, callback) {
  const db = firebase.database();
  const notifRef = db.ref(DB_PATHS.notifications(clientId));

  notifRef.orderByChild('createdAt').on('value', (snapshot) => {
    const notifs = [];
    snapshot.forEach((childSnapshot) => {
      notifs.push(childSnapshot.val());
    });

    // Sort descending
    notifs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    callback(notifs);
  });

  return () => notifRef.off();
}

// Get today's orders count
async function getTodayOrdersCount(clientId) {
  try {
    const db = firebase.database();
    const ordersRef = db.ref(DB_PATHS.orders(clientId));

    const snapshot = await ordersRef.once('value');
    const orders = snapshot.val() || {};

    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = Object.values(orders).filter(o =>
      o.orderDate === today
    );

    return todayOrders.length;
  } catch (error) {
    console.error('Error getting today orders:', error);
    return 0;
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DB_PATHS,
    initClientDatabase,
    saveOrder,
    updateOrderStatus,
    listenToOrders,
    listenToOrdersByStatus,
    saveProductCatalog,
    listenToProducts,
    saveUserProfile,
    sendNotification,
    listenToNotifications,
    getTodayOrdersCount
  };
}