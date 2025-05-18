const express = require("express");
const router = express.Router();
// const db = require("../db/connection");
const db = require("../db/connection.promise");

// Get topics with progress for a user
router.get("/learning/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

    const sql = `
      SELECT 
        t.topic_id,
        t.topic_name, 
        t.topic_name_vi,
        (COUNT(CASE WHEN ul.status = 'Known' THEN 1 END) / COUNT(v.api_id)) * 100 AS progress
      FROM topics t
      LEFT JOIN vocab_topic vt ON t.topic_id = vt.topic_id
      LEFT JOIN vocab_api v ON vt.vocab_id = v.api_id
      LEFT JOIN user_learning ul ON v.api_id = ul.api_id AND ul.user_id = ?
      GROUP BY t.topic_id, t.topic_name, t.topic_name_vi
    `;

    const [results] = await db.query(sql, [user_id]);

    if (results.length === 0) {
      return res.status(404).json({ error: "No word found" });
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get topic and vocabulary for a topic_id and user_id
router.get("/learning/vocabs/:topic_id", async (req, res) => {
  try {
    const { topic_id } = req.params;
    const { user_id } = req.query;

    const topicQuery = `
      SELECT t.topic_id, t.topic_name, t.topic_name_vi
      FROM topics t
      WHERE t.topic_id = ?
    `;

    const vocabQuery = `
      SELECT 
          v.api_id,
          v.word,
          v.word_vi,
          v.phonetic,
          (SELECT p.audio 
              FROM phonetics p 
              WHERE p.vocab_id = v.api_id AND p.audio IS NOT NULL
              ORDER BY p.phonetic_id DESC LIMIT 1
          ) AS audio,
          COALESCE(ul.status, 'Learning') AS status
      FROM 
          topics t
      JOIN 
          vocab_topic vt ON t.topic_id = vt.topic_id
      JOIN 
          vocab_api v ON vt.vocab_id = v.api_id
      JOIN 
          api a ON v.api_id = a.api_id
      LEFT JOIN 
          user_learning ul ON v.api_id = ul.api_id AND ul.user_id = ?
      WHERE 
          t.topic_id = ?
          AND a.type = 'vocab'
    `;

    const [[topic]] = await db.query(topicQuery, [topic_id]);
    if (!topic) return res.status(404).json({ error: "No topic found" });

    const [vocabs] = await db.query(vocabQuery, [user_id, topic_id]);
    if (vocabs.length === 0) return res.status(404).json({ error: "No vocab found" });

    res.json({ topic, vocabs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Insert to user_learning
router.post("/user/learning", async (req, res) => {
  try {
    const { user_id, api_id, status } = req.body;

    const checkSql = `
      SELECT * FROM user_learning
      WHERE user_id = ? AND api_id = ?
    `;

    const [existing] = await db.query(checkSql, [user_id, api_id]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Record already exists" });
    }

    const insertSql = `
      INSERT INTO user_learning (user_id, api_id, status) 
      VALUES (?, ?, ?)
    `;
    const [result] = await db.query(insertSql, [user_id, api_id, status]);

    res.status(200).json({
      message: "User learning record inserted successfully",
      data: result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user_learning
router.put("/user/learning", async (req, res) => {
  try {
    const { user_id, api_id, status } = req.body;

    const updateSql = `
      UPDATE user_learning
      SET status = ?
      WHERE user_id = ? AND api_id = ?
    `;
    const [result] = await db.query(updateSql, [status, user_id, api_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "No record found to update" });
    }

    res.status(200).json({
      message: "User learning record updated successfully",
      data: result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/user/learning/update_status", async (req, res) => {
  const { userId, vocabQuestions } = req.body;
  // Log toàn bộ req.body
  // console.log("Full body:\n", JSON.stringify(req.body, null, 2));

  // Log từng field rõ ràng
  console.log("userId:", userId);
  console.log("vocabQuestions:", vocabQuestions);

  const updates = [];

  vocabQuestions.forEach((item) => {
    updates.push({
      table: "user_learning",
      user_id: userId,
      api_id: item.api_id,
      status: item.status,
      type: "vocab",
    });
  });

  try {
    const promises = updates.map(async (update) => {
      const { table, user_id, api_id, status, type } = update;

      const [existingEntry] = await db.query(
        `SELECT status FROM ${table} WHERE user_id = ? AND api_id = ?`,
        [user_id, api_id]
      );

      if (!existingEntry || existingEntry.length === 0) {
        await db.query(
          `INSERT INTO ${table} (user_id, api_id, status) VALUES (?, ?, ?)`,
          [user_id, api_id, status]
        );
        console.log(`[INSERT] ${type} | api_id: ${api_id} | status: ${status}`);
      } else if (existingEntry[0].status !== status) {
        await db.query(
          `UPDATE ${table} SET status = ? WHERE user_id = ? AND api_id = ?`,
          [status, user_id, api_id]
        );
        console.log(
          `[UPDATE] ${type} | api_id: ${api_id} | old: ${existingEntry[0].status} -> new: ${status}`
        );
      } else {
        console.log(
          `[SKIPPED] ${type} | api_id: ${api_id} | unchanged status: ${status}`
        );
      }
    });

    await Promise.all(promises);

    // // Tính tiến độ
    // const allQuestions = vocabQuestions.concat(grammarQuestions);
    // const learningCount = allQuestions.filter(
    //   (q) => q.status === "Known"
    // ).length;
    // const progress = learningCount / allQuestions.length;

    // // Xác định trạng thái dựa trên tiến độ
    // let status = progress === 1 ? "Done" : "InProgress";

    // // Cập nhật vào bảng user_course dựa trên khóa u_c_id
    // await db.query(
    //   `
    //     INSERT INTO user_course (user_id, course_id, progress, status) 
    //     VALUES (?, ?, ?, ?) 
    //     ON DUPLICATE KEY UPDATE progress = ?, status = ?
    //   `,
    //   [userId, courseId, progress, status, progress, status]
    // );

    // console.log(
    //   `[INSERT/UPDATE] user_course | user_id: ${userId} | course_id: ${courseId} | progress: ${progress} | status: ${status}`
    // );

    res.status(200).json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("[ERROR] Failed to update status:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
});

module.exports = router;
