const fs = require("fs");
const path = require("path");
const axios = require("axios");
const db = require("../db/connection.promise");

const topicFilePath = path.join(__dirname, "../data/gen_vocab_topics_extra_4.json");

// Sleep delay (ms)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Gọi API từ dictionaryapi.dev
async function fetchWordData(word, retries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      return res.data[0];
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message;

      if (status === 404 || msg.includes("couldn't find definitions")) {
        console.warn(`❌ Word not found: "${word}"`);
        return null;
      }

      console.warn(`⚠️ Attempt ${attempt} for "${word}" failed: ${msg}`);
      await sleep(status === 429 ? 5000 : delay);

      if (attempt === retries) throw err;
    }
  }
}

// Insert từ vào DB (nếu chưa có)
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

  await db.query("INSERT INTO vocab_api (api_id, word, phonetic) VALUES (?, ?, ?)", [api_id, word, phonetic]);

  if (Array.isArray(wordData.phonetics)) {
    for (let ph of wordData.phonetics) {
      if (ph.text || ph.audio) {
        await db.query("INSERT INTO phonetics (vocab_id, text, audio) VALUES (?, ?, ?)", [
          api_id,
          ph.text || null,
          ph.audio || null,
        ]);
      }
    }
  }

  if (Array.isArray(wordData.meanings)) {
    for (let meaning of wordData.meanings) {
      const [meaningRes] = await db.query(
        "INSERT INTO meanings (vocab_id, part_of_speech) VALUES (?, ?)",
        [api_id, meaning.partOfSpeech]
      );
      const meaning_id = meaningRes.insertId;

      for (let def of meaning.definitions || []) {
        await db.query("INSERT INTO definitions (meaning_id, definition, example) VALUES (?, ?, ?)", [
          meaning_id,
          def.definition,
          def.example || null,
        ]);
      }

      for (let syn of meaning.synonyms || []) {
        await db.query("INSERT INTO synonyms (meaning_id, synonym) VALUES (?, ?)", [meaning_id, syn]);
      }

      for (let ant of meaning.antonyms || []) {
        await db.query("INSERT INTO antonyms (meaning_id, antonym) VALUES (?, ?)", [meaning_id, ant]);
      }
    }
  }

  console.log(`✅ Inserted new word: ${word}`);
}

// Xử lý một topic
async function processTopic(topic) {
  const topicName = topic.name.trim();

  const [existingTopic] = await db.query("SELECT topic_id FROM topics WHERE topic_name = ?", [topicName]);
  let topic_id;
  if (existingTopic.length > 0) {
    topic_id = existingTopic[0].topic_id;
    console.log(`⏩ Skipped (already exists): ${topicName}`);
    return;
  } else {
    const [insertTopic] = await db.query("INSERT INTO topics (topic_name) VALUES (?)", [topicName]);
    topic_id = insertTopic.insertId;
    console.log(`🆕 Inserted topic: ${topicName}`);
  }

  for (let word of topic.words) {
    word = word.trim().toLowerCase();
    try {
      const [existingWord] = await db.query(
        `SELECT api.api_id FROM api JOIN vocab_api ON api.api_id = vocab_api.api_id WHERE vocab_api.word = ?`,
        [word]
      );

      let vocab_id;
      if (existingWord.length > 0) {
        vocab_id = existingWord[0].api_id;
      } else {
        const wordData = await fetchWordData(word);
        if (!wordData) continue;
        await insertWord(wordData);

        const [recheck] = await db.query(
          `SELECT api.api_id FROM api JOIN vocab_api ON api.api_id = vocab_api.api_id WHERE vocab_api.word = ?`,
          [word]
        );
        vocab_id = recheck[0].api_id;
      }

      // Link vocab to topic
      const [linkExists] = await db.query(
        "SELECT vocab_topic_id FROM vocab_topic WHERE topic_id = ? AND vocab_id = ?",
        [topic_id, vocab_id]
      );
      if (linkExists.length === 0) {
        await db.query("INSERT INTO vocab_topic (topic_id, vocab_id) VALUES (?, ?)", [topic_id, vocab_id]);
        console.log(`🔗 Linked: ${word} → ${topicName}`);
      }
    } catch (err) {
      console.error(`❌ Error with "${word}" in "${topicName}":`, err.message || err);
    }

    await sleep(800);
  }
}

// Hàm main
async function main() {
  try {
    console.log("🚀 Starting topic vocabulary import...");

    const file = JSON.parse(fs.readFileSync(topicFilePath, "utf-8"));
    const topics = file.topics;

    for (let topic of topics) {
      await processTopic(topic);
    }

    console.log("🎉 Done importing all topics.");
  } catch (err) {
    console.error("🔥 MAIN ERROR:", err.message || err);
  } finally {
    db.end();
  }
}

main();
