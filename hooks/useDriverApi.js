import { useState, useCallback } from "react";
import { useDriverAuth } from "../DriverAuthContext";
import driverApi from "../services/driverApi";

/**
 * Custom hook for driver API operations - Production Ready
 * Provides easy-to-use methods with built-in loading and error handling
 * Supports all 50+ driver API endpoints
 * 
 * @version 2.0.0
 */
export const useDriverApi = () => {
  const { driver } = useDriverAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Generic API call wrapper with enhanced error handling and retry logic
   */
  const callApi = useCallback(async (apiFunction, ...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunction(...args);
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err.message || "An unexpected error occurred";
      setError(errorMessage);

      // Check for token-related errors
      if (errorMessage.includes("403") || errorMessage.includes("Invalid or expired token")) {
        return { success: false, error: errorMessage, isTokenError: true };
      }

      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // DRIVER PROFILE & MANAGEMENT
  // ============================================

  const getProfile = useCallback(
    async () => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.getDriverProfile, driver._id);
    },
    [driver, callApi]
  );

  const updateLocation = useCallback(
    async (locationData) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.updateDriverLocation, { ...locationData, driver_id: driver._id });
    },
    [driver, callApi]
  );

  const setPricing = useCallback(
    async (priceData) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.setDriverPricePerKg, { ...priceData, driver_id: driver._id });
    },
    [driver, callApi]
  );

  // ============================================
  // ORDER MANAGEMENT
  // ============================================

  const getOrders = useCallback(async () => {
    if (!driver?._id) return { success: false, error: "No driver ID" };
    return await callApi(driverApi.getDriverAssignedOrders, driver._id);
  }, [driver, callApi]);

  const confirmOrder = useCallback(
    async (orderId) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.confirmOrder, orderId, driver._id);
    },
    [driver, callApi]
  );

  const cancelOrder = useCallback(
    async (orderId, cancelData = {}) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.cancelOrder, orderId, { ...cancelData, driver_id: driver._id });
    },
    [driver, callApi]
  );

  const markOrderAsDelivered = useCallback(
    async (orderId) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.markOrderAsDelivered, orderId);
    },
    [driver, callApi]
  );

  const getOrderDetails = useCallback(
    async (orderId) => {
      return await callApi(driverApi.getOrderDetails, orderId);
    },
    [callApi]
  );

  // ============================================
  // EXTENDED ORDER ACTIONS
  // ============================================

  const acceptOrder = useCallback(
    async (orderId) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.acceptOrder, orderId, { driver_id: driver._id });
    },
    [driver, callApi]
  );

  const markPickedUp = useCallback(
    async (orderId) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.markOrderPickedUp, orderId, { driver_id: driver._id });
    },
    [driver, callApi]
  );

  const startDelivery = useCallback(
    async (orderId) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.startDelivery, orderId, { driver_id: driver._id });
    },
    [driver, callApi]
  );

  const updateETA = useCallback(
    async (orderId, etaData) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.updateOrderETA, orderId, { ...etaData, driver_id: driver._id });
    },
    [driver, callApi]
  );

  // ============================================
  // EARNINGS & FINANCIAL
  // ============================================

  const getEarnings = useCallback(
    async (params) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.getDriverEarnings, driver._id, params);
    },
    [driver, callApi]
  );

  const getEarningsSummary = useCallback(async () => {
    if (!driver?._id) return { success: false, error: "No driver ID" };
    return await callApi(driverApi.getEarningsSummary, driver._id);
  }, [driver, callApi]);

  const getPaymentHistory = useCallback(
    async (params) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.getPaymentHistory, driver._id, params);
    },
    [driver, callApi]
  );

  const getWallet = useCallback(async () => {
    if (!driver?._id) return { success: false, error: "No driver ID" };
    return await callApi(driverApi.getDriverWallet, driver._id);
  }, [driver, callApi]);

  const requestWithdrawal = useCallback(
    async (withdrawalData) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.requestWithdrawal, { ...withdrawalData, driver_id: driver._id });
    },
    [driver, callApi]
  );

  // ============================================
  // AVAILABILITY & SCHEDULE
  // ============================================

  const updateStatus = useCallback(
    async (statusData) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.updateDriverStatus, { ...statusData, driver_id: driver._id });
    },
    [driver, callApi]
  );

  const manageSchedule = useCallback(
    async (scheduleData) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.manageDriverSchedule, { ...scheduleData, driver_id: driver._id });
    },
    [driver, callApi]
  );

  const toggleAvailability = useCallback(async () => {
    if (!driver?._id) return { success: false, error: "No driver ID" };
    return await callApi(driverApi.toggleAvailability, { driver_id: driver._id });
  }, [driver, callApi]);

  const startBreak = useCallback(
    async (breakData) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.startBreak, { ...breakData, driver_id: driver._id });
    },
    [driver, callApi]
  );

  const endBreak = useCallback(async () => {
    if (!driver?._id) return { success: false, error: "No driver ID" };
    return await callApi(driverApi.endBreak, { driver_id: driver._id });
  }, [driver, callApi]);

  // ============================================
  // STATISTICS & PERFORMANCE
  // ============================================

  const getStatistics = useCallback(
    async (params) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.getDriverStatistics, driver._id, params);
    },
    [driver, callApi]
  );

  const getPerformance = useCallback(async () => {
    if (!driver?._id) return { success: false, error: "No driver ID" };
    return await callApi(driverApi.getDriverPerformance, driver._id);
  }, [driver, callApi]);

  const getRatings = useCallback(async () => {
    if (!driver?._id) return { success: false, error: "No driver ID" };
    return await callApi(driverApi.getDriverRatings, driver._id);
  }, [driver, callApi]);

  const getReviews = useCallback(
    async (params) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.getDriverReviews, driver._id, params);
    },
    [driver, callApi]
  );

  // ============================================
// STATISTICS & PERFORMANCE
// ============================================

// ... (existing getStatistics, getPerformance, getRatings, getReviews, getLeaderboard) ...

// ** <-- ADD THIS NEW FUNCTION IMPLEMENTATION --> **
const getDriverPerformanceMetrics = useCallback(async () => {
    if (!driver?._id) return { success: false, error: "No driver ID" };
    // Assuming 'driverApi.getPerformanceMetrics' is the correct method name 
    // in your '../services/driverApi.js' file that fetches the specific metrics dashboard data.
    return await callApi(driverApi.getPerformanceMetrics, driver._id);
}, [driver, callApi]); 
// ** <-- END OF NEW FUNCTION IMPLEMENTATION --> **

// ...

  const getLeaderboard = useCallback(async () => {
    if (!driver?._id) return { success: false, error: "No driver ID" };
    return await callApi(driverApi.getDriverLeaderboard, driver._id);
  }, [driver, callApi]);

  // ============================================
  // VEHICLE & DOCUMENTATION
  // ============================================

  const updateVehicle = useCallback(
    async (vehicleData) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.updateDriverVehicle, { ...vehicleData, driver_id: driver._id });
    },
    [driver, callApi]
  );

  const getDocuments = useCallback(async () => {
    if (!driver?._id) return { success: false, error: "No driver ID" };
    return await callApi(driverApi.getDriverDocuments, driver._id);
  }, [driver, callApi]);

  const uploadDocument = useCallback(
    async (formData) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      // Add driver_id to formData
      formData.append('driver_id', driver._id);
      return await callApi(driverApi.uploadDriverDocument, formData);
    },
    [driver, callApi]
  );

  const updateProfile = useCallback(
    async (profileData) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.updateDriverProfile, { ...profileData, driver_id: driver._id });
    },
    [driver, callApi]
  );

  const updatePhoto = useCallback(
    async (formData) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      // Add driver_id to formData
      formData.append('driver_id', driver._id);
      return await callApi(driverApi.updateDriverPhoto, formData);
    },
    [driver, callApi]
  );

  // ============================================
  // SUPPORT & COMMUNICATION
  // ============================================

  const getSupportTickets = useCallback(async () => {
    if (!driver?._id) return { success: false, error: "No driver ID" };
    return await callApi(driverApi.getDriverSupportTickets, driver._id);
  }, [driver, callApi]);

  const createTicket = useCallback(
    async (ticketData) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.createSupportTicket, { ...ticketData, driver_id: driver._id });
    },
    [driver, callApi]
  );

  const getTicketDetail = useCallback(
    async (ticketId) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.getSupportTicketDetail, ticketId, driver._id);
    },
    [driver, callApi]
  );

  const reportIssue = useCallback(
    async (issueData) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.reportDriverIssue, { ...issueData, driver_id: driver._id });
    },
    [driver, callApi]
  );

  const triggerEmergency = useCallback(
    async (emergencyData) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.triggerEmergencyAlert, { ...emergencyData, driver_id: driver._id });
    },
    [driver, callApi]
  );

  // ============================================
  // NAVIGATION & ROUTES
  // ============================================

  const optimizeRoute = useCallback(
    async (routeData) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.optimizeDeliveryRoute, { ...routeData, driver_id: driver._id });
    },
    [driver, callApi]
  );

  const getDirections = useCallback(
    async (orderId) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.getOrderDirections, orderId, driver._id);
    },
    [driver, callApi]
  );

  const getDeliveryHistory = useCallback(
    async (params) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.getDeliveryHistory, driver._id, params);
    },
    [driver, callApi]
  );

  const getNearbyOrders = useCallback(
    async (params) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.getNearbyOrders, driver._id, params);
    },
    [driver, callApi]
  );

  // ============================================
  // NOTIFICATIONS
  // ============================================

  const getNotifications = useCallback(
    async (params) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.getDriverNotifications, driver._id, params);
    },
    [driver, callApi]
  );

  const markNotificationRead = useCallback(
    async (notificationId) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.markNotificationRead, notificationId, driver._id);
    },
    [driver, callApi]
  );

  const updateNotificationSettings = useCallback(
    async (settingsData) => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.updateNotificationSettings, { ...settingsData, driver_id: driver._id });
    },
    [driver, callApi]
  );

  return {
    loading,
    error,
    
    // Profile & Management
    getProfile,
    updateLocation,
    setPricing,
    updateProfile,
    updatePhoto,
    
    // Order Management (Basic)
    getOrders,
    getOrderDetails,
    confirmOrder,
    cancelOrder,
    markOrderAsDelivered,
    
    // Order Management (Extended)
    acceptOrder,
    markPickedUp,
    startDelivery,
    updateETA,
    
    // Earnings & Financial
    getEarnings,
    getEarningsSummary,
    getPaymentHistory,
    getWallet,
    requestWithdrawal,
    
    // Availability & Schedule
    updateStatus,
    manageSchedule,
    toggleAvailability,
    startBreak,
    endBreak,
    
    // Statistics & Performance
    getStatistics,
    getPerformance,
    getRatings,
    getReviews,
    getLeaderboard,
    getDriverPerformanceMetrics,
    
    // Vehicle & Documentation
    updateVehicle,
    getDocuments,
    uploadDocument,
    
    // Support & Communication
    getSupportTickets,
    createTicket,
    getTicketDetail,
    reportIssue,
    triggerEmergency,
    
    // Navigation & Routes
    optimizeRoute,
    getDirections,
    getDeliveryHistory,
    getNearbyOrders,
    
    // Notifications
    getNotifications,
    markNotificationRead,
    updateNotificationSettings,

    // Welcome Message
    getWelcomeMessage: useCallback(async () => {
      if (!driver?._id) return { success: false, error: "No driver ID" };
      return await callApi(driverApi.getWelcomeMessage, driver._id);
    }, [driver, callApi]),
  };
};

export default useDriverApi;
