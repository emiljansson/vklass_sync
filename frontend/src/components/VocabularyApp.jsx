import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Volume2,
} from "lucide-react";
import words from "@/data/words.json";
import "./VocabularyApp.css";

const REPEATS = 3;
const STORAGE_KEY = "lyssna-progress-v1";

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { index: 0, rate: 0.9 };
    const parsed = JSON.parse(raw);
    return {
      index: Math.min(Math.max(0, Number(parsed.index) || 0), words.length - 1),
      rate: Math.min(1.4, Math.max(0.6, Number(parsed.rate) || 0.9)),
    };
  } catch {
    return { index: 0, rate: 0.9 };
  }
}

function pickEnglishVoice(voices) {
  const preferred = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const order = ["en-GB", "en-US", "en-AU", "en"];
  for (const prefix of order) {
    const match = preferred.find((v) =>
      v.lang?.toLowerCase().startsWith(prefix.toLowerCase())
    );
    if (match) return match;
  }
  return preferred[0] || voices[0] || null;
}

function speakWord(text, { rate, voice, onEnd, onError }) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang || "en-GB";
  utterance.rate = rate;
  utterance.pitch = 1;
  if (voice) utterance.voice = voice;
  utterance.onend = onEnd;
  utterance.onerror = onError;
  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function VocabularyApp() {
  const saved = useRef(loadProgress()).current;
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(saved.index);
  const [repeat, setRepeat] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(saved.rate);
  const [showSettings, setShowSettings] = useState(false);
  const [jumpValue, setJumpValue] = useState(String(saved.index + 1));
  const [voiceReady, setVoiceReady] = useState(false);
  const [ttsSupported] = useState(
    () => typeof window !== "undefined" && "speechSynthesis" in window
  );

  const voiceRef = useRef(null);
  const playingRef = useRef(false);
  const indexRef = useRef(index);
  const repeatRef = useRef(repeat);
  const rateRef = useRef(rate);
  const advanceTimer = useRef(null);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ index, rate })
    );
  }, [index, rate]);

  useEffect(() => {
    if (!ttsSupported) return undefined;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length) {
        voiceRef.current = pickEnglishVoice(voices);
        setVoiceReady(true);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [ttsSupported]);

  const clearAdvance = () => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  };

  const speakCurrent = useCallback(() => {
    if (!ttsSupported || !playingRef.current) return;
    const word = words[indexRef.current];
    if (!word) return;

    speakWord(word.en, {
      rate: rateRef.current,
      voice: voiceRef.current,
      onEnd: () => {
        if (!playingRef.current) return;
        const currentRepeat = repeatRef.current;
        if (currentRepeat < REPEATS - 1) {
          clearAdvance();
          advanceTimer.current = setTimeout(() => {
            if (!playingRef.current) return;
            const nextRepeat = repeatRef.current + 1;
            repeatRef.current = nextRepeat;
            setRepeat(nextRepeat);
            speakCurrent();
          }, 450);
        } else {
          clearAdvance();
          advanceTimer.current = setTimeout(() => {
            if (!playingRef.current) return;
            if (indexRef.current >= words.length - 1) {
              setPlaying(false);
              playingRef.current = false;
              setRepeat(REPEATS - 1);
              return;
            }
            const nextIndex = indexRef.current + 1;
            indexRef.current = nextIndex;
            repeatRef.current = 0;
            setIndex(nextIndex);
            setRepeat(0);
            speakCurrent();
          }, 900);
        }
      },
      onError: () => {
        if (!playingRef.current) return;
        clearAdvance();
        advanceTimer.current = setTimeout(() => {
          if (!playingRef.current) return;
          if (repeatRef.current < REPEATS - 1) {
            const nextRepeat = repeatRef.current + 1;
            repeatRef.current = nextRepeat;
            setRepeat(nextRepeat);
            speakCurrent();
          } else if (indexRef.current < words.length - 1) {
            const nextIndex = indexRef.current + 1;
            indexRef.current = nextIndex;
            repeatRef.current = 0;
            setIndex(nextIndex);
            setRepeat(0);
            speakCurrent();
          } else {
            setPlaying(false);
            playingRef.current = false;
          }
        }, 300);
      },
    });
  }, [ttsSupported]);

  const startPlayback = useCallback(() => {
    if (!ttsSupported) return;
    clearAdvance();
    window.speechSynthesis.cancel();
    setPlaying(true);
    playingRef.current = true;
    // Small delay helps browsers after user gesture / cancel
    setTimeout(() => speakCurrent(), 60);
  }, [speakCurrent, ttsSupported]);

  const pausePlayback = useCallback(() => {
    clearAdvance();
    window.speechSynthesis.cancel();
    setPlaying(false);
  }, []);

  const togglePlay = () => {
    if (playing) pausePlayback();
    else startPlayback();
  };

  const goToIndex = (nextIndex, { autoPlay = playing } = {}) => {
    const clamped = Math.min(Math.max(0, nextIndex), words.length - 1);
    clearAdvance();
    window.speechSynthesis.cancel();
    setIndex(clamped);
    setRepeat(0);
    setJumpValue(String(clamped + 1));
    if (autoPlay) {
      setPlaying(true);
      playingRef.current = true;
      setTimeout(() => speakCurrent(), 80);
    } else {
      setPlaying(false);
    }
  };

  const handleStart = () => {
    setStarted(true);
    startPlayback();
  };

  const handleJump = () => {
    const n = parseInt(jumpValue, 10);
    if (Number.isNaN(n)) return;
    goToIndex(n - 1, { autoPlay: false });
  };

  const current = words[index];
  const progressPct = ((index + 1) / words.length) * 100;

  if (!started) {
    return (
      <div className="vocab-app" data-testid="vocab-app">
        <div className="vocab-shell">
          <section className="start-screen" data-testid="start-screen">
            <h1 className="brand" data-testid="brand">
              Lyssna<span>.</span>
            </h1>
            <h2 className="start-headline">
              Hör, se och lär dig de vanligaste engelska orden.
            </h2>
            <p className="start-lede">
              Varje ord läses upp tre gånger på engelska medan du ser
              översättningen till svenska.
            </p>
            <div className="hero-visual" aria-hidden="true">
              <p>{words.length.toLocaleString("sv-SE")} ord · 3× uttal</p>
            </div>
            <div className="cta-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStart}
                disabled={!ttsSupported}
                data-testid="start-button"
              >
                <Volume2
                  size={18}
                  style={{ display: "inline", marginRight: 8, verticalAlign: -3 }}
                />
                Börja öva
              </button>
              {saved.index > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setStarted(true);
                    startPlayback();
                  }}
                  data-testid="resume-button"
                >
                  Fortsätt från ord {saved.index + 1}
                </button>
              )}
            </div>
            {!ttsSupported && (
              <p className="meta-line" data-testid="tts-unsupported">
                Din webbläsare stödjer inte uppläsning (Web Speech API).
              </p>
            )}
            {ttsSupported && !voiceReady && (
              <p className="meta-line">Laddar röster…</p>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="vocab-app" data-testid="vocab-app">
      <div className="vocab-shell">
        <section className="practice-screen" data-testid="practice-screen">
          <div className="top-bar">
            <div className="brand-mini">
              Lyssna<span>.</span>
            </div>
            <div className="status-pill" data-testid="play-status">
              <span className={`status-dot ${playing ? "" : "paused"}`} />
              {playing ? "Spelar" : "Pausad"}
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={() => setShowSettings((s) => !s)}
              aria-label="Inställningar"
              data-testid="settings-toggle"
            >
              <Settings2 size={18} />
            </button>
          </div>

          <div className="progress-wrap">
            <div className="progress-meta">
              <span data-testid="word-counter">
                Ord {index + 1} / {words.length}
              </span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="progress-track" aria-hidden="true">
              <div
                className="progress-fill"
                style={{ width: `${progressPct}%` }}
                data-testid="progress-fill"
              />
            </div>
          </div>

          <div className="word-stage" key={`${index}-${repeat}`}>
            <p className="word-en" data-testid="word-english">
              {current.en}
            </p>
            <p className="word-sv" data-testid="word-swedish">
              {current.sv}
            </p>
            <div className="repeat-pips" data-testid="repeat-pips">
              {Array.from({ length: REPEATS }).map((_, i) => (
                <span
                  key={i}
                  className={`pip ${
                    i < repeat ? "done" : i === repeat ? "active" : ""
                  }`}
                />
              ))}
              <span className="repeat-label">
                Upprepning {repeat + 1}/{REPEATS}
              </span>
            </div>
          </div>

          <div className="controls">
            <button
              type="button"
              className="btn-icon"
              onClick={() => goToIndex(index - 1)}
              disabled={index === 0}
              aria-label="Föregående ord"
              data-testid="prev-button"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={() => {
                clearAdvance();
                window.speechSynthesis.cancel();
                setRepeat(0);
                if (playing) {
                  setTimeout(() => speakCurrent(), 60);
                } else {
                  startPlayback();
                }
              }}
              aria-label="Repetera ord"
              data-testid="replay-button"
            >
              <RotateCcw size={18} />
            </button>
            <button
              type="button"
              className="btn-icon primary"
              onClick={togglePlay}
              aria-label={playing ? "Pausa" : "Spela"}
              data-testid="play-pause-button"
            >
              {playing ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={() => goToIndex(index + 1)}
              disabled={index >= words.length - 1}
              aria-label="Nästa ord"
              data-testid="next-button"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          {showSettings && (
            <div className="settings-panel" data-testid="settings-panel">
              <div className="settings-row">
                <label htmlFor="speech-rate">
                  Talhastighet ({rate.toFixed(1)}×)
                </label>
                <input
                  id="speech-rate"
                  type="range"
                  min="0.6"
                  max="1.4"
                  step="0.1"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  data-testid="rate-slider"
                />
                <span className="settings-hint">
                  Långsammare hjälper ofta när du lär dig uttal.
                </span>
              </div>
              <div className="settings-row">
                <label htmlFor="jump-to">Hoppa till ordnummer</label>
                <div className="jump-row">
                  <input
                    id="jump-to"
                    type="number"
                    min={1}
                    max={words.length}
                    value={jumpValue}
                    onChange={(e) => setJumpValue(e.target.value)}
                    data-testid="jump-input"
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleJump}
                    data-testid="jump-button"
                  >
                    Gå
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  pausePlayback();
                  goToIndex(0, { autoPlay: false });
                  setStarted(false);
                }}
                data-testid="reset-button"
              >
                Börja om från start
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
