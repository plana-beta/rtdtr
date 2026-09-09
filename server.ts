import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // AI Coach Route
  app.post("/api/coach", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, message: "La clé API Gemini n'est pas configurée sur le serveur." });
      }

      const { prompt, context } = req.body;
      if (!prompt || !context) {
        return res.status(400).json({ success: false, message: "Prompt et contexte sont requis." });
      }

      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `
Tu es le Coach IA de l'application Plana (entraînement sportif pour le cyclisme, course, triathlon).
Ton rôle est d'expliquer les données métier déterministes de l'application (charge d'entraînement, fatigue, séances, recommandations).
Tu NE DOIS PAS recalculer ou inventer des métriques (TSS, ATL, CTL, TSB). Base-toi EXCLUSIVEMENT sur le contexte fourni.
Si une donnée n'est pas dans le contexte, dis clairement que tu ne l'as pas.
Ne prétends pas modifier l'application. Si tu penses qu'une action est pertinente, retourne-la dans la clé "suggestedAction".

CONTEXTE ACTUEL:
${JSON.stringify(context, null, 2)}

MESSAGE DE L'ATHLÈTE:
${prompt}
                `
              }
            ]
          }
        ],
        config: {
          temperature: 0.2, // Garder une réponse factuelle
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: {
                type: Type.STRING,
                description: "Ta réponse conversationnelle à l'athlète, en tant que coach bienveillant, factuel et précis."
              },
              suggestedAction: {
                type: Type.STRING,
                description: "Une action optionnelle recommandée à l'athlète, par exemple 'OPEN_TODAY_WORKOUT', 'OPEN_PLAN', 'SYNC_HEALTH'. Null si pas d'action suggérée.",
                nullable: true
              }
            },
            required: ["message"]
          }
        }
      });

      const responseText = response.text;
      if (responseText) {
          const parsed = JSON.parse(responseText);
          res.json({ success: true, ...parsed });
      } else {
          res.status(500).json({ success: false, message: "Réponse vide de l'IA." });
      }

    } catch (error: any) {
      console.error("[Coach API Error]", error);
      res.status(500).json({ success: false, message: "Erreur lors de la communication avec l'IA.", error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
