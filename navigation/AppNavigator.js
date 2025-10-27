import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { useDriverAuth } from "../DriverAuthContext";

// Screens
import SplashScreen from "../screens/SplashScreen";
import AuthLoadingScreen from "../screens/AuthLoadingScreen";
import RegisterScreen from "../screens/RegisterScreen";
import OtpVerificationScreen from "../screens/OtpVerificationScreen";
import PinLoginScreen from "../screens/PinLoginScreen";
import SetPinScreen from "../screens/SetPinScreen";


import TabNavigator from "./TabNavigator";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isLoggedIn, driver, loading, pinRequired } = useDriverAuth();

  if (loading) {
   
    return (
      <SplashScreen /> 
    );
  }

 
  let initialRouteName = "PinLogin";

  if (isLoggedIn && !pinRequired) {
    initialRouteName = "MainApp";
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="PinLogin" component={PinLoginScreen} />
      <Stack.Screen name="SetPin" component={SetPinScreen} />
      <Stack.Screen name="MainApp" component={TabNavigator} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
