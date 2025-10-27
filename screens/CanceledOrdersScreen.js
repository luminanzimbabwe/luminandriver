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

const OrderItem = ({ order, onPress }) => {
  const getStatusColor = (status) => {
    if (!status) return "#6b7280";
    switch (status.toLowerCase()) {
      case "completed":
        return "#34d399";
      case "pending":
        return "#fbbf24";
      case "cancelled":
        return "#f87171";
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status) => {
    if (!status) return "help-circle-outline";
    switch (status.toLowerCase()) {
      case "completed":
        return "checkmark-circle-outline";
      case "pending":
        return "time-outline";
      case "cancelled":
        return "close-circle-outline";
      default:
        return "help-circle-outline";
    }
  };

  return (
    <TouchableOpacity style={styles.orderItem} onPress={() => onPress(order)} activeOpacity={0.7}>
      <View style={styles.orderHeader}>
        <Text style={styles.customerName}>{order.customer_name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.order_status) }]}>
          <Ionicons name={getStatusIcon(order.order_status)} size={14} color="#fff" />
          <Text style={styles.statusText}>{order.order_status ? order.order_status.toUpperCase() : 'UNKNOWN'}</Text>
        </View>
      </View>
      <View style={styles.orderDetails}>
        <Ionicons name="pin-outline" size={16} color="#38bdf8" />
        <Text style={styles.addressText}>{order.delivery_address}</Text>
      </View>
      <View style={styles.orderDetails}>
        <Ionicons name="water-outline" size={16} color="#38bdf8" />
        <Text style={styles.detailText}>Liters: {order.quantity ? order.quantity.toLocaleString() : 'N/A'} L</Text>
      </View>
      <View style={styles.orderDetails}>
        <Ionicons name="time-outline" size={16} color="#38bdf8" />
        <Text style={styles.detailText}>
          Time: {order.delivery_time ? new Date(order.delivery_time).toLocaleString() : 'N/A'}
        </Text>
      </View>
      <View style={styles.orderDetails}>
        <Ionicons name="cash-outline" size={16} color="#fbbf24" />
        <Text style={styles.detailText}>Amount: ${order.total_amount ? order.total_amount.toLocaleString() : 'N/A'}</Text>
      </View>
      <View style={styles.tapHint}>
        <Text style={styles.tapHintText}>Tap for details</Text>
        <Ionicons name="chevron-forward" size={16} color="#38bdf8" />
      </View>
    </TouchableOpacity>
  );
};

const CanceledOrdersScreen = () => {
  const navigation = useNavigation();
  const { driver, isLoggedIn } = useDriverAuth();
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
        if (Array.isArray(ordersData)) {
          setOrders(ordersData);
        } else if (ordersData && Array.isArray(ordersData.orders)) {
          setOrders(ordersData.orders);
        } else {
          console.error("Invalid orders data format:", ordersData);
          Alert.alert("Error", "Invalid data format received from server.");
          setOrders([]);
        }
      } else {
        console.error("Failed to fetch orders:", result.error);
        Alert.alert("Error", result.error || "Failed to load orders.");
        setOrders([]);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      Alert.alert("Error", "Failed to load orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  };

  const canceledOrders = (orders || []).filter(order =>
    order && order.order_status &&
    (order.order_status.toLowerCase().trim() === "cancelled" ||
     order.order_status.toLowerCase().trim() === "rejected")
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Loading Canceled Orders...</Text>
      </View>
    );
  }

  const handleOrderPress = (order) => {
    const id = order.order_id || order._id || order.id;
    if (!id) {
      console.warn("Order missing id:", order);
      Alert.alert("Error", "Cannot view details for this order.");
      return;
    }
    navigation.navigate("OrderDetails", { orderId: id });
  };

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
        <Text style={styles.headerTitle}>Canceled Orders ({canceledOrders.length})</Text>

        {canceledOrders.length > 0 ? (
          canceledOrders.map((order, index) => <OrderItem key={order._id || order.id || index} order={order} onPress={handleOrderPress} />)
        ) : (
          <Text style={styles.noOrdersText}>No canceled orders.</Text>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

export default CanceledOrdersScreen;

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
