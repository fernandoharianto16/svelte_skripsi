// lib/server/chatbot.js
import express from 'express';
import dialogflow from '@google-cloud/dialogflow';
import { resolve, dirname } from 'path';
// import { fileURLToPath } from 'url';

const router = express.Router();

// Setup path untuk ES Modules
import { fileURLToPath } from 'url';
// import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 1. Konfigurasi Dialogflow menggunakan Environment Variables
const PROJECT_ID = 'chatbot-bantuan-platform-dqnu'; 
const KEY_FILE_PATH = resolve(__dirname, 'kredensial-dialogflow.json'); 

const sessionClient = new dialogflow.SessionsClient({
  projectId: PROJECT_ID,
  keyFilename: KEY_FILE_PATH
});

// 2. Definisi Endpoint POST (Rutenya relatif terhadap prefix di server.js)
router.post('/', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong' });
  }

  const sessionPath = sessionClient.projectAgentSessionPath(PROJECT_ID, sessionId || 'session-default');

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: message,
        languageCode: 'id',
      },
    },
  };

  try {
    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;

    res.json({
      reply: result.fulfillmentText,
      intentName: result.intent.displayName 
    });

  } catch (error) {
    console.error('Gagal memproses ke Dialogflow:', error);
    res.status(500).json({ reply: 'Maaf, layanan chatbot panduan sedang mengalami gangguan teknis.' });
  }
});

// Export router agar bisa di-import oleh server.js
export default router;