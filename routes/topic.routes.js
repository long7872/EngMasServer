const express = require("express");
const router = express.Router();
const db = require("../db/connection");

router.get("/learning/:user_id", (req, res) => {
  console.log("Received id:", req.params);
  const { user_id } = req.params;

  const sql = `
    SELECT 
      t.topic_id,
      t.topic_name, 
      t.topic_name_vi,
      GROUP_CONCAT(CASE WHEN ul.status = 'done' THEN v.word END) AS tudahoc,  -- Lấy danh sách từ đã học
      COUNT(v.api_id) AS tongsotutrongtopic,  -- Tổng số từ trong topic
      (COUNT(CASE WHEN ul.status = 'done' THEN 1 END) / COUNT(v.api_id)) * 100 AS progress  -- Tính tiến độ
    FROM topics t
    LEFT JOIN vocab_topic vt ON t.topic_id = vt.topic_id
    LEFT JOIN vocab_api v ON vt.vocab_id = v.api_id
    LEFT JOIN user_learning ul ON v.api_id = ul.api_id AND ul.user_id = ?
    GROUP BY t.topic_id, t.topic_name, t.topic_name_vi;
  `;

  db.query(sql, [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: err });

    if (results.length === 0)
      return res.status(404).json({ error: "No word found" });

    res.json(results);
  });
});

module.exports = router;
