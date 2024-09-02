import AsyncStorage from "@react-native-async-storage/async-storage";
import { Joke, NotificationTime } from "./types";
import { Alert } from "react-native";

export async function fetchJoke(): Promise<Joke | null> {
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

export const loadTimes = async (): Promise<NotificationTime[]> => {
  try {
    const savedTimes = await AsyncStorage.getItem("notificationTimes");
    if (savedTimes) {
      const parsedTimes: NotificationTime[] = JSON.parse(savedTimes).map(
        (item: NotificationTime) => ({
          ...item,
          time: new Date(item.time), // convert back to Date object
        })
      );
      return parsedTimes;
    }
  } catch (e) {
    console.error("Failed to load times.", e);
  }
  return [];
};

export const saveTimes = async (newTimes: NotificationTime[]) => {
  try {
    await AsyncStorage.setItem("notificationTimes", JSON.stringify(newTimes));
  } catch (e) {
    console.error("Failed to save times.", e);
  }
};

export const addTime = (
  times: NotificationTime[],
  time: Date
): NotificationTime[] => {
  // Check if the selected time already exists
  const existingTime = times.find((t) => t.time === time.toISOString());
  if (existingTime) {
    Alert.alert(
      "Duplicate Time",
      "This time is already set for notifications.",
      [{ text: "OK", style: "cancel" }]
    );
    return [];
  }

  // If not, add the new time
  const newTime: NotificationTime = {
    id: String(Date.now()),
    time: time.toISOString(), // convert to string
    enabled: true,
  };
  const updatedTimes = [...times, newTime];
  return updatedTimes;
};

export const toggleTime = (
  times: NotificationTime[],
  id: string
): NotificationTime[] => {
  const updatedTimes = times.map((t) =>
    t.id === id ? { ...t, enabled: !t.enabled } : t
  );

  return updatedTimes;
};

export const deleteTime = (
  times: NotificationTime[],
  id: string
): NotificationTime[] => {
  const updatedTimes = times.filter((t) => t.id !== id);
  return updatedTimes;
};
