import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Slider from "@react-native-community/slider";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "./config";

const COLORS = {
  bg: "#0a0c1c",
  card: "#151833",
  border: "#272b52",
  text: "#eef0ff",
  muted: "#9aa0c8",
  primary: "#5b5bf0",
  accent: "#ec4899",
  track: "#262a50",
  setosa: "#10b981",
  versicolor: "#f59e0b",
  virginica: "#8b5cf6",
};

const FEATURES = [
  { key: "sepal_length", label: "Sepal length", min: 4, max: 8, def: 5.8 },
  { key: "sepal_width", label: "Sepal width", min: 2, max: 4.5, def: 3.0 },
  { key: "petal_length", label: "Petal length", min: 1, max: 7, def: 4.3 },
  { key: "petal_width", label: "Petal width", min: 0.1, max: 2.6, def: 1.3 },
];

const PRESETS = {
  setosa: { sepal_length: 5.1, sepal_width: 3.5, petal_length: 1.4, petal_width: 0.2 },
  versicolor: { sepal_length: 6.0, sepal_width: 2.9, petal_length: 4.5, petal_width: 1.5 },
  virginica: { sepal_length: 6.7, sepal_width: 3.0, petal_length: 5.8, petal_width: 2.2 },
};

const INFO = {
  setosa: "Smallest of the three, with short, wide petals.",
  versicolor: "Medium-sized, with petals of intermediate length.",
  virginica: "Largest of the three, with long and wide petals.",
};

const initial = Object.fromEntries(FEATURES.map((f) => [f.key, f.def]));
const round1 = (v) => Math.round(v * 10) / 10;

function ProbabilityBar({ name, value }) {
  const width = useMemo(() => new Animated.Value(0), []);
  React.useEffect(() => {
    Animated.timing(width, {
      toValue: value,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value]);
  return (
    <View style={styles.probRow}>
      <Text style={styles.probName}>{name}</Text>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: COLORS[name],
              width: width.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
            },
          ]}
        />
      </View>
      <Text style={styles.probVal}>{(value * 100).toFixed(1)}%</Text>
    </View>
  );
}

export default function App() {
  const [values, setValues] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const setValue = (key, v) => setValues((prev) => ({ ...prev, [key]: v }));

  const predict = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      setResult(await res.json());
    } catch (e) {
      setResult(null);
      setError(`Could not reach the API. ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <LinearGradient
              colors={["#5b5bf0", "#8b5cf6", "#ec4899"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroTag}>RANDOM FOREST · IRIS DATASET</Text>
              <Text style={styles.heroTitle}>IrisAI</Text>
              <Text style={styles.heroSub}>Identify an iris species from four flower measurements.</Text>
            </LinearGradient>

            {/* Presets */}
            <View style={styles.presetRow}>
              {Object.keys(PRESETS).map((name) => (
                <Pressable key={name} style={styles.chip} onPress={() => setValues(PRESETS[name])}>
                  <View style={[styles.dot, { backgroundColor: COLORS[name] }]} />
                  <Text style={styles.chipText}>{name}</Text>
                </Pressable>
              ))}
            </View>

            {/* Inputs */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Measurements (cm)</Text>
              {FEATURES.map((f) => (
                <View key={f.key} style={styles.field}>
                  <View style={styles.fieldTop}>
                    <Text style={styles.label}>{f.label}</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="decimal-pad"
                      value={String(values[f.key])}
                      onChangeText={(t) => {
                        const n = parseFloat(t.replace(",", "."));
                        setValue(f.key, Number.isNaN(n) ? 0 : n);
                      }}
                    />
                  </View>
                  <Slider
                    minimumValue={f.min}
                    maximumValue={f.max}
                    step={0.1}
                    value={Math.min(Math.max(values[f.key], f.min), f.max)}
                    onValueChange={(v) => setValue(f.key, round1(v))}
                    minimumTrackTintColor={COLORS.primary}
                    maximumTrackTintColor={COLORS.track}
                    thumbTintColor="#ffffff"
                  />
                </View>
              ))}

              <Pressable onPress={predict} disabled={loading} style={({ pressed }) => [{ opacity: pressed || loading ? 0.85 : 1 }]}>
                <LinearGradient
                  colors={["#5b5bf0", "#8b5cf6", "#ec4899"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Predict species</Text>}
                </LinearGradient>
              </Pressable>
              {!!error && <Text style={styles.error}>{error}</Text>}
            </View>

            {/* Result */}
            {result && (
              <View style={[styles.card, { borderColor: COLORS[result.species] }]}>
                <Text style={styles.eyebrow}>PREDICTED SPECIES</Text>
                <View style={styles.resultTop}>
                  <Text style={[styles.species, { color: COLORS[result.species] }]}>{result.species}</Text>
                  <View style={[styles.badge, { borderColor: COLORS[result.species] }]}>
                    <Text style={styles.badgeText}>{(result.confidence * 100).toFixed(0)}%</Text>
                  </View>
                </View>
                <Text style={styles.desc}>{INFO[result.species]}</Text>
                <Text style={[styles.eyebrow, { marginTop: 18 }]}>CLASS PROBABILITIES</Text>
                {Object.entries(result.probabilities)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, p]) => (
                    <ProbabilityBar key={name} name={name} value={p} />
                  ))}
              </View>
            )}

            <Text style={styles.footer}>Machine Learning Assignment 1 · scikit-learn · FastAPI · Expo</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 18, paddingBottom: 40 },
  hero: { borderRadius: 24, padding: 24, marginBottom: 16 },
  heroTag: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "700", letterSpacing: 1.4 },
  heroTitle: { color: "#fff", fontSize: 40, fontWeight: "800", marginTop: 6, letterSpacing: -1 },
  heroSub: { color: "rgba(255,255,255,0.9)", fontSize: 15, marginTop: 4, lineHeight: 21 },
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  chip: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  chipText: { color: COLORS.text, fontWeight: "600", textTransform: "capitalize", fontSize: 13 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  card: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1, borderRadius: 22, padding: 20, marginBottom: 16 },
  cardTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 14 },
  field: { marginBottom: 12 },
  fieldTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: COLORS.text, fontWeight: "600", fontSize: 15 },
  input: { color: COLORS.text, backgroundColor: COLORS.bg, borderColor: COLORS.border, borderWidth: 1, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, minWidth: 70, textAlign: "right", fontSize: 15 },
  button: { marginTop: 10, borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  error: { color: "#f87171", marginTop: 12, fontSize: 13 },
  eyebrow: { color: COLORS.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  resultTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  species: { fontSize: 34, fontWeight: "800", textTransform: "capitalize", letterSpacing: -0.8 },
  badge: { borderWidth: 3, borderRadius: 999, width: 68, height: 68, alignItems: "center", justifyContent: "center" },
  badgeText: { color: COLORS.text, fontWeight: "800", fontSize: 17 },
  desc: { color: COLORS.muted, marginTop: 6, lineHeight: 20 },
  probRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  probName: { color: COLORS.text, width: 88, textTransform: "capitalize", fontWeight: "600", fontSize: 13 },
  track: { flex: 1, height: 10, borderRadius: 999, backgroundColor: COLORS.track, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999 },
  probVal: { color: COLORS.muted, width: 52, textAlign: "right", fontSize: 12 },
  footer: { color: COLORS.muted, textAlign: "center", fontSize: 12, marginTop: 8 },
});
