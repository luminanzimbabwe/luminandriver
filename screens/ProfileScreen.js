
// screens/ProfileScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { getCurrentUserToken } from "../services/auth";



const ProfileScreen = ({ navigation }) => {
  const [profileImage, setProfileImage] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchUserData = async () => {
    try {
      setLoading(true);

      const token = await getCurrentUserToken();
      if (!token) {
        Alert.alert("Error", "No logged-in user found.");
        setLoading(false);
        return;
      }

      const response = await fetch("https://backend-luminan.onrender.com/api/profile/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch user data");
      const data = await response.json();

      setUserData({
        username: data.username,
        email: data.email,
        phone: data.phone,
        userId: data.userId,
        appVersion: data.appVersion || "1.0.0",
      });

      setProfileImage(data.profileImage);
      setLoading(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not fetch user data.");
      setLoading(false);
    }
  };

  fetchUserData();
}, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "We need access to your gallery to change profile image.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.cancelled) {
      setProfileImage(result.uri);
      // Upload new image to backend with token
      const token = await getCurrentUserToken();
      const formData = new FormData();
      formData.append("profileImage", {
        uri: result.uri,
        name: "profile.jpg",
        type: "image/jpeg",
      });

      fetch("https://your-api.com/user/profile/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          Alert.alert("Success", "Profile image updated!");
        })
        .catch((err) => {
          console.error(err);
          Alert.alert("Error", "Failed to upload image.");
        });
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={["#0f2027", "#203a43", "#2c5364"]} style={styles.container}>
        <ActivityIndicator size="large" color="#00eaff" style={{ marginTop: 50 }} />
      </LinearGradient>
    );
  }

  const InfoCard = ({ children, style }) => (
    <View style={[styles.card, style]}>{children}</View>
  );

  const NavigationCard = ({ title, iconName, onPress }) => (
    <TouchableOpacity style={styles.navRow} onPress={onPress}>
      <Text style={styles.navText}>{title}</Text>
      <Ionicons name={iconName} size={22} color="#00eaff" />
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={["#0f2027", "#203a43", "#2c5364"]} style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Huge Profile Image */}
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={pickImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImage, { backgroundColor: "#888" }]} />
            )}
            <View style={styles.editIcon}>
              <Ionicons name="camera" size={22} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* User Info Card */}
        <InfoCard>
          <Text style={styles.userText}>{userData.username}</Text>
          <Text style={styles.userText}>{userData.email}</Text>
          <Text style={styles.userText}>{userData.phone}</Text>
        </InfoCard>

        {/* Navigation / Settings Card */}
        <InfoCard>
          <NavigationCard title="Settings" iconName="settings-outline" onPress={() => navigation.navigate("SettingsScreen")} />
          <NavigationCard title="Help" iconName="help-circle-outline" onPress={() => navigation.navigate("HelpScreen")} />
          <NavigationCard title="Privacy Policy" iconName="document-text-outline" onPress={() => navigation.navigate("PrivacyPolicyScreen")} />
        </InfoCard>

        {/* Bottom App Info */}
        <InfoCard style={{ marginBottom: 40 }}>
          <Text style={[styles.userText, { fontSize: 14 }]}>App Version: {userData.appVersion}</Text>
          <Text style={[styles.userText, { fontSize: 14 }]}>User ID: {userData.userId}</Text>
        </InfoCard>
      </ScrollView>
    </LinearGradient>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  imageContainer: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  profileImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    borderColor: "#00eaff",
  },
  editIcon: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#00eaff",
    padding: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#fff",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  userText: {
    color: "#18181b",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,234,255,0.2)",
  },
  navText: { color: "#18181b", fontSize: 16, fontWeight: "bold" },
});
