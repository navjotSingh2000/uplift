import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  Button,
  Platform,
  Switch,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationTime {
  id: string;
  time: string; // store time as string
  enabled: boolean;
}

interface Joke {
  id: string;
  joke: string;
}

export function Home({ navigation }: { navigation: any }) {
  const [expoPushToken, setExpoPushToken] = useState<string>("");
  const [channels, setChannels] = useState<Notifications.NotificationChannel[]>(
    []
  );
  const [notification, setNotification] = useState<
    Notifications.Notification | undefined
  >(undefined);
  const [times, setTimes] = useState<NotificationTime[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    loadTimes();
    registerForPushNotificationsAsync().then(
      (token) => token && setExpoPushToken(token)
    );

    if (Platform.OS === "android") {
      Notifications.getNotificationChannelsAsync().then((value) =>
        setChannels(value ?? [])
      );
    }

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          const jokeData = await fetchJoke();
          if (jokeData) {
            navigation.navigate("JokeScreen", { joke: jokeData.joke });
          }
        }
      );

    return () => {
      notificationListener.current &&
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      responseListener.current &&
        Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const loadTimes = async () => {
    try {
      const savedTimes = await AsyncStorage.getItem("notificationTimes");
      if (savedTimes) {
        const parsedTimes: NotificationTime[] = JSON.parse(savedTimes).map(
          (item: NotificationTime) => ({
            ...item,
            time: new Date(item.time), // convert back to Date object
          })
        );
        setTimes(parsedTimes);
      }
    } catch (e) {
      console.error("Failed to load times.", e);
    }
  };

  const saveTimes = async (newTimes: NotificationTime[]) => {
    try {
      await AsyncStorage.setItem("notificationTimes", JSON.stringify(newTimes));
    } catch (e) {
      console.error("Failed to save times.", e);
    }
  };

  const addTime = (time: Date) => {
    // Check if the selected time already exists
    const existingTime = times.find((t) => t.time === time.toISOString());
    if (existingTime) {
      Alert.alert(
        "Duplicate Time",
        "This time is already set for notifications.",
        [{ text: "OK", style: "cancel" }]
      );
      return;
    }

    // If not, add the new time
    const newTime: NotificationTime = {
      id: String(Date.now()),
      time: time.toISOString(), // convert to string
      enabled: true,
    };
    const updatedTimes = [...times, newTime];
    setTimes(updatedTimes);
    saveTimes(updatedTimes);
  };

  const toggleTime = (id: string) => {
    const updatedTimes = times.map((t) =>
      t.id === id ? { ...t, enabled: !t.enabled } : t
    );
    setTimes(updatedTimes);
    saveTimes(updatedTimes);
  };

  const deleteTime = (id: string) => {
    const updatedTimes = times.filter((t) => t.id !== id);
    setTimes(updatedTimes);
    saveTimes(updatedTimes);
  };

  const scheduleNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const time of times) {
      if (time.enabled) {
        const trigger = new Date(time.time);
        trigger.setSeconds(0);
        trigger.setMilliseconds(0);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Joke Incoming",
            body: "Open to see a funny joke!",
            sound: "default",
          },
          trigger: {
            hour: trigger.getHours(),
            minute: trigger.getMinutes(),
            repeats: true,
          },
        });
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Funny Jokes Scheduler</Text>
      <View style={styles.buttonContainer}>
        <Button
          title="Add Notification Time"
          onPress={() => setShowDatePicker(true)}
          color="#6200ee"
        />
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, date) => {
            if (date) {
              setShowDatePicker(false);
              setSelectedTime(date);
              addTime(date);
            }
          }}
        />
      )}
      <FlatList
        style={styles.list}
        data={times}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <Text style={styles.timeText}>
              {new Date(item.time).toLocaleTimeString()}
            </Text>
            <Switch
              value={item.enabled}
              onValueChange={() => toggleTime(item.id)}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={item.enabled ? "#6200ee" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
            />
            <TouchableOpacity onPress={() => deleteTime(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <View style={styles.buttonContainer}>
        <Button
          title="Schedule Notifications"
          onPress={scheduleNotifications}
          color="#6200ee"
        />
      </View>
    </View>
  );
}

async function fetchJoke(): Promise<Joke | null> {
  try {
    const response = await fetch("https://icanhazdadjoke.com/", {
      headers: {
        Accept: "application/json",
      },
    });
    const data = await response.json();
    return {
      id: data.id,
      joke: data.joke,
    };
  } catch (error) {
    console.error("Failed to fetch joke", error);
    return null;
  }
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Failed to get push token for push notification!",
        [{ text: "OK", style: "cancel" }]
      );
      return;
    }
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      if (!projectId) {
        throw new Error("Project ID not found");
      }
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log(token);
    } catch (e) {
      token = `${e}`;
    }
  } else {
    Alert.alert(
      "Physical Device Required",
      "Must use physical device for Push Notifications",
      [{ text: "OK", style: "cancel" }]
    );
  }

  return token;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
    color: "#6200ee",
  },
  buttonContainer: {
    marginBottom: 10,
    alignSelf: "center",
    width: "80%",
    maxWidth: 300,
  },
  list: {
    marginTop: 10,
    marginBottom: 20,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  timeText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  deleteText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "red",
  },
  jokeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  jokeText: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
});
