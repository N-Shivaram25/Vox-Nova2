import express from "express";

const router = express.Router();

router.get("/token", (req, res) => {
  const key = process.env.DEEPGRAM_API_KEY || "";
  if (!key) return res.status(500).json({ error: "Deepgram API key not configured" });
  res.json({ key });
});

export default router;
