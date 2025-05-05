const db = require("../db/connection.promise");
const translate = require("google-translate-api-x");

// CLI args
const offset = parseInt(process.argv[2]) || 0;
const limit = parseInt(process.argv[3]) || 1000;

console.log(`🚀 Dịch vocab (offset: ${offset}, limit: ${limit})`);

async function translateText(text) {
  try {
    const res = await translate(text, { from: "en", to: "vi" });
    return res.text;
  } catch (err) {
    console.error(`❌ Lỗi dịch: ${text}`);
    console.error(err.message || err);
    return null;
  }
}

async function main() {
  const [rows] = await db.query(`
    SELECT v.api_id, v.word, v.word_vi
    FROM vocab_api v
    LEFT JOIN vocab_topic vt ON v.api_id = vt.vocab_id
    ORDER BY vt.topic_id IS NULL, v.api_id
    LIMIT ? OFFSET ?
  `, [limit, offset]);

  console.log(`📦 Lấy được ${rows.length} từ`);

  let skipped = 0;
  let translated = 0;

  for (const row of rows) {
    if (!row.word || (row.word_vi && row.word_vi.trim())) {
      console.log(`⏩ Skip api_id ${row.api_id} (đã dịch hoặc rỗng)`);
      skipped++;
      continue;
    }

    const vi = await translateText(row.word);
    if (!vi) {
      console.log(`⚠️ Bỏ qua do lỗi dịch: ${row.word}`);
      continue;
    }

    await db.query(`UPDATE vocab_api SET word_vi = ? WHERE api_id = ?`, [vi, row.api_id]);
    console.log(`✅ ${row.api_id}: ${row.word} → ${vi}`);
    translated++;

    const delay = Math.floor(Math.random() * 2000) + 1000; // 2–5 giây
    await new Promise(r => setTimeout(r, delay));
  }

  db.end();
  console.log(`🎯 DONE: ${translated} dịch | ${skipped} bỏ qua`);
}

main();
