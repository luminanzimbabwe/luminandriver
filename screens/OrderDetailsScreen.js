import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDriverAuth } from "../DriverAuthContext";

// =========================================================================
// !!! CRITICAL: REMINDER TO CHECK YOUR BASE_URL !!!
// If running on Android emulator, CHANGE 'localhost' to '10.0.2.2'.
// If running on a physical device, CHANGE 'localhost' to your local IP.
// =========================================================================
const BASE_URL = "http://localhost:8000/api/v1/driver/orders/"; 

const OrderDetailsScreen = ({ route, navigation }) => {
  const { driver } = useDriverAuth(); // 👈 Call the hook here!
  
  const { order: passedOrder } = route.params;
  
  // Prioritize 'order_id' as seen in the Django response
  const orderId = passedOrder?.order_id || passedOrder?._id || passedOrder?.id;

  const [order, setOrder] = useState(passedOrder || null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Custom Confirmation Modal States
  const [deliveredModalVisible, setDeliveredModalVisible] = useState(false); 
  const [confirmModalVisible, setConfirmModalVisible] = useState(false); // 🌟 NEW STATE

  // EXTRA LOG: Check component mount and initial order data
  useEffect(() => {
    console.log("--- OrderDetailsScreen Mounted ---");
    console.log("Current Order ID calculated as:", orderId); 
    console.log("Current Order Status:", order?.order_status);
  }, [orderId, order?.order_status]);

  if (!order) {
    // Basic null check fallback
    return (
        <View style={[styles.container, styles.loadingContainer]}>
            <Text style={styles.errorText}>Order data not available.</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
        </View>
    );
  }

  // Helper function for network requests
  /**
 * Helper function for network requests
 * @param {string} actionEndpoint - The final segment of the URL (e.g., 'confirm', 'delivered')
 * @param {string} successStatus - The status string to set locally on success
 * @param {string} successMessage - The message to show in the success alert
 * @param {object} payload - The body data to send, typically { driver_id: '...' }
 */
const executeOrderAction = async (actionEndpoint, successStatus, successMessage, payload = {}) => {
  setActionLoading(true);
  
  const endpointUrl = `${BASE_URL}${orderId}/${actionEndpoint}/`;
  console.log(`DEBUG: Target URL for ${successStatus}:`, endpointUrl); 
  // Optionally log the payload being sent for debugging
  console.log(`DEBUG: Payload for ${actionEndpoint}:`, payload); 

  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      
      // 👇 CRITICAL FIX: Add Content-Type header for JSON body
      headers: { 
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE', // Add Authorization if needed
      },
      
      // 👇 CRITICAL FIX: Send the payload as the request body
      body: JSON.stringify(payload), 
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      let errorData = {};
      
      try { errorData = JSON.parse(errorText); } catch (e) { /* not JSON */ }
      
      console.error(`NETWORK ERROR: Status ${status}. Response:`, errorData || errorText);

      const message = errorData.error || errorData.detail || errorText || `Failed with HTTP status: ${status}`;
      throw new Error(message);
    }

    const result = await response.json().catch(() => ({}));
    console.log(`${successStatus} success:`, result);

    // Update local state and show final success alert
    setOrder((prev) => ({ ...prev, order_status: successStatus }));
    Alert.alert("Success", successMessage);
    
    // Optionally, navigate back to trigger a list refresh on the previous screen
    // navigation.goBack();

  } catch (error) {
    console.error("FETCH/NETWORK CATCH ERROR:", error);
    Alert.alert("Error", error.message || `Failed to ${successStatus}. Check network connection and server IP.`);
  } finally {
    setActionLoading(false);
    console.log("DEBUG: Action finished. Loading state set to false.");
  }
};
  
  // ---------------- Network Handler: Mark as Delivered ----------------
  const executeMarkAsDelivered = () => {
    setDeliveredModalVisible(false); // Close modal
    executeOrderAction("delivered", "delivered", "Order marked as delivered!");
  };

  // ---------------- Network Handler: Confirm Order (Accept) ----------------
  // ---------------- Network Handler: Confirm Order (Accept) ----------------
const executeConfirmOrder = () => {
  setConfirmModalVisible(false); // Close modal
  
  // 🚨 CRITICAL FIX: Ensure driver ID is available
  if (!driver?._id) {
    Alert.alert("Error", "Driver session expired. Please re-login.");
    return;
  }
  
  // Assuming the backend endpoint for confirmation/acceptance is "confirm/"
  // 🎯 FIX: Pass the required driver_id in the 4th argument (payload)
  executeOrderAction(
    "confirm", 
    "confirmed", 
    "Order successfully confirmed (accepted)!",
    { driver_id: driver._id } // 👈 THIS IS THE FIX
  ); 
};
// ---------------- END Network Handlers ----------------

  // ---------------- Button Handler: Mark as Delivered (Triggers Modal) ----------------
  const handleMarkAsDelivered = () => {
    if (!orderId) { return Alert.alert("Error", "Order ID missing"); }
    setDeliveredModalVisible(true);
  };
  // ---------------- Button Handler: Confirm Order (Triggers Modal) ----------------
  const handleConfirmOrder = () => {
    if (!orderId) { return Alert.alert("Error", "Order ID missing"); }
    setConfirmModalVisible(true);
  };
  // ---------------- END Button Handlers ----------------

  // ---------------- Status Logic ----------------
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending": 
      case "assigned":
        return "#fbbf24"; // Yellow for pending/new
      case "confirmed":
      case "accepted":
      case "picked_up":
      case "in_transit":
        return "#38bdf8"; // Blue for accepted/in-progress
      case "delivered": 
        return "#10b981"; // Green for completion
      case "cancelled": 
      case "rejected":
        return "#f87171"; // Red for cancellation
      default: return "#6b7280";
    }
  };

  const customer = order.customer || {};
  const product = Array.isArray(order.items) && order.items.length > 0 ? order.items[0] : {};
  
  // Determine which actions are available based on current status
  const isPendingActionAvailable = ["pending", "assigned"].includes(order.order_status?.toLowerCase());
  const isDeliveryActionAvailable = ["confirmed", "accepted", "picked_up", "in_transit"].includes(order.order_status?.toLowerCase());

  return (
    <LinearGradient colors={["#0f172a", "#1e293b", "#0f172a"]} style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header and Info Blocks (Unchanged) */}

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.order_status) }]}>
          <Text style={styles.statusText}>{order.order_status?.toUpperCase()}</Text>
        </View>

        {/* --- Order Info --- */}
        <View style={styles.card}><Text style={styles.cardTitle}>Order Information</Text>
          <InfoRow label="Order ID:" value={order.order_id || orderId} />
          <InfoRow label="Status:" value={order.order_status} />
          <InfoRow label="Payment Status:" value={order.payment_status} />
          <InfoRow label="Payment Method:" value={order.payment_method} />
          <InfoRow label="Delivery Type:" value={order.delivery_type} />
          <InfoRow label="Notes:" value={order.notes || "N/A"} />
        </View>

        {/* --- Customer Info --- */}
        <View style={styles.card}><Text style={styles.cardTitle}>Customer Information</Text>
          <InfoRow label="Customer ID:" value={order.customer_id || "N/A"} />
          <InfoRow label="Name:" value={customer.name || "N/A"} />
          <InfoRow label="Phone:" value={customer.phone || "N/A"} />
          <InfoRow label="Email:" value={customer.email || "N/A"} />
        </View>

        {/* --- Product Info --- */}
        <View style={styles.card}><Text style={styles.cardTitle}>Product Information</Text>
          <InfoRow label="Product ID:" value={product.product_id || "N/A"} />
          <InfoRow label="Name:" value={product.name || "N/A"} />
          <InfoRow label="Quantity:" value={product.quantity || 0} />
          <InfoRow label="Weight:" value={`${product.weight || 0} kg`} />
          <InfoRow label="Unit Price:" value={`$${product.unit_price || 0}`} />
        </View>

        {/* --- Delivery Info --- */}
        <View style={styles.card}><Text style={styles.cardTitle}>Delivery Details</Text>
          <InfoRow label="Address:" value={order.delivery_address || "N/A"} />
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          
          {/* 🌟 NEW BUTTON: Confirm Order (for Pending/Assigned) */}
          {isPendingActionAvailable && (
            <ActionButton
              label="Confirm Order (Accept)"
              onPress={handleConfirmOrder}
              color="#fbbf24" // Yellow/Amber for acceptance
              disabled={actionLoading}
            />
          )}

          {/* Existing Button: Mark as Delivered (for Confirmed/In-Transit) */}
          {isDeliveryActionAvailable && (
            <ActionButton
              label="Mark as Delivered"
              onPress={handleMarkAsDelivered}
              color="#10b981" // Green for delivery
              disabled={actionLoading}
            />
          )}
          
          {/* No Actions Text */}
          {["cancelled", "delivered"].includes(order.order_status?.toLowerCase()) && (
            <Text style={styles.noActionsText}>No actions available for this order.</Text>
          )}
        </View>
      </ScrollView>

      {/* ---------------- 1. Confirm Order (Accept) Modal ---------------- */}
      <Modal
        transparent
        animationType="fade"
        visible={confirmModalVisible} 
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.confirmationBox}>
            <Text style={styles.modalTitle}>Confirm Order Acceptance</Text>
            <Text style={styles.modalMessage}>Are you sure you want to accept and confirm this order?</Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.acceptButton]} // Custom style for accept button
                onPress={executeConfirmOrder} // Calls the new network function
              >
                <Text style={styles.actionButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------------- 2. Mark as Delivered Modal (Existing Logic) ---------------- */}
      <Modal
        transparent
        animationType="fade"
        visible={deliveredModalVisible} 
        onRequestClose={() => setDeliveredModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.confirmationBox}>
            <Text style={styles.modalTitle}>Mark as Delivered</Text>
            <Text style={styles.modalMessage}>Are you sure you want to mark this order as delivered?</Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setDeliveredModalVisible(false)}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.deliveredButton]} // Changed from 'confirmButton' for clarity
                onPress={executeMarkAsDelivered} // Calls the network function
              >
                <Text style={styles.actionButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-Screen Loading Overlay (for network call) */}
      {actionLoading && (
        <Modal transparent animationType="fade">
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.overlayText}>Processing...</Text>
          </View>
        </Modal>
      )}
    </LinearGradient>
  );
};

// ---------------- Components ----------------
const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const ActionButton = ({ label, onPress, color, disabled }) => (
  <TouchableOpacity
    style={[styles.actionButton, { backgroundColor: color, opacity: disabled ? 0.6 : 1 }]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={styles.actionButtonText}>{label}</Text>
  </TouchableOpacity>
);

export default OrderDetailsScreen;

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  scrollContent: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "#f87171", fontSize: 18, marginBottom: 20 },
  backButton: { backgroundColor: "#38bdf8", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  backBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  statusBadge: { alignSelf: "center", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginBottom: 20 },
  statusText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  card: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 15, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 15, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)", paddingBottom: 8 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  infoLabel: { color: "#ccc", fontSize: 14, fontWeight: "600" },
  infoValue: { color: "#fff", fontSize: 14, fontWeight: "500" },
  actionsContainer: { marginTop: 10, marginBottom: 30 },
  actionButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 15, borderRadius: 12, marginBottom: 15 },
  actionButtonText: { color: "#0f172a", fontSize: 16, fontWeight: "bold" }, // Changed text color to dark for better contrast on colored buttons
  noActionsText: { color: "#888", fontSize: 14, textAlign: "center", marginTop: 10 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  overlayText: { color: "#fff", marginTop: 10, fontSize: 16 },
  
  // --- STYLES FOR CONFIRMATION MODAL ---
  confirmationBox: {
    backgroundColor: '#1e293b',
    borderRadius: 15,
    padding: 25,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6b7280', // Gray
  },
  deliveredButton: { // Style for the 'Mark as Delivered' confirmation button
    backgroundColor: '#10b981', // Green
  },
  acceptButton: { // Style for the 'Confirm Order' acceptance button
    backgroundColor: '#fbbf24', // Amber/Yellow
  },
});