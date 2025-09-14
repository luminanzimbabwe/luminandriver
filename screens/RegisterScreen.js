// screens/RegisterScreen.js
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
import { useDriverAuth } from "../DriverAuthContext";

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    operational_area: "",
    password: "",
    confirm_password: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const { signIn } = useDriverAuth();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleChange = (name, value) => {
    if (name === "phone") value = formatPhone(value);
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: "" });
  };

  const formatPhone = (phone) => {
    let digits = phone.replace(/\D/g, "");
    // Normalize Zimbabwe numbers
    if (digits.startsWith("263")) digits = "0" + digits.slice(3);
    else if (!digits.startsWith("0") && digits.length > 0) digits = "0" + digits;
    return digits; // Do not slice; keep full number
  };

  const validate = () => {
    let tempErrors = {};
    if (!formData.username.trim()) tempErrors.username = "Username is required";
    if (!formData.email.trim()) tempErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()))
      tempErrors.email = "Email is invalid";
    if (!formData.phone.trim()) tempErrors.phone = "Phone number is required";
    else if (!/^0\d{9}$/.test(formData.phone))
      tempErrors.phone = "Phone must be 10 digits starting with 0";
    if (!formData.operational_area.trim())
      tempErrors.operational_area = "Operational area is required";
    if (!formData.password) tempErrors.password = "Password is required";
    if (!formData.confirm_password)
      tempErrors.confirm_password = "Please confirm your password";
    if (formData.password && formData.confirm_password && formData.password !== formData.confirm_password)
      tempErrors.confirm_password = "Passwords do not match";

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);

    try {
      const payload = { ...formData };

      console.log("Register payload:", payload); // Log payload for debugging

      const response = await fetch("https://backend-luminan.onrender.com/driver/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = { error: "Invalid server response" };
      }

      if (response.ok && data.driver && data.driver.auth_token) {
        await signIn(data.driver.auth_token, data.driver);
        navigation.replace("MainApp");
      } else {
        // Map backend error message
        setErrors(data.errors || { general: data.error || "Registration failed" });
      }
    } catch (err) {
      setErrors({ general: "Unable to connect to server. Check your internet connection." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0f2027", "#203a43", "#2c5364"]} style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.title}>Register for LuminaN</Text>
          <Text style={styles.subtitle}>
            Join LuminaN, Zimbabwe's most reliable gas delivery service. Fill in your details to get started.
          </Text>

          {/** Username **/}
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#bbb"
            value={formData.username}
            onChangeText={(v) => handleChange("username", v)}
          />
          {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}

          {/** Email **/}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#bbb"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(v) => handleChange("email", v)}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          {/** Phone **/}
          <TextInput
            style={styles.input}
            placeholder="+263 78 xxx xxxx"
            placeholderTextColor="#bbb"
            keyboardType="phone-pad"
            value={formData.phone}
            onChangeText={(v) => handleChange("phone", v)}
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          {/** Operational Area **/}
          <TextInput
            style={styles.input}
            placeholder="Operational Area"
            placeholderTextColor="#bbb"
            value={formData.operational_area}
            onChangeText={(v) => handleChange("operational_area", v)}
          />
          {errors.operational_area && <Text style={styles.errorText}>{errors.operational_area}</Text>}

          {/** Password **/}
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

          {/** Confirm Password **/}
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#bbb"
            secureTextEntry={!showPassword}
            value={formData.confirm_password}
            onChangeText={(v) => handleChange("confirm_password", v)}
          />
          {errors.confirm_password && <Text style={styles.errorText}>{errors.confirm_password}</Text>}

          {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

          <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={["#00c6ff", "#0072ff"]} style={styles.registerButton}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerText}>Register</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={[styles.footerText, { color: "#00eaff", marginLeft: 5 }]}>Login</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {loading && (
        <Modal transparent animationType="fade">
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#00eaff" />
            <Text style={styles.loadingText}>Creating your account...</Text>
          </View>
        </Modal>
      )}
    </LinearGradient>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    marginHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
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
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(0,234,255,0.5)",
  },
  passwordContainer: { position: "relative" },
  eyeButton: { position: "absolute", right: 12, top: 14 },
  registerButton: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#00eaff",
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  registerText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
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
});
