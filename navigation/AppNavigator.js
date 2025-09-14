import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { useDriverAuth } from "../DriverAuthContext";

// Screens
import SplashScreen from "../screens/SplashScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import GettingReadyScreen from "../screens/GettingReadyScreen";
import SetLocationScreen from "../screens/SetLocationScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import NotificationScreen from "../screens/NotificationScreen";
import CompanyRegisterScreen from "../screens/CompanyRegisterScreen";

// Main App
import TabNavigator from "./TabNavigator";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isLoggedIn, loading } = useDriverAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#00eaff" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        // Auth flow
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="GettingReady" component={GettingReadyScreen} />
          <Stack.Screen name="SetLocation" component={SetLocationScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="CompanyRegister" component={CompanyRegisterScreen} />
        </>
      ) : (
        // Main app
        <>
          <Stack.Screen name="MainApp" component={TabNavigator} />
          <Stack.Screen name="Notification" component={NotificationScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
