const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: 'server.env' });

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "..", "data", "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

router.post("/analyze", upload.single("audio"), async (req, res) => {
  try {
    const { expected_text, accent } = req.body;
    const filePath = req.file.path;
    const audioBase64 = fs.readFileSync(filePath, { encoding: "base64" });

    const payload = {
      audio_base64: audioBase64,
      audio_format: "wav",
      expected_text: expected_text || "Hello, how are you?",
    };

    const response = await axios.post(
      `https://apis.languageconfidence.ai/speech-assessment/scripted/${
        accent || "us"
      }`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "api-key": process.env.LC_API_KEY,
        },
      }
    );

    fs.unlinkSync(filePath);
    res.json(response.data);
  } catch (err) {
    console.error("🔥 LanguageConfidence API error:");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
      console.error("Headers:", err.response.headers);
    } else {
      console.error("Error Message:", err.message);
    }
    res.status(500).json({ error: "Failed to assess speech." });
  }
});

// GET /voices/sentences
router.get('/sentences', (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'data', 'sentences.txt');
    const content = fs.readFileSync(filePath, 'utf-8');
    const sentences = content
      .split(/\r?\n/)      // tách theo dòng
      .map(line => line.trim())
      .filter(line => line.length > 0);

    res.json(sentences);
  } catch (err) {
    console.error('Error reading sentences file:', err);
    res.status(500).json({ error: 'Cannot load sentences.' });
  }
});


module.exports = router;
