import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { DriverAuthProvider } from "./DriverAuthContext";
import AppNavigator from "./navigation/AppNavigator";

export default function App() {
  return (
    <DriverAuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </DriverAuthProvider>
  );
}
