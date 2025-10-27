import React, { useEffect } from "react";
import { useDriverAuth } from "../DriverAuthContext";
import SplashScreen from "./SplashScreen";

const AuthLoadingScreen = ({ navigation }) => {
  const { isLoggedIn, pinRequired, loading } = useDriverAuth();

  useEffect(() => {
    if (!loading) {
      if (isLoggedIn && !pinRequired) {
        navigation.replace("MainApp");
      } else if (isLoggedIn && pinRequired) {
        navigation.replace("SetPin");
      } else {
        navigation.replace("PinLogin");
      }
    }
  }, [loading, isLoggedIn, pinRequired, navigation]);

  return <SplashScreen />;
};

export default AuthLoadingScreen;
