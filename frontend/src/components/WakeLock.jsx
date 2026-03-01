import { useEffect, useRef, useCallback, useState } from "react";

export const WakeLock = ({ enabled, showIndicator = false }) => {
  const wakeLockRef = useRef(null);
  const isRequestingRef = useRef(false);
  const [isActive, setIsActive] = useState(false);

  const requestWakeLock = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isRequestingRef.current) return false;
    
    // Check if Wake Lock API is supported
    if (!("wakeLock" in navigator)) {
      console.warn("Wake Lock API not supported in this browser");
      return false;
    }

    isRequestingRef.current = true;
    
    try {
      // Release existing lock first
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
      
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      console.log("Wake lock acquired successfully");
      setIsActive(true);
      
      // Listen for release
      wakeLockRef.current.addEventListener("release", () => {
        console.log("Wake lock was released");
        wakeLockRef.current = null;
        setIsActive(false);
      });
      
      isRequestingRef.current = false;
      return true;
    } catch (e) {
      console.error("Error acquiring wake lock:", e.name, e.message);
      setIsActive(false);
      isRequestingRef.current = false;
      return false;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
        console.log("Wake lock released");
      } catch (e) {
        console.error("Error releasing wake lock:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      releaseWakeLock();
      return;
    }

    // Request wake lock
    requestWakeLock();

    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = async () => {
      if (enabled && document.visibilityState === "visible") {
        // Small delay to ensure page is fully visible
        setTimeout(async () => {
          if (!wakeLockRef.current && enabled) {
            const success = await requestWakeLock();
            if (success) {
              console.log("Wake lock re-acquired after visibility change");
            }
          }
        }, 100);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  }, [enabled, requestWakeLock, releaseWakeLock]);

  // Optional visual indicator for debugging
  if (showIndicator && enabled) {
    return (
      <div 
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          padding: '4px 8px',
          background: isActive ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
          color: 'white',
          borderRadius: '4px',
          fontSize: '10px',
          fontFamily: 'monospace',
          zIndex: 9999,
        }}
      >
        WL: {isActive ? 'ON' : 'OFF'}
      </div>
    );
  }

  return null;
};
