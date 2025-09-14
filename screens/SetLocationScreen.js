// screens/SetLocationScreen.js
import React, { useState, useEffect, useRef } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, Animated, ActivityIndicator, Platform
} from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";

const SetLocationScreen = ({ navigation }) => {
  const [location, setLocation] = useState({ latitude: -17.8292, longitude: 31.0522 }); // Default Zimbabwe
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    getDeviceLocation();
  }, []);

  const getDeviceLocation = async () => {
    setLoading(true);
    try {
      if (Platform.OS !== "web") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Oops! We need your location to provide better service.");
          setLoading(false);
          return;
        }
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      }
    } catch (err) {
      console.error(err);
      setError("Unable to retrieve your location. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      await AsyncStorage.setItem("userLocation", JSON.stringify(location));
      Alert.alert("Success", "Your location has been saved!");
      navigation.replace("MainApp"); // Go to MainApp after confirming
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to save your location. Please try again.");
    }
  };

  const osmMapHTML = `...`; // Keep the existing map HTML code

  return (
    <LinearGradient colors={["#0f2027", "#203a43", "#2c5364"]} style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, flex: 1, width: "100%", alignItems: "center" }}>
        <Text style={styles.title}>Set Your Location</Text>
        <Text style={styles.subtitle}>
          Your location helps LuminaN deliver gas faster. It is stored only on your device.
        </Text>

        <View style={styles.mapContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#00eaff" />
          ) : (
            <WebView
              ref={mapRef}
              originWhitelist={['*']}
              source={{ html: osmMapHTML }}
              style={styles.map}
            />
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity onPress={getDeviceLocation} style={styles.updateButton}>
          <Ionicons name="location-outline" size={20} color="#fff" />
          <Text style={styles.updateText}> Update to Current Location</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
          <Text style={styles.confirmText}>Confirm Location</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          You can change this anytime in your profile settings.
        </Text>
      </Animated.View>
    </LinearGradient>
  );
};

export default SetLocationScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "bold", color: "#fff", marginBottom: 12, textAlign: "center" },
  subtitle: { fontSize: 18, color: "#ccc", textAlign: "center", marginBottom: 16 },
  mapContainer: { width: "100%", height: 300, borderRadius: 12, overflow: "hidden", marginVertical: 16 },
  map: { flex: 1, backgroundColor: "#111" },
  updateButton: { 
    marginTop: 12, 
    backgroundColor: "#00eaff", 
    padding: 14, 
    borderRadius: 10, 
    flexDirection: "row", 
    alignItems: "center", 
    elevation: 2 // Add shadow for Android
  },
  updateText: { color: "#fff", fontWeight: "bold", marginLeft: 8 },
  confirmButton: { marginTop: 18, backgroundColor: "#FF3B3B", padding: 16, borderRadius: 10, alignItems: "center", elevation: 2 },
  confirmText: { color: "#fff", fontWeight: "bold" },
  note: { color: "#aaa", fontSize: 14, textAlign: "center", marginTop: 12 },
  error: { color: "#ff4d4d", textAlign: "center", marginTop: 8, fontWeight: "bold" },
});