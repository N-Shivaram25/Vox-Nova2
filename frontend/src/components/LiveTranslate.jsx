import { useEffect, useRef, useState } from "react";
import { useCall } from "@stream-io/video-react-sdk";
import { LANGUAGES, LANGUAGE_CODE_MAP } from "../constants";

const VOICE_MAP = {
  en: "UK English Female",
  es: "Spanish Female",
  hi: "Hindi Female",
  fr: "French Female",
  de: "Deutsch Female",
  zh: "Chinese Female",
  ja: "Japanese Female",
  ko: "Korean Female",
  ru: "Russian Female",
  pt: "Portuguese Female",
  ar: "Arabic Female",
  it: "Italian Female",
  tr: "Turkish Female",
  nl: "Dutch Female",
};

const SOURCE_LANG = "auto"; // let translation auto-detect source

export default function LiveTranslate() {
  const call = useCall();
  const [enabled, setEnabled] = useState(true);
  const [targetLang, setTargetLang] = useState("en");
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    if (!enabled || !call) return;

    let cancelled = false;

    const start = async () => {
      try {
        const keyRes = await fetch("/api/deepgram/token");
        const { key } = await keyRes.json();
        if (!key) throw new Error("Missing Deepgram key from server");

        const socket = new WebSocket("wss://api.deepgram.com/v1/listen", [
          "token",
          key,
        ]);
        wsRef.current = socket;

        socket.onopen = async () => {
          try {
            const localStream = await call.localParticipant.getUserMedia({ audio: true, video: false });
            if (cancelled) return;

            const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(localStream);
            sourceRef.current = source;

            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            source.connect(processor);
            processor.connect(audioContext.destination);

            processor.onaudioprocess = (e) => {
              if (socket.readyState !== WebSocket.OPEN) return;
              const input = e.inputBuffer.getChannelData(0);
              const pcm16 = floatTo16BitPCM(input);
              socket.send(pcm16);
            };
          } catch (err) {
            console.error("Audio init error", err);
          }
        };

        socket.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data);
            const transcript = msg?.channel?.alternatives?.[0]?.transcript;
            const isFinal = msg?.is_final;
            if (!transcript || !isFinal) return;

            const translated = await translateText(transcript, SOURCE_LANG, targetLang);
            if (translated) speakTranslated(translated, targetLang);
          } catch (e) {
            // non-JSON pings from server
          }
        };

        socket.onerror = (e) => {
          console.error("Deepgram socket error", e);
        };

        socket.onclose = () => {
          cleanupAudio();
        };
      } catch (err) {
        console.error("Deepgram init failed", err);
      }
    };

    start();

    return () => {
      cancelled = true;
      try { wsRef.current && wsRef.current.close(); } catch {}
      cleanupAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, call]);

  const cleanupAudio = () => {
    try {
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
        processorRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } catch {}
  };

  return (
    <div style={{ position: "absolute", top: 8, right: 8, zIndex: 50 }} className="bg-black/40 text-white rounded px-3 py-2 flex items-center gap-2">
      <label className="text-sm">Realtime Translate</label>
      <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
      <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="bg-transparent border rounded px-2 py-1 text-sm">
        {LANGUAGES.map((name) => {
          const code = LANGUAGE_CODE_MAP[name.toLowerCase()] || "en";
          return (
            <option key={code} value={code}>
              {name}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

async function translateText(text, source, target) {
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source, target }),
    });
    const data = await res.json();
    return data.translatedText;
  } catch (e) {
    console.error("Translation failed", e);
    return "";
  }
}

function speakTranslated(text, targetLang) {
  const voice = VOICE_MAP[targetLang] || VOICE_MAP.en;
  if (window.responsiveVoice && window.responsiveVoice.speak) {
    window.responsiveVoice.speak(text, voice);
  } else if (window.speechSynthesis) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = targetLang;
    window.speechSynthesis.speak(u);
  }
}
