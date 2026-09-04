import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Smooths perceived navigation delay: a top progress bar while the next route
 * loads, plus a short fade/slide for the newly mounted page.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const status = useRouterState({ select: (s) => s.status });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === "pending") {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), 220);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <>
      <div className="route-progress" data-active={visible ? "true" : "false"} aria-hidden="true">
        <span className="route-progress-bar" />
      </div>
      <div key={pathname} className="route-fade">
        {children}
      </div>
    </>
  );
}
