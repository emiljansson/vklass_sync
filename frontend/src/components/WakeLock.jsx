import { useEffect, useRef } from "react";

export const WakeLock = ({ enabled }) => {
  const wakeLockRef = useRef(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      if (!enabled) {
        // Release wake lock if disabled
        if (wakeLockRef.current) {
          try {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
            console.log("Wake lock released");
          } catch (e) {
            console.error("Error releasing wake lock:", e);
          }
        }
        return;
      }

      // Check if Wake Lock API is supported
      if (!("wakeLock" in navigator)) {
        console.warn("Wake Lock API not supported in this browser");
        return;
      }

      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        console.log("Wake lock acquired");

        // Re-acquire wake lock if it's released (e.g., when tab becomes visible again)
        wakeLockRef.current.addEventListener("release", () => {
          console.log("Wake lock was released");
        });
      } catch (e) {
        console.error("Error acquiring wake lock:", e);
      }
    };

    requestWakeLock();

    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = async () => {
      if (enabled && document.visibilityState === "visible" && !wakeLockRef.current) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          console.log("Wake lock re-acquired after visibility change");
        } catch (e) {
          console.error("Error re-acquiring wake lock:", e);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, [enabled]);

  return null; // This component doesn't render anything
};
