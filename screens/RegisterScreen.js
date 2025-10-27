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
    pin: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const { registerDriver, setPin } = useDriverAuth();

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
    let tempErrors = {};
    if (!formData.username.trim()) tempErrors.username = "Username is required";
    if (!formData.email.trim()) tempErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()))
      tempErrors.email = "Email is invalid";
    if (!formData.pin.trim()) tempErrors.pin = "PIN is required";
    else if (formData.pin.length < 4 || formData.pin.length > 6) tempErrors.pin = "PIN must be 4-6 digits";

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);

    try {
      const result = await registerDriver(formData);

      if (result.success) {
        // Set PIN after successful registration
        await setPin(formData.pin);
        // Navigate to OTP verification screen with temp_driver_id
        navigation.navigate("OtpVerification", { temp_driver_id: result.temp_driver_id });
      } else {
        setErrors({ general: result.error || "Registration failed" });
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
          <Text style={styles.title}>Register as a Driver</Text>
          <Text style={styles.subtitle}>
            Join GasLT's driver network. Deliver gas efficiently and earn competitively.
          </Text>

          <View style={styles.section}>
            <View style={styles.inputContainer}>
              <Ionicons name="person" size={20} color="#00eaff" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#bbb"
                value={formData.username}
                onChangeText={(v) => handleChange("username", v)}
              />
            </View>
            {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}

            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color="#00eaff" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#bbb"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(v) => handleChange("email", v)}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}



            <View style={styles.inputContainer}>
              <Ionicons name="key" size={20} color="#00eaff" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="PIN (4-6 digits)"
                placeholderTextColor="#bbb"
                keyboardType="numeric"
                secureTextEntry={!showPassword}
                value={formData.pin}
                onChangeText={(v) => handleChange("pin", v)}
                maxLength={6}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#00eaff" />
              </TouchableOpacity>
            </View>
            {errors.pin && <Text style={styles.errorText}>{errors.pin}</Text>}
          </View>

          {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

          <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={["#00c6ff", "#0072ff"]} style={styles.registerButton}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerText}>Register</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Need to verify account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate("OtpVerification")}>
              <Text style={[styles.footerText, { color: "#00eaff", marginLeft: 5 }]}>Verify OTP</Text>
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
  section: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,234,255,0.5)",
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#fff",
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeButton: { marginLeft: 8 },
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
