import React, { createContext, useState, useContext, useEffect } from "react";

const DriverAuthContext = createContext();

export const DriverAuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(null);
  const [loading, setLoading] = useState(true); // show loading initially
  const BACKEND_URL = "http://localhost:8000";

  /** Sign in: stores auth token */
  const signIn = (token) => {
    if (!token) return;
    setAuthToken(token);
    localStorage.setItem("driverAuthToken", token);
  };

  /** Sign out */
  const signOut = () => {
    setAuthToken(null);
    localStorage.removeItem("driverAuthToken");
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
      return false;
    }
  };

  /** Initialize auth: always force login */
  const initAuth = async () => {
    setLoading(true);
    const token = localStorage.getItem("driverAuthToken");

    if (token) {
      const valid = await validateToken(token);
      if (valid) {
        // optional: still force login if you want
        // signIn(token);
        signOut(); // remove token so driver always sees login
      } else {
        signOut(); // invalid token, remove
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    initAuth();
  }, []);

  /** Fetch wrapper for driver API calls using token auth */
  const fetchDriverAPI = async (endpoint, options = {}) => {
    if (!authToken) throw new Error("Driver not signed in");

    const method = options.method || "GET";
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
