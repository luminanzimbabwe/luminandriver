// screens/NotificationScreen.js
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
  PanGestureHandler,
  RefreshControl,
  Dimensions,
  Platform,
  Vibration,
  Pressable,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Svg, { Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop, RadialGradient } from "react-native-svg";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { getCurrentUserToken } from "../services/auth";

const { width, height } = Dimensions.get("window");
const BACKEND_URL = "http://localhost:8000";

const notificationTypes = {
  order: {
    icon: "receipt-outline",
    color: "#3b82f6",
    gradient: ["#3b82f6", "#1d4ed8"],
    bgColor: "rgba(59, 130, 246, 0.1)",
  },
  delivery: {
    icon: "car-outline",
    color: "#22c55e",
    gradient: ["#22c55e", "#16a34a"],
    bgColor: "rgba(34, 197, 94, 0.1)",
  },
  promotion: {
    icon: "gift-outline",
    color: "#f59e0b",
    gradient: ["#f59e0b", "#d97706"],
    bgColor: "rgba(245, 158, 11, 0.1)",
  },
  system: {
    icon: "settings-outline",
    color: "#8b5cf6",
    gradient: ["#8b5cf6", "#7c3aed"],
    bgColor: "rgba(139, 92, 246, 0.1)",
  },
  alert: {
    icon: "warning-outline",
    color: "#ef4444",
    gradient: ["#ef4444", "#dc2626"],
    bgColor: "rgba(239, 68, 68, 0.1)",
  },
};

const NotificationScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedNotification, setExpandedNotification] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerScale = useRef(new Animated.Value(0.8)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const notificationAnimations = useRef({}).current;

  const fetchNotifications = async (showRefresh = false) => {
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

      const response = await fetch(`${BACKEND_URL}/notifications/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        Alert.alert("Error", data.error || "Could not fetch notifications.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Enhanced notifications with type detection
      const enhancedNotifications = data.map((notification, index) => ({
        ...notification,
        type: detectNotificationType(notification.message),
        timestamp: notification.created_at || new Date().toISOString(),
        priority: notification.priority || 'normal',
      }));

      setNotifications(enhancedNotifications);
      
      // Initialize animations for new notifications
      enhancedNotifications.forEach((notification, index) => {
        if (!notificationAnimations[notification.id]) {
          notificationAnimations[notification.id] = {
            scale: new Animated.Value(0),
            opacity: new Animated.Value(0),
            translateX: new Animated.Value(width),
            swipeX: new Animated.Value(0),
          };
        }
      });
      
      setLoading(false);
      setRefreshing(false);
      
      // Animate notifications in
      animateNotificationsIn(enhancedNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      Alert.alert("Error", "Something went wrong while fetching notifications.");
      setLoading(false);
      setRefreshing(false);
    }
  };

  const detectNotificationType = (message) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('order') || lowerMessage.includes('purchase')) return 'order';
    if (lowerMessage.includes('delivery') || lowerMessage.includes('delivered')) return 'delivery';
    if (lowerMessage.includes('offer') || lowerMessage.includes('discount')) return 'promotion';
    if (lowerMessage.includes('system') || lowerMessage.includes('update')) return 'system';
    if (lowerMessage.includes('alert') || lowerMessage.includes('warning')) return 'alert';
    return 'system';
  };

  const animateNotificationsIn = (notificationsList) => {
    const animations = notificationsList.map((notification, index) => {
      const anim = notificationAnimations[notification.id];
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
        Animated.timing(anim.translateX, {
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
    fetchNotifications(true);
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    }
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      if (Platform.OS === 'ios') {
        Vibration.vibrate(10);
      }

      const token = await getCurrentUserToken();
      const response = await fetch(`${BACKEND_URL}/notifications/${notificationId}/read/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        Alert.alert("Error", data.error || "Failed to mark as read.");
        return;
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to mark notification as read.");
    }
  };

  const markAllAsRead = async () => {
    try {
      if (Platform.OS === 'ios') {
        Vibration.vibrate([10, 50, 10]);
      }

      const token = await getCurrentUserToken();
      const response = await fetch(`${BACKEND_URL}/notifications/mark-all-read/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        Alert.alert("Error", data.error || "Failed to mark all as read.");
        return;
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to mark all notifications as read.");
    }
  };

  const handleNotificationPress = (notification) => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    }
    
    setExpandedNotification(
      expandedNotification === notification.id ? null : notification.id
    );
    
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const handleSwipeAction = (notification, action) => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate([10, 30, 10]);
    }

    if (action === 'read') {
      markAsRead(notification.id);
    } else if (action === 'delete') {
      // Implement delete functionality
      Alert.alert(
        "Delete Notification",
        "Are you sure you want to delete this notification?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteNotification(notification.id) }
        ]
      );
    }
  };

  const deleteNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    Animated.timing(searchAnim, {
      toValue: showSearch ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesFilter = selectedFilter === "all" || 
      (selectedFilter === "unread" && !notification.read) ||
      (selectedFilter === "read" && notification.read) ||
      notification.type === selectedFilter;
    
    const matchesSearch = searchQuery === "" || 
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getFilterCount = (filter) => {
    if (filter === "all") return notifications.length;
    if (filter === "unread") return notifications.filter(n => !n.read).length;
    if (filter === "read") return notifications.filter(n => n.read).length;
    return notifications.filter(n => n.type === filter).length;
  };

  useEffect(() => {
    fetchNotifications();
    
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

  const NotificationTypeIcon = ({ type, size = 24 }) => {
    const config = notificationTypes[type] || notificationTypes.system;
    
    return (
      <View style={[styles.typeIconContainer, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={size} color={config.color} />
      </View>
    );
  };

  const FilterChip = ({ filter, label, count, isActive, onPress }) => (
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

  const SwipeableNotification = ({ notification, index }) => {
    const config = notificationTypes[notification.type] || notificationTypes.system;
    const isExpanded = expandedNotification === notification.id;
    const anim = notificationAnimations[notification.id] || {
      scale: new Animated.Value(1),
      opacity: new Animated.Value(1),
      translateX: new Animated.Value(0),
      swipeX: new Animated.Value(0),
    };

    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 1) return `${Math.floor(diffInHours * 60)}m ago`;
      if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
      return date.toLocaleDateString();
    };

    return (
      <Animated.View
        style={[
          styles.notificationContainer,
          {
            opacity: anim.opacity,
            transform: [
              { scale: anim.scale },
              { translateX: anim.translateX },
            ],
          },
        ]}
      >
        <Pressable
          style={[
            styles.notificationCard,
            !notification.read && styles.unreadNotification,
            isExpanded && styles.notificationExpanded,
          ]}
          onPress={() => handleNotificationPress(notification)}
          android_ripple={{ color: 'rgba(0,234,255,0.1)' }}
        >
          <LinearGradient
            colors={
              !notification.read
                ? ["rgba(0,234,255,0.08)", "rgba(0,234,255,0.02)"]
                : ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]
            }
            style={styles.cardGradient}
          >
            {/* Priority Indicator */}
            {notification.priority === 'high' && (
              <View style={styles.priorityIndicator}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
              </View>
            )}

            {/* Card Header */}
            <View style={styles.cardHeader}>
              <NotificationTypeIcon type={notification.type} />
              
              <View style={styles.notificationInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.notificationTitle} numberOfLines={1}>
                    {notification.title || getNotificationTitle(notification.type)}
                  </Text>
                  {!notification.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notificationTime}>
                  {formatTime(notification.timestamp)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleSwipeAction(notification, 'read')}
              >
                <Ionicons 
                  name={notification.read ? "checkmark-circle" : "checkmark-circle-outline"} 
                  size={24} 
                  color={notification.read ? "#22c55e" : "#888"} 
                />
              </TouchableOpacity>
            </View>

            {/* Message Content */}
            <View style={styles.messageContainer}>
              <Text 
                style={styles.notificationMessage}
                numberOfLines={isExpanded ? undefined : 2}
              >
                {notification.message}
              </Text>
            </View>

            {/* Expanded Content */}
            {isExpanded && (
              <Animated.View style={styles.expandedContent}>
                <View style={styles.divider} />
                
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.primaryAction}
                    onPress={() => {
                      // Handle primary action based on notification type
                      if (notification.type === 'order') {
                        navigation.navigate('OrderProgress');
                      } else if (notification.type === 'delivery') {
                        navigation.navigate('OrderMapTracking');
                      }
                    }}
                  >
                    <LinearGradient
                      colors={config.gradient}
                      style={styles.primaryActionGradient}
                    >
                      <Ionicons name="open-outline" size={18} color="#fff" />
                      <Text style={styles.primaryActionText}>View Details</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.secondaryAction}
                    onPress={() => handleSwipeAction(notification, 'delete')}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    <Text style={styles.secondaryActionText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                {/* Additional Info */}
                <View style={styles.additionalInfo}>
                  <View style={styles.infoItem}>
                    <Ionicons name="time-outline" size={16} color="#888" />
                    <Text style={styles.infoText}>
                      {new Date(notification.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  {notification.category && (
                    <View style={styles.infoItem}>
                      <Ionicons name="pricetag-outline" size={16} color="#888" />
                      <Text style={styles.infoText}>{notification.category}</Text>
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

  const getNotificationTitle = (type) => {
    const titles = {
      order: "Order Update",
      delivery: "Delivery Status",
      promotion: "Special Offer",
      system: "System Notification",
      alert: "Important Alert",
    };
    return titles[type] || "Notification";
  };

  if (loading) {
    return (
      <LinearGradient colors={["#0a0e27", "#16213e", "#1a2332"]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00eaff" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
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
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerButton} onPress={toggleSearch}>
                <Ionicons name="search-outline" size={24} color="#00eaff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={markAllAsRead}>
                <Ionicons name="checkmark-done-outline" size={24} color="#00eaff" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Search Bar */}
          <Animated.View
            style={[
              styles.searchContainer,
              {
                maxHeight: searchAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 60],
                }),
                opacity: searchAnim,
              },
            ]}
          >
            <View style={styles.searchInputContainer}>
              <Ionicons name="search-outline" size={20} color="#888" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search notifications..."
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#888" />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{notifications.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#ef4444' }]}>
                {notifications.filter(n => !n.read).length}
              </Text>
              <Text style={styles.statLabel}>Unread</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#22c55e' }]}>
                {notifications.filter(n => n.read).length}
              </Text>
              <Text style={styles.statLabel}>Read</Text>
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
          filter="all"
          label="All"
          count={getFilterCount("all")}
          isActive={selectedFilter === "all"}
          onPress={() => setSelectedFilter("all")}
        />
        <FilterChip
          filter="unread"
          label="Unread"
          count={getFilterCount("unread")}
          isActive={selectedFilter === "unread"}
          onPress={() => setSelectedFilter("unread")}
        />
        <FilterChip
          filter="order"
          label="Orders"
          count={getFilterCount("order")}
          isActive={selectedFilter === "order"}
          onPress={() => setSelectedFilter("order")}
        />
        <FilterChip
          filter="delivery"
          label="Delivery"
          count={getFilterCount("delivery")}
          isActive={selectedFilter === "delivery"}
          onPress={() => setSelectedFilter("delivery")}
        />
        <FilterChip
          filter="promotion"
          label="Offers"
          count={getFilterCount("promotion")}
          isActive={selectedFilter === "promotion"}
          onPress={() => setSelectedFilter("promotion")}
        />
      </ScrollView>

      {/* Notifications List */}
      <ScrollView
        style={styles.notificationsContainer}
        contentContainerStyle={styles.notificationsContent}
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
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={["rgba(0,234,255,0.1)", "rgba(0,234,255,0.02)"]}
              style={styles.emptyGradient}
            >
              <Ionicons name="notifications-outline" size={80} color="#00eaff" />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? `No notifications match "${searchQuery}"`
                  : selectedFilter === "all" 
                    ? "You're all caught up! No notifications to show."
                    : `No ${selectedFilter} notifications found.`}
              </Text>
            </LinearGradient>
          </View>
        ) : (
          filteredNotifications.map((notification, index) => (
            <SwipeableNotification 
              key={notification.id} 
              notification={notification} 
              index={index} 
            />
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
};

export default NotificationScreen;

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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  headerActions: {
    flexDirection: "row",
    gap: 15,
  },
  headerButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(0,234,255,0.1)",
  },
  
  // Search
  searchContainer: {
    overflow: "hidden",
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
  },
  
  // Stats
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
  
  // Notifications
  notificationsContainer: {
    flex: 1,
  },
  notificationsContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  notificationContainer: {
    marginBottom: 12,
  },
  notificationCard: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  unreadNotification: {
    elevation: 6,
    shadowOpacity: 0.2,
    shadowOpacity: 0.2,
    borderWidth: 1,
    borderColor: "rgba(0,234,255,0.3)",
  },
  notificationExpanded: {
    elevation: 8,
    shadowOpacity: 0.3,
  },
  cardGradient: {
    padding: 16,
    position: "relative",
  },
  
  // Priority Indicator
  priorityIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
  },
  
  // Card Header
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  notificationTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    marginLeft: 8,
  },
  notificationTime: {
    color: "#888",
    fontSize: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  
  // Message
  messageContainer: {
    marginBottom: 8,
  },
  notificationMessage: {
    color: "#e5e5e5",
    fontSize: 14,
    lineHeight: 20,
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
    marginBottom: 16,
  },
  primaryAction: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  primaryActionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  primaryActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    gap: 8,
  },
  secondaryActionText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "600",
  },
  
  // Additional Info
  additionalInfo: {
    gap: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    color: "#888",
    fontSize: 12,
  },
  
  // Expand Indicator
  expandIndicator: {
    alignItems: "center",
    marginTop: 8,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    marginTop: 40,
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
    lineHeight: 24,
  },
});