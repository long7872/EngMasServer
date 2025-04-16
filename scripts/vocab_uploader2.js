const fs = require("fs");
const path = require("path");
const axios = require("axios");
const db = require("../db/connection.promise");

// Hàm sleep chờ ms mili giây
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Hàm gọi API kèm retry
async function fetchWordData(word, retries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      return res.data[0];
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message;

      // ❌ Nếu là lỗi "không tìm thấy" từ (thường status 404), không retry
      if (status === 404 || msg.includes("couldn't find definitions")) {
        console.warn(`❌ Word not found: "${word}"`);
        return null;
      }

      // Cảnh báo attempt thất bại
      console.warn(`⚠️ Attempt ${attempt} for "${word}" failed: ${msg}`);

      // Nếu bị rate limit thì chờ lâu hơn
      if (status === 429) {
        console.log("⏱️ Rate limit hit. Waiting 5 seconds...");
        await sleep(5000);
      } else {
        await sleep(delay); // delay bình thường nếu lỗi khác
      }

      if (attempt === retries) throw err;
    }
  }
}

async function insertWord(wordData) {
  const word = wordData.word;
  const phonetic = wordData.phonetic || null;

  const [existing] = await db.query(
    'SELECT api.api_id FROM api JOIN vocab_api ON api.api_id = vocab_api.api_id WHERE vocab_api.word = ?',
    [word]
  );
  if (existing.length > 0) {
    console.log(`⏩ Skipped (already exists): ${word}`);
    return;
  }

  const [apiRes] = await db.query("INSERT INTO api (type) VALUES ('vocab')");
  const api_id = apiRes.insertId;

  await db.query(
    "INSERT INTO vocab_api (api_id, word, phonetic) VALUES (?, ?, ?)",
    [api_id, word, phonetic]
  );

  const vocab_id = api_id;

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

  if (Array.isArray(wordData.meanings)) {
    for (let meaning of wordData.meanings) {
      const [meaningRes] = await db.query(
        "INSERT INTO meanings (vocab_id, part_of_speech) VALUES (?, ?)",
        [vocab_id, meaning.partOfSpeech]
      );
      const meaning_id = meaningRes.insertId;

      for (let def of meaning.definitions || []) {
        await db.query(
          "INSERT INTO definitions (meaning_id, definition, example) VALUES (?, ?, ?)",
          [meaning_id, def.definition, def.example || null]
        );
      }

      for (let syn of meaning.synonyms || []) {
        await db.query(
          "INSERT INTO synonyms (meaning_id, synonym) VALUES (?, ?)",
          [meaning_id, syn]
        );
      }

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
  const filePath = path.join(__dirname, "../data/words_alpha2.txt");
  const lines = fs.readFileSync(filePath, "utf-8")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  for (let word of lines) {
    try {
      const wordData = await fetchWordData(word); // gọi API có retry
      
      if (!wordData) {
        // Nếu không có dữ liệu (ví dụ từ không tồn tại), bỏ qua
        continue;
      }
      await insertWord(wordData);

      await sleep(1000); // chờ 1 giây giữa các lần gọi để an toàn
    } catch (err) {
      console.error(`❌ Final error for "${word}":`, err.response?.data?.message || err.message);
    }
  }

  db.end();
}

main();
