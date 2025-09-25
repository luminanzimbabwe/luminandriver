import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import Svg, { Rect, Text } from "react-native-svg";
import { useDriverAuth } from "../DriverAuthContext";

// Animated SVG components
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedText = Animated.createAnimatedComponent(Text);

const SplashScreen = ({ navigation }) => {
  const leftAnim = useRef(new Animated.Value(-80)).current;
  const rightAnim = useRef(new Animated.Value(80)).current;
  const middleScale = useRef(new Animated.Value(0.8)).current;

  const { driver, loading } = useDriverAuth();

  useEffect(() => {
    // Start animation immediately
    Animated.parallel([
      Animated.timing(leftAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(rightAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.spring(middleScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Ensure splash screen stays visible for at least 2.5 seconds
    const timer = setTimeout(() => {
      if (!loading) {
        if (driver) navigation.replace("MainApp");
        else navigation.replace("Welcome");
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [loading, driver]);

  // Handle loading state more smoothly
  useEffect(() => {
    if (!loading && driver) {
      navigation.replace("MainApp");
    } else if (!loading && !driver) {
      navigation.replace("Welcome");
    }
  }, [loading, driver, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#232323" />
      <View style={styles.logoWrapper}>
        <Svg width="160" height="70" viewBox="0 0 160 70">
          {/* Left box */}
          <AnimatedRect
            x={10}
            y={20}
            width={30}
            height={30}
            fill="#6EC6FF"
            stroke="#FF3B3B"
            strokeWidth={2}
            transform={[{ translateX: leftAnim }, { rotate: "-10deg" }]}
            rx={6}
            ry={6}
          />
          <AnimatedText
            x={25}
            y={42}
            fontSize="18"
            fontWeight="bold"
            fill="#fff"
            textAnchor="middle"
            transform={[{ translateX: leftAnim }, { rotate: "-10deg" }]}
          >
            L
          </AnimatedText>

          {/* Middle "umina" */}
          <AnimatedText
            x={80}
            y={45}
            fontSize="20"
            fontWeight="bold"
            fill="#FFFFFF"
            textAnchor="middle"
            transform={[{ scale: middleScale }]}
          >
            umina
          </AnimatedText>

          {/* Right box */}
          <AnimatedRect
            x={120}
            y={20}
            width={30}
            height={30}
            fill="#6EC6FF"
            stroke="#FF3B3B"
            strokeWidth={2}
            transform={[{ translateX: rightAnim }, { rotate: "10deg" }]}
            rx={6}
            ry={6}
          />
          <AnimatedText
            x={135}
            y={42}
            fontSize="18"
            fontWeight="bold"
            fill="#fff"
            textAnchor="middle"
            transform={[{ translateX: rightAnim }, { rotate: "10deg" }]}
          >
            N
          </AnimatedText>
        </Svg>

        {/* Spinner */}
        <ActivityIndicator
          size="small"
          color="#6EC6FF"
          style={{ marginTop: 20 }}
        />
      </View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#232323",
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrapper: {
    alignItems: "center",
  },
});
