import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
  Dimensions,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDriverAuth } from "../DriverAuthContext";

const { width } = Dimensions.get("window");

const STATUS_CATEGORIES = [
  { key: "pending", label: "Pending", color: "#facc15" },
  { key: "confirmed", label: "Confirmed", color: "#22c55e" },
  { key: "delivered", label: "Delivered", color: "#00eaff" },
  { key: "cancelled", label: "Cancelled", color: "#ff6b6b" },
];

const STATUS_ACTIONS = {
  pending: { label: "Confirm", action: "confirm", color: "#0ea5e9" },
  confirmed: { label: "Mark Delivered", action: "delivered", color: "#22c55e" },
};

const HomeScreen = () => {
  const { authToken } = useDriverAuth();
  const [orders, setOrders] = useState([]);
  const [groupedOrders, setGroupedOrders] = useState({});
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    if (!authToken) return setLoading(false);
    setLoading(true);

    try {
      const res = await fetch("https://backend-luminan.onrender.com/driver/orders/", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      const ordersData = data.orders || [];

      setOrders(ordersData);

      // Group orders by status
      const grouped = STATUS_CATEGORIES.reduce((acc, status) => {
        acc[status.key] = ordersData.filter(o => o.order_status === status.key);
        return acc;
      }, {});
      setGroupedOrders(grouped);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to fetch orders.");
      setOrders([]);
      setGroupedOrders({ pending: [], confirmed: [], delivered: [], cancelled: [] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleOrderPress = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const handleAction = async (action) => {
    if (!selectedOrder?.order_id) return Alert.alert("Action unavailable");

    try {
      const API_URL = `https://backend-luminan.onrender.com/driver/orders/${selectedOrder.order_id}/${action}/`;
      const res = await fetch(API_URL, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: action === "cancel" ? JSON.stringify({ reason: "Cancelled by driver" }) : undefined,
      });

      if (!res.ok) throw new Error("Action failed");
      fetchOrders();
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setModalVisible(false);
    }
  };

  const renderStatusCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.statusCard, selectedStatus === item.key && { borderWidth: 2, borderColor: item.color }]}
      onPress={() => setSelectedStatus(item.key)}
    >
      <View style={[styles.statusIndicator, { backgroundColor: item.color }]} />
      <Text style={styles.statusLabel}>{item.label}</Text>
      <Text style={styles.statusCount}>{groupedOrders[item.key]?.length || 0}</Text>
    </TouchableOpacity>
  );

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity style={styles.orderItem} onPress={() => handleOrderPress(item)}>
      <View style={styles.orderInfo}>
        <Text style={styles.orderCustomer}>{item.customer_name || item.customer?.name || "Unknown"}</Text>
        <Text style={styles.orderLocation}>{item.delivery_address || "Unknown"}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#888" />
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={["#0a0e27", "#16213e", "#1a2332"]} style={styles.container}>
      {/* Status Cards */}
      <View style={styles.statusScrollContainer}>
        <FlatList
          data={STATUS_CATEGORIES}
          renderItem={renderStatusCard}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Orders List */}
      <View style={styles.ordersContainer}>
        <Text style={styles.ordersTitle}>
          {STATUS_CATEGORIES.find((s) => s.key === selectedStatus)?.label} Orders
        </Text>
        {loading ? (
          <ActivityIndicator size="large" color="#00eaff" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={groupedOrders[selectedStatus] || []}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.order_id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            ListEmptyComponent={<Text style={styles.emptyText}>No orders in this status.</Text>}
          />
        )}
      </View>

      {/* Order Details Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedOrder && (
              <>
                <Text style={styles.modalTitle}>Order Details</Text>

                <Text style={styles.detailLabel}>Customer Name:</Text>
                <Text style={styles.detailValue}>{selectedOrder.customer?.name || selectedOrder.customer_name || "N/A"}</Text>

                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={styles.detailValue}>{selectedOrder.customer?.email || selectedOrder.customer_email || "N/A"}</Text>

                <Text style={styles.detailLabel}>Phone:</Text>
                <TouchableOpacity
                  onPress={() => {
                    const phone = selectedOrder.customer?.phone || selectedOrder.customer_phone;
                    if (phone && phone.trim() !== "") Linking.openURL(`tel:${phone}`);
                    else Alert.alert("Phone number not available");
                  }}
                >
                  <Text style={[styles.detailValue, { color: "#00eaff", textDecorationLine: "underline" }]}>
                    {selectedOrder.customer?.phone || selectedOrder.customer_phone || "Not available"}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.detailLabel}>Delivery Address:</Text>
                <Text style={styles.detailValue}>{selectedOrder.delivery_address || "N/A"}</Text>

                <Text style={styles.detailLabel}>Notes:</Text>
                <Text style={styles.detailValue}>{selectedOrder.notes || "None"}</Text>

                <Text style={styles.detailLabel}>Payment Method:</Text>
                <Text style={styles.detailValue}>{selectedOrder.payment_method || "Not specified"}</Text>

                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={styles.detailValue}>{selectedOrder.order_status || "Unknown"}</Text>

                <Text style={styles.detailLabel}>Total Price:</Text>
                <Text style={styles.detailValue}>
                  {selectedOrder.total_price != null
                    ? `$${selectedOrder.total_price.toFixed(2)}`
                    : "Pending"}
                </Text>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  {STATUS_ACTIONS[selectedOrder.order_status] && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: STATUS_ACTIONS[selectedOrder.order_status].color }]}
                      onPress={() => handleAction(STATUS_ACTIONS[selectedOrder.order_status].action)}
                    >
                      <Text style={styles.actionText}>
                        {STATUS_ACTIONS[selectedOrder.order_status].label}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {selectedOrder.order_status !== "delivered" &&
                    selectedOrder.order_status !== "cancelled" && (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: "#ff6b6b" }]}
                        onPress={() => handleAction("cancel")}
                      >
                        <Text style={styles.actionText}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={{ color: "#00eaff", textAlign: "center", marginTop: 12 }}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusScrollContainer: { marginBottom: 10 },
  statusCard: {
    width: width * 0.28,
    height: 80,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  statusIndicator: { width: 16, height: 16, borderRadius: 8, marginBottom: 6 },
  statusLabel: { color: "#fff", fontSize: 16, fontWeight: "bold", marginBottom: 2 },
  statusCount: { color: "#00eaff", fontSize: 18, fontWeight: "bold" },
  ordersContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  ordersTitle: { color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderInfo: { flex: 1 },
  orderCustomer: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 2 },
  orderLocation: { color: "#e5e7eb", fontSize: 16, marginBottom: 2 },
  emptyText: { color: "#888", fontSize: 16, textAlign: "center", marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: {
    backgroundColor: "#1a2332",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: { color: "#00eaff", fontSize: 24, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  modalActions: { flexDirection: "row", justifyContent: "space-around", marginTop: 18, marginBottom: 10 },
  actionButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, marginHorizontal: 5 },
  actionText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  detailLabel: { color: "#ccc", fontWeight: "bold", marginTop: 10, fontSize: 14 },
  detailValue: { color: "#fff", fontSize: 16, marginBottom: 4 },
});