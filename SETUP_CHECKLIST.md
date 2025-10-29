# Setup Checklist for API Integration

Use this checklist to ensure everything is properly configured and tested.

---

## ✅ Configuration

### 1. Backend URL Configuration
- [ ] Open `services/driverApi.js`
- [ ] Verify `BACKEND_URL` constant is set to production URL
  ```javascript
  const BACKEND_URL = "https://backend-luminanonrender.com"; // Production URL
  ```
- [ ] Verify URL has no trailing slash
- [ ] Test backend is accessible from your network

### 2. Environment Setup
- [ ] Install all dependencies: `npm install` or `yarn install`
- [ ] Ensure React Native is running: `npm start`
- [ ] Ensure backend server is running and accessible

### 3. Required Packages
Verify these packages are installed:
- [ ] `@react-native-async-storage/async-storage` (for token storage)
- [ ] `@react-navigation/native` (for navigation)
- [ ] `@react-navigation/native-stack` (for stack navigation)
- [ ] `@react-navigation/bottom-tabs` (for tab navigation)
- [ ] `expo-location` (for location tracking)
- [ ] `axios` (already installed)

---

## ✅ Testing Authentication Flow

### 1. Test Registration
- [ ] Run the app
- [ ] Navigate to Register screen
- [ ] Fill in all required fields:
  - [ ] Username
  - [ ] Email
  - [ ] Phone (10 digits starting with 0)
  - [ ] Operational area
  - [ ] Driver's licence number
  - [ ] Valid Zimbabwe ID
  - [ ] Bio
  - [ ] Vehicle number
  - [ ] Vehicle color
  - [ ] Password & Confirm password
- [ ] Click Register button
- [ ] Verify you're navigated to OTP screen
- [ ] Note down the `temp_driver_id` from logs

### 2. Test OTP Verification
- [ ] Enter the OTP sent to your phone/email
- [ ] Click Verify button
- [ ] Verify you're logged in automatically
- [ ] Check AsyncStorage for auth token (use React Native Debugger)
- [ ] Verify you see the Home screen

### 3. Test Login
- [ ] Logout from Settings screen
- [ ] Navigate to Login screen
- [ ] Enter username/email and password
- [ ] Click Login button
- [ ] Verify you're logged in
- [ ] Verify token is stored in AsyncStorage

### 4. Test Token Persistence
- [ ] Close and reopen the app
- [ ] Verify you're still logged in (no login screen)
- [ ] Token should be automatically loaded from AsyncStorage

---

## ✅ Testing Order Management

### 1. Test Fetching Orders
- [ ] Navigate to Orders tab
- [ ] Verify orders are loading
- [ ] Check loading indicator appears
- [ ] Verify orders are displayed after loading
- [ ] Pull down to refresh
- [ ] Verify refresh works

### 2. Test Order Filters
- [ ] Click "All" filter - verify all orders shown
- [ ] Click "Confirmed" filter - verify only confirmed orders shown
- [ ] Click "Pending" filter - verify only pending orders shown
- [ ] Click "Canceled" filter - verify only canceled orders shown

### 3. Test Order Details
- [ ] Click on an order
- [ ] Verify navigation to OrderDetails screen
- [ ] Verify all order information is displayed
- [ ] Verify status badge shows correct color
- [ ] Test back navigation

### 4. Test Order Actions

#### Confirm Order (Pending orders only)
- [ ] Open a pending order
- [ ] Click "Confirm Order" button
- [ ] Verify confirmation alert appears
- [ ] Click "Confirm" in alert
- [ ] Verify success message
- [ ] Verify order status updates
- [ ] Verify order moves to confirmed section

#### Cancel Order (Pending orders only)
- [ ] Open a pending order
- [ ] Click "Cancel Order" button
- [ ] Enter cancellation reason
- [ ] Click "Submit"
- [ ] Verify success message
- [ ] Verify order status updates
- [ ] Verify order moves to canceled section

#### Mark as Delivered (Confirmed orders only)
- [ ] Open a confirmed order
- [ ] Click "Mark as Delivered" button
- [ ] Verify confirmation alert appears
- [ ] Click "Confirm" in alert
- [ ] Verify success message
- [ ] Verify order status updates

---

## ✅ Testing Location Features

### 1. Test Location Permissions
- [ ] Navigate to Settings screen
- [ ] Toggle "Enable Location Updates" switch
- [ ] Verify permission request appears
- [ ] Grant location permission
- [ ] Verify switch stays enabled

### 2. Test Location Updates
- [ ] With location enabled, click "Update Location Now"
- [ ] Verify loading indicator appears
- [ ] Verify success message appears
- [ ] Verify current coordinates are displayed
- [ ] Check backend to verify location was updated

### 3. Test Auto Location Tracking (if implemented)
- [ ] Enable location tracking
- [ ] Move to a different location
- [ ] Wait for auto-update interval
- [ ] Verify location updates automatically

---

## ✅ Testing Pricing Management

### 1. Test Set Pricing
- [ ] Navigate to Settings screen
- [ ] Enter a price in "Price per Kilogram" field
- [ ] Click "Update Pricing" button
- [ ] Verify loading indicator appears
- [ ] Verify success message appears
- [ ] Check backend to verify price was updated

### 2. Test Price Validation
- [ ] Try entering invalid values (letters, symbols)
- [ ] Verify validation error appears
- [ ] Try entering negative number
- [ ] Verify appropriate error handling

---

## ✅ Testing Error Handling

### 1. Test Network Errors
- [ ] Disconnect from internet
- [ ] Try fetching orders
- [ ] Verify error message appears
- [ ] Reconnect to internet
- [ ] Verify refresh works

### 2. Test Invalid Token
- [ ] Manually clear AsyncStorage
- [ ] Try making an API call
- [ ] Verify you're logged out
- [ ] Verify login screen appears

### 3. Test Backend Errors
- [ ] Stop backend server
- [ ] Try making an API call
- [ ] Verify error message appears
- [ ] Restart backend
- [ ] Verify app recovers

---

## ✅ Testing Loading States

### 1. Verify Loading Indicators
- [ ] Check loading spinner appears during:
  - [ ] Login
  - [ ] Registration
  - [ ] OTP verification
  - [ ] Fetching orders
  - [ ] Confirming order
  - [ ] Canceling order
  - [ ] Marking as delivered
  - [ ] Updating location
  - [ ] Setting pricing

### 2. Verify Disabled States
- [ ] Check buttons are disabled during loading
- [ ] Verify no double-submits are possible
- [ ] Verify loading overlays prevent interaction

---

## ✅ Testing User Feedback

### 1. Success Messages
- [ ] Verify success alerts appear for:
  - [ ] Successful login
  - [ ] Successful registration
  - [ ] Order confirmation
  - [ ] Order cancellation
  - [ ] Delivery confirmation
  - [ ] Location update
  - [ ] Pricing update

### 2. Error Messages
- [ ] Verify error alerts appear for:
  - [ ] Invalid credentials
  - [ ] Network errors
  - [ ] Validation errors
  - [ ] Server errors
  - [ ] Permission denials

---

## ✅ Testing Navigation

### 1. Tab Navigation
- [ ] Navigate between Home, Orders, Updates, Settings tabs
- [ ] Verify correct screen appears
- [ ] Verify active tab is highlighted
- [ ] Verify tab bar icons change correctly

### 2. Stack Navigation
- [ ] Navigate from Orders → Order Details
- [ ] Use back button to return
- [ ] Use hardware back button (Android)
- [ ] Verify navigation state is preserved

### 3. Deep Linking (if configured)
- [ ] Test navigating to specific order via deep link
- [ ] Verify proper screen appears

---

## ✅ Performance Testing

### 1. Test with Multiple Orders
- [ ] Test with 50+ orders
- [ ] Verify list scrolls smoothly
- [ ] Verify filtering works efficiently
- [ ] Check memory usage

### 2. Test Network Latency
- [ ] Test on slow network (enable throttling)
- [ ] Verify loading states work correctly
- [ ] Verify timeouts are handled

---

## ✅ Security Testing

### 1. Token Security
- [ ] Verify token is stored securely in AsyncStorage
- [ ] Verify token is sent in Authorization header
- [ ] Verify token format: `Bearer <token>`
- [ ] Verify expired tokens trigger logout

### 2. Data Validation
- [ ] Verify input validation on all forms
- [ ] Verify proper error messages
- [ ] Verify no sensitive data in logs (production)

---

## ✅ Platform-Specific Testing

### iOS
- [ ] Test on iOS simulator
- [ ] Test on physical iOS device
- [ ] Verify safe area handling
- [ ] Verify keyboard behavior
- [ ] Test location permissions

### Android
- [ ] Test on Android emulator
- [ ] Test on physical Android device
- [ ] Verify safe area handling
- [ ] Verify keyboard behavior
- [ ] Test location permissions
- [ ] Test hardware back button

---

## ✅ Production Readiness

### 1. Configuration
- [ ] Backend URL points to production
- [ ] Remove all console.logs (or use production logging)
- [ ] Disable React Native Debugger
- [ ] Update app version numbers
- [ ] Test on both iOS and Android

### 2. Build & Deploy
- [ ] Create production build
- [ ] Test production build thoroughly
- [ ] Verify all APIs work with production backend
- [ ] Test on multiple devices
- [ ] Verify app store compliance

### 3. Monitoring & Analytics (if configured)
- [ ] Verify error tracking works
- [ ] Verify analytics events fire
- [ ] Test crash reporting

---

## 🚨 Common Issues & Solutions

### Issue: "Network request failed"
**Solution:**
- Check backend URL is correct
- Verify backend is running
- Check network connectivity
- Verify CORS settings on backend
- Check if using `http://` instead of `https://` (may need cleartext traffic on Android)

### Issue: "Token is invalid"
**Solution:**
- Token may have expired
- User needs to login again
- Check token format in Authorization header
- Verify backend token validation

### Issue: Orders not loading
**Solution:**
- Check if token is valid
- Verify endpoint URL is correct
- Check backend logs for errors
- Verify user has assigned orders

### Issue: Location not updating
**Solution:**
- Check location permissions granted
- Verify GPS is enabled on device
- Check if location services are enabled in app settings
- Test on physical device (not simulator)

### Issue: App crashes on order action
**Solution:**
- Check order ID is valid
- Verify endpoint exists on backend
- Check response format matches expected
- Look at error logs for details

---

## 📝 Notes

### Backend Response Format
Ensure your backend returns data in this format:

```json
// Success response
{
  "success": true,
  "data": { ... }
}

// Error response
{
  "success": false,
  "error": "Error message"
}
```

Or ensure the API service properly transforms responses.

### Order Status Values
Ensure backend uses these status values:
- `pending`
- `confirmed`
- `canceled`
- `delivered`

### Testing Credentials
Keep a set of test credentials handy:
- Test username
- Test password
- Test OTP (if using fixed OTP in dev)

---

## ✅ Final Checks

- [ ] All tests passing
- [ ] No console errors
- [ ] App builds successfully
- [ ] Performance is acceptable
- [ ] UI is responsive
- [ ] Loading states work
- [ ] Error handling works
- [ ] Navigation works
- [ ] All features tested
- [ ] Ready for production

---

## 🎉 Congratulations!

If all items are checked, your API integration is complete and ready to go! 

For ongoing reference:
- Use `QUICK_REFERENCE.md` for day-to-day API usage
- Use `API_INTEGRATION_GUIDE.md` for detailed examples
- Use `API_SUMMARY.md` for architecture overview

Happy coding! 🚀
