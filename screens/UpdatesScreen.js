// screens/DriverSetPrice.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useDriverAuth } from "../DriverAuthContext"; // context for auth token

const BACKEND_URL = "http://localhost:8000/drivers/set-price/";
const DRIVER_PROFILE_URL = "http://localhost:8000/drivers/me/";

const DriverSetPrice = () => {
  const { authToken } = useDriverAuth(); // get token from context
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch current driver price
  useEffect(() => {
    const fetchDriverPrice = async () => {
      if (!authToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(DRIVER_PROFILE_URL, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (res.ok && data.price_per_kg != null) {
          setPrice(data.price_per_kg.toString());
        }
      } catch (err) {
        console.error("Failed to fetch driver profile:", err);
        Alert.alert("Error", "Unable to load your current price.");
      } finally {
        setLoading(false);
      }
    };
    fetchDriverPrice();
  }, [authToken]);

  const handleSetPrice = async () => {
    if (!authToken) {
      Alert.alert("Error", "Authorization token missing. Please log in.");
      return;
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid price greater than 0");
      return;
    }

    setSaving(true);
    setSuccessMessage("");

    try {
      const res = await fetch(BACKEND_URL, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ price_per_kg: numericPrice }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(`Price updated successfully: $${numericPrice.toFixed(2)} per kg`);
      } else {
        Alert.alert("Error", data.error || "Failed to update price");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00eaff" />
        <Text style={{ color: "#fff", marginTop: 10 }}>Loading your current price...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Set Your Price per KG</Text>
      <TextInput
        placeholder="Enter price per kg"
        placeholderTextColor="#888"
        keyboardType="numeric"
        style={styles.input}
        value={price}
        onChangeText={setPrice}
      />

      <TouchableOpacity
        style={[styles.button, saving && { opacity: 0.7 }]}
        onPress={handleSetPrice}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Set Price</Text>}
      </TouchableOpacity>

      {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
    padding: 20,
  },
  label: { fontSize: 18, color: "#00eaff", marginBottom: 12, fontWeight: "600" },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#1a2332",
    color: "#fff",
    marginBottom: 20,
  },
  button: { backgroundColor: "#00eaff", padding: 14, borderRadius: 10, width: "100%", alignItems: "center" },
  buttonText: { color: "#000", fontWeight: "700", fontSize: 16 },
  successText: { color: "#00ff88", marginTop: 16, fontWeight: "600", fontSize: 16 },
});

export default DriverSetPrice;
