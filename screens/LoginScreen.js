// screens/LoginScreen.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useDriverAuth } from "../DriverAuthContext"; // token-based auth

const LoginScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const { signIn } = useDriverAuth(); // expects token only

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: "" });
  };

  const validate = () => {
    const tempErrors = {};
    if (!formData.identifier) tempErrors.identifier = "Please enter your username or email";
    if (!formData.password) tempErrors.password = "Please enter your password";
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch("http://localhost:8000/driver/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: formData.identifier.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.driver?.auth_token) {
        // ✅ Token-only signIn
        signIn(data.driver.auth_token);

        // Navigate to main app
        navigation.replace("MainApp");
      } else {
        setErrors({ general: data.error || "Invalid credentials" });
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrors({ general: "Unable to connect to server. Check your internet connection." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0f2027", "#203a43", "#2c5364"]} style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.title}>Welcome Back to LuminaN</Text>
          <Text style={styles.subtitle}>
            Login to continue using LuminaN, Zimbabwe's fastest and safest gas delivery service.
          </Text>

          {/* Identifier */}
          <TextInput
            style={styles.input}
            placeholder="Username or Email"
            placeholderTextColor="#bbb"
            autoCapitalize="none"
            value={formData.identifier}
            onChangeText={(v) => handleChange("identifier", v)}
          />
          {errors.identifier && <Text style={styles.errorText}>{errors.identifier}</Text>}

          {/* Password */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#bbb"
              secureTextEntry={!showPassword}
              value={formData.password}
              onChangeText={(v) => handleChange("password", v)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#00eaff" />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

          {/* Login Button */}
          <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={["#00c6ff", "#0072ff"]} style={styles.loginButton}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginText}>Login</Text>}
            </LinearGradient>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={[styles.footerText, { color: "#00eaff", marginLeft: 5 }]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Loading Overlay */}
      {loading && (
        <Modal transparent animationType="fade">
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#00eaff" />
            <Text style={styles.loadingText}>Logging in...</Text>
          </View>
        </Modal>
      )}
    </LinearGradient>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    marginHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#00eaff",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 10,
  },
  title: { fontSize: 26, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#aaa", textAlign: "center", marginBottom: 28 },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 234, 255, 0.5)",
  },
  passwordContainer: { position: "relative" },
  eyeButton: { position: "absolute", right: 12, top: 14 },
  loginButton: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#00eaff",
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  loginText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerText: { color: "#ccc", fontSize: 14 },
  errorText: { color: "#ff4d4d", fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "#fff", marginTop: 10 },
  forgotButton: { alignSelf: "center", marginBottom: 8, marginTop: -4 },
  forgotText: { color: "#aaa", fontSize: 13, textDecorationLine: "underline" },
});
