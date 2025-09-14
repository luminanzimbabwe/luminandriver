// screens/ResetPasswordScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const ResetPasswordScreen = ({ navigation }) => {
  const [step, setStep] = useState(1); // 1 = request code, 2 = reset password
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const BACKEND_URL = "http://localhost:8000/api";

  // Step 1: Send reset code
  const handleSendCode = async () => {
    if (!email.trim()) {
      setErrorMessage("Please enter your registered email.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const response = await fetch(`${BACKEND_URL}/driver/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        Alert.alert(
          "Success",
          "If this account exists, a reset code has been sent to your email."
        );
        setStep(2);
      } else {
        setErrorMessage(data.error || "Failed to send reset code.");
      }
    } catch (error) {
      setLoading(false);
      setErrorMessage(`Network error: ${error.message}`);
    }
  };

  // Step 2: Reset password
  const handleResetPassword = async () => {
    if (!code.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setErrorMessage("Please fill all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const response = await fetch(`${BACKEND_URL}/driver/reset-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        Alert.alert("Success", "Password has been reset successfully.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        setErrorMessage(data.error || JSON.stringify(data));
      }
    } catch (error) {
      setLoading(false);
      setErrorMessage(`Network error: ${error.message}`);
    }
  };

  return (
    <LinearGradient
      colors={["#0f2027", "#203a43", "#2c5364"]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.card}>
            <Text style={styles.title}>Reset Password</Text>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            {step === 1 ? (
              <>
                <Text style={styles.subtitle}>
                  Enter your registered email to receive a reset code.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#bbb"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleSendCode}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Send Reset Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  Enter the 6-digit code sent to your email and choose a new password.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Reset Code"
                  placeholderTextColor="#bbb"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                />
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  placeholderTextColor="#bbb"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#bbb"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default ResetPasswordScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#00eaff",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "#00eaff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    color: "#fff",
  },
  button: {
    backgroundColor: "#00eaff",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  errorText: {
    color: "#FF3B3B",
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
});
