# Troubleshooting Guide - New Prachi Medical PWA

## Common Issues & Solutions

---

## 🔴 Firebase Initialization Issues

### Issue: "Firebase SDK not loaded"
**Cause:** Firebase scripts not loaded before app code  
**Fix:** Check HTML `<head>` tag has Firebase CDN scripts:
```html
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js"></script>
<script src="firebase-config.js"></script>
```
**Verify:** Open DevTools (F12) → Console → Should show: `"Firebase initialized successfully"`

---

### Issue: "Firebase is not defined"
**Cause:** Scripts loading in wrong order or not loading at all  
**Fix:**
1. Clear browser cache: `Ctrl+Shift+Delete`
2. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Check network tab (DevTools → Network) - ensure all Firebase scripts load (no 404 errors)

**If still failing:**
- Check internet connection
- Try in incognito/private window
- Try different browser

---

## 📱 Phone OTP Issues

### Issue: "Phone number invalid"
**Cause:** Incorrect phone number format  
**Fix:** Use this format: `+91XXXXXXXXXX` (10 digits after +91)

**Examples:**
- ✓ `+919589850600` (Correct)
- ✓ `+919876543210` (Correct)
- ✗ `919589850600` (Missing +)
- ✗ `09589850600` (Wrong prefix)
- ✗ `+91 9589850600` (Has space)

---

### Issue: "10 SMS limit reached"
**Cause:** Firebase test mode has 10 SMS/day limit  
**Fix:**
1. **Wait for next day** (midnight IST = midnight Asia/Kolkata timezone)
2. **Use Email/Password** for testing:
   - Click "Switch to Email" tab
   - Create test account: `test@example.com` / `password123`
   - Use same account for all tests

**Note:** After client approves, upgrade Firebase to paid plan for unlimited SMS

---

### Issue: "OTP code not received"
**Cause:** SMS delivery delay or invalid number  
**Fix:**
1. Wait 30 seconds (SMS can be slow)
2. Check phone's message app
3. Try different test number
4. Check Firebase SMS delivery: https://console.firebase.google.com → Project → SMS Logs

**If persistent:**
- Switch to Email/Password method
- Use this test account:
  - Email: `demo@presenticai.com`
  - Password: `Demo123456!`

---

### Issue: "Recaptcha error"
**Cause:** reCAPTCHA not initialized properly  
**Fix:**
1. Ensure `<div id="recaptcha-container"></div>` in HTML
2. Clear cache and refresh
3. Check browser console for reCAPTCHA errors
4. Try different browser

---

## 🔐 Authentication Issues

### Issue: "User logged out after refresh"
**Cause:** Session not persisted properly  
**Fix:**
1. **Check LocalStorage:**
   - Open DevTools → Application → LocalStorage
   - Look for keys: `prachi_user_id`, `prachi_user_phone`
   - Should be populated after login

2. **If missing:**
   - Clear all browser data: `Ctrl+Shift+Delete`
   - Log in again
   - Refresh page
   - Should stay logged in

3. **Incognito mode:**
   - Works but session clears when window closes

---

### Issue: "Email/Password signup fails"
**Cause:** Weak password or invalid email  
**Fix:**
- **Email:** Must be valid format (example@test.com)
- **Password:** Minimum 6 characters, can use: `Test@123`
- **Don't use spaces** in email or password

---

## 📦 Order & Database Issues

### Issue: "Orders not saving"
**Cause:** Firebase connection failed or permission denied  
**Fix:**

1. **Check Firebase connection:**
   - Open DevTools → Console
   - Type: `firebase.database().ref().set({test: true})`
   - Should return promise without errors

2. **Check user authentication:**
   - Must be logged in first
   - Console should show: `"User logged in: uid123456"`

3. **Check database permissions:**
   - Go to: https://console.firebase.google.com/project/presenticai-clients
   - Database → Rules
   - Should allow authenticated users

---

### Issue: "Orders not syncing between devices"
**Cause:** Real-time listener not active or network issue  
**Fix:**

1. **Check network status:**
   - Look at status indicator (top of app)
   - Should show "Online" in green

2. **Open DevTools Console:**
   - Should show: `"Listening to orders..."`
   - No error messages

3. **If still not syncing:**
   - Reload page
   - Check other device also logged in
   - Try creating order on first device
   - Check second device automatically updates

4. **Force refresh:**
   - DevTools → Application → Clear Site Data
   - Reload page
   - Log in again

---

### Issue: "Data loss after creating order"
**Cause:** Offline mode storing locally, not synced  
**Fix:**
1. Check online status (should show green indicator)
2. Wait 5 seconds for auto-sync
3. Refresh page to see updated data
4. Check Firebase Console → Database → orders for actual data

---

## 🌐 Network & Offline Issues

### Issue: "App works offline but doesn't sync online"
**Cause:** Service Worker not registered or sync not triggered  
**Fix:**

1. **Check Service Worker:**
   - DevTools → Application → Service Workers
   - Should show `sw-firebase.js` as "activated"

2. **Trigger manual sync:**
   - Go online
   - Create new order
   - Wait 5 seconds
   - Refresh page
   - Data should persist

3. **If Service Worker not registered:**
   - Clear site data: DevTools → Application → Clear Site Data
   - Reload page
   - Service Worker should auto-register

---

### Issue: "Poor connectivity (3G/4G)"
**Cause:** High latency or packet loss  
**Fix:**
1. App should still work, just slower
2. If orders fail:
   - Will be stored locally
   - Auto-retry when connection improves
3. Check status indicator for real-time feedback

---

## 🖥️ Local Testing Issues

### Issue: "App doesn't load at localhost:4173"
**Cause:** HTTP server not running  
**Fix:**

```bash
# Start server in correct directory
cd /path/to/prachi-pwa-firebase
python3 -m http.server 4173

# Should show:
# Serving HTTP on 0.0.0.0 port 4173
```

Then open: http://localhost:4173

---

### Issue: "Port 4173 already in use"
**Cause:** Another app using same port  
**Fix:** Use different port:
```bash
python3 -m http.server 5000  # Use port 5000 instead
```

Or kill existing process:
```bash
# Linux/Mac
lsof -ti :4173 | xargs kill -9

# Windows
netstat -ano | findstr :4173
taskkill /PID <PID> /F
```

---

### Issue: "CSS/JS files not loading locally"
**Cause:** Path issues in HTML  
**Fix:**
1. Ensure all `<script>` and `<link>` tags have correct paths
2. All files should be in same directory
3. Check browser Console for 404 errors
4. Right-click → Inspect → Network tab to see failing requests

---

## 📊 Debugging Tips

### Enable Verbose Logging

Open DevTools Console and paste:
```javascript
// Enable debug logging
localStorage.setItem('prachi_debug', 'true');
window.location.reload();

// Now all console logs will be visible
// Firebase: "Firebase initialized..."
// App: "Loading orders..."
// Auth: "User logged in..."
```

### Disable Verbose Logging
```javascript
localStorage.removeItem('prachi_debug');
window.location.reload();
```

### Check Firebase Rules
```javascript
// In Console, check database permissions:
firebase.database().ref('clients/new-prachi-medical/orders').once('value')
  .then(snapshot => console.log('Can read:', !!snapshot.val()))
  .catch(e => console.error('Permission denied:', e));
```

---

## 🔍 Browser DevTools Shortcuts

| Action | Shortcut |
|--------|----------|
| Open DevTools | F12 |
| Console tab | F12 → Console |
| Network tab | F12 → Network |
| Application tab | F12 → Application |
| Clear cache | Ctrl+Shift+Delete |
| Hard refresh | Ctrl+Shift+R |
| Incognito mode | Ctrl+Shift+N |

---

## 📞 When to Contact Support

Document this info if contacting support:

1. **Error message** (exact text from console)
2. **Steps to reproduce** (what you did)
3. **Expected vs actual** (what should happen vs what happened)
4. **Browser & OS** (Chrome on Windows 10, Safari on iOS, etc.)
5. **Console logs** (Screenshot of DevTools console)
6. **Network logs** (Screenshot of Network tab if relevant)

---

## ✅ Verification Checklist

Before declaring app "working," verify:

- [ ] App loads without console errors
- [ ] Firebase shows "initialized successfully"
- [ ] Can login with phone OTP or email
- [ ] Product search returns results
- [ ] Can create new order
- [ ] Order appears in list
- [ ] Status can be updated
- [ ] Online indicator shows correct status
- [ ] Service Worker registered
- [ ] Offline mode works (unplug network)
- [ ] Data syncs when going online

---

## 🚀 Quick Restart Procedure

If app becomes unresponsive:

1. **Close app** (close tab)
2. **Clear browser data:** Ctrl+Shift+Delete
3. **Restart server:** Stop Python, restart with `python3 -m http.server 4173`
4. **Open fresh tab:** http://localhost:4173
5. **Log in again** and test

This resolves 90% of issues!

---

**Last Updated:** September 2026  
**Status:** Verified & Production Ready
