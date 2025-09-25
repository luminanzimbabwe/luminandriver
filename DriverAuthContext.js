import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DriverAuthContext = createContext();

export const DriverAuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(null);
  const [loading, setLoading] = useState(true); // show loading initially
  const BACKEND_URL = "https://backend-luminan.onrender.com";

  /** Sign in: stores auth token */
  const signIn = (token) => {
    if (!token) return;
    setAuthToken(token);
    AsyncStorage.setItem("driverAuthToken", token); // Use AsyncStorage in React Native
  };

  /** Sign out */
  const signOut = () => {
    setAuthToken(null);
    AsyncStorage.removeItem("driverAuthToken");
  };

  /** Validate token with backend: returns true if valid, false if invalid */
  const validateToken = async (token) => {
    try {
      const res = await fetch(`${BACKEND_URL}/driver/me/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      return res.ok;
    } catch (err) {
      console.error("Token validation failed:", err);
      return false;
    }
  };

  /** Initialize auth: checks if token is valid on app start */
  const initAuth = async () => {
    setLoading(true);
    const token = await AsyncStorage.getItem("driverAuthToken");

    if (token) {
      const valid = await validateToken(token);
      if (valid) {
        signIn(token); // If valid, sign in with the token
      } else {
        signOut(); // If invalid, sign out and clear token
      }
    } else {
      signOut(); // No token found, sign out
    }

    setLoading(false);
  };

  useEffect(() => {
    initAuth(); // Run auth initialization on mount
  }, []);

  /** Fetch wrapper for driver API calls using token auth */
  const fetchDriverAPI = async (endpoint, options = {}) => {
    if (!authToken) throw new Error("Driver not signed in");

    const method = options.method || "GET";
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        ...options,
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
          ...options.headers,
        },
        body: method !== "GET" && options.body ? JSON.stringify(options.body) : null,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Request failed");
      }

      return res.json();
    } catch (error) {
      console.error("Fetch request failed:", error);
      throw error;
    }
  };

  const isLoggedIn = !!authToken;

  return (
    <DriverAuthContext.Provider
      value={{
        authToken,
        loading,
        isLoggedIn,
        signIn,
        signOut,
        fetchDriverAPI,
        initAuth,
      }}
    >
      {children}
    </DriverAuthContext.Provider>
  );
};

/** Custom hook */
export const useDriverAuth = () => {
  const context = useContext(DriverAuthContext);
  if (!context)
    throw new Error("useDriverAuth must be used inside DriverAuthProvider");
  return context;
};
