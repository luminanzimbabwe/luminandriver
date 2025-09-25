import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { useDriverAuth } from "../DriverAuthContext";

// Screens
import SplashScreen from "../screens/SplashScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";

// Main App
import TabNavigator from "./TabNavigator";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isLoggedIn, loading } = useDriverAuth();

  if (loading) {
    // Splash Screen or loading indicator can be here while checking auth state
    return (
      <SplashScreen /> // Use SplashScreen to handle animation and loading
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
        </>
      ) : (
        // Main app flow
        <>
          <Stack.Screen name="MainApp" component={TabNavigator} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
