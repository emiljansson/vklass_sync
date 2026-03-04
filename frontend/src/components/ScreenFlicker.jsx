import { useState, useEffect, useRef, useCallback } from "react";

// Web Audio API electrical spark sound generator
const createSparkSound = (audioContext, volume = 0.3) => {
  try {
    const duration = 0.05 + Math.random() * 0.1;
    const now = audioContext.currentTime;
    
    // Create noise buffer for the spark
    const bufferSize = Math.floor(audioContext.sampleRate * duration);
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate filtered noise that sounds like electrical sparks
    for (let i = 0; i < bufferSize; i++) {
      // White noise with random spikes
      const spike = Math.random() > 0.95 ? (Math.random() * 2 - 1) * 3 : 1;
      data[i] = (Math.random() * 2 - 1) * spike;
    }
    
    // Noise source
    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = buffer;
    
    // Highpass filter for that crispy electrical sound
    const highpass = audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 2000 + Math.random() * 3000;
    highpass.Q.value = 1;
    
    // Bandpass for extra crackle
    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 4000 + Math.random() * 4000;
    bandpass.Q.value = 2;
    
    // Gain envelope for quick attack/decay
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    // Connect nodes
    noiseSource.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Play
    noiseSource.start(now);
    noiseSource.stop(now + duration);
  } catch (e) {
    console.warn('Error creating spark sound:', e);
  }
};

// Play multiple spark sounds for a more realistic effect
const playElectricalSpark = (audioContext, volumePercent) => {
  const sparkCount = 1 + Math.floor(Math.random() * 3);
  // Convert percentage (0-100) to actual volume (0-0.4)
  const baseVolume = (volumePercent / 100) * 0.4;
  const volume = baseVolume * (0.8 + Math.random() * 0.4);
  
  for (let i = 0; i < sparkCount; i++) {
    setTimeout(() => {
      createSparkSound(audioContext, volume);
    }, i * (20 + Math.random() * 40));
  }
};

export const ScreenFlicker = ({ soundEnabled = true, soundVolume = 50 }) => {
  const [flickering, setFlickering] = useState(false);
  const timeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioUnlockedRef = useRef(false);

  // Function to unlock and initialize audio (iOS requirement)
  const unlockAudio = useCallback(async () => {
    if (audioUnlockedRef.current) return;
    
    try {
      // Create AudioContext if not exists
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          console.warn('Web Audio API not supported');
          return;
        }
        audioContextRef.current = new AudioContextClass();
        console.log('AudioContext created, state:', audioContextRef.current.state);
      }
      
      const ctx = audioContextRef.current;
      
      // Resume if suspended (required for iOS)
      if (ctx.state === 'suspended') {
        console.log('Resuming suspended AudioContext...');
        await ctx.resume();
        console.log('AudioContext resumed, state:', ctx.state);
      }
      
      // iOS audio unlock: play a silent buffer
      const silentBuffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(ctx.destination);
      source.start(0);
      
      // Also play a tiny actual sound to fully unlock on iOS
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.001; // Nearly silent
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start(0);
      oscillator.stop(ctx.currentTime + 0.01);
      
      audioUnlockedRef.current = true;
      console.log('Audio unlocked successfully, state:', ctx.state);
    } catch (e) {
      console.warn('Error unlocking audio:', e);
    }
  }, []);

  // Initialize audio context on user interaction
  useEffect(() => {
    const events = ['click', 'touchstart', 'touchend', 'keydown', 'mousedown'];
    
    const handleInteraction = (e) => {
      console.log('User interaction detected:', e.type);
      unlockAudio();
    };

    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { passive: true, capture: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction, { capture: true });
      });
    };
  }, [unlockAudio]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Play spark sound with iOS fixes
  const playSound = useCallback(async () => {
    if (!soundEnabled || !audioContextRef.current || !audioUnlockedRef.current) return;
    
    try {
      const ctx = audioContextRef.current;
      
      // Always try to resume on iOS (can get suspended when tab is backgrounded)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      if (ctx.state === 'running') {
        playElectricalSpark(ctx, soundVolume);
      }
    } catch (e) {
      console.warn('Error playing sound:', e);
    }
  }, [soundEnabled, soundVolume]);

  useEffect(() => {
    const doFlicker = async () => {
      // Random number of blinks (1-3)
      const blinks = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < blinks; i++) {
        setFlickering(true);
        
        // Play spark sound
        playSound();
        
        await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
        setFlickering(false);
        if (i < blinks - 1) {
          await new Promise(r => setTimeout(r, 50 + Math.random() * 150));
        }
      }
      
      // Schedule next flicker
      scheduleNext();
    };

    const scheduleNext = () => {
      // Random delay between 2-15 seconds
      const delay = 2000 + Math.random() * 13000;
      timeoutRef.current = setTimeout(doFlicker, delay);
    };

    // Start first flicker after a short delay
    timeoutRef.current = setTimeout(doFlicker, 1000);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [playSound]);

  if (!flickering) return null;

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-[999]"
      style={{
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        mixBlendMode: 'screen'
      }}
    />
  );
};
