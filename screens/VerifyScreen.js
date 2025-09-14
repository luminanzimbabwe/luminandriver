// screens/DriverVerifyScreen.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useDriverAuth } from "../DriverAuthContext"; // adjust path if needed

const BACKEND_URL = "http://localhost:8000";

const DriverVerifyScreen = ({ navigation, route }) => {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const inputsRef = useRef([]);
  const { driver, markVerified } = useDriverAuth(); // similar to user verification

  // Optional: get email or driver ID from route params
  const { email, driverId } = route.params || {};

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
    ]).start();

    // Auto-focus first input
    if (inputsRef.current[0]) inputsRef.current[0].focus();
  }, []);

  const handleChange = (text, index) => {
    const newCode = [...code];
    newCode[index] = text.replace(/[^0-9]/g, "");
    setCode(newCode);

    if (text && index < code.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && index > 0 && !code[index]) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const verificationCode = code.join("");
    if (verificationCode.length < 6) {
      setErrorMessage("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/driver/verify-code/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode, email, driver_id: driverId }),
      });

      const data = await response.json();

      if (response.ok) {
        await markVerified(); // update driver context locally
        Alert.alert("Success", "Your account has been verified!");
        navigation.replace("MainApp"); // Navigate to main/home screen
      } else {
        setErrorMessage(data.error || "Invalid or expired verification code.");
      }
    } catch (err) {
      console.error("Driver verification error:", err);
      setErrorMessage("Unable to connect. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email && !driverId) {
      setErrorMessage("Cannot resend code: missing driver information.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/driver/resend-verification-code/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, driver_id: driverId }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "A new verification code has been sent to your email/phone.");
      } else {
        setErrorMessage(data.error || "Failed to resend code. Please try again later.");
      }
    } catch (err) {
      console.error("Resend code error:", err);
      setErrorMessage("Unable to connect. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0f2027", "#203a43", "#2c5364"]} style={styles.container}>
      <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.title}>Verify Your Account</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to your email or phone to activate your LuminaN driver account
        </Text>

        <View style={styles.codeContainer}>
          {code.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => (inputsRef.current[idx] = ref)}
              style={styles.codeInput}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleChange(text, idx)}
              onKeyPress={(e) => handleBackspace(e, idx)}
            />
          ))}
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TouchableOpacity onPress={handleVerify} disabled={loading} activeOpacity={0.85}>
          <LinearGradient colors={["#00c6ff", "#0072ff"]} style={styles.verifyButton}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyText}>Verify</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive a code? Resend</Text>
        </TouchableOpacity>
      </Animated.View>

      {loading && (
        <Modal transparent animationType="fade">
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#00eaff" />
            <Text style={styles.loadingText}>Verifying...</Text>
          </View>
        </Modal>
      )}
    </LinearGradient>
  );
};

export default DriverVerifyScreen;

// Styles (same as before)
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
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
    width: "100%",
  },
  title: { fontSize: 26, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#aaa", textAlign: "center", marginBottom: 28 },
  codeContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  codeInput: {
    width: 40,
    height: 50,
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    borderRadius: 10,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "rgba(0,234,255,0.5)",
  },
  verifyButton: { padding: 14, borderRadius: 10, alignItems: "center", marginTop: 10, shadowColor: "#00eaff", shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  verifyText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  resendContainer: { marginTop: 15, alignItems: "center" },
  resendText: { color: "#00eaff", textDecorationLine: "underline", fontSize: 14 },
  errorText: { color: "#ff4d4d", fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#fff", marginTop: 10 },
});
