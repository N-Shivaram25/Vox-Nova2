import express from "express";

const router = express.Router();

// ElevenLabs default multilingual voice (Rachel)
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

function getElevenLabsKey() {
  // Support multiple env var names just in case
  return (
    process.env.ELEVEN_LABS_API_KEY ||
    process.env.ELVEN_LABS ||
    process.env.ELEVENLABS_API_KEY ||
    process.env.ElEVEN_LABS ||
    ""
  );
}

// POST /api/tts
// body: { text: string, voiceId?: string }
router.post("/", async (req, res) => {
  try {
    const apiKey = getElevenLabsKey();
    if (!apiKey) {
      return res.status(500).json({ message: "ElevenLabs API key not configured" });
    }

    const { text, voiceId } = req.body || {};
    if (!text) return res.status(400).json({ message: "Missing text" });

    const vid = voiceId || DEFAULT_VOICE_ID;

    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(502).json({ message: "ElevenLabs error", detail: errText });
    }

    // Pipe audio/mpeg back
    res.setHeader("Content-Type", "audio/mpeg");
    upstream.body.pipe(res);
  } catch (err) {
    console.error("/api/tts error", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
