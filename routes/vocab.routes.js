const express = require("express");
const router = express.Router();
const db = require("../db/connection.promise");

// GET random word
router.get("/random", async (req, res) => {
  const sql = `SELECT word FROM vocab_api ORDER BY RAND() LIMIT 11`;

  try {
    const [results] = await db.query(sql);

    if (results.length === 0)
      return res.status(404).json({ error: "No word found" });

    const wordList = results.map(row => row.word);
    res.json(wordList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET search word (by query)
router.get("/search/:query", async (req, res) => {
  console.log("Received query:", req.params.query);
  const searchTerm = `${req.params.query}%`;
  const sql = `SELECT * FROM vocab_api WHERE word LIKE ? LIMIT 10`;

  try {
    const [results] = await db.query(sql, [searchTerm]);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route GET để lấy dữ liệu từ từ điển
router.get('/decode/:api_id', async (req, res) => {
  const { api_id } = req.params;

  try {
    // Lấy word + phonetic từ vocab_api
    const [wordRows] = await db.query(
      'SELECT * FROM vocab_api WHERE api_id = ?',
      [api_id]
    );
    if (wordRows.length === 0) {
      return res.status(404).json({ message: `No word found for api_id ${api_id}` });
    }
    const wordData = wordRows[0];

    // Lấy các phiên âm
    const [phonetics] = await db.query(
      'SELECT text, audio FROM phonetics WHERE vocab_id = ?',
      [api_id]
    );

    // Lấy các meanings
    const [meanings] = await db.query(
      'SELECT * FROM meanings WHERE vocab_id = ?',
      [api_id]
    );
    const meaningIds = meanings.map(m => m.meaning_id);

    let definitions = [];
    let synonyms = [];
    let antonyms = [];

    if (meaningIds.length > 0) {
      // Lấy định nghĩa
      [definitions] = await db.query(
        `SELECT * FROM definitions WHERE meaning_id IN (?)`,
        [meaningIds]
      );

      // Lấy synonyms
      [synonyms] = await db.query(
        `SELECT * FROM synonyms WHERE meaning_id IN (?)`,
        [meaningIds]
      );

      // Lấy antonyms
      [antonyms] = await db.query(
        `SELECT * FROM antonyms WHERE meaning_id IN (?)`,
        [meaningIds]
      );
    }

    // Kết cấu dữ liệu phản hồi
    const response = {
      api_id: Number(api_id),
      word: wordData.word,
      word_vi: wordData.word_vi,
      phonetics: phonetics.map(p => ({
        text: p.text,
        audio: p.audio
      })),
      meanings: meanings.map(meaning => {
        const defs = definitions.filter(d => d.meaning_id === meaning.meaning_id);
        const syns = synonyms.filter(s => s.meaning_id === meaning.meaning_id).map(s => s.synonym);
        const ants = antonyms.filter(a => a.meaning_id === meaning.meaning_id).map(a => a.antonym);

        return {
          partOfSpeech: meaning.part_of_speech,
          definitions: defs.map(d => ({
            definition: d.definition,
            definition_vi: d.definition_vi,
            example: d.example
          })),
          synonyms: syns,
          antonyms: ants
        };
      })
    };

    res.json(response);
  } catch (err) {
    console.error("❌ Error decoding api_id:", err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
