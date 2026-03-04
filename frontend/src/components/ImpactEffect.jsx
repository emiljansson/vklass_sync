import { useState, useEffect, useCallback } from 'react';

export const ImpactEffect = ({ trigger, onComplete }) => {
  const [phase, setPhase] = useState('idle'); // idle, distortion, blackout, rebooting, complete
  const [rebootProgress, setRebootProgress] = useState(0);

  const runEffect = useCallback(() => {
    // Phase 1: INSANE distortion/flicker for 2 seconds
    setPhase('distortion');
    
    setTimeout(() => {
      // Phase 2: Blackout for 3 seconds
      setPhase('blackout');
      
      setTimeout(() => {
        // Phase 3: Rebooting for 8 seconds + 2 seconds pause at 100%
        setPhase('rebooting');
        setRebootProgress(0);
        
        // Animate progress bar
        const progressInterval = setInterval(() => {
          setRebootProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              return 100;
            }
            return prev + 1.25; // 80 steps over 8 seconds (100ms each)
          });
        }, 100);
        
        setTimeout(() => {
          clearInterval(progressInterval);
          setRebootProgress(100);
          
          // Wait 2 more seconds at 100% so user can see the completed state
          setTimeout(() => {
            // Phase 4: Complete - fade back in
            setPhase('complete');
            
            setTimeout(() => {
              setPhase('idle');
              setRebootProgress(0);
              if (onComplete) onComplete();
            }, 1000);
          }, 2000);
        }, 8000);
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
      {/* INSANE Distortion phase */}
      {phase === 'distortion' && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {/* Main glitch container */}
          <div className="absolute inset-0 impact-shake">
            {/* Color channel splits */}
            <div className="absolute inset-0 glitch-red" />
            <div className="absolute inset-0 glitch-green" />
            <div className="absolute inset-0 glitch-blue" />
          </div>
          
          {/* Scanline noise */}
          <div className="absolute inset-0 scanline-noise" />
          
          {/* Random blocks */}
          <div className="absolute inset-0 glitch-blocks" />
          
          {/* Flicker overlay */}
          <div className="absolute inset-0 flicker-insane" />
          
          {/* Static noise */}
          <div className="absolute inset-0 static-noise" />
          
          {/* Horizontal tear lines */}
          <div className="absolute inset-0 tear-lines" />
        </div>
      )}

      {/* Blackout phase */}
      {phase === 'blackout' && (
        <div className="fixed inset-0 z-[9999] bg-black" />
      )}

      {/* Rebooting phase */}
      {phase === 'rebooting' && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
          {/* CRT screen effect */}
          <div className="absolute inset-0 crt-overlay pointer-events-none" />
          
          {/* Terminal text */}
          <div className="text-center space-y-6 font-mono">
            <div className="text-green-500 text-2xl tracking-widest terminal-flicker">
              REBOOTING<span className="terminal-dots">...</span>
            </div>
            
            {/* Progress bar container */}
            <div className="w-80 h-6 border-2 border-green-500/50 bg-black/50 relative overflow-hidden">
              {/* Progress bar fill */}
              <div 
                className="h-full bg-green-500/80 transition-all duration-100 progress-glow"
                style={{ width: `${rebootProgress}%` }}
              />
              {/* Scanline effect on progress */}
              <div className="absolute inset-0 progress-scanlines" />
            </div>
            
            {/* Percentage */}
            <div className="text-green-400 text-lg">
              [{rebootProgress.toString().padStart(3, ' ')}%]
            </div>
            
            {/* System messages */}
            <div className="text-green-500/60 text-sm space-y-1 h-20">
              {rebootProgress > 10 && <div className="terminal-type">Initializing system...</div>}
              {rebootProgress > 30 && <div className="terminal-type">Loading kernel modules...</div>}
              {rebootProgress > 50 && <div className="terminal-type">Mounting filesystems...</div>}
              {rebootProgress > 70 && <div className="terminal-type">Starting services...</div>}
              {rebootProgress > 90 && <div className="terminal-type text-green-400">System ready.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Complete phase - fade back */}
      {phase === 'complete' && (
        <div className="fixed inset-0 z-[9999] bg-black animate-fade-out" />
      )}

      <style>{`
        /* INSANE SHAKE */
        .impact-shake {
          animation: insaneShake 0.05s infinite;
        }
        
        @keyframes insaneShake {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          10% { transform: translate(-15px, 10px) rotate(-3deg) scale(1.02); }
          20% { transform: translate(15px, -15px) rotate(3deg) scale(0.98); }
          30% { transform: translate(-20px, -10px) rotate(-2deg) scale(1.03); }
          40% { transform: translate(10px, 20px) rotate(4deg) scale(0.97); }
          50% { transform: translate(-25px, 5px) rotate(-4deg) scale(1.05); }
          60% { transform: translate(20px, -20px) rotate(2deg) scale(0.95); }
          70% { transform: translate(-10px, 15px) rotate(-3deg) scale(1.02); }
          80% { transform: translate(25px, -5px) rotate(5deg) scale(0.98); }
          90% { transform: translate(-15px, -15px) rotate(-5deg) scale(1.04); }
          100% { transform: translate(0, 0) rotate(0deg) scale(1); }
        }

        /* RGB Color splits */
        .glitch-red {
          background: rgba(255, 0, 0, 0.3);
          mix-blend-mode: multiply;
          animation: glitchRed 0.1s infinite;
        }
        
        .glitch-green {
          background: rgba(0, 255, 0, 0.3);
          mix-blend-mode: screen;
          animation: glitchGreen 0.08s infinite;
        }
        
        .glitch-blue {
          background: rgba(0, 0, 255, 0.2);
          mix-blend-mode: overlay;
          animation: glitchBlue 0.12s infinite;
        }

        @keyframes glitchRed {
          0%, 100% { transform: translateX(0); opacity: 0; }
          20% { transform: translateX(-20px); opacity: 1; }
          40% { transform: translateX(15px); opacity: 0.5; }
          60% { transform: translateX(-10px); opacity: 1; }
          80% { transform: translateX(25px); opacity: 0.7; }
        }

        @keyframes glitchGreen {
          0%, 100% { transform: translateX(0); opacity: 0; }
          15% { transform: translateX(20px); opacity: 1; }
          35% { transform: translateX(-25px); opacity: 0.6; }
          55% { transform: translateX(15px); opacity: 1; }
          75% { transform: translateX(-20px); opacity: 0.8; }
        }

        @keyframes glitchBlue {
          0%, 100% { transform: translateY(0); opacity: 0; }
          25% { transform: translateY(-15px); opacity: 1; }
          50% { transform: translateY(20px); opacity: 0.5; }
          75% { transform: translateY(-25px); opacity: 0.8; }
        }

        /* Insane flicker */
        .flicker-insane {
          background: white;
          animation: flickerInsane 0.05s infinite;
        }

        @keyframes flickerInsane {
          0% { opacity: 0; }
          5% { opacity: 1; }
          10% { opacity: 0; }
          15% { opacity: 0.8; }
          20% { opacity: 0; }
          25% { opacity: 0.6; }
          30% { opacity: 0; }
          35% { opacity: 1; }
          40% { opacity: 0; }
          45% { opacity: 0.4; }
          50% { opacity: 0; }
          55% { opacity: 0.9; }
          60% { opacity: 0; }
          65% { opacity: 0.3; }
          70% { opacity: 0; }
          75% { opacity: 1; }
          80% { opacity: 0; }
          85% { opacity: 0.7; }
          90% { opacity: 0; }
          95% { opacity: 0.5; }
          100% { opacity: 0; }
        }

        /* Static noise */
        .static-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E");
          animation: staticMove 0.1s steps(10) infinite;
          opacity: 0.5;
          mix-blend-mode: overlay;
        }

        @keyframes staticMove {
          0% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -5%); }
          20% { transform: translate(5%, 5%); }
          30% { transform: translate(-10%, 5%); }
          40% { transform: translate(10%, -5%); }
          50% { transform: translate(-5%, 10%); }
          60% { transform: translate(5%, -10%); }
          70% { transform: translate(-10%, -10%); }
          80% { transform: translate(10%, 10%); }
          90% { transform: translate(-5%, 5%); }
          100% { transform: translate(0, 0); }
        }

        /* Scanline noise */
        .scanline-noise {
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 255, 0, 0.15) 0px,
            rgba(0, 255, 0, 0.15) 1px,
            transparent 1px,
            transparent 3px
          );
          animation: scanlineScroll 0.1s linear infinite;
        }

        @keyframes scanlineScroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(6px); }
        }

        /* Glitch blocks */
        .glitch-blocks {
          animation: glitchBlocks 0.15s infinite;
        }

        @keyframes glitchBlocks {
          0% {
            clip-path: inset(0 0 100% 0);
            background: linear-gradient(90deg, transparent 30%, lime 30%, lime 35%, transparent 35%);
          }
          10% {
            clip-path: inset(20% 0 60% 0);
            background: linear-gradient(90deg, transparent 60%, red 60%, red 65%, transparent 65%);
          }
          20% {
            clip-path: inset(40% 0 30% 0);
            background: linear-gradient(90deg, transparent 10%, cyan 10%, cyan 20%, transparent 20%);
          }
          30% {
            clip-path: inset(60% 0 20% 0);
            background: linear-gradient(90deg, transparent 80%, yellow 80%, yellow 90%, transparent 90%);
          }
          40% {
            clip-path: inset(10% 0 70% 0);
            background: linear-gradient(90deg, transparent 40%, magenta 40%, magenta 50%, transparent 50%);
          }
          50% {
            clip-path: inset(80% 0 5% 0);
            background: linear-gradient(90deg, transparent 20%, lime 20%, lime 30%, transparent 30%);
          }
          60% {
            clip-path: inset(30% 0 50% 0);
            background: linear-gradient(90deg, transparent 70%, white 70%, white 75%, transparent 75%);
          }
          70% {
            clip-path: inset(5% 0 80% 0);
            background: linear-gradient(90deg, transparent 50%, red 50%, red 60%, transparent 60%);
          }
          80% {
            clip-path: inset(50% 0 40% 0);
            background: linear-gradient(90deg, transparent 0%, cyan 0%, cyan 10%, transparent 10%);
          }
          90% {
            clip-path: inset(70% 0 10% 0);
            background: linear-gradient(90deg, transparent 90%, lime 90%, lime 100%, transparent 100%);
          }
          100% {
            clip-path: inset(0 0 100% 0);
            background: transparent;
          }
        }

        /* Horizontal tear lines */
        .tear-lines {
          background: repeating-linear-gradient(
            0deg,
            transparent 0px,
            transparent 50px,
            rgba(0, 255, 0, 0.8) 50px,
            rgba(0, 255, 0, 0.8) 52px,
            transparent 52px
          );
          animation: tearMove 0.08s steps(5) infinite;
        }

        @keyframes tearMove {
          0% { transform: translateY(0) skewX(0deg); }
          20% { transform: translateY(20px) skewX(20deg); }
          40% { transform: translateY(-30px) skewX(-15deg); }
          60% { transform: translateY(40px) skewX(25deg); }
          80% { transform: translateY(-20px) skewX(-20deg); }
          100% { transform: translateY(0) skewX(0deg); }
        }

        /* Rebooting styles */
        .crt-overlay {
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.15) 0px,
            rgba(0, 0, 0, 0.15) 1px,
            transparent 1px,
            transparent 2px
          );
          animation: crtFlicker 0.15s infinite;
        }

        @keyframes crtFlicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.98; }
          75% { opacity: 0.97; }
        }

        .terminal-flicker {
          animation: terminalFlicker 0.5s infinite;
        }

        @keyframes terminalFlicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
          75% { opacity: 0.9; }
        }

        .terminal-dots {
          animation: dotsAnim 1s steps(4) infinite;
        }

        @keyframes dotsAnim {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }

        .progress-glow {
          box-shadow: 0 0 10px rgba(0, 255, 0, 0.5), 0 0 20px rgba(0, 255, 0, 0.3);
        }

        .progress-scanlines {
          background: repeating-linear-gradient(
            0deg,
            transparent 0px,
            transparent 2px,
            rgba(0, 0, 0, 0.3) 2px,
            rgba(0, 0, 0, 0.3) 4px
          );
        }

        .terminal-type {
          animation: typeIn 0.3s ease-out;
        }

        @keyframes typeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .animate-fade-out {
          animation: fadeOut 1s ease-out forwards;
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </>
  );
};
