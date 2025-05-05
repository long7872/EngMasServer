const db = require("../db/connection.promise");
const translate = require("google-translate-api-x");

const offset = parseInt(process.argv[2]) || 0;
const limit = parseInt(process.argv[3]) || 1000;

console.log(`🚀 Dịch definitions (offset: ${offset}, limit: ${limit})`);

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
        SELECT DISTINCT d.def_id, d.definition, d.definition_vi, vt.topic_id
        FROM definitions d
        JOIN meanings m ON d.meaning_id = m.meaning_id
        JOIN vocab_api v ON m.vocab_id = v.api_id
        LEFT JOIN vocab_topic vt ON v.api_id = vt.vocab_id
        ORDER BY vt.topic_id IS NULL, d.def_id
        LIMIT ? OFFSET ?
      `, [limit, offset]);

  console.log(`📦 Lấy được ${rows.length} định nghĩa`);

  let skipped = 0;
  let translated = 0;
  const seen = new Set();

  for (const row of rows) {
    if (seen.has(row.def_id)) {
      console.log(`⚠️ Lặp def_id ${row.def_id}, bỏ qua`);
      continue;
    }
    seen.add(row.def_id);

    if (!row.definition || (row.definition_vi && row.definition_vi.trim())) {
      console.log(`⏩ Skip def_id ${row.def_id} (đã dịch hoặc rỗng)`);
      skipped++;
      continue;
    }

    const vi = await translateText(row.definition);
    if (!vi) {
      console.log(`⚠️ Bỏ qua do lỗi dịch: ${row.definition}`);
      continue;
    }

    await db.query(`UPDATE definitions SET definition_vi = ? WHERE def_id = ?`, [vi, row.def_id]);
    console.log(`✅ ${row.def_id}: ${row.definition} → ${vi}`);
    translated++;

    const delay = Math.floor(Math.random() * 2000) + 1000; // 2–5 giây
    await new Promise(r => setTimeout(r, delay));
  }

  db.end();
  console.log(`🎯 DONE: ${translated} dịch | ${skipped} bỏ qua`);
}

main();
