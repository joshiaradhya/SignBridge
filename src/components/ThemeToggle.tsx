import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    setReady(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    const button = buttonRef.current;
    if (button) {
      const bounds = button.getBoundingClientRect();
      document.documentElement.style.setProperty(
        "--theme-origin-x",
        `${bounds.left + bounds.width / 2}px`,
      );
      document.documentElement.style.setProperty(
        "--theme-origin-y",
        `${bounds.top + bounds.height / 2}px`,
      );
    }

    localStorage.setItem("sb-theme", next);
    const changeTheme = () => {
      apply(next);
      setTheme(next);
    };
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> };
    };

    if (
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      typeof transitionDocument.startViewTransition === "function"
    ) {
      transitionDocument.startViewTransition(() => flushSync(changeTheme));
    } else {
      changeTheme();
    }
  };

  return (
    <Button
      ref={buttonRef}
      type="button"
      aria-label="Toggle dark mode"
      disabled={!ready}
      onClick={toggleTheme}
      className="ink ink-press flex h-8 w-8 items-center justify-center rounded-md bg-card"
      variant="ghost"
      size="icon"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
