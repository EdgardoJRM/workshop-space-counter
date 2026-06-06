import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchEvents } from "./api";
import type { MobileEvent } from "./types";

export const SELECTED_EVENT_KEY = "hp_selected_event";

type EventContextValue = {
  loaded: boolean;
  events: MobileEvent[];
  selectedEventId: string | null;
  selectedEvent: MobileEvent | null;
  selectEvent: (workshopDateId: string) => Promise<void>;
  refreshEvents: () => Promise<void>;
};

const EventContext = createContext<EventContextValue | null>(null);

export async function getSelectedEventId(): Promise<string | null> {
  return AsyncStorage.getItem(SELECTED_EVENT_KEY);
}

export function EventProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const refreshEvents = useCallback(async () => {
    try {
      const data = await fetchEvents();
      setEvents(data.events);

      const saved = await AsyncStorage.getItem(SELECTED_EVENT_KEY);
      const nextId =
        saved && data.events.some((e) => e.workshopDateId === saved)
          ? saved
          : (data.events[0]?.workshopDateId ?? null);

      setSelectedEventId(nextId);
      if (nextId) {
        await AsyncStorage.setItem(SELECTED_EVENT_KEY, nextId);
      } else {
        await AsyncStorage.removeItem(SELECTED_EVENT_KEY);
      }
    } catch {
      setEvents([]);
      setSelectedEventId(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refreshEvents();
  }, [refreshEvents]);

  const selectEvent = useCallback(
    async (workshopDateId: string) => {
      if (!events.some((e) => e.workshopDateId === workshopDateId)) return;
      setSelectedEventId(workshopDateId);
      await AsyncStorage.setItem(SELECTED_EVENT_KEY, workshopDateId);
    },
    [events]
  );

  const selectedEvent = useMemo(
    () => events.find((e) => e.workshopDateId === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const value = useMemo(
    () => ({
      loaded,
      events,
      selectedEventId,
      selectedEvent,
      selectEvent,
      refreshEvents,
    }),
    [loaded, events, selectedEventId, selectedEvent, selectEvent, refreshEvents]
  );

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useSelectedEvent() {
  const ctx = useContext(EventContext);
  if (!ctx) {
    throw new Error("useSelectedEvent must be used within EventProvider");
  }
  return ctx;
}
