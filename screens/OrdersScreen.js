import React, { useState, useEffect, useCallback } from "react";
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
// Assuming these are correct paths
import { useDriverAuth } from "../DriverAuthContext"; 
import { useDriverApi } from "../hooks/useDriverApi"; 
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

// ---------------- Metric Formatting Helpers ----------------

/**
 * Safely parses an amount (number or string) into a number, defaulting to 0.
 * @param {string|number} amount
 * @returns {number}
 */
const safeParseAmount = (amount) => {
    if (typeof amount === 'number') {
        return amount;
    }
    if (typeof amount === 'string') {
        // Removes non-numeric characters except for the decimal point
        const parsed = parseFloat(amount.replace(/[^0-9.]+/g, ""));
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

/**
 * Formats a number as currency (e.g., $1,234.56).
 * @param {string|number} amount
 * @returns {string}
 */
const formatCurrency = (amount) => {
    const safeAmount = safeParseAmount(amount);
    return `$${safeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------- Order Item Component ----------------
/**
 * Renders a clickable order item in the list.
 * @param {object} props
 * @param {object} props.order - The order data object.
 * @param {function} props.onPress - Function to handle press, passed the order.
 */
const OrderItem = ({ order, onPress }) => {
    // Utility to get status color
    const getStatusColor = (status) => {
        if (!status) return "#6b7280";
        switch (status.toLowerCase().trim()) {
            case "delivered":
            case "completed": return "#34d399";
            case "pending":
            case "assigned": return "#fbbf24";
            case "cancelled":
            case "rejected": return "#f87171";
            case "in_transit":
            case "picked_up": return "#38bdf8"; // Use a distinct color for in-progress
            default: return "#6b7280"; // Unknown/Other
        }
    };
    
    // Utility to get status icon
    const getStatusIcon = (status) => {
        if (!status) return "help-circle-outline";
        switch (status.toLowerCase().trim()) {
            case "delivered":
            case "completed": return "checkmark-done-circle-outline";
            case "pending":
            case "assigned": return "time-outline";
            case "cancelled":
            case "rejected": return "close-circle-outline";
            case "in_transit":
            case "picked_up": return "navigate-circle-outline";
            default: return "help-circle-outline";
        }
    };

    const displayAmount = safeParseAmount(order.total_price || 0).toFixed(2);

    return (
        <TouchableOpacity style={styles.orderItem} onPress={() => onPress(order)} activeOpacity={0.7}>
            <View style={styles.orderHeader}>
                <Text style={styles.customerName}>{order.customer?.name || 'Customer N/A'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.order_status) }]}>
                    <Ionicons name={getStatusIcon(order.order_status)} size={14} color="#fff" />
                    <Text style={styles.statusText}>{order.order_status ? order.order_status.toUpperCase().replace('_', ' ') : 'UNKNOWN'}</Text>
                </View>
            </View>
            <View style={styles.orderDetails}>
                <Ionicons name="pin-outline" size={16} color="#38bdf8" />
                <Text style={styles.addressText}>{order.delivery_address || 'Address N/A'}</Text>
            </View>
            <View style={styles.orderDetails}>
                <Ionicons name="water-outline" size={16} color="#34d399" />
                <Text style={styles.detailText}>Weight: {order.quantity != null ? order.quantity.toLocaleString() : 'N/A'} kg</Text>
            </View>
            <View style={styles.orderDetails}>
                <Ionicons name="time-outline" size={16} color="#fbbf24" />
                <Text style={styles.detailText}>
                    Scheduled: {order.scheduled_time ? new Date(order.scheduled_time).toLocaleString() : 'N/A'}
                </Text>
            </View>
            <View style={styles.orderDetails}>
                <Ionicons name="cash-outline" size={16} color="#f87171" />
                <Text style={styles.detailText}>Total: ${displayAmount}</Text>
            </View>
            <View style={styles.tapHint}>
                <Text style={styles.tapHintText}>Tap for details</Text>
                <Ionicons name="chevron-forward" size={16} color="#38bdf8" />
            </View>
        </TouchableOpacity>
    );
};

// ---------------- Graph Component ----------------
/**
 * Renders a progress bar and statistics based on order counts.
 * NOTE: The totalOrders should ideally be the sum of all categories if a filter isn't applied.
 */
const DriverProgressGraph = ({ deliveredCount, pendingCount, canceledCount, totalOrders }) => {
    const total = totalOrders || 1; // Prevent division by zero
    const deliveredCountSafe = deliveredCount || 0;
    const pendingCountSafe = pendingCount || 0;
    const canceledCountSafe = canceledCount || 0;
    
    // Calculate orders that fall outside the three main tracked categories
    const unknownCount = Math.max(0, total - deliveredCountSafe - pendingCountSafe - canceledCountSafe);
    
    // Completion rate based on the delivered orders
    const completionRate = total > 0 ? Math.round((deliveredCountSafe / totalOrders) * 100) : 0;

    return (
        <View style={styles.graphContainer}>
            <Text style={styles.graphTitle}>Order Progress Distribution 📈</Text>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressSegment, styles.deliveredSegment, { flex: deliveredCountSafe }]} />
                    <View style={[styles.progressSegment, styles.pendingSegment, { flex: pendingCountSafe }]} />
                    <View style={[styles.progressSegment, styles.canceledSegment, { flex: canceledCountSafe }]} />
                    {unknownCount > 0 && <View style={[styles.progressSegment, styles.unknownSegment, { flex: unknownCount }]} />}
                </View>
            </View>

            {/* Progress Stats */}
            <View style={styles.progressStats}>
                {/* Delivered Stat */}
                <View style={styles.statItem}>
                    <View style={[styles.statDot, { backgroundColor: '#34d399' }]} />
                    <Text style={styles.statText}>Delivered: {completionRate}% ({deliveredCountSafe})</Text>
                </View>
                {/* Pending Stat */}
                <View style={styles.statItem}>
                    <View style={[styles.statDot, { backgroundColor: '#fbbf24' }]} />
                    <Text style={styles.statText}>Pending: {totalOrders > 0 ? Math.round((pendingCountSafe / totalOrders) * 100) : 0}% ({pendingCountSafe})</Text>
                </View>
                {/* Canceled Stat */}
                <View style={styles.statItem}>
                    <View style={[styles.statDot, { backgroundColor: '#f87171' }]} />
                    <Text style={styles.statText}>Canceled: {totalOrders > 0 ? Math.round((canceledCountSafe / totalOrders) * 100) : 0}% ({canceledCountSafe})</Text>
                </View>
                {/* Unknown Stat */}
                {unknownCount > 0 && (
                    <View style={styles.statItem}>
                        <View style={[styles.statDot, { backgroundColor: '#6b7280' }]} />
                        <Text style={styles.statText}>Other: {unknownCount}</Text>
                    </View>
                )}
            </View>

            {/* Performance Indicator */}
            <View style={styles.performanceIndicator}>
                <Ionicons
                    name={completionRate >= 80 ? "trophy" : completionRate >= 60 ? "thumbs-up" : "alert-circle"}
                    size={20}
                    color={completionRate >= 80 ? "#fbbf24" : completionRate >= 60 ? "#34d399" : "#f87171"}
                />
                <Text style={styles.performanceText}>
                    {completionRate >= 80 ? "Excellent Performance!" :
                     completionRate >= 60 ? "Good Progress" :
                     "Needs Improvement"}
                </Text>
            </View>
        </View>
    );
};

// ---------------- Default State ----------------

/**
 * Default structure for metrics state.
 */
const DEFAULT_METRICS = {
    daily_sales: 0.0,
    daily_deliveries: 0,
    weekly_sales: 0.0,
    weekly_deliveries: 0,
    monthly_sales: 0.0,
    monthly_deliveries: 0,
    lifetime_sales: 0.0,
    lifetime_deliveries: 0,
};

// ---------------- Main Orders Screen ----------------
const OrdersScreen = () => {
    const navigation = useNavigation();
    const { isLoggedIn } = useDriverAuth();
    const { getOrders, getDriverPerformanceMetrics } = useDriverApi(); 
    
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Use the defined default structure
    const [metrics, setMetrics] = useState(DEFAULT_METRICS);


    /**
     * Fetches both orders and performance metrics concurrently.
     */
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Use Promise.all to fetch data concurrently for better performance
            const [orderResult, metricsResult] = await Promise.all([
                getOrders(),
                getDriverPerformanceMetrics(),
            ]);

            // 1. Process Orders List
            const ordersData = (orderResult?.success && Array.isArray(orderResult.data)) ? orderResult.data : 
                               (orderResult?.data?.orders && Array.isArray(orderResult.data.orders) ? orderResult.data.orders : []);
            setOrders(ordersData);

            // 2. Process Performance Metrics
            if (metricsResult?.success && metricsResult.data) {
                // Merge the fetched data with defaults to ensure all keys exist
                setMetrics({ ...DEFAULT_METRICS, ...metricsResult.data }); 
            } else {
                console.warn("Failed to fetch metrics, using default values.", metricsResult?.error);
                setMetrics(DEFAULT_METRICS); 
            }
            
        } catch (error) {
            console.error("Failed to fetch driver data:", error);
            Alert.alert("Error", "Failed to load driver data. Please check your connection.");
            setOrders([]);
            setMetrics(DEFAULT_METRICS);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [getOrders, getDriverPerformanceMetrics]); 

    useEffect(() => {
        if (isLoggedIn) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [isLoggedIn, fetchData]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    /**
     * Filters orders by status list for easy counting/display.
     * Trims and converts status to lowercase for robust matching.
     */
    const filterOrdersByStatus = (statuses) => (orders || []).filter(order =>
        order?.order_status && statuses.includes(order.order_status.toLowerCase().trim())
    );

    // Filtered lists for the Navigation Buttons and Graph
    const confirmedOrders = filterOrdersByStatus(["confirmed", "accepted", "picked_up", "in_transit"]);
    const deliveredOrders = filterOrdersByStatus(["delivered", "completed"]);
    const pendingOrders = filterOrdersByStatus(["pending", "assigned"]);
    const canceledOrders = filterOrdersByStatus(["cancelled", "rejected"]);
    
    const totalOrdersCount = orders.length;

    /**
     * Navigates to the OrderDetails screen.
     * @param {object} order - The order object to pass to the details screen.
     */
    const handleOrderPress = (order) => {
        const id = order.order_id || order._id || order.id;
        if (!id) {
            Alert.alert("Error", "Cannot view details. Order ID is missing.");
            return;
        }
        // Navigate and pass the full order object
        navigation.navigate("OrderDetails", { order: order });
    };

    // --- Loading State Screen ---
    if (loading) {
        return (
            <LinearGradient colors={["#0f172a", "#1e293b", "#0f172a"]} style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text style={{ color: '#fff', marginTop: 10 }}>Loading Driver Dashboard...</Text>
            </LinearGradient>
        );
    }

    // --- Goals Statuses (using backend-provided metrics) ---
    // Note: Goals are hardcoded here, which is typical for a basic dashboard.
    const dailyDeliveryTarget = 10;
    const monthlySalesTarget = 500;
    const completionRateTarget = 0.8; // 80%

    const dailyTargetAchieved = metrics.daily_deliveries >= dailyDeliveryTarget;
    const monthlyEarningsAchieved = metrics.monthly_sales >= monthlySalesTarget;
    const completionRate = totalOrdersCount > 0 ? (deliveredOrders.length / totalOrdersCount) : 0;
    const completionRateAchieved = completionRate >= completionRateTarget;
    
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
                        // Use a boolean for tintColor on iOS, or the color string itself.
                        // Setting `tintColor` directly works on Android.
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#38bdf8"
                    />
                }
            >
                <Text style={styles.headerTitle}>Driver Dashboard</Text>

                {/* Navigation Buttons for Quick Filtering */}
                <View style={styles.navContainer}>
                    {/* CONFIRMED / IN-PROGRESS */}
                    <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('ConfirmedOrders')}>
                        <Ionicons name="location-outline" size={24} color="#10b981" />
                        <Text style={styles.navText}>In Progress ({confirmedOrders.length})</Text>
                    </TouchableOpacity>
                    {/* DELIVERED */}
                    <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('DeliveredOrders')}>
                        <Ionicons name="checkmark-done-circle-outline" size={24} color="#34d399" />
                        <Text style={styles.navText}>Delivered ({deliveredOrders.length})</Text>
                    </TouchableOpacity>
                    {/* PENDING */}
                    <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('PendingOrders')}>
                        <Ionicons name="time-outline" size={24} color="#fbbf24" />
                        <Text style={styles.navText}>Pending ({pendingOrders.length})</Text>
                    </TouchableOpacity>
                    {/* CANCELED */}
                    <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('CanceledOrders')}>
                        <Ionicons name="close-circle-outline" size={24} color="#f87171" />
                        <Text style={styles.navText}>Canceled ({canceledOrders.length})</Text>
                    </TouchableOpacity>
                </View>

                {/* Driver Progress Graph */}
                <DriverProgressGraph
                    deliveredCount={deliveredOrders.length}
                    pendingCount={pendingOrders.length}
                    canceledCount={canceledOrders.length}
                    totalOrders={totalOrdersCount}
                />

                <View style={styles.analyticsContainer}>
                    {/* List of Orders */}
                    <Text style={styles.analyticsTitle}>All Assigned Orders ({totalOrdersCount}) 📋</Text>
                    {orders.map(order => (
                        <OrderItem key={order.order_id || order._id || `order-${order.customer_name}-${Math.random()}`} order={order} onPress={handleOrderPress} />
                    ))}

                    {orders.length === 0 && (
                        <Text style={{color: '#9ca3af', textAlign: 'center', marginTop: 20, marginBottom: 50}}>
                            No assigned orders found. Pull down to refresh.
                        </Text>
                    )}
                </View>
            </ScrollView>
        </LinearGradient>
    );
};

export default OrdersScreen;

// ---------------- Styles (Kept consistent) ----------------
// ... (The styles remain the same as provided in your original code)
const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 50 },
    loadingContainer: { justifyContent: 'center', alignItems: 'center' },
    scrollContent: { flex: 1, paddingHorizontal: 20 },
    headerTitle: {
        color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center",
    },
    navContainer: {
        flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20,
    },
    navButton: {
        backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10, alignItems: 'center', flex: 1, marginHorizontal: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    navText: {
        color: '#fff', fontSize: 10, fontWeight: 'bold', marginTop: 5, textAlign: 'center',
    },
    graphContainer: {
        backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 15, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    },
    graphTitle: {
        color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 5,
    },
    progressContainer: {
        marginBottom: 15,
    },
    progressBar: {
        height: 20, borderRadius: 10, overflow: 'hidden', flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    progressSegment: {
        height: '100%',
    },
    deliveredSegment: {
        backgroundColor: '#34d399', // Green
    },
    pendingSegment: {
        backgroundColor: '#fbbf24', // Yellow
    },
    canceledSegment: {
        backgroundColor: '#f87171', // Red
    },
    unknownSegment: {
        backgroundColor: '#6b7280', // Gray
    },
    progressStats: {
        marginBottom: 15,
    },
    statItem: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    },
    statDot: {
        width: 12, height: 12, borderRadius: 6, marginRight: 10,
    },
    statText: {
        color: '#fff', fontSize: 14,
    },
    performanceIndicator: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8,
    },
    performanceText: {
        color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 8,
    },
    analyticsContainer: {
        marginBottom: 20,
    },
    analyticsTitle: {
        color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 15, textAlign: "center", borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 10,
    },
    metricCard: {
        backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 15, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    },
    metricHeader: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    },
    metricTitle: {
        color: "#fff", fontSize: 16, fontWeight: "600", marginLeft: 10,
    },
    metricValueSmall: {
        color: '#38bdf8', fontSize: 18, fontWeight: 'bold',
    },
    metricSubtitle: {
        color: '#9ca3af', fontSize: 12,
    },
    metricsGrid: {
        flexDirection: 'row', justifyContent: 'space-between', marginTop: 10,
    },
    metricItem: {
        alignItems: 'center', flex: 1, marginHorizontal: 5,
    },
    metricLabel: {
        color: '#9ca3af', fontSize: 12, marginBottom: 5, textAlign: 'center',
    },
    goalsList: {
        marginTop: 10,
    },
    goalItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    goalText: {
        color: '#fff', fontSize: 14,
    },
    goalStatus: {
        fontSize: 14, fontWeight: '600',
    },
    goalAchieved: {
        color: '#10b981',
    },
    goalPending: {
        color: '#fbbf24',
    },
    orderItem: {
        backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    },
    orderHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
    },
    customerName: {
        color: '#38bdf8', fontSize: 16, fontWeight: 'bold',
    },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    },
    statusText: {
        color: '#fff', fontSize: 10, fontWeight: 'bold', marginLeft: 4,
    },
    orderDetails: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 5,
    },
    addressText: {
        color: '#fff', fontSize: 14, marginLeft: 8, flex: 1,
    },
    detailText: {
        color: '#ccc', fontSize: 13, marginLeft: 8,
    },
    tapHint: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    },
    tapHintText: {
        color: '#38bdf8', fontSize: 12, marginRight: 4,
    },
});