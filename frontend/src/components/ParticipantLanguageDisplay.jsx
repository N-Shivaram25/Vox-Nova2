import { useCallStateHooks } from "@stream-io/video-react-sdk";
import { useEffect, useState } from "react";
import axios from "axios";

const LANGUAGE_TO_FLAG = {
  english: "🇬🇧",
  hindi: "🇮🇳",
  telugu: "🇮🇳",
  tamil: "🇮🇳",
  marathi: "🇮🇳",
  bengali: "🇮🇳",
  gujarati: "🇮🇳",
  kannada: "🇮🇳",
  malayalam: "🇮🇳",
  punjabi: "🇮🇳",
  odia: "🇮🇳",
  assamese: "🇮🇳",
  urdu: "🇮🇳",
  sanskrit: "🇮🇳",
  konkani: "🇮🇳",
  manipuri: "🇮🇳",
  nepali: "🇳🇵",
  sindhi: "🇵🇰",
  kashmiri: "🇮🇳",
  spanish: "🇪🇸",
  french: "🇫🇷",
  german: "🇩🇪",
  mandarin: "🇨🇳",
  japanese: "🇯🇵",
  korean: "🇰🇷",
  russian: "🇷🇺",
  portuguese: "🇵🇹",
  arabic: "🇸🇦",
  italian: "🇮🇹",
  turkish: "🇹🇷",
  dutch: "🇳🇱",
  indonesian: "🇮🇩",
  vietnamese: "🇻🇳",
  thai: "🇹🇭",
  polish: "🇵🇱",
  ukrainian: "🇺🇦",
  romanian: "🇷🇴",
  greek: "🇬🇷",
  czech: "🇨🇿",
  swedish: "🇸🇪",
  hungarian: "🇭🇺",
  finnish: "🇫🇮",
  danish: "🇩🇰",
  norwegian: "🇳🇴",
  persian: "🇮🇷",
  hebrew: "🇮🇱",
  swahili: "🇰🇪",
  afrikaans: "🇿🇦",
};

export default function ParticipantLanguageDisplay() {
  const { useRemoteParticipants } = useCallStateHooks();
  const remoteParticipants = useRemoteParticipants();
  const [participantLanguages, setParticipantLanguages] = useState({});

  useEffect(() => {
    const fetchLanguages = async () => {
      for (const participant of remoteParticipants) {
        const userId = participant.userId;
        if (!userId || participantLanguages[userId]) continue;

        try {
          const response = await axios.get(`/api/users/${userId}`);
          const nativeLanguage = response.data?.nativeLanguage;
          if (nativeLanguage) {
            setParticipantLanguages((prev) => ({
              ...prev,
              [userId]: nativeLanguage,
            }));
          }
        } catch (error) {
          console.error("Failed to fetch user language:", error);
        }
      }
    };

    if (remoteParticipants.length > 0) {
      fetchLanguages();
    }
  }, [remoteParticipants, participantLanguages]);

  if (remoteParticipants.length === 0) return null;

  return (
    <div style={{ position: "absolute", top: 8, left: 8, zIndex: 50 }} className="flex flex-col gap-2">
      {remoteParticipants.map((participant) => {
        const userId = participant.userId;
        const language = participantLanguages[userId];
        const flag = language ? LANGUAGE_TO_FLAG[language.toLowerCase()] || "🌐" : "🌐";
        const displayName = participant.name || "Participant";

        return (
          <div
            key={userId}
            className="bg-black/80 text-white rounded-lg px-3 py-2 flex items-center gap-2"
          >
            <span className="text-2xl">{flag}</span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold">{displayName}</span>
              <span className="text-xs opacity-70 capitalize">{language || "Unknown"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
