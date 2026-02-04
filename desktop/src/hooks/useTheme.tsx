import { createContext, useContext, useEffect, useState } from "react";
import { Config, getConfig, saveConfig } from "./useTauriCommands";

type Theme = "dark" | "light" | "system";

interface ThemeProviderState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    actualTheme: "dark" | "light"; // Le thème réellement affiché (résolu depuis 'system')
}

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
    actualTheme: "dark",
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = "system",
}: {
    children: React.ReactNode;
    defaultTheme?: Theme;
}) {
    const [theme, setThemeState] = useState<Theme>(defaultTheme);
    const [systemTheme, setSystemTheme] = useState<"dark" | "light">("dark");
    const [config, setConfig] = useState<Config | null>(null);

    // Charger la config au démarrage
    useEffect(() => {
        getConfig().then((cfg) => {
            setConfig(cfg);
            if (cfg.theme && (cfg.theme === "dark" || cfg.theme === "light" || cfg.theme === "system")) {
                setThemeState(cfg.theme);
            }
        }).catch(console.error);
    }, []);

    // Détecter le thème système
    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        setSystemTheme(mediaQuery.matches ? "dark" : "light");

        const handler = (e: MediaQueryListEvent) => {
            setSystemTheme(e.matches ? "dark" : "light");
        };

        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    // Appliquer le thème
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");

        const effectiveTheme = theme === "system" ? systemTheme : theme;

        root.classList.add(effectiveTheme);
        root.setAttribute("data-theme", effectiveTheme);

        // Mettre à jour la meta color-scheme si nécessaire
        root.style.colorScheme = effectiveTheme;
    }, [theme, systemTheme]);

    const setTheme = async (newTheme: Theme) => {
        setThemeState(newTheme);

        // Sauvegarder dans la config Rust
        if (config) {
            const newConfig = { ...config, theme: newTheme };
            setConfig(newConfig);
            try {
                await saveConfig(newConfig);
            } catch (e) {
                console.error("Failed to save theme preference:", e);
            }
        }
    };

    const actualTheme = theme === "system" ? systemTheme : theme;

    return (
        <ThemeProviderContext.Provider value={{ theme, setTheme, actualTheme }}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider");

    return context;
};
