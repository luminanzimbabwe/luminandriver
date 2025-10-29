/**
 * Driver API Service - Production Ready
 *
 * Comprehensive API service for all driver-related endpoints.
 * Supports authentication, orders, earnings, availability, and more.
 *
 * @version 2.0.0
 * @production-ready
 */

// Environment configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://backend-luminan.onrender.com";
const API_VERSION = "/api/v1";
const DRIVER_BASE = `${API_VERSION}/driver`;



/**
 * Generic API request handler with enhanced error handling
 * @param {string} endpoint - API endpoint path
 * @param {string} method - HTTP method
 * @param {object|FormData} body - Request body
 * @param {boolean} isFormData - Whether body is FormData
 * @returns {Promise<object>} - Response data
 */
const apiRequest = async (endpoint, method = "GET", body = null, isFormData = false) => {
  try {
    const headers = {};

    // Only set Content-Type for JSON (not for FormData)
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    const config = {
      method,
      headers,
    };

    // Add body for non-GET requests
    if (body && method !== "GET") {
      config.body = isFormData ? body : JSON.stringify(body);
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, config);

    // Parse response
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error(`API Error [${method} ${endpoint}]:`, error);
    // Don't throw "Authorization header missing" error
    if (error.message.includes("Authorization header missing")) {
      return { success: false, error: `Request failed with status ${response.status}` };
    }
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
};

// ============================================
// DRIVER AUTH & MANAGEMENT ENDPOINTS
// ============================================

/**
 * Register a new driver
 * @param {object} driverData - Driver registration data
 * @returns {Promise<object>} - Registration response with temp_driver_id
 */
export const registerDriver = async (driverData) => {
  // Simplified registration - send as JSON with minimal fields
  const registrationData = {
    username: driverData.username || driverData.name,
    email: driverData.email,
    pin: driverData.pin
  };

  return await apiRequest("/api/v1/driver/register/", "POST", registrationData);
};

/**
 * Login driver (deprecated - no longer used)
 * @param {object} credentials - { identifier, password }
 * @returns {Promise<object>} - Login response with auth token
 */
export const loginDriver = async (credentials) => {
  return await apiRequest("/api/v1/driver/login/", "POST", credentials);
};



/**
 * Get driver profile by driver ID
 * @param {string} driverId - Driver ID
 * @returns {Promise<object>} - Driver profile data
 */
export const getDriverProfile = async (driverId) => {
  return await apiRequest(`/api/v1/driver/profile/${driverId}/`, "GET");
};

/**
 * Get list of orders assigned to the driver
 * @param {string} driverId - Driver ID
 * @returns {Promise<object>} - List of assigned orders
 */
export const getDriverAssignedOrders = async (driverId) => {
  return await apiRequest(`/api/v1/driver/orders/?driver_id=${driverId}`, "GET");
};

/**
 * Get order details by order ID
 * @param {string} orderId - Order ID
 * @returns {Promise<object>} - Order details
 */
export const getOrderDetails = async (orderId) => {
  return await apiRequest(`${DRIVER_BASE}/orders/${orderId}/`, "GET");
};




/**
 * Update driver's current location
 * @param {object} locationData - { latitude, longitude, driver_id }
 * @returns {Promise<object>} - Location update response
 */
export const updateDriverLocation = async (locationData) => {
  return await apiRequest("/api/v1/driver/location/update/", "POST", locationData);
};

/**
 * Set driver's price per kg
 * @param {object} priceData - { price_per_kg, driver_id }
 * @returns {Promise<object>} - Price setting response
 */
export const setDriverPricePerKg = async (priceData) => {
  return await apiRequest("/api/v1/driver/pricing/set/", "POST", priceData);
};

// ============================================
// DRIVER ORDER ACTIONS
// ============================================

/**
 * Confirm an order
 * @param {string} orderId - Order ID
 * @param {string} driverId - Driver ID
 * @returns {Promise<object>} - Order confirmation response
 */
export const confirmOrder = async (orderId, driverId) => {
  // Accept whatever driver identifier is available and let the backend decide
  // whether the driver exists. This avoids client-side false negatives when
  // temporary IDs or non-standard IDs are used (e.g., during registration
  // or offline cached profiles).
  if (!driverId) {
    return { success: false, error: "No driver ID provided" };
  }

  return await apiRequest(`${DRIVER_BASE}/orders/${orderId}/confirm/`, "POST", { driver_id: driverId });
};

/**
 * Cancel an order
 * @param {string} orderId - Order ID
 * @param {object} cancelData - Optional cancellation reason { reason, driver_id }
 * @returns {Promise<object>} - Order cancellation response
 */
export const cancelOrder = async (orderId, cancelData = {}) => {
  return await apiRequest(`${DRIVER_BASE}/orders/${orderId}/cancel/`, "POST", cancelData);
};

/**
 * Mark an order as delivered
 * @param {string} orderId - Order ID
 * @param {string} driverId - Driver ID
 * @returns {Promise<object>} - Order delivery confirmation response
 */
export const markOrderAsDelivered = async (orderId, driverId) => {
  return await apiRequest(`${DRIVER_BASE}/orders/${orderId}/delivered/`, "POST", {});
};

// ============================================
// ADDITIONAL ORDER ACTIONS
// ============================================

/**
 * Accept an order
 */
export const acceptOrder = async (orderId, driverId) => {
  return await apiRequest(`${DRIVER_BASE}/orders/${orderId}/accept/`, "POST", { driver_id: driverId });
};

/**
 * Mark order as picked up
 */
export const markOrderPickedUp = async (orderId, driverId) => {
  return await apiRequest(`${DRIVER_BASE}/orders/${orderId}/pickup/`, "POST", { driver_id: driverId });
};

/**
 * Start delivery for an order
 */
export const startDelivery = async (orderId, driverId) => {
  return await apiRequest(`${DRIVER_BASE}/orders/${orderId}/start-delivery/`, "POST", { driver_id: driverId });
};

/**
 * Update order ETA
 */
export const updateOrderETA = async (orderId, etaData) => {
  return await apiRequest(`${DRIVER_BASE}/orders/${orderId}/eta/`, "POST", etaData);
};

// ============================================
// EARNINGS & FINANCIAL
// ============================================

/**
 * Get driver earnings
 */
export const getDriverEarnings = async (driverId, params = {}) => {
  const queryString = new URLSearchParams({ ...params, driver_id: driverId }).toString();
  const endpoint = `${DRIVER_BASE}/earnings/${queryString ? `?${queryString}` : ''}`;
  return await apiRequest(endpoint, "GET");
};

/**
 * Get earnings summary
 */
export const getEarningsSummary = async (driverId) => {
  return await apiRequest(`${DRIVER_BASE}/earnings/summary/?driver_id=${driverId}`, "GET");
};

/**
 * Get payment history
 */
export const getPaymentHistory = async (driverId, params = {}) => {
  const queryString = new URLSearchParams({ ...params, driver_id: driverId }).toString();
  const endpoint = `${DRIVER_BASE}/payments/history/${queryString ? `?${queryString}` : ''}`;
  return await apiRequest(endpoint, "GET");
};

/**
 * Get driver wallet
 */
export const getDriverWallet = async (driverId) => {
  return await apiRequest(`${DRIVER_BASE}/wallet/?driver_id=${driverId}`, "GET");
};

/**
 * Request withdrawal
 */
export const requestWithdrawal = async (withdrawalData) => {
  return await apiRequest(`${DRIVER_BASE}/wallet/withdraw/`, "POST", withdrawalData);
};

// ============================================
// AVAILABILITY & SCHEDULE
// ============================================

/**
 * Update driver status
 */
export const updateDriverStatus = async (statusData) => {
  return await apiRequest(`${DRIVER_BASE}/status/`, "POST", statusData);
};

/**
 * Manage driver schedule
 */
export const manageDriverSchedule = async (scheduleData) => {
  return await apiRequest(`${DRIVER_BASE}/schedule/`, "POST", scheduleData);
};

/**
 * Toggle availability
 */
export const toggleAvailability = async (driverId) => {
  return await apiRequest(`${DRIVER_BASE}/availability/toggle/`, "POST", { driver_id: driverId });
};

/**
 * Start break
 */
export const startBreak = async (breakData) => {
  return await apiRequest(`${DRIVER_BASE}/break/start/`, "POST", breakData);
};

/**
 * End break
 */
export const endBreak = async (driverId) => {
  return await apiRequest(`${DRIVER_BASE}/break/end/`, "POST", { driver_id: driverId });
};

// ============================================
// STATISTICS & PERFORMANCE
// ============================================

/**
 * Get driver statistics
 */
export const getDriverStatistics = async (driverId, params = {}) => {
  const queryString = new URLSearchParams({ ...params, driver_id: driverId }).toString();
  const endpoint = `${DRIVER_BASE}/statistics/${queryString ? `?${queryString}` : ''}`;
  return await apiRequest(endpoint, "GET");
};





// ============================================
// STATISTICS & PERFORMANCE (Correction)
// ============================================

/**
 * Get specific driver performance metrics (for dashboard)
 * Using driver_id as query parameter to match backend expectations
 */
export const getPerformanceMetrics = async (driverId) => {
    return await apiRequest(`${DRIVER_BASE}/performance/?driver_id=${driverId}`, "GET");
};








/**
 * Get driver performance
 */
export const getDriverPerformance = async (driverId) => {
  return await apiRequest(`${DRIVER_BASE}/performance/?driver_id=${driverId}`, "GET");
};

/**
 * Get driver ratings
 */
export const getDriverRatings = async (driverId) => {
  return await apiRequest(`${DRIVER_BASE}/ratings/?driver_id=${driverId}`, "GET");
};

/**
 * Get driver reviews
 */
export const getDriverReviews = async (driverId, params = {}) => {
  const queryString = new URLSearchParams({ ...params, driver_id: driverId }).toString();
  const endpoint = `${DRIVER_BASE}/reviews/${queryString ? `?${queryString}` : ''}`;
  return await apiRequest(endpoint, "GET");
};

/**
 * Get driver leaderboard
 */
export const getDriverLeaderboard = async (driverId, params = {}) => {
  const queryString = new URLSearchParams({ ...params, driver_id: driverId }).toString();
  const endpoint = `${DRIVER_BASE}/leaderboard/${queryString ? `?${queryString}` : ''}`;
  return await apiRequest(endpoint, "GET");
};

// ============================================
// VEHICLE & DOCUMENTATION
// ============================================

/**
 * Update driver vehicle
 */
export const updateDriverVehicle = async (vehicleData) => {
  return await apiRequest(`${DRIVER_BASE}/vehicle/`, "POST", vehicleData);
};

/**
 * Get driver documents
 */
export const getDriverDocuments = async (driverId) => {
  return await apiRequest(`${DRIVER_BASE}/documents/?driver_id=${driverId}`, "GET");
};

/**
 * Upload driver document
 */
export const uploadDriverDocument = async (formData) => {
  return await apiRequest(`${DRIVER_BASE}/documents/upload/`, "POST", formData, true);
};

/**
 * Update driver profile
 */
export const updateDriverProfile = async (profileData) => {
  return await apiRequest(`${DRIVER_BASE}/profile/update/`, "POST", profileData);
};

/**
 * Update driver photo
 */
export const updateDriverPhoto = async (formData) => {
  return await apiRequest(`${DRIVER_BASE}/profile/photo/`, "POST", formData, true);
};

// ============================================
// SUPPORT & COMMUNICATION
// ============================================

/**
 * Get driver support tickets
 */
export const getDriverSupportTickets = async (driverId) => {
  return await apiRequest(`${DRIVER_BASE}/support/tickets/?driver_id=${driverId}`, "GET");
};

/**
 * Create support ticket
 */
export const createSupportTicket = async (ticketData) => {
  return await apiRequest(`${DRIVER_BASE}/support/tickets/create/`, "POST", ticketData);
};

/**
 * Get support ticket detail
 */
export const getSupportTicketDetail = async (ticketId, driverId) => {
  return await apiRequest(`${DRIVER_BASE}/support/tickets/${ticketId}/?driver_id=${driverId}`, "GET");
};

/**
 * Report driver issue
 */
export const reportDriverIssue = async (issueData) => {
  return await apiRequest(`${DRIVER_BASE}/report-issue/`, "POST", issueData);
};

/**
 * Trigger emergency alert
 */
export const triggerEmergencyAlert = async (emergencyData) => {
  return await apiRequest(`${DRIVER_BASE}/emergency/`, "POST", emergencyData);
};

// ============================================
// NAVIGATION & ROUTES
// ============================================

/**
 * Optimize delivery route
 */
export const optimizeDeliveryRoute = async (routeData) => {
  return await apiRequest(`${DRIVER_BASE}/route/optimize/`, "POST", routeData);
};

/**
 * Get order directions
 */
export const getOrderDirections = async (orderId, driverId) => {
  return await apiRequest(`${DRIVER_BASE}/orders/${orderId}/directions/?driver_id=${driverId}`, "GET");
};

/**
 * Get delivery history
 */
export const getDeliveryHistory = async (driverId, params = {}) => {
  const queryString = new URLSearchParams({ ...params, driver_id: driverId }).toString();
  const endpoint = `${DRIVER_BASE}/delivery-history/${queryString ? `?${queryString}` : ''}`;
  return await apiRequest(endpoint, "GET");
};

/**
 * Get nearby orders
 */
export const getNearbyOrders = async (driverId, params = {}) => {
  const queryString = new URLSearchParams({ ...params, driver_id: driverId }).toString();
  const endpoint = `${DRIVER_BASE}/nearby-orders/${queryString ? `?${queryString}` : ''}`;
  return await apiRequest(endpoint, "GET");
};

// ============================================
// NOTIFICATIONS
// ============================================

/**
 * Get driver notifications
 */
export const getDriverNotifications = async (driverId, params = {}) => {
  const queryString = new URLSearchParams({ ...params, driver_id: driverId }).toString();
  const endpoint = `${DRIVER_BASE}/notifications/${queryString ? `?${queryString}` : ''}`;
  return await apiRequest(endpoint, "GET");
};

/**
 * Mark notification as read
 */
export const markNotificationRead = async (notificationId, driverId) => {
  return await apiRequest(`${DRIVER_BASE}/notifications/${notificationId}/read/`, "POST", { driver_id: driverId });
};

/**
 * Update notification settings
 */
export const updateNotificationSettings = async (settingsData) => {
  return await apiRequest(`${DRIVER_BASE}/notifications/settings/`, "POST", settingsData);
};

/**
 * Get welcome message
 * @param {string} driverId - Driver ID
 * @returns {Promise<object>} - Welcome message response
 */
export const getWelcomeMessage = async (driverId) => {
  return await apiRequest(`${DRIVER_BASE}/welcome/?driver_id=${driverId}`, "GET");
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const getBackendUrl = () => BACKEND_URL;

// ============================================
// DEFAULT EXPORT - ALL FUNCTIONS
// ============================================

export default {
  // Auth & Management
  registerDriver,
  getDriverProfile,
  getDriverAssignedOrders,
  getOrderDetails,
  updateDriverLocation,
  setDriverPricePerKg,
  
  // Order Actions (Basic)
  confirmOrder,
  cancelOrder,
  markOrderAsDelivered,
  
  // Order Actions (Extended)
  acceptOrder,
  markOrderPickedUp,
  startDelivery,
  updateOrderETA,
  
  // Earnings & Financial
  getDriverEarnings,
  getEarningsSummary,
  getPaymentHistory,
  getDriverWallet,
  requestWithdrawal,
  
  // Availability & Schedule
  updateDriverStatus,
  manageDriverSchedule,
  toggleAvailability,
  startBreak,
  endBreak,
  
  // Statistics & Performance
  getDriverStatistics,
  getDriverPerformance,
  getDriverRatings,
  getDriverReviews,
  getDriverLeaderboard,
  getPerformanceMetrics,
  
  // Vehicle & Documentation
  updateDriverVehicle,
  getDriverDocuments,
  uploadDriverDocument,
  updateDriverProfile,
  updateDriverPhoto,
  
  // Support & Communication
  getDriverSupportTickets,
  createSupportTicket,
  getSupportTicketDetail,
  reportDriverIssue,
  triggerEmergencyAlert,
  
  // Navigation & Routes
  optimizeDeliveryRoute,
  getOrderDirections,
  getDeliveryHistory,
  getNearbyOrders,
  
  // Notifications
  getDriverNotifications,
  markNotificationRead,
  updateNotificationSettings,
  
  // Utilities
  getBackendUrl,
  getWelcomeMessage,
};
