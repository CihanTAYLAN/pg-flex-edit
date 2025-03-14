"use client";

import { useTheme } from "next-themes";
import { Button, Tooltip } from "antd";
import { BulbOutlined, BulbFilled } from "@ant-design/icons";
import { useEffect, useState } from "react";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <Tooltip title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            <Button
                type="text"
                icon={theme === "dark" ? <BulbOutlined /> : <BulbFilled />}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
            />
        </Tooltip>
    );
} 