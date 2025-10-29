import * as Location from 'expo-location';

class LocationTracker {
  constructor() {
    this.ws = null;
    this.isTracking = false;
    this.orderId = null;
    this.driverId = null;
    this.intervalId = null;

    // General tracking properties
    this.generalWs = null;
    this.isGeneralTracking = false;
    this.generalDriverId = null;
    this.generalIntervalId = null;
  }

  async requestPermissions() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }
  }

  async startTracking(orderId, driverId) {
    if (this.isTracking) {
      console.log('Already tracking location');
      return;
    }

    try {
      await this.requestPermissions();

      this.orderId = orderId;
      this.driverId = driverId;
      this.isTracking = true;

      // Connect to WebSocket
      const wsUrl = `wss://backend-luminan.onrender.com/ws/track/${orderId}/`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected for order tracking');
        this.startLocationUpdates();
      };

      this.ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.stopTracking();
      };

    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  async startLocationUpdates() {
    // Send location every 2 seconds (like the simulator)
    this.intervalId = setInterval(async () => {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const { latitude, longitude } = location.coords;
        const timestamp = new Date().toISOString();

        const message = {
          driver_id: this.driverId,
          lat: latitude,
          lng: longitude,
          timestamp: timestamp,
        };

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(message));
          console.log('Sent location update:', message);
        } else {
          console.warn('WebSocket not open, cannot send location update');
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    }, 2000); // Update every 2 seconds
  }

  stopTracking() {
    this.isTracking = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    console.log('Location tracking stopped');
  }

  isCurrentlyTracking() {
    return this.isTracking;
  }

  // --- GENERAL DRIVER TRACKING (for admin monitoring) ---
  async startGeneralTracking(driverId) {
    if (this.isGeneralTracking) {
      console.log('Already doing general tracking');
      return;
    }

    try {
      await this.requestPermissions();

      this.generalDriverId = driverId;
      this.isGeneralTracking = true;

      // Connect to general driver tracking WebSocket
      const wsUrl = `wss://backend-luminan.onrender.com/ws/driver/track/${driverId}/`;
      this.generalWs = new WebSocket(wsUrl);

      this.generalWs.onopen = () => {
        console.log('WebSocket connected for general driver tracking');
        this.startGeneralLocationUpdates();
      };

      this.generalWs.onmessage = (event) => {
        console.log('General tracking WebSocket message received:', event.data);
      };

      this.generalWs.onerror = (error) => {
        console.error('General tracking WebSocket error:', error);
      };

      this.generalWs.onclose = () => {
        console.log('General tracking WebSocket closed');
        this.stopGeneralTracking();
      };

    } catch (error) {
      console.error('Error starting general location tracking:', error);
      throw error;
    }
  }

  async startGeneralLocationUpdates() {
    // Send location every 5 seconds for general tracking (less frequent than order tracking)
    this.generalIntervalId = setInterval(async () => {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const { latitude, longitude } = location.coords;
        const timestamp = new Date().toISOString();

        const message = {
          driver_id: this.generalDriverId,
          lat: latitude,
          lng: longitude,
          timestamp: timestamp,
          status: 'available', // or 'busy' based on current order status
        };

        if (this.generalWs && this.generalWs.readyState === WebSocket.OPEN) {
          this.generalWs.send(JSON.stringify(message));
          console.log('Sent general location update:', message);
        } else {
          console.warn('General WebSocket not open, cannot send location update');
        }
      } catch (error) {
        console.error('Error getting location for general tracking:', error);
      }
    }, 5000); // Update every 5 seconds
  }

  stopGeneralTracking() {
    this.isGeneralTracking = false;

    if (this.generalIntervalId) {
      clearInterval(this.generalIntervalId);
      this.generalIntervalId = null;
    }

    if (this.generalWs) {
      this.generalWs.close();
      this.generalWs = null;
    }

    console.log('General location tracking stopped');
  }

  isGeneralTrackingActive() {
    return this.isGeneralTracking;
  }
}

// Export a singleton instance
export default new LocationTracker();
