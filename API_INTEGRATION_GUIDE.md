# LuminaN Driver App - API Integration Guide

This guide explains how to use the backend APIs in the LuminaN Driver mobile app.

## Table of Contents
1. [Overview](#overview)
2. [Setup](#setup)
3. [Authentication Flow](#authentication-flow)
4. [API Service](#api-service)
5. [Using the APIs](#using-the-apis)
6. [Hook Usage](#hook-usage)
7. [Complete Examples](#complete-examples)

---

## Overview

The app integrates with the following backend endpoints:

### Driver Auth & Management
- `POST /api/v1/driver/register/` - Register a new driver
- `POST /api/v1/driver/login/` - Login driver
- `POST /api/v1/driver/verify-otp/` - Verify OTP after registration
- `GET /api/v1/driver/profile/<driver_id>/` - Get driver profile
- `GET /api/v1/driver/orders/` - Get assigned orders
- `POST /api/v1/driver/location/update/` - Update driver location
- `POST /api/v1/driver/pricing/set/` - Set price per kg

### Driver Order Actions
- `POST /api/v1/driver/orders/<order_id>/confirm/` - Confirm an order
- `POST /api/v1/driver/orders/<order_id>/cancel/` - Cancel an order
- `POST /api/v1/driver/orders/<order_id>/delivered/` - Mark order as delivered

---

## Setup

### 1. Configure Backend URL

Update the backend URL in `services/driverApi.js`:

```javascript
const BACKEND_URL = "https://your-backend-url.com"; // Replace with your actual backend URL
```

### 2. Install Dependencies

Make sure you have all required dependencies:

```bash
npm install
# or
yarn install
```

---

## Authentication Flow

### Registration → OTP Verification → Login

```javascript
import { useDriverAuth } from '../DriverAuthContext';

const { registerDriver, verifyOtp, loginDriver } = useDriverAuth();

// 1. Register
const registrationResult = await registerDriver({
  username: "john_doe",
  email: "john@example.com",
  phone: "0771234567",
  operational_area: "Harare",
  drivers_licence_number: "ABC123",
  valid_zimbabwe_id: "123456789",
  bio: "Experienced driver",
  vehicle_number: "ABC-1234",
  vehicle_color: "Blue",
  password: "securePassword123",
  confirm_password: "securePassword123"
});

if (registrationResult.success) {
  const tempDriverId = registrationResult.temp_driver_id;
  
  // 2. Verify OTP
  const otpResult = await verifyOtp({
    temp_driver_id: tempDriverId,
    otp: "123456"
  });
  
  if (otpResult.success) {
    // User is now logged in automatically
    console.log("Registration complete!");
  }
}

// 3. Login (for returning users)
const loginResult = await loginDriver({
  identifier: "john_doe", // username or email
  password: "securePassword123"
});

if (loginResult.success) {
  console.log("Logged in successfully!");
}
```

---

## API Service

The `services/driverApi.js` module provides all API functions:

```javascript
import driverApi from './services/driverApi';

// All available functions:
driverApi.registerDriver(driverData)
driverApi.loginDriver(credentials)
driverApi.verifyDriverOtp(otpData)
driverApi.getDriverProfile(driverId, authToken)
driverApi.getDriverAssignedOrders(authToken)
driverApi.updateDriverLocation(locationData, authToken)
driverApi.setDriverPricePerKg(priceData, authToken)
driverApi.confirmOrder(orderId, authToken)
driverApi.cancelOrder(orderId, cancelData, authToken)
driverApi.markOrderAsDelivered(orderId, authToken)
```

---

## Using the APIs

### Method 1: Direct API Calls

```javascript
import { useDriverAuth } from '../DriverAuthContext';
import driverApi from '../services/driverApi';

const MyComponent = () => {
  const { authToken } = useDriverAuth();
  
  const fetchOrders = async () => {
    const result = await driverApi.getDriverAssignedOrders(authToken);
    
    if (result.success) {
      console.log("Orders:", result.data);
    } else {
      console.error("Error:", result.error);
    }
  };
  
  return (
    <Button title="Fetch Orders" onPress={fetchOrders} />
  );
};
```

### Method 2: Using Context's fetchDriverAPI

```javascript
import { useDriverAuth } from '../DriverAuthContext';

const MyComponent = () => {
  const { fetchDriverAPI } = useDriverAuth();
  
  const fetchOrders = async () => {
    try {
      const orders = await fetchDriverAPI("/api/v1/driver/orders/");
      console.log("Orders:", orders);
    } catch (error) {
      console.error("Error:", error.message);
    }
  };
  
  return (
    <Button title="Fetch Orders" onPress={fetchOrders} />
  );
};
```

### Method 3: Using Custom Hook (Recommended)

```javascript
import useDriverApi from '../hooks/useDriverApi';

const MyComponent = () => {
  const { getOrders, loading, error } = useDriverApi();
  
  const fetchOrders = async () => {
    const result = await getOrders();
    
    if (result.success) {
      console.log("Orders:", result.data);
    }
  };
  
  return (
    <>
      {loading && <ActivityIndicator />}
      {error && <Text>Error: {error}</Text>}
      <Button title="Fetch Orders" onPress={fetchOrders} />
    </>
  );
};
```

---

## Hook Usage

The `useDriverApi` hook provides the easiest way to interact with APIs:

```javascript
import useDriverApi from '../hooks/useDriverApi';

const OrderManagementScreen = () => {
  const {
    loading,
    error,
    getOrders,
    confirmOrder,
    cancelOrder,
    markAsDelivered,
    updateLocation,
    setPricing
  } = useDriverApi();
  
  const [orders, setOrders] = useState([]);
  
  // Fetch orders
  const fetchOrders = async () => {
    const result = await getOrders();
    if (result.success) {
      setOrders(result.data);
    }
  };
  
  // Confirm order
  const handleConfirm = async (orderId) => {
    const result = await confirmOrder(orderId);
    if (result.success) {
      Alert.alert("Success", "Order confirmed!");
      fetchOrders(); // Refresh
    }
  };
  
  // Cancel order
  const handleCancel = async (orderId, reason) => {
    const result = await cancelOrder(orderId, { reason });
    if (result.success) {
      Alert.alert("Success", "Order cancelled!");
      fetchOrders(); // Refresh
    }
  };
  
  // Mark as delivered
  const handleDelivered = async (orderId) => {
    const result = await markAsDelivered(orderId);
    if (result.success) {
      Alert.alert("Success", "Order marked as delivered!");
      fetchOrders(); // Refresh
    }
  };
  
  // Update location
  const handleUpdateLocation = async () => {
    const result = await updateLocation({
      latitude: -17.8252,
      longitude: 31.0335
    });
    if (result.success) {
      Alert.alert("Success", "Location updated!");
    }
  };
  
  // Set pricing
  const handleSetPrice = async () => {
    const result = await setPricing({
      price_per_kg: 2.50
    });
    if (result.success) {
      Alert.alert("Success", "Price updated!");
    }
  };
  
  useEffect(() => {
    fetchOrders();
  }, []);
  
  return (
    <View>
      {loading && <ActivityIndicator />}
      {error && <Text style={{ color: 'red' }}>Error: {error}</Text>}
      {/* Your UI here */}
    </View>
  );
};
```

---

## Complete Examples

### Example 1: Location Tracking Component

```javascript
import React, { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';
import * as Location from 'expo-location';
import useDriverApi from '../hooks/useDriverApi';

const LocationTracker = () => {
  const { updateLocation, loading } = useDriverApi();
  const [currentLocation, setCurrentLocation] = useState(null);
  
  useEffect(() => {
    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 30000, // Update every 30 seconds
            distanceInterval: 100, // or every 100 meters
          },
          async (location) => {
            const { latitude, longitude } = location.coords;
            setCurrentLocation({ latitude, longitude });
            
            // Update backend
            await updateLocation({ latitude, longitude });
          }
        );
      }
    };
    
    startTracking();
  }, []);
  
  return (
    <View>
      <Text>Current Location:</Text>
      {currentLocation && (
        <Text>
          Lat: {currentLocation.latitude}, 
          Lng: {currentLocation.longitude}
        </Text>
      )}
      {loading && <Text>Updating location...</Text>}
    </View>
  );
};

export default LocationTracker;
```

### Example 2: Order Actions Component

```javascript
import React from 'react';
import { View, TouchableOpacity, Text, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useDriverApi from '../hooks/useDriverApi';

const OrderActions = ({ order, onUpdate }) => {
  const { confirmOrder, cancelOrder, markAsDelivered, loading } = useDriverApi();
  
  const handleConfirm = () => {
    Alert.alert(
      "Confirm Order",
      "Are you sure you want to confirm this order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            const result = await confirmOrder(order.id);
            if (result.success) {
              Alert.alert("Success", "Order confirmed!");
              onUpdate();
            } else {
              Alert.alert("Error", result.error);
            }
          }
        }
      ]
    );
  };
  
  const handleCancel = () => {
    Alert.prompt(
      "Cancel Order",
      "Please provide a reason:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async (reason) => {
            const result = await cancelOrder(order.id, { reason });
            if (result.success) {
              Alert.alert("Success", "Order cancelled!");
              onUpdate();
            } else {
              Alert.alert("Error", result.error);
            }
          }
        }
      ]
    );
  };
  
  const handleMarkDelivered = () => {
    Alert.alert(
      "Mark as Delivered",
      "Confirm that this order has been delivered?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            const result = await markAsDelivered(order.id);
            if (result.success) {
              Alert.alert("Success", "Order marked as delivered!");
              onUpdate();
            } else {
              Alert.alert("Error", result.error);
            }
          }
        }
      ]
    );
  };
  
  return (
    <View style={styles.container}>
      {order.status === 'pending' && (
        <>
          <TouchableOpacity 
            style={[styles.button, styles.confirmButton]} 
            onPress={handleConfirm}
            disabled={loading}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.buttonText}>Confirm</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]} 
            onPress={handleCancel}
            disabled={loading}
          >
            <Ionicons name="close-circle" size={20} color="#fff" />
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}
      
      {order.status === 'confirmed' && (
        <TouchableOpacity 
          style={[styles.button, styles.deliveredButton]} 
          onPress={handleMarkDelivered}
          disabled={loading}
        >
          <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
          <Text style={styles.buttonText}>Mark Delivered</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmButton: {
    backgroundColor: '#34d399',
  },
  cancelButton: {
    backgroundColor: '#f87171',
  },
  deliveredButton: {
    backgroundColor: '#10b981',
    flex: 1,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default OrderActions;
```

### Example 3: Profile Management

```javascript
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import useDriverApi from '../hooks/useDriverApi';
import { useDriverAuth } from '../DriverAuthContext';

const ProfileManager = () => {
  const { authToken } = useDriverAuth();
  const { getProfile, setPricing, loading } = useDriverApi();
  const [profile, setProfile] = useState(null);
  const [pricePerKg, setPricePerKg] = useState('');
  
  useEffect(() => {
    loadProfile();
  }, []);
  
  const loadProfile = async () => {
    // Assuming you have the driver ID available
    const driverId = 'driver-id-here';
    const result = await getProfile(driverId);
    
    if (result.success) {
      setProfile(result.data);
      setPricePerKg(result.data.price_per_kg?.toString() || '');
    }
  };
  
  const handleUpdatePrice = async () => {
    const result = await setPricing({ 
      price_per_kg: parseFloat(pricePerKg) 
    });
    
    if (result.success) {
      Alert.alert("Success", "Price updated successfully!");
      loadProfile();
    } else {
      Alert.alert("Error", result.error);
    }
  };
  
  return (
    <View>
      {profile && (
        <>
          <Text>Name: {profile.name}</Text>
          <Text>License: {profile.drivers_licence_number}</Text>
          
          <TextInput
            placeholder="Price per kg"
            value={pricePerKg}
            onChangeText={setPricePerKg}
            keyboardType="decimal-pad"
          />
          
          <Button 
            title="Update Price" 
            onPress={handleUpdatePrice}
            disabled={loading}
          />
        </>
      )}
      
      {loading && <Text>Loading...</Text>}
    </View>
  );
};

export default ProfileManager;
```

---

## Error Handling

All API functions return a consistent response format:

```javascript
{
  success: true/false,
  data: { ... } // if success
  error: "Error message" // if failed
}
```

Always check the `success` property:

```javascript
const result = await driverApi.getDriverAssignedOrders(authToken);

if (result.success) {
  // Handle success
  console.log(result.data);
} else {
  // Handle error
  Alert.alert("Error", result.error);
}
```

---

## Testing

To test the API integration:

1. Make sure your backend is running
2. Update the `BACKEND_URL` in `services/driverApi.js`
3. Test authentication flow first (register → OTP → login)
4. Test order management features
5. Check network logs in React Native Debugger

---

## Best Practices

1. **Always handle errors**: Check `result.success` before accessing data
2. **Show loading states**: Use the `loading` state from hooks
3. **Refresh data after actions**: Refetch data after confirm/cancel/deliver
4. **Use try-catch**: Wrap API calls in try-catch blocks
5. **Store auth token securely**: The context handles this automatically
6. **Validate inputs**: Validate data before sending to backend
7. **Provide user feedback**: Use Alert or Toast for success/error messages

---

## Troubleshooting

### Connection Errors
- Check if backend URL is correct
- Ensure backend is running
- Check network connectivity
- Verify CORS settings on backend

### Authentication Errors
- Token might have expired (user needs to login again)
- Check if token is being sent correctly
- Verify Authorization header format: `Bearer <token>`

### API Errors
- Check backend logs for detailed error messages
- Verify request payload matches backend expectations
- Ensure all required fields are provided

---

## Support

For issues or questions, please refer to:
- Backend API documentation
- React Native documentation
- Expo documentation

Happy coding! 🚀
