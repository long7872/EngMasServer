// scripts/vocab_uploader.js

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const db = require("../db/connection.promise"); // dùng lại kết nối có sẵn

async function insertWord(wordData) {
  const word = wordData.word;
  const phonetic = wordData.phonetic || null;

  // 🔎 Kiểm tra từ đã tồn tại chưa
  const [existing] = await db.query(
    'SELECT api.api_id FROM api JOIN vocab_api ON api.api_id = vocab_api.api_id WHERE vocab_api.word = ?',
    [word]
  );
  if (existing.length > 0) {
    console.log(`⏩ Skipped (already exists): ${word}`);
    return;
  }

  // Insert vào bảng api
  const [apiRes] = await db.query("INSERT INTO api (type) VALUES ('vocab')");
  const api_id = apiRes.insertId;

  // Insert vào bảng vocab_api
  await db.query(
    "INSERT INTO vocab_api (api_id, word, phonetic) VALUES (?, ?, ?)",
    [api_id, word, phonetic]
  );

  const vocab_id = api_id;

  // Phonetics
  if (Array.isArray(wordData.phonetics)) {
    for (let ph of wordData.phonetics) {
      if (ph.text || ph.audio) {
        await db.query(
          "INSERT INTO phonetics (vocab_id, text, audio) VALUES (?, ?, ?)",
          [vocab_id, ph.text || null, ph.audio || null]
        );
      }
    }
  }

  // Meanings
  if (Array.isArray(wordData.meanings)) {
    for (let meaning of wordData.meanings) {
      const [meaningRes] = await db.query(
        "INSERT INTO meanings (vocab_id, part_of_speech) VALUES (?, ?)",
        [vocab_id, meaning.partOfSpeech]
      );
      const meaning_id = meaningRes.insertId;

      // Definitions
      for (let def of meaning.definitions || []) {
        await db.query(
          "INSERT INTO definitions (meaning_id, definition, example) VALUES (?, ?, ?)",
          [meaning_id, def.definition, def.example || null]
        );
      }

      // Synonyms
      for (let syn of meaning.synonyms || []) {
        await db.query(
          "INSERT INTO synonyms (meaning_id, synonym) VALUES (?, ?)",
          [meaning_id, syn]
        );
      }

      // Antonyms
      for (let ant of meaning.antonyms || []) {
        await db.query(
          "INSERT INTO antonyms (meaning_id, antonym) VALUES (?, ?)",
          [meaning_id, ant]
        );
      }
    }
  }

  console.log(`✅ Inserted: ${word}`);
}

async function main() {
  const filePath = path.join(__dirname, "../data/words_alpha.txt");
  const lines = fs.readFileSync(filePath, "utf-8")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  for (let word of lines) {
    try {
      const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const wordData = res.data[0];
      await insertWord(wordData);
    } catch (err) {
      console.error(`❌ Error for "${word}":`, err.response?.data?.message || err.message);
    }
  }

  db.end();
}

main();
