"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";
import { ConfigProvider, theme as antTheme } from "antd";
import { useEffect, useState } from "react";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    const [mounted, setMounted] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
        // Check initial theme
        const isDark = document.documentElement.classList.contains('dark');
        setIsDarkMode(isDark);
    }, []);

    // Listen for theme changes
    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const isDark = document.documentElement.classList.contains('dark');
                    setIsDarkMode(isDark);
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });

        return () => observer.disconnect();
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <NextThemesProvider {...props}>
            <ConfigProvider
                theme={{
                    algorithm: isDarkMode ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
                    token: {
                        borderRadius: 8,
                        colorPrimary: '#7C5CFC',
                    },
                }}
            >
                {children}
            </ConfigProvider>
        </NextThemesProvider>
    );
} 