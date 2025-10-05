
// navigation/TabNavigator.js
import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
// 1. Import useSafeAreaInsets
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

import HomeScreen from "../screens/HomeScreen";
import UpdatesScreen from "../screens/UpdatesScreen";


const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  // 2. Use the hook to get the bottom safe area inset value
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        
        // 3. Dynamically apply the tab bar style with the safe area inset
        tabBarStyle: {
          ...styles.tabBar,
          // Add the bottom safe area inset to the custom height
          height: 60 + insets.bottom, 
        },
        
        tabBarActiveTintColor: "#00eaff",
        tabBarInactiveTintColor: "#888",
        
        // Let's also make the text smaller here for consistency with WelcomeScreen
        tabBarLabelStyle: { fontSize: 10 }, 
        
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          // Let's also make the icons smaller for consistency
          const iconSize = 20; 
          
          if (route.name === "Home") iconName = focused ? "home" : "home-outline";
          else if (route.name === "Updates") iconName = focused ? "notifications" : "notifications-outline";
          else if (route.name === "Progress") iconName = focused ? "pulse" : "pulse-outline";

          return <Ionicons name={iconName} size={iconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Updates" component={UpdatesScreen} />
 
    </Tab.Navigator>
  );
};

export default TabNavigator;

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#18181b",
    borderTopColor: "#00eaff",
    borderTopWidth: 0.5,
    
    // Set a base height, as the safe area will be added dynamically above
    height: 60, 
    
    // We can remove paddingBottom/paddingTop here, or adjust them
    paddingBottom: 4, 
    paddingTop: 4,
    
    // Keep position: "absolute" if you need the tab bar to float over content 
    // but be aware it requires explicit safe area handling as done above.
    // If you remove it, React Navigation handles safe area for you.
    position: "absolute", 
  },
});