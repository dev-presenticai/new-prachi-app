// Firebase Configuration for PresenticAI Multi-Client System
// Project: PresenticAI-Clients
// Environment: Production Ready

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAOAaQ0aBWld5FkSg-KfSdgFqM-bB24nQQ",
  authDomain: "presenticai-clients.firebaseapp.com",
  databaseURL: "https://presenticai-clients-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "presenticai-clients",
  storageBucket: "presenticai-clients.firebasestorage.app",
  messagingSenderId: "565166097925",
  appId: "1:565166097925:web:f4538a6daad3a80fc5fe6c",
  measurementId: "G-D6NMV9N2Y8"
};

// Client Configuration (for New Prachi Medical Agencies)
const CLIENT_CONFIG = {
  clientId: "new-prachi-medical",
  clientName: "New Prachi Medical Agencies",
  clientEmail: "presenticai@gmail.com", // Owner email for notifications
  location: "Datia",
  areas: ["Datia", "Indargarh", "Bhander", "Dinara"],
  currency: "INR",
  timeZone: "Asia/Kolkata",
  phone: "+919589850600",
  gstin: "23CQ8PG3635EI2E"
};

// Initialize Firebase (vanilla JS - no npm required)
let db = null;
let auth = null;
let currentUser = null;

async function initFirebase() {
  try {
    // Initialize Firebase from CDN (no build step needed)
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK not loaded. Make sure you include Firebase scripts in HTML.');
      return false;
    }

    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    auth = firebase.auth();

    // Set up auth state listener
    auth.onAuthStateChanged(user => {
      currentUser = user;
      if (user) {
        console.log('User logged in:', user.uid);
        localStorage.setItem('prachi_user_id', user.uid);
        localStorage.setItem('prachi_user_phone', user.phoneNumber || user.email || 'unknown');
      } else {
        console.log('User logged out');
        localStorage.removeItem('prachi_user_id');
        localStorage.removeItem('prachi_user_phone');
      }
    });

    return true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return false;
  }
}

// Get current user
function getCurrentUser() {
  return currentUser;
}

// Get database reference
function getDatabase() {
  return db;
}

// Get auth instance
function getAuth() {
  return auth;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FIREBASE_CONFIG,
    CLIENT_CONFIG,
    initFirebase,
    getCurrentUser,
    getDatabase,
    getAuth
  };
}