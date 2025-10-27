# Quick API Reference Card

## 🚀 Import Statements

```javascript
// Using the Hook (Easiest)
import useDriverApi from '../hooks/useDriverApi';

// Direct API Import
import driverApi from '../services/driverApi';

// Auth Context
import { useDriverAuth } from '../DriverAuthContext';
```

---

## 🎣 Hook Usage (Recommended)

```javascript
const {
  loading,           // Boolean: API call in progress
  error,            // String: Last error message
  getOrders,        // Function: Get assigned orders
  confirmOrder,     // Function: Confirm order
  cancelOrder,      // Function: Cancel order
  markAsDelivered,  // Function: Mark delivered
  updateLocation,   // Function: Update location
  setPricing,       // Function: Set price per kg
  getProfile,       // Function: Get driver profile
} = useDriverApi();
```

---

## 📝 API Functions Quick Reference

### Get Orders
```javascript
const result = await getOrders();
// Returns: { success: true, data: [orders] }
```

### Confirm Order
```javascript
const result = await confirmOrder(orderId);
// Returns: { success: true, data: {...} }
```

### Cancel Order
```javascript
const result = await cancelOrder(orderId, { reason: "Customer request" });
// Returns: { success: true, data: {...} }
```

### Mark as Delivered
```javascript
const result = await markAsDelivered(orderId);
// Returns: { success: true, data: {...} }
```

### Update Location
```javascript
const result = await updateLocation({ 
  latitude: -17.8252, 
  longitude: 31.0335 
});
// Returns: { success: true, data: {...} }
```

### Set Pricing
```javascript
const result = await setPricing({ price_per_kg: 2.50 });
// Returns: { success: true, data: {...} }
```

### Get Profile
```javascript
const result = await getProfile(driverId);
// Returns: { success: true, data: {...} }
```

---

## 🔐 Auth Functions

```javascript
const { 
  loginDriver, 
  registerDriver, 
  verifyOtp,
  signOut,
  authToken,
  isLoggedIn 
} = useDriverAuth();

// Login
await loginDriver({ identifier: "user", password: "pass" });

// Register
await registerDriver({ username, email, phone, ... });

// Verify OTP
await verifyOtp({ temp_driver_id: "id", otp: "123456" });

// Logout
signOut();
```

---

## 💡 Common Patterns

### Pattern 1: Fetch & Display
```javascript
const [orders, setOrders] = useState([]);
const { getOrders, loading } = useDriverApi();

useEffect(() => {
  const fetchOrders = async () => {
    const result = await getOrders();
    if (result.success) {
      setOrders(result.data);
    }
  };
  fetchOrders();
}, []);

return (
  <>
    {loading && <ActivityIndicator />}
    <FlatList data={orders} ... />
  </>
);
```

### Pattern 2: Action with Confirmation
```javascript
const { confirmOrder, loading } = useDriverApi();

const handleConfirm = () => {
  Alert.alert(
    "Confirm Order",
    "Are you sure?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          const result = await confirmOrder(orderId);
          if (result.success) {
            Alert.alert("Success!");
            // Refresh data
          } else {
            Alert.alert("Error", result.error);
          }
        }
      }
    ]
  );
};
```

### Pattern 3: Update with Feedback
```javascript
const { setPricing, loading, error } = useDriverApi();
const [price, setPrice] = useState("");

const handleUpdate = async () => {
  const result = await setPricing({ 
    price_per_kg: parseFloat(price) 
  });
  
  if (result.success) {
    Alert.alert("Success", "Price updated!");
    setPrice("");
  } else {
    Alert.alert("Error", result.error);
  }
};

return (
  <>
    <TextInput value={price} onChangeText={setPrice} />
    <Button title="Update" onPress={handleUpdate} disabled={loading} />
    {error && <Text style={{color: 'red'}}>{error}</Text>}
  </>
);
```

---

## 🎯 Response Format

Every API call returns:
```javascript
{
  success: true/false,
  data: { ... },      // if success
  error: "message"    // if error
}
```

Always check `success`:
```javascript
const result = await someApiCall();
if (result.success) {
  // Use result.data
} else {
  // Show result.error
}
```

---

## 🗺️ Navigation

### Navigate to Order Details
```javascript
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();
navigation.navigate('OrderDetails', { orderId: '123' });
```

### Go Back
```javascript
navigation.goBack();
```

---

## 🔄 Refresh Pattern

```javascript
const [refreshing, setRefreshing] = useState(false);

const handleRefresh = async () => {
  setRefreshing(true);
  await fetchData();
  setRefreshing(false);
};

<ScrollView
  refreshControl={
    <RefreshControl 
      refreshing={refreshing} 
      onRefresh={handleRefresh}
      tintColor="#38bdf8"
    />
  }
>
```

---

## ⚠️ Error Handling

```javascript
// Option 1: Check success
const result = await getOrders();
if (!result.success) {
  Alert.alert("Error", result.error);
  return;
}

// Option 2: Try-catch
try {
  const result = await getOrders();
  if (result.success) {
    setOrders(result.data);
  }
} catch (error) {
  Alert.alert("Error", error.message);
}

// Option 3: Use error state from hook
const { getOrders, error } = useDriverApi();

useEffect(() => {
  getOrders();
}, []);

return (
  <>
    {error && <Text style={{color: 'red'}}>Error: {error}</Text>}
  </>
);
```

---

## 🎨 Loading States

```javascript
const { loading } = useDriverApi();

// Option 1: Inline spinner
{loading && <ActivityIndicator size="small" color="#38bdf8" />}

// Option 2: Overlay
{loading && (
  <Modal transparent>
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color="#38bdf8" />
    </View>
  </Modal>
)}

// Option 3: Disable button
<Button 
  title="Submit" 
  onPress={handleSubmit}
  disabled={loading}
/>
```

---

## 📍 Location Tracking

```javascript
import * as Location from 'expo-location';
import useDriverApi from '../hooks/useDriverApi';

const { updateLocation } = useDriverApi();

// One-time update
const updateCurrentLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status === 'granted') {
    const location = await Location.getCurrentPositionAsync();
    await updateLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    });
  }
};

// Continuous tracking
useEffect(() => {
  let subscription;
  
  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status === 'granted') {
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // Every 30 seconds
          distanceInterval: 100, // Every 100 meters
        },
        async (location) => {
          await updateLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
        }
      );
    }
  };
  
  startTracking();
  
  return () => subscription?.remove();
}, []);
```

---

## 🎯 Complete Component Template

```javascript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useDriverApi from '../hooks/useDriverApi';

const MyScreen = () => {
  const navigation = useNavigation();
  const { getOrders, confirmOrder, loading, error } = useDriverApi();
  
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    fetchOrders();
  }, []);
  
  const fetchOrders = async () => {
    const result = await getOrders();
    if (result.success) {
      setOrders(result.data);
    } else {
      Alert.alert("Error", result.error);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };
  
  const handleConfirm = async (orderId) => {
    const result = await confirmOrder(orderId);
    if (result.success) {
      Alert.alert("Success", "Order confirmed!");
      fetchOrders();
    } else {
      Alert.alert("Error", result.error);
    }
  };
  
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
    >
      <View>
        <Text>{item.customer_name}</Text>
        <TouchableOpacity onPress={() => handleConfirm(item.id)}>
          <Text>Confirm</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
  
  if (loading && orders.length === 0) {
    return <ActivityIndicator size="large" />;
  }
  
  return (
    <FlatList
      data={orders}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      ListEmptyComponent={<Text>No orders found</Text>}
    />
  );
};

export default MyScreen;
```

---

## 📞 Need Help?

- Check `API_INTEGRATION_GUIDE.md` for detailed examples
- Check `API_SUMMARY.md` for overview
- Check backend API documentation for endpoint details

---

**That's it! You now have everything you need to use the APIs! 🎉**
