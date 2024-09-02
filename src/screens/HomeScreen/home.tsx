import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  Button,
  Platform,
  Switch,
  FlatList,
  TouchableOpacity,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import { styles } from "./styles";
import { NotificationTime } from "./types";
import {
  addTime,
  deleteTime,
  fetchJoke,
  loadTimes,
  saveTimes,
  toggleTime,
} from "./helpers";
import { registerForPushNotificationsAsync } from "./service";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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
    async () => {
      const savedTimes = await loadTimes();
      setTimes(savedTimes);
    };

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
      Notifications.addNotificationResponseReceivedListener(async () => {
        const jokeData = await fetchJoke();
        if (jokeData) {
          navigation.navigate("JokeScreen", { joke: jokeData.joke });
        }
      });

    return () => {
      notificationListener.current &&
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      responseListener.current &&
        Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

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
              const addedTimes = addTime(times, date);
              setTimes(addedTimes);
              saveTimes(addedTimes);
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
              onValueChange={() => {
                const toggledTimes = toggleTime(times, item.id);
                setTimes(toggledTimes);
                saveTimes(toggledTimes);
              }}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={item.enabled ? "#6200ee" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
            />
            <TouchableOpacity
              onPress={() => {
                const deletedTimes = deleteTime(times, item.id);
                setTimes(deletedTimes);
                saveTimes(deletedTimes);
              }}
            >
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
