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
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useDriverAuth } from "../DriverAuthContext";

const { width } = Dimensions.get("window");

const PinLoginScreen = ({ navigation }) => {
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const inputRefs = useRef([]);

  const { verifyPin, signOut } = useDriverAuth();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
    ]).start();

    // Auto-focus first input
    setTimeout(() => inputRefs.current[0]?.focus(), 500);
  }, []);

  const handlePinChange = (value, index) => {
    if (value.length > 1) return; // Only allow single digit

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Clear errors
    setErrors({});
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const validate = () => {
    const pinString = pin.join("");
    let tempErrors = {};
    if (pinString.length < 4 || pinString.length > 6 || !/^\d{4,6}$/.test(pinString)) {
      tempErrors.pin = "Please enter a 4-6 digit PIN";
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleVerifyPin = async () => {
    if (!validate()) return;

    setLoading(true);
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();

    try {
      const result = await verifyPin(pin.join(""));

      if (result) {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        // Navigation will be handled by the auth context state change
        // The AppNavigator will automatically navigate to MainApp when isLoggedIn becomes true
      } else {
        setAttempts((prev) => prev + 1);
        if (attempts >= 4) {
          Alert.alert("Too Many Attempts", "You have entered the wrong PIN too many times. Please log in again.", [
            { text: "OK", onPress: () => signOut() },
          ]);
        } else {
          setErrors({ general: `Incorrect PIN. ${5 - attempts} attempts remaining.` });
        }
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
      }
    } catch (err) {
      setErrors({ general: "Unable to verify PIN. Please try again." });
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0f2027", "#203a43", "#2c5364"]} style={styles.container}>
      <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={60} color="#00eaff" />
        </View>

        <Text style={styles.title}>Enter Your PIN</Text>
        <Text style={styles.subtitle}>
          Please enter your 4-6 digit PIN to continue.
        </Text>

        <View style={styles.pinContainer}>
          {pin.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[styles.pinBox, errors.pin && styles.pinBoxError]}
              keyboardType="numeric"
              maxLength={1}
              value={digit}
              onChangeText={(value) => handlePinChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              selectTextOnFocus
              secureTextEntry
            />
          ))}
        </View>
        {errors.pin && <Text style={styles.errorText}>{errors.pin}</Text>}

        {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

        <TouchableOpacity onPress={handleVerifyPin} disabled={loading} activeOpacity={0.85}>
          <LinearGradient colors={["#00c6ff", "#0072ff"]} style={styles.verifyButton}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyText}>Unlock</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.registerText}>Don't have a PIN? Register</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
};

export default PinLoginScreen;

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
  pinContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  pinBox: {
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
  pinBoxError: {
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
  forgotText: { color: "#00eaff", textAlign: "center", marginTop: 10, fontSize: 14 },
  registerText: { color: "#00eaff", textAlign: "center", marginTop: 10, fontSize: 14 },
  errorText: { color: "#ff4d4d", fontWeight: "bold", textAlign: "center", marginBottom: 8 },
});
