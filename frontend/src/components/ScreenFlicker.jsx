import { useState, useEffect, useRef } from "react";

// Continuous crackle sound generator
const startContinuousCrackle = (audioContext) => {
  const createCrackleLoop = () => {
    const duration = 0.15 + Math.random() * 0.2;
    const now = audioContext.currentTime;
    
    // Crackle noise buffer
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < noiseData.length; i++) {
      // More frequent crackles
      const crackle = Math.random() > 0.92 ? (Math.random() - 0.5) * 4 : 0;
      const pop = Math.random() > 0.97 ? (Math.random() - 0.5) * 6 : 0;
      noiseData[i] = (Math.random() * 2 - 1) * 0.05 + crackle * 0.3 + pop * 0.4;
    }
    
    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    // Highpass filter for crispy crackles
    const highpass = audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 1500 + Math.random() * 1000;
    highpass.Q.value = 0.7;
    
    // Gain for crackle volume
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.06 + Math.random() * 0.04;
    
    noiseSource.connect(highpass);
    highpass.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    noiseSource.start(now);
    noiseSource.stop(now + duration);
    
    // Schedule next crackle burst
    noiseSource.onended = () => {
      setTimeout(() => {
        if (audioContext.state === 'running') {
          createCrackleLoop();
        }
      }, 50 + Math.random() * 150);
    };
  };
  
  createCrackleLoop();
};

// Web Audio API electrical buzzing sound generator (half volume)
const playElectricalBuzz = (audioContext) => {
  const duration = 0.1 + Math.random() * 0.15;
  const now = audioContext.currentTime;
  const volume = (0.22 + Math.random() * 0.1) * 0.25; // Quarter volume (half of half)
  
  // Main gain node
  const mainGain = audioContext.createGain();
  mainGain.connect(audioContext.destination);
  mainGain.gain.setValueAtTime(0, now);
  mainGain.gain.linearRampToValueAtTime(volume, now + 0.008);
  mainGain.gain.setValueAtTime(volume, now + duration - 0.03);
  mainGain.gain.linearRampToValueAtTime(0, now + duration);
  
  // Base frequency with slight randomness
  const baseFreq = 300 + Math.random() * 150;
  
  // Waveshaper for analog warmth/distortion
  const waveshaper = audioContext.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i / 128) - 1;
    curve[i] = Math.tanh(x * 2) * 0.8 + x * 0.2;
  }
  waveshaper.curve = curve;
  waveshaper.oversample = '2x';
  
  // Multiple detuned oscillators for thickness
  const oscillators = [];
  const gains = [];
  const detunes = [-12, -5, 0, 5, 8, 15];
  const types = ['sawtooth', 'square', 'sawtooth', 'triangle', 'square', 'sawtooth'];
  const volumes = [0.25, 0.2, 0.3, 0.15, 0.15, 0.1];
  
  detunes.forEach((detune, i) => {
    const osc = audioContext.createOscillator();
    osc.type = types[i];
    osc.frequency.value = baseFreq * (i < 3 ? 1 : 2);
    osc.detune.value = detune + (Math.random() - 0.5) * 10;
    
    const gain = audioContext.createGain();
    gain.gain.value = volumes[i];
    
    osc.connect(gain);
    oscillators.push(osc);
    gains.push(gain);
  });
  
  // Pitch wobble LFO
  const pitchLfo = audioContext.createOscillator();
  pitchLfo.type = 'sine';
  pitchLfo.frequency.value = 4 + Math.random() * 8;
  
  const pitchLfoGain = audioContext.createGain();
  pitchLfoGain.gain.value = 8 + Math.random() * 12;
  
  pitchLfo.connect(pitchLfoGain);
  oscillators.forEach(osc => {
    pitchLfoGain.connect(osc.detune);
  });
  
  // Amplitude tremolo
  const tremoloLfo = audioContext.createOscillator();
  tremoloLfo.type = 'triangle';
  tremoloLfo.frequency.value = 18 + Math.random() * 30;
  
  const tremoloGain = audioContext.createGain();
  tremoloGain.gain.value = 0.35;
  
  tremoloLfo.connect(tremoloGain);
  tremoloGain.connect(mainGain.gain);
  
  // Mixer before filter
  const mixer = audioContext.createGain();
  mixer.gain.value = 1.2;
  
  gains.forEach(g => g.connect(mixer));
  
  // Resonant filter
  const filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1200 + Math.random() * 600;
  filter.Q.value = 3 + Math.random() * 4;
  
  // Filter wobble
  const filterLfo = audioContext.createOscillator();
  filterLfo.type = 'sine';
  filterLfo.frequency.value = 6 + Math.random() * 10;
  
  const filterLfoGain = audioContext.createGain();
  filterLfoGain.gain.value = 300;
  
  filterLfo.connect(filterLfoGain);
  filterLfoGain.connect(filter.frequency);
  
  // Connect signal chain
  mixer.connect(waveshaper);
  waveshaper.connect(filter);
  filter.connect(mainGain);
  
  // Start everything
  oscillators.forEach(osc => osc.start(now));
  pitchLfo.start(now);
  tremoloLfo.start(now);
  filterLfo.start(now);
  
  // Stop everything
  oscillators.forEach(osc => osc.stop(now + duration));
  pitchLfo.stop(now + duration);
  tremoloLfo.stop(now + duration);
  filterLfo.stop(now + duration);
};

export const ScreenFlicker = () => {
  const [flickering, setFlickering] = useState(false);
  const timeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const userInteractedRef = useRef(false);
  const crackleStartedRef = useRef(false);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      userInteractedRef.current = true;
      
      // Start continuous crackle
      if (!crackleStartedRef.current && audioContextRef.current) {
        crackleStartedRef.current = true;
        startContinuousCrackle(audioContextRef.current);
      }
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
        
        // Play buzz sound if audio is enabled
        if (audioContextRef.current && userInteractedRef.current) {
          if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
          }
          playElectricalBuzz(audioContextRef.current);
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
