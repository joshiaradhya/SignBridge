import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const apply = (t: "light" | "dark") => {
    document.documentElement.classList.toggle("dark", t === "dark");
  };

  useEffect(() => {
    const stored = localStorage.getItem("sb-theme");
    const initial: "light" | "dark" =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);


  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        localStorage.setItem("sb-theme", next);
        apply(next);
      }}
      className="ink ink-press flex h-8 w-8 items-center justify-center rounded-md bg-card"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
