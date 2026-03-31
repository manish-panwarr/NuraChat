import useUiStore from "../store/uiStore";

/**
 * Theme hook wrapping Zustand UI store.
 * Initializes theme on mount and provides toggle function.
 */
export default function useTheme() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const setTheme = useUiStore((s) => s.setTheme);

  const isDark = theme === "dark";

  return { theme, isDark, toggleTheme, setTheme };
}
