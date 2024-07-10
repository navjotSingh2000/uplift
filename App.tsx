import { StatusBar } from "expo-status-bar";
import { StyleSheet, Button, View } from "react-native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Home } from "./src/screens/HomeScreen/home";
import { Jokes } from "./src/screens/JokesScreen/jokes";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        {/* <StatusBar style="auto" /> */}
        <Stack.Screen
          name="Home"
          component={Home}
          options={({ navigation }) => ({
            headerRight: () => (
              <View style={{ marginRight: 10 }}>
                <Button
                  onPress={() => navigation.navigate("JokeScreen")}
                  title="Jokes"
                  color="#6200ee"
                />
              </View>
            ),
          })}
        />
        <Stack.Screen name="JokeScreen" component={Jokes} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
