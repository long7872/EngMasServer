const db = require("../db/connection.promise");
const translate = require("google-translate-api-x");

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
  console.log("🚀 Bắt đầu dịch topic_name → topic_name_vi...");

  const [rows] = await db.query(
    "SELECT topic_id, topic_name FROM topics WHERE topic_name_vi IS NULL OR topic_name_vi = ''"
  );

  for (const row of rows) {
    const vi = await translateText(row.topic_name);
    if (!vi) continue;

    await db.query(
      "UPDATE topics SET topic_name_vi = ? WHERE topic_id = ?",
      [vi, row.topic_id]
    );

    console.log(`✅ ${row.topic_name} → ${vi}`);

    // 🕓 Tránh bị block
    await new Promise(r => setTimeout(r, 1000));
  }

  db.end();
  console.log("🎉 Dịch xong toàn bộ topics.");
}

main();
