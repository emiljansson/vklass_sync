import { useState, useEffect, useCallback } from 'react';

export const ImpactEffect = ({ trigger, onComplete }) => {
  const [phase, setPhase] = useState('idle'); // idle, distortion, blackout, complete

  const runEffect = useCallback(() => {
    // Phase 1: Distortion/flicker for 2 seconds
    setPhase('distortion');
    
    setTimeout(() => {
      // Phase 2: Blackout for 3 seconds
      setPhase('blackout');
      
      setTimeout(() => {
        // Phase 3: Complete - fade back in
        setPhase('complete');
        
        setTimeout(() => {
          setPhase('idle');
          if (onComplete) onComplete();
        }, 500);
      }, 3000);
    }, 2000);
  }, [onComplete]);

  useEffect(() => {
    if (trigger && phase === 'idle') {
      runEffect();
    }
  }, [trigger, phase, runEffect]);

  if (phase === 'idle') return null;

  return (
    <>
      {/* Distortion phase */}
      {phase === 'distortion' && (
        <div className="fixed inset-0 z-[9999] pointer-events-none impact-distortion">
          <div className="absolute inset-0 bg-green-500/10 animate-pulse" />
          <div className="absolute inset-0 glitch-overlay" />
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <filter id="glitch">
                <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise" seed="1">
                  <animate attributeName="baseFrequency" values="0.01;0.15;0.01" dur="0.2s" repeatCount="indefinite" />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="50" xChannelSelector="R" yChannelSelector="G">
                  <animate attributeName="scale" values="0;80;20;100;0" dur="0.5s" repeatCount="indefinite" />
                </feDisplacementMap>
              </filter>
            </defs>
          </svg>
        </div>
      )}

      {/* Blackout phase */}
      {phase === 'blackout' && (
        <div className="fixed inset-0 z-[9999] bg-black transition-opacity duration-300" />
      )}

      {/* Complete phase - fade back */}
      {phase === 'complete' && (
        <div className="fixed inset-0 z-[9999] bg-black animate-fade-out" />
      )}

      <style>{`
        .impact-distortion {
          animation: distort 0.1s infinite;
        }
        
        @keyframes distort {
          0% { transform: translate(0, 0) skewX(0deg); filter: hue-rotate(0deg); }
          10% { transform: translate(-5px, 2px) skewX(2deg); filter: hue-rotate(90deg); }
          20% { transform: translate(5px, -2px) skewX(-2deg); filter: hue-rotate(180deg); }
          30% { transform: translate(-3px, 5px) skewX(5deg); filter: hue-rotate(270deg); }
          40% { transform: translate(3px, -5px) skewX(-5deg); filter: hue-rotate(360deg); }
          50% { transform: translate(-8px, 0) skewX(0deg); filter: hue-rotate(45deg); }
          60% { transform: translate(8px, 3px) skewX(3deg); filter: hue-rotate(135deg); }
          70% { transform: translate(-2px, -3px) skewX(-3deg); filter: hue-rotate(225deg); }
          80% { transform: translate(2px, 8px) skewX(8deg); filter: hue-rotate(315deg); }
          90% { transform: translate(-5px, -8px) skewX(-8deg); filter: hue-rotate(90deg); }
          100% { transform: translate(0, 0) skewX(0deg); filter: hue-rotate(0deg); }
        }

        .glitch-overlay {
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 255, 0, 0.03) 0px,
            rgba(0, 255, 0, 0.03) 1px,
            transparent 1px,
            transparent 2px
          );
          animation: scanline-glitch 0.05s infinite;
        }

        @keyframes scanline-glitch {
          0% { transform: translateY(0); opacity: 1; }
          25% { transform: translateY(100%); opacity: 0.5; }
          50% { transform: translateY(-100%); opacity: 0.8; }
          75% { transform: translateY(50%); opacity: 0.3; }
          100% { transform: translateY(0); opacity: 1; }
        }

        .animate-fade-out {
          animation: fadeOut 0.5s ease-out forwards;
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </>
  );
};
