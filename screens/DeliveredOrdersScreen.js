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
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

// ---------------- Order Item Component ----------------
const OrderItem = ({ order, onPress }) => {
  const getStatusColor = (status) => {
    if (!status) return "#6b7280";
    return status.toLowerCase() === "delivered" ? "#34d399" : "#6b7280";
  };

  const getStatusIcon = (status) => {
    if (!status) return "help-circle-outline";
    return status.toLowerCase() === "delivered" ? "checkmark-done-circle-outline" : "help-circle-outline";
  };

  const customerName = order.customer_name || 'N/A';
  const orderStatus = order.order_status ? order.order_status.toUpperCase() : 'UNKNOWN';
  const quantity = order.quantity ? order.quantity.toLocaleString() : 'N/A';
  const product = Array.isArray(order.items) && order.items.length > 0 ? order.items[0] : {};
  const totalAmount = order.total_amount ? order.total_amount.toLocaleString() : (product.unit_price && product.quantity ? (product.unit_price * product.quantity).toFixed(2) : 'N/A');
  const deliveryTime = order.delivery_time ? new Date(order.delivery_time).toLocaleString() : 'N/A';

  return (
    <TouchableOpacity style={styles.orderItem} onPress={() => onPress(order)} activeOpacity={0.7}>
      <View style={styles.orderHeader}>
        <Text style={styles.customerName}>{customerName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.order_status) }]}>
          <Ionicons name={getStatusIcon(order.order_status)} size={14} color="#fff" />
          <Text style={styles.statusText}>{orderStatus}</Text>
        </View>
      </View>
      <View style={styles.orderDetails}>
        <Ionicons name="pin-outline" size={16} color="#38bdf8" />
        <Text style={styles.addressText}>{order.delivery_address || 'N/A'}</Text>
      </View>
      <View style={styles.orderDetails}>
        <Ionicons name="water-outline" size={16} color="#38bdf8" />
        <Text style={styles.detailText}>Liters: {quantity} L</Text>
      </View>
      <View style={styles.orderDetails}>
        <Ionicons name="time-outline" size={16} color="#38bdf8" />
        <Text style={styles.detailText}>Time: {deliveryTime}</Text>
      </View>
      <View style={styles.tapHint}>
        <Text style={styles.tapHintText}>Tap for details</Text>
        <Ionicons name="chevron-forward" size={16} color="#38bdf8" />
      </View>
    </TouchableOpacity>
  );
};

// ---------------- Delivered Orders Screen ----------------
const DeliveredOrdersScreen = () => {
  const navigation = useNavigation();
  const { isLoggedIn } = useDriverAuth();
  const { getOrders } = useDriverApi();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const result = await getOrders();
      if (result.success) {
        let ordersData = result.data;
        // Handle both direct array or nested { orders: [] } response formats
        const ordersArray = Array.isArray(ordersData) ? ordersData : 
                            (ordersData && Array.isArray(ordersData.orders) ? ordersData.orders : []);

        if (ordersArray.length > 0 || ordersData !== undefined) {
          setOrders(ordersArray);
        } else {
          console.error("Invalid or empty orders data:", ordersData);
          Alert.alert("Error", "Invalid data format received from server.");
          setOrders([]);
        }
      } else {
        console.error("Failed to fetch orders:", result.error);
        Alert.alert("Error", result.error || "Failed to load orders.");
        setOrders([]);
      }
    } catch (error) {
      console.error("Failed to fetch orders (network/API call):", error);
      Alert.alert("Error", "Failed to load orders. Check network connection.");
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const deliveredOrders = (orders || []).filter(order =>
    order && order.order_status &&
    order.order_status.toLowerCase().trim() === "delivered"
  );

  const handleOrderPress = (order) => {
    const id = order.order_id || order._id || order.id;
    if (!id) {
      console.warn("Order missing id:", order);
      Alert.alert("Error", "Cannot view details for this order.");
      return;
    }
    // **FIXED NAVIGATION:** Pass the full 'order' object to OrderDetailsScreen
    navigation.navigate("OrderDetails", { order: order }); 
  };

  if (loading) {
    return (
      <LinearGradient colors={["#0f172a", "#1e293b", "#0f172a"]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={{ color: '#fff', marginTop: 10 }}>Loading Delivered Orders...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#0f172a", "#1e293b", "#0f172a"]}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#38bdf8"
          />
        }
      >
        <Text style={styles.headerTitle}>Delivered Orders ({deliveredOrders.length})</Text>

        {deliveredOrders.length > 0 ? (
          deliveredOrders.map((order, index) => (
            <OrderItem 
              key={order._id || order.id || index} 
              order={order} 
              onPress={handleOrderPress} 
            />
          ))
        ) : (
          <Text style={styles.noOrdersText}>No delivered orders.</Text>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

export default DeliveredOrdersScreen;

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  customerName: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  orderDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  addressText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  detailText: {
    color: '#ccc',
    fontSize: 13,
    marginLeft: 8,
  },
  noOrdersText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  tapHintText: {
    color: '#38bdf8',
    fontSize: 12,
    marginRight: 4,
  },
});