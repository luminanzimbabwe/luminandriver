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
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useDriverAuth } from "../DriverAuthContext";

const { width } = Dimensions.get("window");

const OtpVerificationScreen = ({ navigation, route }) => {
  const { temp_driver_id } = route.params;
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const inputRefs = useRef([]);

  const { verifyOtp } = useDriverAuth();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
    ]).start();

    // Start countdown for resend
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (value, index) => {
    if (value.length > 1) return; // Only allow single digit

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Clear errors
    setErrors({});
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const validate = () => {
    const otpString = otp.join("");
    let tempErrors = {};
    if (otpString.length !== 6 || !/^\d{6}$/.test(otpString)) tempErrors.otp = "Please enter all 6 digits";

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleVerifyOtp = async () => {
    if (!validate()) return;

    setLoading(true);
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();

    try {
      const result = await verifyOtp({ temp_driver_id, otp_code: otp.join("") });

      if (result.success) {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        navigation.replace("SetPin");
      } else {
        setErrors({ general: result.error || "OTP verification failed" });
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
      }
    } catch (err) {
      setErrors({ general: "Unable to connect to server. Check your internet connection." });
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    // Simulate API call
    setTimeout(() => {
      setResendLoading(false);
      setCountdown(30);
      Alert.alert("OTP Sent", "A new verification code has been sent to your email.");
    }, 2000);
  };

  return (
    <LinearGradient colors={["#0f2027", "#203a43", "#2c5364"]} style={styles.container}>
      <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={60} color="#00eaff" />
        </View>

        <Text style={styles.title}>Verify Your Account</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to your email to complete registration.
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[styles.otpBox, errors.otp && styles.otpBoxError]}
              keyboardType="numeric"
              maxLength={1}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              selectTextOnFocus
            />
          ))}
        </View>
        {errors.otp && <Text style={styles.errorText}>{errors.otp}</Text>}

        {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

        <TouchableOpacity onPress={handleVerifyOtp} disabled={loading} activeOpacity={0.85}>
          <LinearGradient colors={["#00c6ff", "#0072ff"]} style={styles.verifyButton}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyText}>Verify Account</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code?</Text>
          {countdown > 0 ? (
            <Text style={styles.countdownText}>Resend in {countdown}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResendOtp} disabled={resendLoading}>
              {resendLoading ? (
                <ActivityIndicator size="small" color="#00eaff" />
              ) : (
                <Text style={styles.resendLink}>Resend Code</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back to Registration</Text>
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

export default OtpVerificationScreen;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
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
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  title: { fontSize: 26, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#aaa", textAlign: "center", marginBottom: 32 },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  otpBox: {
    width: (width - 80) / 6 - 8,
    height: 60,
    borderWidth: 2,
    borderColor: "#00eaff",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginHorizontal: 4,
  },
  otpBoxError: {
    borderColor: "#ff4d4d",
  },
  verifyButton: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#00eaff",
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    marginBottom: 20,
  },
  verifyText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  resendContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  resendText: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 8,
  },
  countdownText: {
    color: "#00eaff",
    fontSize: 14,
    fontWeight: "bold",
  },
  resendLink: {
    color: "#00eaff",
    fontSize: 14,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  backText: { color: "#00eaff", textAlign: "center", marginTop: 10, fontSize: 14 },
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
