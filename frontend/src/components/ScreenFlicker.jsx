import { useState, useEffect, useRef } from "react";

// Web Audio API electrical buzzing sound generator
const playElectricalBuzz = (audioContext) => {
  const duration = 0.08 + Math.random() * 0.12;
  const now = audioContext.currentTime;
  const volume = 0.2 + Math.random() * 0.1; // Medium volume
  
  // Main gain node
  const mainGain = audioContext.createGain();
  mainGain.connect(audioContext.destination);
  mainGain.gain.setValueAtTime(0, now);
  mainGain.gain.linearRampToValueAtTime(volume, now + 0.01);
  mainGain.gain.setValueAtTime(volume, now + duration - 0.02);
  mainGain.gain.linearRampToValueAtTime(0, now + duration);
  
  // Base electrical hum (50-60 Hz like power lines)
  const baseFreq = 50 + Math.random() * 10;
  
  // Oscillator 1: Base hum
  const osc1 = audioContext.createOscillator();
  osc1.type = 'sawtooth';
  osc1.frequency.value = baseFreq;
  
  // Oscillator 2: Harmonic (doubles the frequency)
  const osc2 = audioContext.createOscillator();
  osc2.type = 'square';
  osc2.frequency.value = baseFreq * 2;
  
  // Oscillator 3: Higher harmonic for buzz texture
  const osc3 = audioContext.createOscillator();
  osc3.type = 'sawtooth';
  osc3.frequency.value = baseFreq * 3 + Math.random() * 20;
  
  // LFO for tremolo/flutter effect (makes it sound unstable)
  const lfo = audioContext.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 15 + Math.random() * 25; // Fast flutter
  
  const lfoGain = audioContext.createGain();
  lfoGain.gain.value = 0.3;
  
  lfo.connect(lfoGain);
  lfoGain.connect(mainGain.gain);
  
  // Gain nodes for mixing oscillators
  const gain1 = audioContext.createGain();
  gain1.gain.value = 0.5;
  
  const gain2 = audioContext.createGain();
  gain2.gain.value = 0.3;
  
  const gain3 = audioContext.createGain();
  gain3.gain.value = 0.2;
  
  // Lowpass filter to soften the buzz
  const lowpass = audioContext.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 400 + Math.random() * 200;
  lowpass.Q.value = 1;
  
  // Add subtle noise for texture
  const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * 0.1;
  }
  const noiseSource = audioContext.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  
  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 300;
  
  const noiseGain = audioContext.createGain();
  noiseGain.gain.value = 0.15;
  
  // Connect everything
  osc1.connect(gain1);
  osc2.connect(gain2);
  osc3.connect(gain3);
  
  gain1.connect(lowpass);
  gain2.connect(lowpass);
  gain3.connect(lowpass);
  
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(mainGain);
  
  lowpass.connect(mainGain);
  
  // Start all oscillators
  osc1.start(now);
  osc2.start(now);
  osc3.start(now);
  lfo.start(now);
  noiseSource.start(now);
  
  // Stop all
  osc1.stop(now + duration);
  osc2.stop(now + duration);
  osc3.stop(now + duration);
  lfo.stop(now + duration);
  noiseSource.stop(now + duration);
};

export const ScreenFlicker = () => {
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
        if (audioContextRef.current && userInteractedRef.current) {
          if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
          }
          playElectricalSpark(audioContextRef.current);
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
  }, []);

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
