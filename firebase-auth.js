// Firebase Authentication Module
// Phone OTP + Email/Password for PresenticAI

let recaptchaVerifier = null;
let confirmationResult = null;

// Initialize reCAPTCHA for Phone Auth
function initRecaptcha() {
  if (!window.RecaptchaVerifier) {
    window.RecaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
      size: 'invisible',
      callback: (response) => {
        console.log('reCAPTCHA verified');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
      }
    });
  }
  recaptchaVerifier = window.RecaptchaVerifier;
  return recaptchaVerifier;
}

// Sign up with Phone OTP (for field staff in India)
async function signUpWithPhone(phoneNumber) {
  try {
    const auth = firebase.auth();

    // Format phone number for India
    if (!phoneNumber.startsWith('+')) {
      if (phoneNumber.startsWith('91')) {
        phoneNumber = '+' + phoneNumber;
      } else if (phoneNumber.startsWith('0')) {
        phoneNumber = '+91' + phoneNumber.slice(1);
      } else {
        phoneNumber = '+91' + phoneNumber;
      }
    }

    // Initialize reCAPTCHA if not already done
    if (!recaptchaVerifier) {
      initRecaptcha();
    }

    console.log('Sending OTP to:', phoneNumber);

    confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, recaptchaVerifier);
    console.log('OTP sent successfully');

    return { success: true, message: 'OTP sent to ' + phoneNumber };
  } catch (error) {
    console.error('Phone sign-up error:', error);
    return { success: false, error: error.message };
  }
}

// Verify OTP
async function verifyOTP(code) {
  try {
    if (!confirmationResult) {
      return { success: false, error: 'OTP request not initialized. Send OTP first.' };
    }

    const result = await confirmationResult.confirm(code);
    console.log('OTP verified, user:', result.user.uid);

    return { success: true, user: result.user };
  } catch (error) {
    console.error('OTP verification error:', error);
    return { success: false, error: error.message };
  }
}

// Sign in with Email/Password
async function signInWithEmail(email, password) {
  try {
    const auth = firebase.auth();
    const result = await auth.signInWithEmailAndPassword(email, password);
    console.log('Email sign-in successful:', result.user.uid);

    return { success: true, user: result.user };
  } catch (error) {
    console.error('Email sign-in error:', error);
    return { success: false, error: error.message };
  }
}

// Create user with Email/Password
async function createUserWithEmail(email, password) {
  try {
    const auth = firebase.auth();
    const result = await auth.createUserWithEmailAndPassword(email, password);
    console.log('User created:', result.user.uid);

    return { success: true, user: result.user };
  } catch (error) {
    console.error('User creation error:', error);
    return { success: false, error: error.message };
  }
}

// Sign out
async function signOut() {
  try {
    const auth = firebase.auth();
    await auth.signOut();
    console.log('User signed out');

    localStorage.removeItem('prachi_user_id');
    localStorage.removeItem('prachi_user_phone');

    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
}

// Get current user
function getCurrentUser() {
  return firebase.auth().currentUser;
}

// Check if user is authenticated
function isAuthenticated() {
  return firebase.auth().currentUser !== null;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initRecaptcha,
    signUpWithPhone,
    verifyOTP,
    signInWithEmail,
    createUserWithEmail,
    signOut,
    getCurrentUser,
    isAuthenticated
  };
}