import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { ConfigProvider, theme } from "antd";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

export type ThemeMode = "light" | "dark";
const storageKey = "stock-portfolio-theme";
const ThemeContext = createContext({ mode: "light" as ThemeMode, toggleTheme: () => {} });
export const useAppTheme = () => useContext(ThemeContext);

function initialTheme(): ThemeMode {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function AppTheme({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(initialTheme);
  const dark = mode === "dark";
  const muiTheme = useMemo(() => createTheme({
    palette: { mode, primary: { main: dark ? "#5eead4" : "#0f766e" },
      background: { default: dark ? "#101923" : "#f3f6f8", paper: dark ? "#192532" : "#ffffff" },
      text: { primary: dark ? "#e6edf4" : "#162638", secondary: dark ? "#a5b5c5" : "#607286" },
    },
    typography: { fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
    shape: { borderRadius: 12 },
  }), [mode, dark]);
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
    try { window.localStorage.setItem(storageKey, mode); } catch {}
  }, [mode]);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey && (event.newValue === "light" || event.newValue === "dark")) setMode(event.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return <ThemeContext.Provider value={{ mode, toggleTheme: () => setMode(value => value === "light" ? "dark" : "light") }}>
    <ConfigProvider theme={{ algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: {
      colorPrimary: dark ? "#5eead4" : "#0f766e",
      colorBgLayout: dark ? "#101923" : "#f3f6f8",
      colorBgContainer: dark ? "#192532" : "#ffffff",
      colorText: dark ? "#e6edf4" : "#162638",
      colorTextSecondary: dark ? "#a5b5c5" : "#607286",
      colorBorderSecondary: dark ? "#2b3b4b" : "#e4ebf0",
      borderRadius: 12, fontFamily: muiTheme.typography.fontFamily, controlHeight: 38,
    } }}>
      <ThemeProvider theme={muiTheme}><CssBaseline />{children}</ThemeProvider>
    </ConfigProvider>
  </ThemeContext.Provider>;
}
