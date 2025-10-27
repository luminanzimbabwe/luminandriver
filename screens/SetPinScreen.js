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

const SetPinScreen = ({ navigation }) => {
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", "", "", ""]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0); // 0: enter PIN, 1: confirm PIN

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const inputRefs = useRef([]);



  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
    ]).start();

    // Auto-focus first input
    setTimeout(() => inputRefs.current[0]?.focus(), 500);
  }, []);

  const handlePinChange = (value, index, isConfirm = false) => {
    if (value.length > 1) return; // Only allow single digit

    const newPin = isConfirm ? [...confirmPin] : [...pin];
    newPin[index] = value;
    isConfirm ? setConfirmPin(newPin) : setPin(newPin);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Clear errors
    setErrors({});
  };

  const handleKeyPress = (e, index, isConfirm = false) => {
    if (e.nativeEvent.key === "Backspace" && !(isConfirm ? confirmPin[index] : pin[index]) && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const validate = () => {
    const pinString = pin.join("");
    const confirmPinString = confirmPin.join("");
    let tempErrors = {};

    if (step === 0) {
      if (pinString.length < 4 || pinString.length > 6 || !/^\d{4,6}$/.test(pinString)) {
        tempErrors.pin = "Please enter a 4-6 digit PIN";
      }
    } else {
      if (confirmPinString.length < 4 || confirmPinString.length > 6 || !/^\d{4,6}$/.test(confirmPinString)) {
        tempErrors.confirmPin = "Please enter a 4-6 digit PIN";
      } else if (pinString !== confirmPinString) {
        tempErrors.confirmPin = "PINs do not match";
      }
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;

    if (step === 0) {
      setStep(1);
      setTimeout(() => inputRefs.current[0]?.focus(), 500);
    } else {
      handleSetPin();
    }
  };

  const handleSetPin = async () => {
    setLoading(true);
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();

    try {
      await setPin(pin.join(""));
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
      navigation.replace("MainApp");
    } catch (err) {
      setErrors({ general: "Unable to set PIN. Please try again." });
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    } finally {
      setLoading(false);
    }
  };

  const currentPin = step === 0 ? pin : confirmPin;
  const title = step === 0 ? "Set Your PIN" : "Confirm Your PIN";
  const subtitle = step === 0
    ? "Create a 4-6 digit PIN to secure your account"
    : "Re-enter your PIN to confirm";

  return (
    <LinearGradient colors={["#0f2027", "#203a43", "#2c5364"]} style={styles.container}>
      <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={60} color="#00eaff" />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.pinContainer}>
          {currentPin.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[styles.pinBox, (step === 0 ? errors.pin : errors.confirmPin) && styles.pinBoxError]}
              keyboardType="numeric"
              maxLength={1}
              value={digit}
              onChangeText={(value) => handlePinChange(value, index, step === 1)}
              onKeyPress={(e) => handleKeyPress(e, index, step === 1)}
              selectTextOnFocus
              secureTextEntry
            />
          ))}
        </View>
        {(step === 0 ? errors.pin : errors.confirmPin) && <Text style={styles.errorText}>{step === 0 ? errors.pin : errors.confirmPin}</Text>}

        {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

        <TouchableOpacity onPress={handleNext} disabled={loading} activeOpacity={0.85}>
          <LinearGradient colors={["#00c6ff", "#0072ff"]} style={styles.setButton}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.setText}>{step === 0 ? "Next" : "Set PIN"}</Text>}
          </LinearGradient>
        </TouchableOpacity>

        {step === 1 && (
          <TouchableOpacity onPress={() => setStep(0)}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </LinearGradient>
  );
};

export default SetPinScreen;

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
  setButton: {
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
  setText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  backText: { color: "#00eaff", textAlign: "center", marginTop: 10, fontSize: 14 },
  errorText: { color: "#ff4d4d", fontWeight: "bold", textAlign: "center", marginBottom: 8 },
});
