import { useState, useEffect, useRef } from "react";

// Web Audio API electrical spark sound generator
const createSparkSound = (audioContext, volume = 0.3) => {
  const duration = 0.05 + Math.random() * 0.1;
  const now = audioContext.currentTime;
  
  // Create noise buffer for the spark
  const bufferSize = audioContext.sampleRate * duration;
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
  const userInteractedRef = useRef(false);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      userInteractedRef.current = true;
    };

    // Listen for any user interaction to enable audio
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, initAudio, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, initAudio);
      });
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const doFlicker = async () => {
      // Random number of blinks (1-3)
      const blinks = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < blinks; i++) {
        setFlickering(true);
        
        // Play spark sound if audio is enabled
        if (soundEnabled && audioContextRef.current && userInteractedRef.current) {
          if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
          }
          playElectricalSpark(audioContextRef.current, soundVolume);
        }
        
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
  }, [soundEnabled, soundVolume]);

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
