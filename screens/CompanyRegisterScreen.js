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
import { LinearGradient } from "expo-linear-gradient";

// Use your backend URL (Android emulator / device)
const BASE_URL = "http://10.0.2.2:8000";

const CompanyRegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    company_name: "",
    company_id: "",
    company_registration_number: "",
    email: "",
    phone_number: "",
    address: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
    setErrors({});
    setSuccess("");
  };

  const validate = () => {
    let tempErrors = {};
    if (!formData.company_name) tempErrors.company_name = "Company name is required";
    if (!formData.company_id) tempErrors.company_id = "Company ID is required";
    if (!formData.company_registration_number) tempErrors.company_registration_number = "Registration number is required";
    if (!formData.email) tempErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) tempErrors.email = "Email is invalid";
    if (!formData.phone_number) tempErrors.phone_number = "Phone number is required";
    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) tempErrors.contact_email = "Contact email is invalid";
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        company_name: formData.company_name,
        company_id: formData.company_id,
        company_registration_number: formData.company_registration_number,
        email: formData.email,
        phone_number: formData.phone_number,
        address: formData.address,
        contact_name: formData.contact_name,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
      };

      const response = await fetch(`${BASE_URL}/api/company/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || "Company registered successfully.");
        setFormData({
          company_name: "",
          company_id: "",
          company_registration_number: "",
          email: "",
          phone_number: "",
          address: "",
          contact_name: "",
          contact_email: "",
          contact_phone: "",
        });
      } else {
        setErrors({ general: data.error || "Registration failed" });
      }
    } catch (err) {
      setErrors({ general: "Unable to connect to server. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (field, placeholder, keyboardType = "default") => (
    <View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        value={formData[field]}
        onChangeText={(v) => handleChange(field, v)}
        keyboardType={keyboardType}
        autoCapitalize={field.includes("email") ? "none" : "words"}
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  return (
    <LinearGradient colors={["#0f2027", "#203a43", "#2c5364"]} style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.title}>Register Your Company</Text>
          <Text style={styles.subtitle}>Fill in your company details to join the Luminan platform.</Text>

          {renderInput("company_name", "Company Name")}
          {renderInput("company_id", "Company ID")}
          {renderInput("company_registration_number", "Company Registration Number")}
          {renderInput("email", "Company Email", "email-address")}
          {renderInput("phone_number", "Company Phone Number", "phone-pad")}
          {renderInput("address", "Company Address")}
          {renderInput("contact_name", "Contact Person Name")}
          {renderInput("contact_email", "Contact Person Email", "email-address")}
          {renderInput("contact_phone", "Contact Person Phone", "phone-pad")}

          {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}
          {success ? <Text style={styles.successText}>{success}</Text> : null}

          <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={["#00c6ff", "#0072ff"]} style={styles.registerButton}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerText}>Register Company</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[styles.footerText, { color: "#00eaff" }]}>Back to Driver Registration</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {loading && (
        <Modal transparent animationType="fade">
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#00eaff" />
            <Text style={styles.loadingText}>Registering your company...</Text>
          </View>
        </Modal>
      )}
    </LinearGradient>
  );
};

export default CompanyRegisterScreen;

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
  successText: { color: "#22c55e", fontWeight: "bold", textAlign: "center", marginBottom: 8 },
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
