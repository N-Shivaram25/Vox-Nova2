import express from "express";
import { TranslationServiceClient } from "@google-cloud/translate";

const router = express.Router();

// Initialize Google Translate client from env var containing service account JSON
function makeTranslateClient() {
  const raw = process.env.GOOGLE_cLOUD_API;
  if (!raw) throw new Error("GOOGLE_cLOUD_API not configured");
  let creds;
  try {
    creds = JSON.parse(raw);
  } catch (e) {
    throw new Error("GOOGLE_cLOUD_API is not valid JSON");
  }
  const { client_email, private_key, project_id } = creds;
  if (!client_email || !private_key || !project_id) throw new Error("Missing required Google service account fields");
  const client = new TranslationServiceClient({
    credentials: { client_email, private_key },
    projectId: project_id,
  });
  return { client, projectId: project_id };
}

// POST /api/translate
// body: { q: string, source: string ('auto' or ISO), target: string (ISO) }
router.post("/", async (req, res) => {
  try {
    const { q, source = "auto", target } = req.body || {};
    if (!q || !target) {
      return res.status(400).json({ message: "Missing required fields q and target" });
    }

    const { client, projectId } = makeTranslateClient();
    const parent = `projects/${projectId}/locations/global`;

    const request = {
      parent,
      contents: [q],
      targetLanguageCode: target,
      mimeType: "text/plain",
    };
    // If source is not 'auto', pass it through; otherwise let Google auto-detect
    if (source && source !== "auto") request.sourceLanguageCode = source;

    const [response] = await client.translateText(request);
    const translatedText = response.translations?.[0]?.translatedText || "";
    return res.json({ translatedText });
  } catch (err) {
    console.error("/api/translate error", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
