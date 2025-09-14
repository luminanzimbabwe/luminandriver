// screens/WelcomeScreen.js
import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
  Dimensions,
  Platform,
  Vibration,
  Pressable,
} from "react-native";
import Svg, { 
  Rect, 
  Text as SvgText, 
  Circle, 
  Path, 
  Defs, 
  LinearGradient as SvgLinearGradient, 
  Stop,
  RadialGradient,
  ClipPath
} from "react-native-svg";
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");

const WelcomeScreen = ({ navigation }) => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipContent, setTooltipContent] = useState("");

  // Enhanced Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const particleAnimations = useRef([]).current;
  const featureCarouselAnim = useRef(new Animated.Value(0)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const backgroundShift = useRef(new Animated.Value(0)).current;

  // Feature data for dynamic previews
  const features = [
    {
      icon: "flash",
      title: "Lightning Fast",
      description: "Get gas delivered in under 30 minutes",
      color: "#f59e0b",
      gradient: ["#f59e0b", "#d97706"],
    },
    {
      icon: "shield-checkmark",
      title: "100% Secure",
      description: "Safe payments and verified suppliers",
      color: "#22c55e",
      gradient: ["#22c55e", "#16a34a"],
    },
    {
      icon: "location",
      title: "Real-time Tracking",
      description: "Track your delivery every step of the way",
      color: "#3b82f6",
      gradient: ["#3b82f6", "#1d4ed8"],
    },
    {
      icon: "people",
      title: "24/7 Support",
      description: "Always here when you need us most",
      color: "#8b5cf6",
      gradient: ["#8b5cf6", "#7c3aed"],
    },
  ];

  useEffect(() => {
    // Initialize particle animations
    for (let i = 0; i < 8; i++) {
      particleAnimations[i] = new Animated.Value(0);
    }

    // Enhanced entrance sequence
    Animated.sequence([
      // Background shift animation
      Animated.timing(backgroundShift, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
      
      Animated.parallel([
        // Logo entrance with rotation
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
            toValue: 1,
            friction: 6,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.timing(logoRotate, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }),
        ]),
        
        // Content slide in
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1000,
          delay: 300,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Start particle animations
    startParticleAnimations();
    
    // Start button pulse
    startButtonPulse();
    
    // Auto-rotate features
    const featureInterval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);

    return () => clearInterval(featureInterval);
  }, []);

  const startParticleAnimations = () => {
    particleAnimations.forEach((anim, index) => {
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 4000 + index * 500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    });
  };

  const startButtonPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulse, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(buttonPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleGetStarted = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Vibration.vibrate(50);
    }

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonPulse, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonPulse, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate("Login");
    });
  };

  const handleSkip = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate("Login");
  };

  const showFeatureTooltip = (feature) => {
    setTooltipContent(`${feature.title}: ${feature.description}`);
    setShowTooltip(true);
    
    Animated.spring(tooltipAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(tooltipAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowTooltip(false));
    }, 2500);
  };

  const EnhancedLogo = () => {
    const rotation = logoRotate.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <Animated.View
        style={{
          transform: [
            { scale: logoScale },
            { rotate: rotation },
          ],
          opacity: fadeAnim,
          marginBottom: 30,
        }}
      >
        <Svg width="160" height="80" viewBox="0 0 200 100">
          <Defs>
            <RadialGradient id="logoGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#00eaff" stopOpacity="0.8" />
              <Stop offset="50%" stopColor="#6EC6FF" stopOpacity="0.6" />
              <Stop offset="100%" stopColor="#0072ff" stopOpacity="0.2" />
            </RadialGradient>
            <SvgLinearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <Stop offset="100%" stopColor="#00eaff" stopOpacity="0.8" />
            </SvgLinearGradient>
          </Defs>
          
          {/* Glow effect */}
          <Circle cx="50" cy="50" r="35" fill="url(#logoGlow)" opacity="0.3" />
          <Circle cx="150" cy="50" r="35" fill="url(#logoGlow)" opacity="0.3" />
          
          {/* Enhanced logo elements */}
          <Rect 
            x={20} y={30} width={40} height={40} 
            fill="#6EC6FF" 
            stroke="#FF3B3B" 
            strokeWidth={3} 
            rx={8} ry={8} 
            transform="rotate(-8 40 50)" 
          />
          <SvgText x={40} y={58} fontSize="24" fontWeight="bold" fill="url(#textGrad)" textAnchor="middle">L</SvgText>
          
          <SvgText x={100} y={60} fontSize="28" fontWeight="bold" fill="url(#textGrad)" textAnchor="middle">umina</SvgText>
          
          <Rect 
            x={140} y={30} width={40} height={40} 
            fill="#6EC6FF" 
            stroke="#FF3B3B" 
            strokeWidth={3} 
            rx={8} ry={8} 
            transform="rotate(8 160 50)" 
          />
          <SvgText x={160} y={58} fontSize="24" fontWeight="bold" fill="url(#textGrad)" textAnchor="middle">N</SvgText>
        </Svg>
      </Animated.View>
    );
  };

  const FloatingParticles = () => {
    return (
      <View style={styles.particlesContainer}>
        {particleAnimations.map((anim, index) => {
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [height + 50, -50],
          });
          
          const translateX = anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, Math.sin(index) * 30, Math.sin(index + 1) * 20],
          });

          const opacity = anim.interpolate({
            inputRange: [0, 0.1, 0.9, 1],
            outputRange: [0, 0.8, 0.8, 0],
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.particle,
                {
                  left: `${10 + index * 12}%`,
                  transform: [
                    { translateY },
                    { translateX },
                  ],
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const FeatureCarousel = () => {
    const currentFeatureData = features[currentFeature];
    
    return (
      <Animated.View style={styles.featureCarousel}>
        <BlurView intensity={20} style={styles.featureBlur}>
          <LinearGradient
            colors={[
              `${currentFeatureData.color}20`,
              `${currentFeatureData.color}05`,
            ]}
            style={styles.featureGradient}
          >
            <View style={styles.featureHeader}>
              <View style={[styles.featureIcon, { backgroundColor: `${currentFeatureData.color}20` }]}>
                <Ionicons 
                  name={currentFeatureData.icon} 
                  size={28} 
                  color={currentFeatureData.color} 
                />
              </View>
              <TouchableOpacity
                onPress={() => showFeatureTooltip(currentFeatureData)}
                style={styles.infoButton}
              >
                <Ionicons name="information-circle-outline" size={20} color="#888" />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.featureTitle, { color: currentFeatureData.color }]}>
              {currentFeatureData.title}
            </Text>
            <Text style={styles.featureDescription}>
              {currentFeatureData.description}
            </Text>
            
            {/* Feature indicators */}
            <View style={styles.featureIndicators}>
              {features.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentFeature && styles.indicatorActive,
                    { backgroundColor: index === currentFeature ? currentFeatureData.color : '#888' }
                  ]}
                  onPress={() => setCurrentFeature(index)}
                />
              ))}
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    );
  };

  const StatsSection = () => {
    const stats = [
      { number: "100+", label: "Happy Users", icon: "people" },
      { number: "99.9%", label: "Uptime", icon: "checkmark-circle" },
      { number: "24/7", label: "Support", icon: "headset" },
    ];

    return (
      <View style={styles.statsSection}>
        {stats.map((stat, index) => (
          <Animated.View
            key={index}
            style={[
              styles.statCard,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 50],
                      outputRange: [0, 50 + index * 20],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={["rgba(0,234,255,0.1)", "rgba(0,234,255,0.05)"]}
              style={styles.statGradient}
            >
              <Ionicons name={stat.icon} size={24} color="#00eaff" />
              <Text style={styles.statNumber}>{stat.number}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </LinearGradient>
          </Animated.View>
        ))}
      </View>
    );
  };

  const Tooltip = () => {
    if (!showTooltip) return null;

    return (
      <Animated.View
        style={[
          styles.tooltip,
          {
            opacity: tooltipAnim,
            transform: [
              {
                scale: tooltipAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <BlurView intensity={30} style={styles.tooltipBlur}>
          <Text style={styles.tooltipText}>{tooltipContent}</Text>
        </BlurView>
      </Animated.View>
    );
  };

  return (
    <LinearGradient 
      colors={["#0a0e27", "#16213e", "#1a2332"]} 
      style={styles.container}
    >
      <FloatingParticles />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Enhanced Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Enhanced Logo */}
        <EnhancedLogo />

        {/* Main Content */}
        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.title}>Welcome LuminaNDriver</Text>
          <Text style={styles.subtitle}>
            Your trusted gas delivery partner in Zimbabwe
          </Text>
          
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>
              Experience the future of gas delivery with our cutting-edge platform. 
              Fast, secure, and reliable service that puts you first.
            </Text>
          </View>

          <Text style={styles.tagline}>
            Empowering Zimbabwe with smarter, cleaner, and more reliable gas solutions.
          </Text>
          <Text style={styles.author}>— thisismeprivateisaacngirazi</Text>
        </Animated.View>

        {/* Feature Carousel */}
        <FeatureCarousel />

        {/* Stats Section */}
        <StatsSection />

        {/* Enhanced Get Started Button */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: buttonPulse },
              ],
            },
          ]}
        >
          <Pressable
            onPress={handleGetStarted}
            style={({ pressed }) => [
              styles.getStartedButton,
              pressed && styles.buttonPressed,
            ]}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          >
            <LinearGradient
              colors={["#00eaff", "#0ea5e9", "#0072ff"]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="rocket" size={24} color="#fff" />
              <Text style={styles.getStartedText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Trust Indicators */}
        <Animated.View
          style={[
            styles.trustSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={["rgba(34,197,94,0.1)", "rgba(34,197,94,0.05)"]}
            style={styles.trustGradient}
          >
            <View style={styles.trustHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
              <Text style={styles.trustTitle}>Trusted & Secure</Text>
            </View>
            <Text style={styles.trustText}>
              Licensed, insured, and verified. Your safety is our top priority.
            </Text>
          </LinearGradient>
        </Animated.View>
      </ScrollView>

      {/* Tooltip */}
      <Tooltip />
    </LinearGradient>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  
  // Particles
  particlesContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  particle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,234,255,0.4)",
  },
  
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 20,
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  skipText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },
  
  // Content
  contentContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
    letterSpacing: 1.2,
    textAlign: "center",
    textShadowColor: "rgba(0,234,255,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 18,
    color: "#00eaff",
    marginBottom: 20,
    letterSpacing: 0.5,
    textAlign: "center",
    fontWeight: "600",
  },
  descriptionContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(0,234,255,0.2)",
  },
  description: {
    fontSize: 16,
    color: "#e5e5e5",
    textAlign: "center",
    lineHeight: 24,
  },
  tagline: {
    fontSize: 16,
    color: "#00eaff",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
    lineHeight: 22,
    fontWeight: "500",
  },
  author: {
    fontSize: 14,
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
  
  // Feature Carousel
  featureCarousel: {
    marginBottom: 30,
    borderRadius: 20,
    overflow: "hidden",
  },
  featureBlur: {
    borderRadius: 20,
  },
  featureGradient: {
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  featureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
  },
  infoButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  featureDescription: {
    fontSize: 16,
    color: "#e5e5e5",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  featureIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicatorActive: {
    width: 24,
  },
  
  // Stats
  statsSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 40,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 16,
    overflow: "hidden",
  },
  statGradient: {
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,234,255,0.2)",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#00eaff",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },
  
  // Button
  buttonContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  getStartedButton: {
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#00eaff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  getStartedText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    letterSpacing: 0.5,
  },
  
  // Trust Section
  trustSection: {
    borderRadius: 16,
    overflow: "hidden",
  },
  trustGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
  },
  trustHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  trustTitle: {
    color: "#22c55e",
    fontSize: 16,
    fontWeight: "bold",
  },
  trustText: {
    color: "#e5e5e5",
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Tooltip
  tooltip: {
    position: "absolute",
    top: "50%",
    left: 20,
    right: 20,
    zIndex: 1000,
    borderRadius: 16,
    overflow: "hidden",
  },
  tooltipBlur: {
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  tooltipText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});