// screens/OrderProgressScreen.js
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  Dimensions,
  Platform,
  Vibration,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { getCurrentUserToken } from "../services/auth";

const { width, height } = Dimensions.get("window");
const BACKEND_URL = "http://localhost:8000";

const statusConfig = {
  pending: {
    color: "#facc15",
    gradient: ["#facc15", "#f59e0b"],
    icon: "time-outline",
    progress: 0.25,
    label: "Processing",
    description: "Your order is being prepared"
  },
  out_for_delivery: {
    color: "#3b82f6",
    gradient: ["#3b82f6", "#1d4ed8"],
    icon: "car-outline",
    progress: 0.75,
    label: "On the Way",
    description: "Driver is heading to your location"
  },
  delivered: {
    color: "#22c55e",
    gradient: ["#22c55e", "#16a34a"],
    icon: "checkmark-circle-outline",
    progress: 1.0,
    label: "Delivered",
    description: "Order completed successfully"
  },
  cancelled: {
    color: "#ef4444",
    gradient: ["#ef4444", "#dc2626"],
    icon: "close-circle-outline",
    progress: 0,
    label: "Cancelled",
    description: "Order was cancelled"
  },
};

const OrderProgressScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("all");
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerScale = useRef(new Animated.Value(0.8)).current;
  const orderAnimations = useRef({}).current;

  const fetchOrders = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      
      const token = await getCurrentUserToken();
      if (!token) {
        Alert.alert("Error", "No logged-in user found.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/orders/my-orders/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        Alert.alert("Error", data.error || "Failed to fetch orders.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setOrders(data.orders);
      
      // Initialize animations for new orders
      data.orders.forEach((order, index) => {
        if (!orderAnimations[order.order_id]) {
          orderAnimations[order.order_id] = {
            scale: new Animated.Value(0),
            opacity: new Animated.Value(0),
            translateY: new Animated.Value(50),
          };
        }
      });
      
      setLoading(false);
      setRefreshing(false);
      
      // Animate orders in
      animateOrdersIn(data.orders);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Something went wrong while fetching orders.");
      setLoading(false);
      setRefreshing(false);
    }
  };

  const animateOrdersIn = (ordersList) => {
    const animations = ordersList.map((order, index) => {
      const anim = orderAnimations[order.order_id];
      return Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 600,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.spring(anim.scale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateY, {
          toValue: 0,
          duration: 600,
          delay: index * 100,
          useNativeDriver: true,
        }),
      ]);
    });
    
    Animated.stagger(50, animations).start();
  };

  const onRefresh = useCallback(() => {
    fetchOrders(true);
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    }
  }, []);

  const handleOrderPress = (order) => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    }
    
    setExpandedOrder(expandedOrder === order.order_id ? null : order.order_id);
  };

  const handleTrackOrder = (orderId) => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate([10, 50, 10]);
    }
    navigation.navigate("OrderMapTracking", { orderId });
  };

  const filteredOrders = orders.filter(order => {
    if (selectedFilter === "all") return true;
    return order.order_status === selectedFilter;
  });

  const getFilterCount = (status) => {
    if (status === "all") return orders.length;
    return orders.filter(order => order.order_status === status).length;
  };

  useEffect(() => {
    fetchOrders();
    
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(headerScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const ProgressRing = ({ progress, size = 60, strokeWidth = 6, color }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${circumference} ${circumference}`;
    const strokeDashoffset = circumference - progress * circumference;

    return (
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgLinearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={color} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        <Circle
          stroke="rgba(255,255,255,0.1)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <Circle
          stroke="url(#progressGrad)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </Svg>
    );
  };

  const FilterChip = ({ status, label, count, isActive, onPress }) => (
    <TouchableOpacity
      style={[styles.filterChip, isActive && styles.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={isActive ? ["#00eaff", "#0ea5e9"] : ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]}
        style={styles.filterChipGradient}
      >
        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
          {label}
        </Text>
        {count > 0 && (
          <View style={[styles.filterChipBadge, isActive && styles.filterChipBadgeActive]}>
            <Text style={[styles.filterChipBadgeText, isActive && styles.filterChipBadgeTextActive]}>
              {count}
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const OrderCard = ({ order, index }) => {
    const config = statusConfig[order.order_status] || statusConfig.pending;
    const isExpanded = expandedOrder === order.order_id;
    const anim = orderAnimations[order.order_id] || {
      scale: new Animated.Value(1),
      opacity: new Animated.Value(1),
      translateY: new Animated.Value(0),
    };

    return (
      <Animated.View
        style={[
          styles.orderCardContainer,
          {
            opacity: anim.opacity,
            transform: [
              { scale: anim.scale },
              { translateY: anim.translateY },
            ],
          },
        ]}
      >
        <Pressable
          style={[styles.orderCard, isExpanded && styles.orderCardExpanded]}
          onPress={() => handleOrderPress(order)}
          android_ripple={{ color: 'rgba(0,234,255,0.1)' }}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"]}
            style={styles.cardGradient}
          >
            {/* Status Indicator */}
            <View style={[styles.statusIndicator, { backgroundColor: config.color }]} />
            
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.orderInfo}>
                <View style={styles.orderIdContainer}>
                  <MaterialIcons name="receipt" size={20} color="#00eaff" />
                  <Text style={styles.orderIdText}>#{order.order_id.slice(-6)}</Text>
                </View>
                <Text style={styles.orderDate}>
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
              
              <View style={styles.progressContainer}>
                <ProgressRing 
                  progress={config.progress} 
                  color={config.color}
                  size={50}
                  strokeWidth={4}
                />
                <View style={styles.progressIcon}>
                  <Ionicons name={config.icon} size={20} color={config.color} />
                </View>
              </View>
            </View>

            {/* Status Info */}
            <View style={styles.statusInfo}>
              <View style={styles.statusLabelContainer}>
                <Text style={[styles.statusLabel, { color: config.color }]}>
                  {config.label}
                </Text>
                <View style={[styles.statusDot, { backgroundColor: config.color }]} />
              </View>
              <Text style={styles.statusDescription}>{config.description}</Text>
            </View>

            {/* Order Details */}
            <View style={styles.orderDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="cash-outline" size={16} color="#888" />
                <Text style={styles.detailText}>${order.total_price}</Text>
              </View>
              {order.notes && (
                <View style={styles.detailItem}>
                  <Ionicons name="document-text-outline" size={16} color="#888" />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {order.notes}
                  </Text>
                </View>
              )}
            </View>

            {/* Expanded Content */}
            {isExpanded && (
              <Animated.View style={styles.expandedContent}>
                <View style={styles.divider} />
                
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleTrackOrder(order.order_id)}
                  >
                    <LinearGradient
                      colors={config.gradient}
                      style={styles.actionButtonGradient}
                    >
                      <Ionicons name="location-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Track Order</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.actionButtonSecondary}>
                    <Ionicons name="call-outline" size={20} color="#00eaff" />
                    <Text style={styles.actionButtonSecondaryText}>Contact</Text>
                  </TouchableOpacity>
                </View>

                {/* Timeline Preview */}
                <View style={styles.timelinePreview}>
                  <Text style={styles.timelineTitle}>Order Timeline</Text>
                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineIcon, { backgroundColor: '#22c55e' }]}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                    <Text style={styles.timelineText}>Order Placed</Text>
                    <Text style={styles.timelineTime}>
                      {new Date(order.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  
                  {order.order_status !== 'pending' && (
                    <View style={styles.timelineItem}>
                      <View style={[styles.timelineIcon, { backgroundColor: config.color }]}>
                        <Ionicons name={config.icon} size={12} color="#fff" />
                      </View>
                      <Text style={styles.timelineText}>{config.label}</Text>
                      <Text style={styles.timelineTime}>Now</Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            )}

            {/* Expand Indicator */}
            <View style={styles.expandIndicator}>
              <Ionicons 
                name={isExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#888" 
              />
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={["#0a0e27", "#16213e", "#1a2332"]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00eaff" />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#0a0e27", "#16213e", "#1a2332"]} style={styles.container}>
      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: headerScale },
            ],
          },
        ]}
      >
        <BlurView intensity={20} style={styles.headerBlur}>
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSubtitle}>Track your gas deliveries</Text>
          
          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{orders.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#22c55e' }]}>
                {orders.filter(o => o.order_status === 'delivered').length}
              </Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#3b82f6' }]}>
                {orders.filter(o => o.order_status === 'out_for_delivery').length}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </View>
        </BlurView>
      </Animated.View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <FilterChip
          status="all"
          label="All Orders"
          count={getFilterCount("all")}
          isActive={selectedFilter === "all"}
          onPress={() => setSelectedFilter("all")}
        />
        <FilterChip
          status="pending"
          label="Processing"
          count={getFilterCount("pending")}
          isActive={selectedFilter === "pending"}
          onPress={() => setSelectedFilter("pending")}
        />
        <FilterChip
          status="out_for_delivery"
          label="On the Way"
          count={getFilterCount("out_for_delivery")}
          isActive={selectedFilter === "out_for_delivery"}
          onPress={() => setSelectedFilter("out_for_delivery")}
        />
        <FilterChip
          status="delivered"
          label="Delivered"
          count={getFilterCount("delivered")}
          isActive={selectedFilter === "delivered"}
          onPress={() => setSelectedFilter("delivered")}
        />
      </ScrollView>

      {/* Orders List */}
      <ScrollView
        style={styles.ordersContainer}
        contentContainerStyle={styles.ordersContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#00eaff"]}
            tintColor="#00eaff"
            title="Pull to refresh"
            titleColor="#fff"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={["rgba(0,234,255,0.1)", "rgba(0,234,255,0.02)"]}
              style={styles.emptyGradient}
            >
              <Ionicons name="receipt-outline" size={80} color="#00eaff" />
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptyText}>
                {selectedFilter === "all" 
                  ? "You haven't placed any orders yet." 
                  : `No ${selectedFilter.replace('_', ' ')} orders found.`}
              </Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => navigation.navigate("Home")}
              >
                <LinearGradient
                  colors={["#00eaff", "#0ea5e9"]}
                  style={styles.emptyButtonGradient}
                >
                  <Text style={styles.emptyButtonText}>Place Your First Order</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (
          filteredOrders.map((order, index) => (
            <OrderCard key={order.order_id} order={order} index={index} />
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
};

export default OrderProgressScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  
  // Header
  header: {
    marginTop: Platform.OS === 'ios' ? 50 : 30,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: "hidden",
  },
  headerBlur: {
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  headerSubtitle: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    color: "#00eaff",
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    color: "#888",
    fontSize: 14,
    marginTop: 2,
  },
  
  // Filters
  filterContainer: {
    marginBottom: 20,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterChip: {
    borderRadius: 20,
    overflow: "hidden",
  },
  filterChipActive: {
    elevation: 4,
    shadowColor: "#00eaff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  filterChipGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChipText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  filterChipBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  filterChipBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  filterChipBadgeText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "bold",
  },
  filterChipBadgeTextActive: {
    color: "#fff",
  },
  
  // Orders
  ordersContainer: {
    flex: 1,
  },
  ordersContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  orderCardContainer: {
    marginBottom: 16,
  },
  orderCard: {
    borderRadius: 20,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  orderCardExpanded: {
    elevation: 8,
    shadowOpacity: 0.2,
  },
  cardGradient: {
    padding: 20,
    position: "relative",
  },
  statusIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  
  // Card Header
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  orderIdText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  orderDate: {
    color: "#888",
    fontSize: 14,
  },
  progressContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  progressIcon: {
    position: "absolute",
  },
  
  // Status Info
  statusInfo: {
    marginBottom: 16,
  },
  statusLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDescription: {
    color: "#888",
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Order Details
  orderDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    color: "#e5e7eb",
    fontSize: 14,
    flex: 1,
  },
  
  // Expanded Content
  expandedContent: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    gap: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,234,255,0.3)",
  },
  actionButtonSecondaryText: {
    color: "#00eaff",
    fontSize: 14,
    fontWeight: "600",
  },
  
  // Timeline
  timelinePreview: {
    gap: 12,
  },
  timelineTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timelineIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineText: {
    color: "#e5e7eb",
    fontSize: 14,
    flex: 1,
  },
  timelineTime: {
    color: "#888",
    fontSize: 12,
  },
  
  // Expand Indicator
  expandIndicator: {
    position: "absolute",
    bottom: 10,
    right: 20,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyGradient: {
    alignItems: "center",
    padding: 40,
    borderRadius: 20,
    width: "100%",
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 30,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  emptyButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});