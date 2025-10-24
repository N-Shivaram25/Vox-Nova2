import express from "express";

const router = express.Router();

// POST /api/translate
// body: { q: string, source: string (e.g. 'auto' or 'en'), target: string (e.g. 'es') }
router.post("/", async (req, res) => {
  try {
    const { q, source = "auto", target } = req.body || {};
    if (!q || !target) {
      return res.status(400).json({ message: "Missing required fields q and target" });
    }

    // Prefer a custom LibreTranslate/Argos instance if provided via env, else use public Argos
    const baseUrl = process.env.LIBRETRANSLATE_URL || "https://translate.argosopentech.com";

    const upstream = await fetch(`${baseUrl}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, source, target }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(502).json({ message: "Upstream translation error", detail: text });
    }

    const data = await upstream.json();
    return res.json(data);
  } catch (err) {
    console.error("/api/translate error", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
