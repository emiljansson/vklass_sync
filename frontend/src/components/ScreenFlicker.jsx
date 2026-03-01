import { useState, useEffect } from "react";

export const ScreenFlicker = () => {
  const [flickering, setFlickering] = useState(false);

  useEffect(() => {
    const doFlicker = async () => {
      // Random number of blinks (1-3)
      const blinks = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < blinks; i++) {
        setFlickering(true);
        await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
        setFlickering(false);
        if (i < blinks - 1) {
          await new Promise(r => setTimeout(r, 50 + Math.random() * 150));
        }
      }
    };

    const scheduleFlicker = () => {
      // Random delay between 2-15 seconds
      const delay = 2000 + Math.random() * 13000;
      return setTimeout(() => {
        doFlicker();
        scheduleFlicker();
      }, delay);
    };

    const timerId = scheduleFlicker();
    return () => clearTimeout(timerId);
  }, []);

  if (!flickering) return null;

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-[999]"
      style={{
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        mixBlendMode: 'overlay'
      }}
    />
  );
};
