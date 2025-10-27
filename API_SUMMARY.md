# API Integration Summary

## 📋 What We've Created

### 1. **Core API Service** (`services/driverApi.js`)
A centralized module that handles all backend API calls with:
- Consistent error handling
- Token-based authentication
- Clean, reusable functions
- All 11 backend endpoints integrated

### 2. **Enhanced Auth Context** (`DriverAuthContext.js`)
Updated to use the new API service:
- Uses `driverApi` for all auth operations
- Maintains backward compatibility
- Automatic token management
- Smart endpoint routing in `fetchDriverAPI`

### 3. **Custom Hook** (`hooks/useDriverApi.js`)
Provides the easiest way to use APIs:
- Built-in loading states
- Automatic error handling
- Clean, intuitive API
- Perfect for React components

### 4. **Example Screens**

#### **OrderDetailsScreen.js**
- Complete order management interface
- Confirm/Cancel/Deliver actions
- Real-time updates
- Error handling and loading states

#### **SettingsScreen.js**
- Pricing management
- Location tracking
- Profile settings
- Logout functionality

#### **Updated OrdersScreen.js**
- Clickable order items
- Navigation to details
- Filter functionality

### 5. **Documentation**
- `API_INTEGRATION_GUIDE.md` - Complete usage guide
- `API_SUMMARY.md` - This file

---

## 🎯 Available Backend Endpoints

### Authentication & Management
```javascript
✅ POST /api/v1/driver/register/
✅ POST /api/v1/driver/login/
✅ POST /api/v1/driver/verify-otp/
✅ GET  /api/v1/driver/profile/<driver_id>/
✅ GET  /api/v1/driver/orders/
✅ POST /api/v1/driver/location/update/
✅ POST /api/v1/driver/pricing/set/
```

### Order Actions
```javascript
✅ POST /api/v1/driver/orders/<order_id>/confirm/
✅ POST /api/v1/driver/orders/<order_id>/cancel/
✅ POST /api/v1/driver/orders/<order_id>/delivered/
```

---

## 🚀 Quick Start Usage

### Method 1: Using the Hook (Recommended)
```javascript
import useDriverApi from '../hooks/useDriverApi';

const MyComponent = () => {
  const { getOrders, confirmOrder, loading, error } = useDriverApi();
  
  const handleConfirm = async (orderId) => {
    const result = await confirmOrder(orderId);
    if (result.success) {
      Alert.alert("Success!");
    }
  };
  
  return (
    <>
      {loading && <ActivityIndicator />}
      {error && <Text>Error: {error}</Text>}
      <Button title="Confirm" onPress={() => handleConfirm('123')} />
    </>
  );
};
```

### Method 2: Direct API Import
```javascript
import driverApi from '../services/driverApi';
import { useDriverAuth } from '../DriverAuthContext';

const MyComponent = () => {
  const { authToken } = useDriverAuth();
  
  const handleConfirm = async (orderId) => {
    const result = await driverApi.confirmOrder(orderId, authToken);
    if (result.success) {
      console.log("Success:", result.data);
    } else {
      console.error("Error:", result.error);
    }
  };
  
  return <Button title="Confirm" onPress={() => handleConfirm('123')} />;
};
```

### Method 3: Using Context Method
```javascript
import { useDriverAuth } from '../DriverAuthContext';

const MyComponent = () => {
  const { fetchDriverAPI } = useDriverAuth();
  
  const fetchOrders = async () => {
    try {
      const orders = await fetchDriverAPI("/api/v1/driver/orders/");
      console.log(orders);
    } catch (error) {
      console.error(error);
    }
  };
  
  return <Button title="Fetch" onPress={fetchOrders} />;
};
```

---

## 📦 File Structure

```
luminandriver/
├── services/
│   └── driverApi.js           # Core API service
├── hooks/
│   └── useDriverApi.js        # Custom hook
├── screens/
│   ├── RegisterScreen.js      # Uses auth APIs
│   ├── OtpVerificationScreen.js # Uses OTP API
│   ├── OrdersScreen.js        # Lists orders
│   ├── OrderDetailsScreen.js  # Order actions
│   ├── HomeScreen.js          # Dashboard
│   └── SettingsScreen.js      # Settings & pricing
├── DriverAuthContext.js       # Enhanced context
├── API_INTEGRATION_GUIDE.md   # Detailed guide
└── API_SUMMARY.md            # This file
```

---

## 🔧 Configuration

### Update Backend URL

In `services/driverApi.js`, change:
```javascript
const BACKEND_URL = "http://localhost:8000";
```

To your production URL:
```javascript
const BACKEND_URL = "https://api.luminan.co.zw";
```

Or use environment variables:
```javascript
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
```

---

## 🎨 Response Format

All API functions return a consistent format:

### Success Response
```javascript
{
  success: true,
  data: {
    // Response data here
  }
}
```

### Error Response
```javascript
{
  success: false,
  error: "Error message here"
}
```

---

## 💡 Best Practices

### 1. Always Check Success
```javascript
const result = await driverApi.getOrders(authToken);
if (result.success) {
  // Use result.data
} else {
  // Handle result.error
}
```

### 2. Use Loading States
```javascript
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  setLoading(true);
  const result = await driverApi.getOrders(authToken);
  setLoading(false);
  
  if (result.success) {
    setData(result.data);
  }
};
```

### 3. Show User Feedback
```javascript
const handleAction = async () => {
  const result = await driverApi.confirmOrder(orderId, authToken);
  
  if (result.success) {
    Alert.alert("Success", "Order confirmed!");
  } else {
    Alert.alert("Error", result.error);
  }
};
```

### 4. Refresh After Actions
```javascript
const handleConfirm = async (orderId) => {
  const result = await driverApi.confirmOrder(orderId, authToken);
  
  if (result.success) {
    Alert.alert("Success!");
    fetchOrders(); // Refresh the list
  }
};
```

---

## 🔒 Authentication Flow

```
1. Register Driver
   ↓
2. Receive temp_driver_id
   ↓
3. Verify OTP
   ↓
4. Receive auth_token
   ↓
5. Token stored in AsyncStorage
   ↓
6. Use token for all subsequent API calls
```

### Example Flow
```javascript
// 1. Register
const regResult = await registerDriver(userData);
const tempId = regResult.temp_driver_id;

// 2. Verify OTP
const otpResult = await verifyOtp({ 
  temp_driver_id: tempId, 
  otp: "123456" 
});

// 3. Token is now stored automatically
// All future API calls will use this token

// 4. Login (returning users)
const loginResult = await loginDriver({
  identifier: "username",
  password: "password"
});
```

---

## 📱 Real-World Examples

### Example 1: Order List with Actions
```javascript
const OrdersList = () => {
  const [orders, setOrders] = useState([]);
  const { getOrders, confirmOrder, loading } = useDriverApi();
  
  useEffect(() => {
    fetchOrders();
  }, []);
  
  const fetchOrders = async () => {
    const result = await getOrders();
    if (result.success) {
      setOrders(result.data);
    }
  };
  
  const handleConfirm = async (orderId) => {
    const result = await confirmOrder(orderId);
    if (result.success) {
      Alert.alert("Success!");
      fetchOrders(); // Refresh
    }
  };
  
  return (
    <FlatList
      data={orders}
      renderItem={({ item }) => (
        <OrderItem 
          order={item} 
          onConfirm={() => handleConfirm(item.id)} 
        />
      )}
    />
  );
};
```

### Example 2: Location Tracking
```javascript
const LocationTracker = () => {
  const { updateLocation } = useDriverApi();
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const location = await Location.getCurrentPositionAsync();
      await updateLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    }, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, []);
  
  return <Text>Location tracking active</Text>;
};
```

### Example 3: Dynamic Pricing
```javascript
const PricingManager = () => {
  const [price, setPrice] = useState("");
  const { setPricing, loading } = useDriverApi();
  
  const handleUpdate = async () => {
    const result = await setPricing({ 
      price_per_kg: parseFloat(price) 
    });
    
    if (result.success) {
      Alert.alert("Price updated!");
      setPrice("");
    } else {
      Alert.alert("Error", result.error);
    }
  };
  
  return (
    <View>
      <TextInput 
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder="Enter price per kg"
      />
      <Button 
        title="Update" 
        onPress={handleUpdate}
        disabled={loading}
      />
    </View>
  );
};
```

---

## 🐛 Debugging Tips

### 1. Check Network Requests
Use React Native Debugger to inspect:
- Request URL
- Headers (especially Authorization)
- Request body
- Response status and data

### 2. Log API Responses
```javascript
const result = await driverApi.getOrders(authToken);
console.log("API Result:", JSON.stringify(result, null, 2));
```

### 3. Verify Token
```javascript
import { useDriverAuth } from '../DriverAuthContext';

const { authToken } = useDriverAuth();
console.log("Current token:", authToken);
```

### 4. Check Backend Connectivity
```javascript
const testConnection = async () => {
  try {
    const result = await driverApi.getDriverAssignedOrders(authToken);
    console.log("Backend is reachable:", result.success);
  } catch (error) {
    console.error("Backend connection failed:", error);
  }
};
```

---

## 🎯 Next Steps

1. **Update Backend URL** in `services/driverApi.js`
2. **Test Authentication** flow (register → OTP → login)
3. **Implement Location Tracking** in your app
4. **Add Order Actions** to your order screens
5. **Integrate Pricing** management
6. **Handle Errors** gracefully throughout
7. **Add Loading States** to all async operations
8. **Test on Real Device** with actual backend

---

## 📚 Additional Resources

- [React Native Documentation](https://reactnative.dev/)
- [Expo Location API](https://docs.expo.dev/versions/latest/sdk/location/)
- [React Navigation](https://reactnavigation.org/)
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/)

---

## ✅ Integration Checklist

- [x] API service created (`driverApi.js`)
- [x] Auth context updated
- [x] Custom hook created
- [x] Example screens created
- [x] Documentation written
- [ ] Backend URL configured
- [ ] Tested on real device
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] User feedback implemented

---

## 🎉 You're All Set!

All backend URLs are now integrated and ready to use. Choose your preferred method (Hook, Direct API, or Context) and start building!

For detailed examples and usage patterns, refer to `API_INTEGRATION_GUIDE.md`.

Happy coding! 🚀
