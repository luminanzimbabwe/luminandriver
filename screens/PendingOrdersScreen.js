import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDriverAuth } from "../DriverAuthContext";
import { useDriverApi } from "../hooks/useDriverApi";
import driverApi from "../services/driverApi";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

// =========================================================================
// NOTE: Keep BASE_URL in sync with OrderDetailsScreen.cs - points to
// /api/v1/driver/orders/{orderId}/{action}/
// =========================================================================
const BASE_URL = "https://backend-luminan.onrender.com/api/v1/driver/orders/";

// Helper to safely parse amount (copied from previous logic for consistency)
const safeParseAmount = (amount) => {
    if (typeof amount === 'number') {
        return amount;
    }
    if (typeof amount === 'string') {
        const parsed = parseFloat(amount.replace(/[^0-9.]+/g,""));
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};


// ---------------- Order Item Component ----------------
const OrderItem = ({ order, onPress, onConfirm }) => {
  const isPending = order?.order_status?.toLowerCase().trim() === "pending" ||
                    order?.order_status?.toLowerCase().trim() === "assigned";

  const getStatusColor = (status) => {
    if (!status) return "#6b7280";
    switch (status.toLowerCase()) {
      case "delivered":
        return "#34d399";
      case "pending":
      case "assigned":
        return "#fbbf24"; // Highlight pending/assigned orders
      case "confirmed":
      case "accepted":
      case "picked_up":
      case "in_transit":
        return "#38bdf8"; // Highlight in-progress confirmed orders
      case "cancelled":
      case "rejected":
        return "#f87171";
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status) => {
    if (!status) return "help-circle-outline";
    switch (status.toLowerCase()) {
      case "delivered":
        return "checkmark-circle-outline";
      case "pending":
      case "assigned":
        return "time-outline";
      case "confirmed":
      case "accepted":
      case "picked_up":
      case "in_transit":
        return "sync-outline";
      case "cancelled":
      case "rejected":
        return "close-circle-outline";
      default:
        return "help-circle-outline";
    }
  };
    
  const displayAmount = safeParseAmount(order.total_amount || order.total_price).toFixed(2);


  return (
    <TouchableOpacity
      style={styles.orderItem}
      onPress={() => onPress(order)}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.customerName}>{order.customer_name || "N/A"}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(order.order_status) },
          ]}
        >
          <Ionicons
            name={getStatusIcon(order.order_status)}
            size={14}
            color="#fff"
          />
          <Text style={styles.statusText}>
            {order.order_status ? order.order_status.toUpperCase() : "UNKNOWN"}
          </Text>
        </View>
      </View>

      {/* Order Details (Address, Liters, Time, Amount) */}
      <View style={styles.orderDetails}>
        <Ionicons name="pin-outline" size={16} color="#38bdf8" />
        <Text style={styles.addressText}>{order.delivery_address || "N/A"}</Text>
      </View>

      <View style={styles.orderDetails}>
        <Ionicons name="water-outline" size={16} color="#38bdf8" />
        <Text style={styles.detailText}>
          Liters: {order.quantity ? order.quantity.toLocaleString() : "N/A"} L
        </Text>
      </View>
      
      <View style={styles.orderDetails}>
        <Ionicons name="cash-outline" size={16} color="#fbbf24" />
        <Text style={styles.detailText}>
          Amount: ${displayAmount}
        </Text>
      </View>

      {/* Action Buttons / Tap Hint */}
      <View style={styles.actionRow}>
        
        {/* Confirms the order only if it is in 'pending' or 'assigned' status */}
        {isPending && onConfirm && (
            <TouchableOpacity 
                style={styles.confirmButton} 
                onPress={(e) => {
                    e.stopPropagation(); // Prevent the main TouchableOpacity from firing
                    onConfirm(order);
                }}
            >
                <Ionicons name="hand-right-outline" size={18} color="#0f172a" />
                <Text style={styles.confirmButtonText}>CONFIRM ORDER</Text>
            </TouchableOpacity>
        )}
        
        {/* Tap hint for detailed view */}
        <TouchableOpacity style={styles.tapHint} onPress={() => onPress(order)}>
          <Text style={styles.tapHintText}>Tap for details</Text>
          <Ionicons name="chevron-forward" size={16} color="#38bdf8" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ---------------- Pending Orders Screen ----------------
const PendingOrdersScreen = () => {
  const navigation = useNavigation();
  const { driver, isLoggedIn } = useDriverAuth();
  // Assume useDriverApi provides getOrders; we will POST directly for confirm
  const { getOrders } = useDriverApi(); 
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Use useCallback for fetchOrders to ensure stability in useEffect
  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await getOrders();
      if (result.success) {
        const ordersData = Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.data.orders)
          ? result.data.orders
          : [];
        setOrders(ordersData);
      } else {
        Alert.alert("Error", result.error || "Failed to load orders.");
        setOrders([]);
      }
    } catch (error) {
      console.error("Fetch orders failed:", error);
      Alert.alert("Error", "Failed to load orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [getOrders]); // Dependency: getOrders

  useFocusEffect(
    React.useCallback(() => {
      if (isLoggedIn) fetchOrders();
      else setLoading(false);
    }, [isLoggedIn, fetchOrders])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  };

  const handleOrderPress = (order) => {
    const id = order.order_id || order._id || order.id;
    if (!id) {
      console.warn("Order missing id:", order);
      Alert.alert("Error", "Cannot view details for this order.");
      return;
    }
    // FIX: Pass the entire order object to prevent OrderDetailsScreen crash
    navigation.navigate("OrderDetails", { order: order });
  };
  
  // 🚀 NEW LOGIC: Function to confirm the order and refresh the list
  const handleConfirmOrder = async (order) => {
    const orderId = order.order_id || order._id || order.id;
    if (!orderId) {
        Alert.alert("Error", "Order ID missing.");
        return;
    }

    Alert.alert(
        "Confirm Order",
        `Are you sure you want to confirm order ${orderId}? This will mark it as accepted by you.`,
        [
            { text: "Cancel", style: "cancel" },
            {
                text: "Confirm",
        onPress: async () => {
          setLoading(true);
            try {
            // Require a driver id (any of the common fields)
            const driverId = (typeof driver === 'object') && (driver._id || driver.id || driver.temp_driver_id);
            if (!driverId) {
              Alert.alert("Error", "Driver ID missing. Please re-login.");
              return;
            }

            // Validate driver exists on the backend first
            const profileCheck = await driverApi.getDriverProfile(driverId);
            if (!profileCheck.success) {
              const msg = profileCheck.error || "Driver not found. Please re-login or verify your account.";
              console.warn("DEBUG: Driver profile check failed:", profileCheck);
              Alert.alert(
                "Driver not found",
                msg,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Register", onPress: () => navigation.navigate("Register") },
                ],
                { cancelable: true }
              );
              return;
            }

            // Proceed to confirm with the driver_id
            const endpoint = `${BASE_URL}${orderId}/confirm/`;
            console.log("DEBUG: Confirming order", orderId, "endpoint:", endpoint, "payload:", { driver_id: driverId });

            const resp = await fetch(endpoint, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ driver_id: driverId }),
            });

            const text = await resp.text();
            let data = {};
            try { data = JSON.parse(text); } catch (e) { data = { message: text }; }

            if (!resp.ok) {
              const msg = data.error || data.message || `Failed with status ${resp.status}`;
              Alert.alert("Error", msg);
            } else {
              const message = data.message || `Order ${orderId} confirmed!`;
              Alert.alert("Success", message);
              await fetchOrders();
            }
          } catch (error) {
            console.error("Confirm order API failed:", error);
            Alert.alert("Error", "Network error. Failed to confirm order.");
          } finally {
            setLoading(false);
          }
        }
            }
        ]
    );
  };


  // Filter pending orders (including 'assigned')
  const pendingOrders = (orders || []).filter(
    (order) =>
      order &&
      order.order_status &&
      (order.order_status.toLowerCase().trim() === "pending" ||
        order.order_status.toLowerCase().trim() === "assigned")
  );

  if (loading) {
    return (
      <View
        style={[styles.container, { justifyContent: "center", alignItems: "center" }]}
      >
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={{ color: "#fff", marginTop: 10 }}>Loading Pending Orders...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#0f172a", "#1e293b", "#0f172a"]} style={styles.container}>
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />
        }
      >
        <Text style={styles.headerTitle}>Pending Orders ({pendingOrders.length})</Text>

        {pendingOrders.length > 0 ? (
          pendingOrders.map((order, index) => (
            <OrderItem 
                key={order._id || order.id || index} 
                order={order} 
                onPress={handleOrderPress} 
                onConfirm={handleConfirmOrder} // Pass the new confirm handler
            />
          ))
        ) : (
          <Text style={styles.noOrdersText}>No pending orders.</Text>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

export default PendingOrdersScreen;

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  scrollContent: { flex: 1, paddingHorizontal: 20 },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  orderItem: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  customerName: { color: "#38bdf8", fontSize: 16, fontWeight: "bold" },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: "#fff", fontSize: 10, fontWeight: "bold", marginLeft: 4 },
  orderDetails: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  addressText: { color: "#fff", fontSize: 14, marginLeft: 8, flex: 1 },
  detailText: { color: "#ccc", fontSize: 13, marginLeft: 8 },
  noOrdersText: { color: "#888", fontSize: 14, textAlign: "center", marginTop: 10 },
  // 🚀 NEW STYLES
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34d399', // Green color for confirmation
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  confirmButtonText: {
    color: '#0f172a', // Dark text for contrast
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  tapHint: { 
    flexDirection: "row", 
    alignItems: "center", 
    // Removed borderTop from here and moved it to actionRow
  },
  tapHintText: { color: "#38bdf8", fontSize: 12, marginRight: 4 },
});