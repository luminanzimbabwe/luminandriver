import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useDriverAuth } from "../DriverAuthContext";
import { useDriverApi } from "../hooks/useDriverApi";

const { width } = Dimensions.get("window");



// --- Helper Components ---

const StatusToggle = ({ isOnline, toggleStatus }) => (
  <TouchableOpacity
    style={[
      styles.statusToggle,
      { 
        backgroundColor: isOnline ? "#059669" : "#dc2626",
        shadowColor: isOnline ? "#059669" : "#dc2626",
      },
    ]}
    onPress={toggleStatus}
  >
    <Ionicons
      name={isOnline ? "flash" : "power-outline"}
      size={20}
      color="#fff"
      style={{ marginRight: 8 }}
    />
    <Text style={styles.statusText}>
      {isOnline ? "ACTIVE" : "OFFLINE"}
    </Text>
  </TouchableOpacity>
);

const MetricsCard = ({ label, value, icon, color }) => (
  <View style={styles.metricCard}>
    <Ionicons name={icon} size={24} color={color} />
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
  </View>
);

const FuelIndicator = ({ fuelLevel }) => {
    let color;
    if (fuelLevel > 70) color = '#34d399'; // Green
    else if (fuelLevel > 30) color = '#fbbf24'; // Yellow/Amber
    else color = '#f87171'; // Red

    // The length of the fuel bar
    const barWidth = `${fuelLevel}%`;

    return (
        <View style={styles.fuelContainer}>
            <Text style={styles.fuelLabel}>Truck Fuel</Text>
            <View style={styles.fuelBarBackground}>
                <View style={[styles.fuelBarFill, { width: barWidth, backgroundColor: color }]} />
                <Text style={styles.fuelPercentage}>{fuelLevel}%</Text>
            </View>
        </View>
    );
};

const NotificationArea = ({ notifications }) => {
    return (
        <View style={styles.notificationsContainer}>
            <Text style={styles.cardTitle}>Critical Alerts ({notifications.length})</Text>
            {notifications.slice(0, 3).map((item) => { // Show top 3 alerts
                let iconName, color;
                if (item.type === 'danger') { iconName = 'alert-circle-outline'; color = '#f87171'; }
                else if (item.type === 'success') { iconName = 'checkmark-circle-outline'; color = '#34d399'; }
                else { iconName = 'information-circle-outline'; color = '#38bdf8'; }

                return (
                    <View key={item.id} style={styles.notificationItem}>
                        <Ionicons name={iconName} size={18} color={color} style={{ marginRight: 8 }} />
                        <Text style={styles.notificationText} numberOfLines={1}>{item.message}</Text>
                    </View>
                );
            })}
            {notifications.length === 0 && (
                 <Text style={styles.noNotifications}>No active alerts.</Text>
            )}
            <TouchableOpacity onPress={() => Alert.alert("Navigation Mock", "Viewing all past alerts.")} style={{marginTop: 5, padding: 5}}>
                <Text style={styles.viewAllText}>View All Alerts </Text>
            </TouchableOpacity>
        </View>
    );
};

// -----------------------------

const HomeScreen = () => {
  const navigation = useNavigation();
  const { isLoggedIn } = useDriverAuth();
  const { getOrders } = useDriverApi();
  const [isDriverOnline, setIsDriverOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [driverProfile, setDriverProfile] = useState({});
  const [driverStats, setDriverStats] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [nextDelivery, setNextDelivery] = useState({});
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch assigned orders
      const result = await getOrders();
      if (result.success) {
        let ordersData = result.data;
        if (Array.isArray(ordersData)) {
          setOrders(ordersData);
        } else if (ordersData && Array.isArray(ordersData.orders)) {
          setOrders(ordersData.orders);
        } else {
          console.error("Invalid orders data format:", ordersData);
          setOrders([]);
        }
      } else {
        console.error("Failed to fetch orders:", result.error);
        setOrders([]);
      }

      // Compute driver stats from orders
      const deliveredOrders = (result.success ? (Array.isArray(result.data) ? result.data : (result.data && Array.isArray(result.data.orders) ? result.data.orders : [])) : []).filter(order =>
        order && order.order_status &&
        order.order_status.toLowerCase().trim() === "delivered"
      );

      const totalSales = deliveredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const litersDelivered = deliveredOrders.reduce((sum, order) => sum + (order.quantity || 0), 0);
      const lossRate = 0; // Mock value, could be calculated if data available
      const fuelLevel = 0; // Mock value
      const safetyScore = 0; // Mock value

      setDriverStats({ totalSales, litersDelivered, lossRate, fuelLevel, safetyScore });

      // Derive next delivery from first pending/assigned order
      const pendingOrders = (result.success ? (Array.isArray(result.data) ? result.data : (result.data && Array.isArray(result.data.orders) ? result.data.orders : [])) : []).filter(order =>
        order && order.order_status &&
        (order.order_status.toLowerCase().trim() === "pending" ||
         order.order_status.toLowerCase().trim() === "assigned" ||
         order.order_status.toLowerCase().trim() === "confirmed")
      );

      if (pendingOrders.length > 0) {
        const firstOrder = pendingOrders[0];
        const deliveryTime = firstOrder.delivery_time ? new Date(firstOrder.delivery_time) : null;
        const timeString = deliveryTime instanceof Date && !isNaN(deliveryTime.getTime())
          ? deliveryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'TBD';

        // Get customer name from order data
        const customerName = firstOrder.customer_name ||
                           (firstOrder.customer && firstOrder.customer.name) ||
                           'Customer';

        // Get quantity from order or first product item
        const product = Array.isArray(firstOrder.items) && firstOrder.items.length > 0 ? firstOrder.items[0] : {};
        const quantity = firstOrder.quantity || product.quantity || 0;

        // Check if location looks like an ID (alphanumeric, no spaces, length > 5)
        const location = firstOrder.delivery_address && !/^[a-zA-Z0-9]{6,}$/.test(firstOrder.delivery_address.trim())
          ? firstOrder.delivery_address
          : 'Address not available';

        setNextDelivery({
          time: timeString,
          location: location,
          liters: quantity,
          customer: customerName,
        });
      } else {
        setNextDelivery({});
      }

      // Set empty or default values for profile and notifications
      setDriverProfile({});
      setNotifications([]);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      // Handle authentication errors gracefully for offline mode
      if (error.message && (error.message.includes("403") || error.message.includes("Invalid or expired token") || error.message === "TOKEN_INVALID")) {
        setOrders([]);
        setNextDelivery({});
        setDriverProfile({});
        setDriverStats({});
        setNotifications([]);
        console.log("Token invalid, operating in offline mode");

        Alert.alert(
          "Session Expired",
          "Your session has expired. You can continue using the app in offline mode, or log in again to access real-time data.",
          [
            {
  
              text: "Continue Offline",
              style: "default"
            },
            {
              text: "Log In",
              onPress: () => {
                // Navigate to login screen
                navigation.navigate('Login');
              }
            }
          ]
        );
      } else {
        Alert.alert("Error", "Failed to load dashboard data.");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleDriverStatus = () => {
    setIsDriverOnline(prev => !prev);
    Alert.alert(
      "Status Updated",
      `You are now ${isDriverOnline ? "OFFLINE" : "ONLINE"}. Update your status when ready to receive deliveries.`
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData().finally(() => setRefreshing(false));
  };

  const handleViewOrders = () => {
    // Navigate to Orders tab
    navigation.navigate('Orders');
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={["#0f172a", "#1e293b", "#0f172a"]}
      style={styles.container}
    >
      {/* HEADER: Driver Status and Toggle */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Fuel Operations Dashboard</Text>
          <StatusToggle
            isOnline={isDriverOnline}
            toggleStatus={toggleDriverStatus}
          />
        </View>
      </View>
      
      {/* MAIN SCROLLABLE CONTENT AREA */}
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
        
        {/* DRIVER PROFILE CARD & FUEL INDICATOR */}
        <View style={[styles.card, styles.profileCard]}>
            <View style={styles.profileSection}>
                <Ionicons name="person-circle-outline" size={40} color="#38bdf8" />
                <View style={{marginLeft: 10}}>
                    <Text style={styles.profileName}>{driverProfile.name || 'Driver'}</Text>
                    <Text style={styles.profileDetail}>Truck ID: {driverProfile.truckId || 'N/A'} | License: {driverProfile.license || 'N/A'}</Text>
                </View>
            </View>
            <FuelIndicator fuelLevel={driverStats.fuelLevel || 0} />
        </View>

        {/* UPCOMING DELIVERY CARD */}
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Next Stop: {nextDelivery.time || 'No deliveries'} ⏱️</Text>
            <View style={styles.nextStopContent}>
                <Ionicons name="pin-outline" size={24} color="#fbbf24" />
                <View style={{marginLeft: 10, flexShrink: 1}}>
                    <Text style={styles.nextStopLocation}>{nextDelivery.location || 'N/A'}</Text>
                    <Text style={styles.nextStopDetails}>Customer: {nextDelivery.customer || 'N/A'}</Text>
                    <Text style={styles.nextStopDetails}>Liters: {(nextDelivery.liters || 0).toLocaleString()} L</Text>
                </View>
            </View>
        </View>

        {/* FINANCIAL & OPERATIONAL METRICS */}
        <View style={styles.metricsContainer}>
          <MetricsCard
            label="Total Sales"
            value={`$${(driverStats.totalSales || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}`}
            icon="cash-outline"
            color="#fbbf24"
          />
          <MetricsCard
            label="Liters Today"
            value={(driverStats.litersDelivered || 0).toLocaleString()}
            icon="water-outline"
            color="#38bdf8"
          />
          <MetricsCard
            label="Loss Rate"
            value={`${driverStats.lossRate || 0}%`}
            icon="alert-circle-outline"
            color="#f87171"
          />
        </View>

        {/* GRAPH & ALERTS ROW */}
        <View style={styles.dashboardRow}>
            {/* GRAPH: Daily Sales Trend (Larger container) */}
            <View style={[styles.graphContainer, { flex: 3, marginRight: 10 }]}>
                <Text style={styles.cardTitle}>Daily Delivery Trend 📊</Text>
                <View style={styles.mockGraph}>
                    <Text style={styles.mockGraphText}>Mock Chart: Sales vs. Liters Delivered</Text>
                </View>
            </View>

            {/* Notifications / Alerts */}
            <NotificationArea notifications={notifications} />
        </View>

        {/* SAFETY SCORE CARD (Standalone) */}
        <View style={[styles.card, styles.safetyScoreCard]}>
             <Ionicons name="shield-checkmark-outline" size={24} color="#34d399" />
             <View style={{marginLeft: 10, flex: 1}}>
                <Text style={styles.safetyTitle}>Overall Safety Score</Text>
                <Text style={styles.safetyDetail}>Aim for 100 to maximize your bonus!</Text>
             </View>
             <Text style={styles.safetyScoreText}>{driverStats.safetyScore || 0}</Text>
        </View>

        {/* VIEW ORDERS BUTTON */}
        <TouchableOpacity style={styles.viewOrdersButton} onPress={handleViewOrders}>
            <Ionicons name="navigate-circle-outline" size={26} color="#fff" />
            <Text style={styles.viewOrdersText}>Manage Active Route & Orders</Text>
        </TouchableOpacity>

      </ScrollView>

    </LinearGradient>
  );
};

export default HomeScreen;

// --- Stylesheet ---
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { paddingHorizontal: 20, marginBottom: 15 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  
  scrollContent: {flex: 1, paddingHorizontal: 20},
  
  // Status Toggle
  statusToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 25,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  statusText: { color: "#fff", fontWeight: "bold", fontSize: 14, textTransform: 'uppercase' },

  // Cards & Titles
  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 5,
  },

  // Driver Profile & Fuel
  profileCard: { padding: 10 },
  profileSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 10 },
  profileName: { color: '#38bdf8', fontSize: 18, fontWeight: 'bold' },
  profileDetail: { color: '#ccc', fontSize: 13 },
  
  // Fuel Indicator
  fuelContainer: { marginTop: 5, paddingHorizontal: 5 },
  fuelLabel: { color: '#ccc', fontSize: 12, marginBottom: 5 },
  fuelBarBackground: {
      height: 20,
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: 10,
      overflow: 'hidden',
      justifyContent: 'center',
  },
  fuelBarFill: { height: '100%', borderRadius: 10, position: 'absolute' },
  fuelPercentage: { color: '#fff', fontWeight: 'bold', textAlign: 'center', zIndex: 1 },

  // Next Stop Card
  nextStopContent: { flexDirection: 'row', alignItems: 'center' },
  nextStopLocation: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  nextStopDetails: { color: '#ccc', fontSize: 13 },


  // Metrics Card
  metricsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metricCard: {
    width: width / 3.8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  metricLabel: { color: "#ccc", fontSize: 11, marginTop: 4, textAlign: 'center' },
  metricValue: { fontSize: 16, fontWeight: "bold", marginTop: 2, },
  
  // Graph & Alerts Row
  dashboardRow: { flexDirection: 'row', marginBottom: 20, height: 180, },
  graphContainer: { 
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  mockGraph: {
    height: 120,
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  mockGraphText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center' },

  // Notifications
  notificationsContainer: {
    flex: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 3,
  },
  notificationText: { color: '#e5e7eb', fontSize: 12, flexShrink: 1, },
  noNotifications: { color: '#888', fontSize: 12, textAlign: 'center', marginTop: 10, },
  viewAllText: { color: '#38bdf8', fontSize: 12, textAlign: 'right', fontWeight: 'bold' },

  // Safety Score Card
  safetyScoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderColor: '#34d399',
    paddingVertical: 15,
  },
  safetyTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  safetyDetail: { color: '#ccc', fontSize: 12 },
  safetyScoreText: { 
      color: '#34d399', 
      fontSize: 32, 
      fontWeight: 'bold', 
      marginLeft: 20, 
      paddingHorizontal: 10,
      backgroundColor: 'rgba(52,211,153,0.2)',
      borderRadius: 8
    },

  // View Orders Button (CTA)
  viewOrdersButton: {
      backgroundColor: '#38bdf8',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
      borderRadius: 15,
      marginBottom: 20,
      elevation: 5,
      shadowColor: '#38bdf8',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.6,
      shadowRadius: 10,
  },
  viewOrdersText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
      marginLeft: 10,
  }
});