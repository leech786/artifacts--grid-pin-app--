import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { bngToLatLon, toDMS } from "@/lib/bng";
import { useColors } from "@/hooks/useColors";

interface ConversionResult {
  lat: number;
  lon: number;
}

interface HistoryItem {
  id: string;
  easting: string;
  northing: string;
  lat: number;
  lon: number;
  timestamp: number;
}

const HISTORY_KEY = "gridpin_history";
const MAX_HISTORY = 8;

function NavAppButton({
  label,
  icon,
  color,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, { toValue: 0.94, useNativeDriver: true }).start();
  }
  function handlePressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.navBtn, { backgroundColor: color }]}
      >
        {icon}
        <Text style={styles.navBtnText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [easting, setEasting] = useState("");
  const [northing, setNorthing] = useState("");
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const northingRef = useRef<TextInput>(null);
  const resultAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then((raw) => {
      if (raw) {
        try { setHistory(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  async function saveHistory(items: HistoryItem[]) {
    setHistory(items);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  }

  function showResult() {
    resultAnim.setValue(0);
    Animated.spring(resultAnim, {
      toValue: 1,
      friction: 7,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }

  function handleConvert() {
    setError(null);
    const E = parseFloat(easting.trim());
    const N = parseFloat(northing.trim());

    if (isNaN(E) || isNaN(N)) {
      setError("Enter valid numbers for both easting and northing.");
      setResult(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (E < 0 || E > 700_000) {
      setError("Easting must be between 0 and 700,000 metres.");
      setResult(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (N < 0 || N > 1_300_000) {
      setError("Northing must be between 0 and 1,300,000 metres.");
      setResult(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      const { lat, lon } = bngToLatLon(E, N);
      setResult({ lat, lon });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showResult();

      const newItem: HistoryItem = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        easting: easting.trim(),
        northing: northing.trim(),
        lat,
        lon,
        timestamp: Date.now(),
      };
      const updated = [newItem, ...history.filter((h) => h.easting !== easting.trim() || h.northing !== northing.trim())].slice(0, MAX_HISTORY);
      saveHistory(updated);
    } catch {
      setError("Conversion failed. Please check your inputs.");
      setResult(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  function handleClear() {
    setEasting("");
    setNorthing("");
    setResult(null);
    setError(null);
  }

  const openNav = useCallback(
    async (app: "google" | "apple" | "waze") => {
      if (!result) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { lat, lon } = result;
      const latStr = lat.toFixed(6);
      const lonStr = lon.toFixed(6);

      let urls: string[] = [];

      if (app === "google") {
        urls = [
          `comgooglemaps://?q=${latStr},${lonStr}&center=${latStr},${lonStr}`,
          `https://maps.google.com/maps?q=${latStr},${lonStr}`,
        ];
      } else if (app === "apple") {
        urls = [`maps://?ll=${latStr},${lonStr}&q=GridPin`, `https://maps.apple.com/?ll=${latStr},${lonStr}&q=GridPin`];
      } else if (app === "waze") {
        urls = [`waze://?ll=${latStr},${lonStr}&navigate=yes`, `https://waze.com/ul?ll=${latStr},${lonStr}&navigate=yes`];
      }

      for (const url of urls) {
        const can = await Linking.canOpenURL(url).catch(() => false);
        if (can) { Linking.openURL(url); return; }
      }
      // fallback — last URL in list should be web
      if (urls.length > 0) Linking.openURL(urls[urls.length - 1]);
    },
    [result]
  );

  function loadHistory(item: HistoryItem) {
    setEasting(item.easting);
    setNorthing(item.northing);
    setResult({ lat: item.lat, lon: item.lon });
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showResult();
  }

  async function clearHistory() {
    await saveHistory([]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#151e3a", "#0d1424"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="location" size={26} color="#fff" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>GridPin</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            British National Grid converter
          </Text>
        </View>

        {/* Input card */}
        <View style={[styles.card, { backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.12)" }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>EASTING (metres)</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.06)" }]}
            value={easting}
            onChangeText={setEasting}
            placeholder="e.g. 530234.5"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
            returnKeyType="next"
            onSubmitEditing={() => northingRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 14 }]}>NORTHING (metres)</Text>
          <TextInput
            ref={northingRef}
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.06)" }]}
            value={northing}
            onChangeText={setNorthing}
            placeholder="e.g. 181534.2"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={handleConvert}
          />

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: "rgba(225,43,43,0.15)", borderColor: "rgba(225,43,43,0.4)" }]}>
              <Ionicons name="alert-circle" size={14} color="#f87171" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.btnRow}>
            <Pressable
              onPress={handleConvert}
              style={({ pressed }) => [styles.convertBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.convertBtnText}>Convert</Text>
            </Pressable>
            <Pressable
              onPress={handleClear}
              style={({ pressed }) => [styles.clearBtn, { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.07)", opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="close" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* Result */}
        {result && (
          <Animated.View
            style={{
              opacity: resultAnim,
              transform: [{ translateY: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            }}
          >
            <View style={[styles.card, { backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.12)" }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CONVERTED COORDINATES</Text>

              <View style={[styles.coordBox, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }]}>
                <Text style={[styles.coordMeta, { color: colors.mutedForeground }]}>Decimal Degrees (WGS84)</Text>
                <Text style={[styles.coordValue, { color: colors.foreground }]}>
                  {result.lat.toFixed(6)}, {result.lon.toFixed(6)}
                </Text>
              </View>

              <View style={[styles.coordBox, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)", marginTop: 8 }]}>
                <Text style={[styles.coordMeta, { color: colors.mutedForeground }]}>Degrees, Minutes, Seconds</Text>
                <Text style={[styles.coordValue, { color: colors.foreground }]}>
                  {toDMS(result.lat, ["N", "S"])}
                </Text>
                <Text style={[styles.coordValue, { color: colors.foreground }]}>
                  {toDMS(result.lon, ["E", "W"])}
                </Text>
              </View>

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 16, marginBottom: 8 }]}>OPEN IN APP</Text>

              <View style={styles.navRow}>
                <NavAppButton
                  label="Maps"
                  color="#333"
                  icon={<Ionicons name="map" size={20} color="#fff" />}
                  onPress={() => openNav("apple")}
                />
                <NavAppButton
                  label="Google"
                  color="#4285F4"
                  icon={<Ionicons name="navigate" size={20} color="#fff" />}
                  onPress={() => openNav("google")}
                />
                <NavAppButton
                  label="Waze"
                  color="#33CCFF"
                  icon={<MaterialCommunityIcons name="waze" size={20} color="#fff" />}
                  onPress={() => openNav("waze")}
                />
              </View>
            </View>
          </Animated.View>
        )}

        {/* History */}
        {history.length > 0 && (
          <View style={[styles.card, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }]}>
            <View style={styles.historyHeader}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>RECENT</Text>
              <Pressable onPress={clearHistory} hitSlop={8}>
                <Text style={[styles.clearHistoryText, { color: colors.mutedForeground }]}>Clear</Text>
              </Pressable>
            </View>
            {history.map((item, idx) => (
              <Pressable
                key={item.id}
                onPress={() => loadHistory(item)}
                style={({ pressed }) => [
                  styles.historyItem,
                  idx < history.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyCoords, { color: colors.foreground }]}>
                    E {item.easting}  N {item.northing}
                  </Text>
                  <Text style={[styles.historyLatLon, { color: colors.mutedForeground }]}>
                    {item.lat.toFixed(5)}, {item.lon.toFixed(5)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          OSGB36 to WGS84 via Helmert transformation
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { alignItems: "center", marginBottom: 24 },
  iconBadge: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    marginBottom: 12, shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  title: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  card: {
    borderRadius: 18, borderWidth: 1, padding: 18,
    marginBottom: 14,
  },
  label: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 1.2, marginBottom: 8 },
  input: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 13, fontSize: 16,
  },
  errorBox: {
    flexDirection: "row", alignItems: "center", borderRadius: 10,
    borderWidth: 1, padding: 10, marginTop: 12,
  },
  errorText: { color: "#f87171", fontSize: 13, flex: 1 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  convertBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 14,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#6366f1", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  convertBtnText: { color: "#fff", fontWeight: "700" as const, fontSize: 16 },
  clearBtn: {
    width: 50, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  sectionLabel: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 1.2, marginBottom: 10 },
  coordBox: { borderRadius: 12, borderWidth: 1, padding: 12 },
  coordMeta: { fontSize: 11, marginBottom: 4 },
  coordValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  navRow: { flexDirection: "row", gap: 8 },
  navBtn: {
    borderRadius: 12, paddingVertical: 12,
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  navBtnText: { color: "#fff", fontSize: 11, fontWeight: "600" as const },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  clearHistoryText: { fontSize: 12 },
  historyItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, gap: 8,
  },
  historyCoords: { fontSize: 13, fontWeight: "500" as const, fontFamily: "Inter_500Medium" },
  historyLatLon: { fontSize: 12, marginTop: 2, fontFamily: "Inter_400Regular" },
  footer: { textAlign: "center", fontSize: 11, marginTop: 4 },
});
