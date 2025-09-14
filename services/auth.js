// services/auth.js
import AsyncStorage from "@react-native-async-storage/async-storage";

// Save token after login
export const saveToken = async (token) => {
  await AsyncStorage.setItem("userToken", token);
};

// Get token for current user
export const getCurrentUserToken = async () => {
  return await AsyncStorage.getItem("userToken");
};
