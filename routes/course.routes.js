const express = require("express");
const router = express.Router();
// const db = require("../db/connection");
const db = require("../db/connection.promise");

// Route lấy tất cả khóa học
router.get("/", async (req, res) => {
  try {
    // Truy vấn tất cả khóa học từ bảng course
    const [courses] = await db.query("SELECT * FROM course");

    // Kiểm tra nếu không có khóa học
    if (courses.length === 0) {
      return res.status(404).json({ message: "No courses found" });
    }

    // Trả về danh sách các khóa học
    res.status(200).json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Error occurred while fetching courses" });
  }
});

// Route tạo khóa học beginner (GET method)
router.get("/create", async (req, res) => {
  try {
    // 1. Lấy topic_id từ query parameters (nếu có)
    const topicId = req.query.topic_id; // Lấy từ query string
    if (!topicId) {
      return res.status(400).json({ error: "Topic ID is required" });
    }

    // 2. Lấy grammar_type_id từ query parameters (nếu có)
    const grammarTypeId = req.query.grammar_type_id; // Lấy từ query string
    if (!grammarTypeId) {
      return res.status(400).json({ error: "Grammar Type ID is required" });
    }

    // 3. Lấy chủ đề từ bảng topics
    const [topicResults] = await db.query(
      "SELECT topic_name FROM topics WHERE topic_id = ?",
      [topicId]
    );
    const topic = topicResults[0];

    if (!topic) {
      return res.status(400).json({ error: "Topic not found" });
    }

    const topicName = topic.topic_name;

    // 4. Lấy 8 từ vựng ngẫu nhiên từ bảng vocab_api theo topic_id
    const [vocabResults] = await db.query(
      "SELECT * FROM vocab_api v " +
        "JOIN vocab_topic vt ON v.api_id = vt.vocab_id " +
        "WHERE vt.topic_id = ? " +
        "ORDER BY RAND() LIMIT 8",
      [topicId]
    );

    // Kiểm tra nếu không đủ 8 từ vựng
    if (vocabResults.length < 8) {
      return res
        .status(400)
        .json({ error: "Not enough vocabulary for the course" });
    }

    const [typeResults] = await db.query(
      "SELECT grammar_name FROM grammar_type WHERE grammar_type_id = ?",
      [grammarTypeId]
    );
    const type = typeResults[0];
    if (!type) {
      return res.status(400).json({ error: "Type not found" });
    }
    const typeName = type.grammar_name;

    // 5. Lấy 2 câu hỏi ngẫu nhiên từ grammar_api theo grammar_type_id
    const [questionResults] = await db.query(
      "SELECT * FROM grammar_api WHERE grammar_type_id = ? ORDER BY RAND() LIMIT 2",
      [grammarTypeId]
    );

    // Kiểm tra nếu không đủ câu hỏi
    if (questionResults.length < 2) {
      return res
        .status(400)
        .json({ error: "Not enough grammar questions for the course" });
    }

    // 6. Tạo khóa học (course)
    const [courseResult] = await db.query(
      "INSERT INTO course (course_name, type) VALUES (?, ?)",
      [`${topicName} - ${typeName} Beginner Course`, "Beginner"]
    );
    const courseId = courseResult.insertId;

    // 7. Thêm nội dung khóa học (course_content) - Từ vựng
    for (let vocab of vocabResults) {
      const vocabApiId = vocab.api_id;

      await db.query(
        "INSERT INTO course_content (course_id, api_id) VALUES (?, ?)",
        [courseId, vocabApiId]
      );
    }

    // 8. Thêm nội dung khóa học (course_content) - Câu hỏi ngữ pháp
    for (let question of questionResults) {
      const grammarApiId = question.api_id;

      await db.query(
        "INSERT INTO course_content (course_id, api_id) VALUES (?, ?)",
        [courseId, grammarApiId]
      );
    }

    // 9. Trả về kết quả khóa học tạo thành công
    res.status(200).json({
      message: "Beginner course created successfully",
      courseData: {
        course_name: `${topicName} - ${typeName} Beginner Course`,
        topic: topicName,
        vocabulary: vocabResults.map((row) => row.word),
        questions: questionResults.map((row) => ({
          question: row.question,
          answer: row.answer,
        })),
      },
    });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: "Error occurred during course creation" });
  }
});

// Route lấy dữ liệu khóa học cho user (GET)
router.get("/learning/:course_id", async (req, res) => {
  const { course_id } = req.params; // Lấy course_id từ URL
  const { user_id } = req.query; // Lấy user_id từ query string

  try {
    // 1. Lấy thông tin khóa học từ bảng course
    const [courseResult] = await db.query(
      "SELECT * FROM course WHERE course_id = ?",
      [course_id]
    );
    const course = courseResult[0];

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // 3. Lấy thông tin từ vựng cho khóa học
    const [vocabulary_questions] = await db.query(
      `
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
          course c
      JOIN 
          course_content cc ON c.course_id = cc.course_id
      JOIN 
          vocab_api v ON cc.api_id = v.api_id
      JOIN 
          api a ON v.api_id = a.api_id  -- Liên kết với bảng api để lấy type
      LEFT JOIN 
          user_learning ul ON v.api_id = ul.api_id AND ul.user_id = ?  -- user_id từ tham số đầu vào
      WHERE 
          c.course_id = ?  -- course_id từ tham số đầu vào
          AND a.type = 'vocab'  -- Kiểm tra loại câu hỏi là vocab
      `,
      [user_id, course_id]
    );

    // 4. Lấy câu hỏi ngữ pháp cho khóa học
    const [grammar_questions] = await db.query(
      `
      SELECT 
        g.api_id,
        gt.grammar_name,
        g.question,
        g.answer,
          COALESCE(ul.status, 'Learning') AS status
      FROM 
          course c
      JOIN 
          course_content cc ON c.course_id = cc.course_id
      JOIN 
          grammar_api g ON cc.api_id = g.api_id
      JOIN 
          api a ON g.api_id = a.api_id  -- Liên kết với bảng api để lấy type
      LEFT JOIN 
          user_learning ul ON g.api_id = ul.api_id AND ul.user_id = 1  -- user_id từ tham số đầu vào
      JOIN
        grammar_type gt ON g.grammar_type_id = gt.grammar_type_id 
      WHERE 
          c.course_id = 1  -- course_id từ tham số đầu vào
          AND a.type = 'grammar'  -- Kiểm tra loại câu hỏi là grammar
      `,
      [user_id, course_id]
    );

    // 5. Tạo dữ liệu cho QuestionInCourse
    const questionInCourse = {
      course,
      vocabulary_questions,
      grammar_questions,
    };

    // 6. Trả về kết quả
    res.status(200).json(questionInCourse);
  } catch (error) {
    console.error("Error fetching course data:", error);
    res
      .status(500)
      .json({ error: "Error occurred during fetching course data" });
  }
});

// API Route để cập nhật trạng thái của câu hỏi
router.post("/learning/update_status", async (req, res) => {
  const { userId, courseId, vocabQuestions, grammarQuestions } = req.body;
  // Log toàn bộ req.body
  // console.log("Full body:\n", JSON.stringify(req.body, null, 2));

  // Log từng field rõ ràng
  console.log("userId:", userId);
  console.log("courseId:", courseId);
  // console.log("vocabQuestions:", vocabQuestions);
  // console.log("grammarQuestions:", grammarQuestions);

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

  grammarQuestions.forEach((item) => {
    updates.push({
      table: "user_learning",
      user_id: userId,
      api_id: item.api_id,
      status: item.status,
      type: "grammar",
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

    // Tính tiến độ
    const allQuestions = vocabQuestions.concat(grammarQuestions);
    const learningCount = allQuestions.filter(
      (q) => q.status === "Known"
    ).length;
    const progress = learningCount / allQuestions.length;

    // Xác định trạng thái dựa trên tiến độ
    let status = progress === 1 ? "Done" : "InProgress";

    // Cập nhật vào bảng user_course dựa trên khóa u_c_id
    await db.query(
      `
        INSERT INTO user_course (user_id, course_id, progress, status) 
        VALUES (?, ?, ?, ?) 
        ON DUPLICATE KEY UPDATE progress = ?, status = ?
      `,
      [userId, courseId, progress, status, progress, status]
    );

    console.log(
      `[INSERT/UPDATE] user_course | user_id: ${userId} | course_id: ${courseId} | progress: ${progress} | status: ${status}`
    );

    res.status(200).json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("[ERROR] Failed to update status:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// Router lấy user_course + name + type
router.get("/user_course/:user_id", async (req, res) => {
  const { user_id } = req.params; // Lấy user_id từ URL

  try {
    // Truy vấn dữ liệu từ bảng user_course và lấy thông tin thêm từ bảng course
    const query = `
      SELECT uc.u_c_id, uc.user_id, uc.course_id, uc.progress, uc.timestamp, c.course_name, c.type 
      FROM user_course uc
      JOIN course c ON uc.course_id = c.course_id
      WHERE uc.user_id = ?
      ORDER BY uc.timestamp DESC;
    `;

    const [rows] = await db.query(query, [user_id]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No courses found for this user." });
    }

    // Trả về kết quả, bao gồm thông tin từ bảng `user_course` và `course`
    res.status(200).json(rows);
  } catch (error) {
    console.error("[ERROR] Failed to retrieve user courses:", error);
    res.status(500).json({ error: "Failed to retrieve user courses" });
  }
});

module.exports = router;
