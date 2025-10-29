// DriverAuthContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SHA256 } from "crypto-js";
import { Alert } from "react-native";
import driverApi from "./services/driverApi";

const DriverAuthContext = createContext();

export const DriverAuthProvider = ({ children }) => {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pinRequired, setPinRequired] = useState(false);

  // --- Helper: Update cache safely with retries ---
  const updateDriverCache = useCallback(async (driverData) => {
    let retries = 3;
    while (retries > 0) {
      try {
        await AsyncStorage.setItem("driverProfile", JSON.stringify(driverData));
        return true;
      } catch (err) {
        retries--;
        console.warn(`⚠️ AsyncStorage write failed, retries left: ${retries}`, err);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    console.error("❌ Critical error saving profile to cache.");
    return false;
  }, []);

  // --- Sign Out ---
  const signOut = async () => {
    console.log("Signing out driver...");

    // Stop general location tracking
    try {
      const locationTracker = (await import('./services/locationTracker')).default;
      if (locationTracker.isGeneralTrackingActive()) {
        locationTracker.stopGeneralTracking();
        console.log("✅ General location tracking stopped");
      }
    } catch (error) {
      console.warn("⚠️ Failed to stop general location tracking:", error);
    }

    setDriver(null);
    await AsyncStorage.removeItem("driverProfile");
    await AsyncStorage.removeItem("pinLastLogin");
    setPinRequired(false);
    console.log("Sign out complete");
  };

  // --- PIN expiry check ---
  const isPinExpired = async () => {
    // Disable PIN expiry to prevent logout
    return false; // Never expire PIN
  };

  // --- Initialize Authentication ---
  const initAuth = async () => {
    console.log("🔄 Initializing auth...");
    try {
      // 1️⃣ Load cached profile
      let cachedProfile = null;
      let retries = 3;
      while (retries > 0) {
        try {
          cachedProfile = await AsyncStorage.getItem("driverProfile");
          break;
        } catch (err) {
          retries--;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      if (cachedProfile) {
        const parsedProfile = JSON.parse(cachedProfile);
        const expired = await isPinExpired();

        if (expired) {
          console.log("⏰ PIN expired — forcing re-login via PIN");
          setPinRequired(true);
          setDriver(null);
        } else {
          // Allow access as long as driver has ID, regardless of verification
          setDriver(parsedProfile);
          setPinRequired(false); // ✅ explicitly allow access

          // Optional: refresh from backend
          const driverId = parsedProfile._id || parsedProfile.id;
          if (driverId) {
            console.log(`📡 Cached ID found: ${driverId}. Checking server...`);
            const refreshResult = await driverApi.getDriverProfile(driverId);
            if (refreshResult.success && refreshResult.data?.driver) {
              const freshDriverData = refreshResult.data.driver;
              setDriver(freshDriverData);
              await updateDriverCache(freshDriverData);
              console.log("✅ Profile refreshed successfully.");

              // Start general location tracking for admin monitoring
              try {
                const locationTracker = (await import('./services/locationTracker')).default;
                if (!locationTracker.isGeneralTrackingActive()) {
                  await locationTracker.startGeneralTracking(driverId);
                  console.log("✅ General location tracking started for admin monitoring");
                }
              } catch (error) {
                console.warn("⚠️ Failed to start general location tracking:", error);
              }
            } else {
              console.warn("⚠️ Profile refresh failed - driver may have been deleted from backend.");
              // Force logout if driver not found on backend
              console.log("🚪 Forcing logout due to driver deletion...");
              await signOut();
              return;
            }
          }
        }
      } else {
        console.log("ℹ️ No cached driver profile.");
        // Always require PIN or registration
        setPinRequired(true);
      }
    } catch (error) {
      console.error("❌ Fatal error during auth initialization:", error);
      await AsyncStorage.removeItem("driverProfile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const isLoggedIn = !!driver;

  return (
    <DriverAuthContext.Provider
      value={{
        driver,
        loading,
        isLoggedIn,
        signOut,
        pinRequired,



        // --- Driver registration ---
        registerDriver: async (driverData) => {
          const result = await driverApi.registerDriver(driverData);
          if (result.success && result.data.driver) {
            // Driver is now immediately verified - no OTP needed
            const driverDataFromResponse = result.data.driver;

            // Store the PIN locally for login
            if (driverData.pin) {
              const hashedPin = SHA256(driverData.pin).toString();
              await AsyncStorage.setItem("driverPin", hashedPin);
              await AsyncStorage.setItem("pinLastLogin", new Date().toISOString());
            }

            // Cache the verified driver data immediately
            await updateDriverCache(driverDataFromResponse);

            // Set driver immediately after registration - they're ready to use
            setDriver(driverDataFromResponse);

            // Start general location tracking for admin monitoring
            try {
              const locationTracker = (await import('./services/locationTracker')).default;
              if (!locationTracker.isGeneralTrackingActive()) {
                await locationTracker.startGeneralTracking(driverDataFromResponse._id);
                console.log("✅ General location tracking started for new driver");
              }
            } catch (error) {
              console.warn("⚠️ Failed to start general location tracking:", error);
            }

            return { success: true, driver: driverDataFromResponse };
          }
          return { success: false, error: result.error || "Registration failed" };
        },

        // --- PIN handling ---
        setPin: async (pin) => {
          const hashedPin = SHA256(pin).toString();
          await AsyncStorage.setItem("driverPin", hashedPin);
          await AsyncStorage.setItem("pinLastLogin", new Date().toISOString()); // reset 8h timer
          setPinRequired(false);
        },
        verifyPin: async (pin) => {
          const storedPin = await AsyncStorage.getItem("driverPin");
          if (!storedPin) return false;
          const hashedPin = SHA256(pin).toString();
          if (hashedPin === storedPin) {
            await AsyncStorage.setItem("pinLastLogin", new Date().toISOString()); // reset 8h timer
            setPinRequired(false);
            // Restore driver from cache
            const cachedProfile = await AsyncStorage.getItem("driverProfile");
            if (cachedProfile) {
              const driverData = JSON.parse(cachedProfile);
              // Allow access as long as driver has ID, regardless of verification or orders
              setDriver(driverData);
              return true;
            }
            return true;
          }
          return false;
        },
        clearPin: async () => {
          await AsyncStorage.removeItem("driverPin");
          await AsyncStorage.removeItem("pinLastLogin");
          setPinRequired(false);
        },
      }}
    >
      {children}
    </DriverAuthContext.Provider>
  );
};

export const useDriverAuth = () => {
  const context = useContext(DriverAuthContext);
  if (!context) throw new Error("useDriverAuth must be used inside DriverAuthProvider");
  return context;
};
