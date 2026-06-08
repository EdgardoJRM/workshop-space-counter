import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import {
  joinWorkshopDatetimeLocal,
  parseWorkshopDatetimeLocal,
  splitWorkshopDatetimeLocal,
} from "@/lib/workshop-datetime";
import { useAppTheme } from "@/lib/useAppTheme";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

function toPickerDate(value: string): Date {
  const joined = value.trim()
    ? joinWorkshopDatetimeLocal(
        splitWorkshopDatetimeLocal(value).date,
        splitWorkshopDatetimeLocal(value).time
      )
    : "";
  const parsed = joined ? parseWorkshopDatetimeLocal(joined) : null;
  if (parsed) return parsed;
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 14);
  fallback.setHours(10, 0, 0, 0);
  return fallback;
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString("es-PR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTimeLabel(d: Date): string {
  return d.toLocaleTimeString("es-PR", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WorkshopDateTimePicker({ value, onChange }: Props) {
  const { colors, styles } = useAppTheme();
  const [pickerDate, setPickerDate] = useState(() => toPickerDate(value));
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  useEffect(() => {
    if (value.trim()) setPickerDate(toPickerDate(value));
  }, [value]);

  function emit(next: Date) {
    setPickerDate(next);
    const local = joinWorkshopDatetimeLocal(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`,
      `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`
    );
    onChange(local);
  }

  function onDateChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setShowDate(false);
    if (event.type === "dismissed" || !selected) return;
    const next = new Date(pickerDate);
    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    emit(next);
  }

  function onTimeChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setShowTime(false);
    if (event.type === "dismissed" || !selected) return;
    const next = new Date(pickerDate);
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    emit(next);
  }

  return (
    <View style={{ gap: 10, marginBottom: 12 }}>
      <Pressable
        onPress={() => {
          setShowTime(false);
          setShowDate(true);
        }}
        style={[
          styles.input,
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="calendar-outline" size={18} color={colors.accent} />
          <Text style={{ fontSize: 14, color: colors.text }}>
            {formatDateLabel(pickerDate)}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.textSubtle} />
      </Pressable>

      <Pressable
        onPress={() => {
          setShowDate(false);
          setShowTime(true);
        }}
        style={[
          styles.input,
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="time-outline" size={18} color={colors.accent} />
          <Text style={{ fontSize: 14, color: colors.text }}>
            {formatTimeLabel(pickerDate)}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.textSubtle} />
      </Pressable>

      {showDate ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={onDateChange}
        />
      ) : null}

      {showTime ? (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onTimeChange}
        />
      ) : null}
    </View>
  );
}
