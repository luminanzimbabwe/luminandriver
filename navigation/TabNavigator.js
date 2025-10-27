
// navigation/TabNavigator.js
import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from "../screens/HomeScreen";
import OrdersScreen from "../screens/OrdersScreen";
import ConfirmedOrdersScreen from "../screens/ConfirmedOrdersScreen";
import DeliveredOrdersScreen from "../screens/DeliveredOrdersScreen";
import PendingOrdersScreen from "../screens/PendingOrdersScreen";
import CanceledOrdersScreen from "../screens/CanceledOrdersScreen";
import OrderDetailsScreen from "../screens/OrderDetailsScreen";


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Orders Stack Navigator
const OrdersStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrdersList" component={OrdersScreen} />
      <Stack.Screen name="ConfirmedOrders" component={ConfirmedOrdersScreen} />
      <Stack.Screen name="DeliveredOrders" component={DeliveredOrdersScreen} />
      <Stack.Screen name="PendingOrders" component={PendingOrdersScreen} />
      <Stack.Screen name="CanceledOrders" component={CanceledOrdersScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
    </Stack.Navigator>
  );
};



const TabNavigator = () => {
 
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,

        
        tabBarStyle: {
          ...styles.tabBar,
          
          height: 60 + insets.bottom,
        },

        tabBarActiveTintColor: "#00eaff",
        tabBarInactiveTintColor: "#888",

        
        tabBarLabelStyle: { fontSize: 10 },

        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          const iconSize = 20;

          if (route.name === "Home") iconName = focused ? "home" : "home-outline";
          else if (route.name === "Orders") iconName = focused ? "list" : "list-outline";

          return <Ionicons name={iconName} size={iconSize} color={color} />;
        },
      })}
        >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Orders" component={OrdersStack} />
    </Tab.Navigator>
  );
};

export default TabNavigator;

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#18181b",
    borderTopColor: "#00eaff",
    borderTopWidth: 0.5,
    
   
    height: 60, 
    
    
    paddingBottom: 4, 
    paddingTop: 4,
    
   
  },
});