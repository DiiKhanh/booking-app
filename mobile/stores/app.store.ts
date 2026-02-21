import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HAS_SEEN_ONBOARDING_KEY = "has_seen_onboarding";
const GUEST_MODE_KEY = "is_guest_mode";

interface AppState {
  readonly hasSeenOnboarding: boolean | null;
  readonly isAppReady: boolean;
  readonly isGuestMode: boolean;
}

interface AppActions {
  loadOnboardingStatus: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setGuestMode: (value: boolean) => void;
  clearGuestMode: () => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()((set) => ({
  hasSeenOnboarding: null,
  isAppReady: false,
  isGuestMode: false,

  loadOnboardingStatus: async () => {
    try {
      const [onboardingValue, guestValue] = await Promise.all([
        AsyncStorage.getItem(HAS_SEEN_ONBOARDING_KEY),
        AsyncStorage.getItem(GUEST_MODE_KEY),
      ]);
      set({
        hasSeenOnboarding: onboardingValue === "true",
        isGuestMode: guestValue === "true",
        isAppReady: true,
      });
    } catch {
      set({ hasSeenOnboarding: false, isGuestMode: false, isAppReady: true });
    }
  },

  completeOnboarding: async () => {
    await AsyncStorage.setItem(HAS_SEEN_ONBOARDING_KEY, "true");
    set({ hasSeenOnboarding: true });
  },

  setGuestMode: (value: boolean) => {
    AsyncStorage.setItem(GUEST_MODE_KEY, value ? "true" : "false");
    set({ isGuestMode: value });
  },

  clearGuestMode: () => {
    AsyncStorage.removeItem(GUEST_MODE_KEY);
    set({ isGuestMode: false });
  },
}));
