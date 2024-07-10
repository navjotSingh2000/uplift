import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";

interface Joke {
  id: string;
  joke: string;
}

export function Jokes({ route }: { route: any }) {
  const { joke: initialJoke } = route.params || {
    joke: "No joke fetched yet.",
  };
  const [joke, setJoke] = useState<string>(initialJoke);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchNewJoke = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("https://icanhazdadjoke.com/", {
        headers: {
          Accept: "application/json",
        },
      });
      const data = await response.json();
      setJoke(data.joke);
    } catch (error) {
      console.error("Failed to fetch joke", error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchNewJoke();
  };

  useEffect(() => {
    // Fetch a new joke if initialJoke is not provided or is the default message
    if (!initialJoke || initialJoke === "No joke fetched yet.") {
      fetchNewJoke();
    }
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollView}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.jokeContainer}>
        <Text style={styles.jokeText}>{joke}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    justifyContent: "center",
  },
  jokeContainer: {
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
