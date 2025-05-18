const express = require("express");
const router = express.Router();
const multer = require("multer");
const { Dropbox } = require("dropbox");
const fetch = require("isomorphic-fetch");
// const db = require('../db/connection');
const db = require("../db/connection.promise");
const dotenv = require('dotenv');
dotenv.config({ path: 'server.env' });

const upload = multer({ storage: multer.memoryStorage() });
const dbx = new Dropbox({ accessToken: process.env.DROPBOX_TOKEN, fetch });

// Route: POST /users/upload?user_id=...
router.post("/upload", upload.single("image"), async (req, res) => {
    const userId = req.query.user_id;

    if (!userId) {
        return res.status(400).json({ error: "Missing user_id" });
    }

    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const fileName = `${Date.now()}_${file.originalname}`;
        const dropboxPath = `/images/${fileName}`;

        const uploadRes = await dbx.filesUpload({
            path: dropboxPath,
            contents: file.buffer,
            mode: "add",
        });

        const sharedLink = await dbx.sharingCreateSharedLinkWithSettings({
            path: uploadRes.result.path_display,
        });

        const imageUrl = sharedLink.result.url.replace("&dl=0", "&raw=1");

        // ✅ Cập nhật image_url vào users
        const sql = "UPDATE users SET photo_url = ? WHERE user_id = ?";
        await db.query(sql, [imageUrl, userId]);

        // console.log(sharedLink, imageUrl)
        res.json(imageUrl);
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// GET tất cả users
router.get("/", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM users");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// POST thêm user
router.post("/", async (req, res) => {
  const {
    user_id,
    username,
    email,
    facebook,
    photo_url,
    privilege,
    status,
    name,
    date_of_birth,
    phone_number,
  } = req.body;

  const sql = `
    INSERT INTO users (
      user_id,
      username,
      email,
      facebook,
      photo_url,
      privilege,
      status,
      name,
      date_of_birth,
      phone_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    await db.query(sql, [
      user_id,
      username,
      email,
      facebook,
      photo_url,
      privilege,
      status,
      name,
      date_of_birth,
      phone_number,
    ]);
    res.status(201).json({
      user_id,
      username,
      email,
      facebook,
      photo_url,
      privilege,
      status,
      name,
      date_of_birth,
      phone_number,
    });
  } catch (err) {
    console.error("SQL error:", err);
    res.status(500).json({ error: err });
  }
});

// GET user
router.get("/:user_id", async (req, res) => {
  const { user_id } = req.params;
  try {
    const [results] = await db.query("SELECT * FROM users WHERE user_id = ?", [
      user_id,
    ]);
    if (results.length === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// UPDATE user
router.put("/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const {
    username,
    email,
    facebook,
    photo_url,
    privilege,
    status,
    name,
    date_of_birth,
    phone_number,
  } = req.body;

  const sql = `
    UPDATE users
    SET
      username = ?,
      email = ?,
      facebook = ?,
      photo_url = ?,
      privilege = ?,
      status = ?,
      name = ?,
      date_of_birth = ?,
      phone_number = ?
    WHERE user_id = ?
  `;

  try {
    const [result] = await db.query(sql, [
      username,
      email,
      facebook,
      photo_url,
      privilege,
      status,
      name,
      date_of_birth,
      phone_number,
      user_id,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "User not found or nothing changed" });
    }

    res.status(202).json({ message: "User updated successfully" });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: err });
  }
});

// DELETE user
router.delete("/:user_id", async (req, res) => {
  const { user_id } = req.params;

  // Kiểm tra xem người dùng có tồn tại không trước khi xóa
  const checkSql = "SELECT * FROM users WHERE user_id = ?";
  try {
    const [checkResult] = await db.query(checkSql, [user_id]);

    if (checkResult.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Xóa người dùng
    const deleteSql = "DELETE FROM users WHERE user_id = ?";
    const [deleteResult] = await db.query(deleteSql, [user_id]);

    // Kiểm tra xem có bị lỗi trong quá trình xóa hay không
    if (deleteResult.affectedRows === 0) {
      return res.status(400).json({ error: "Failed to delete user" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT cập nhật status user
router.put("/:user_id/status", async (req, res) => {
  const { user_id } = req.params;
  const { status } = req.body;
  try {
    await db.query("UPDATE users SET status = ? WHERE user_id = ?", [
      status,
      user_id,
    ]);
    res.json({ user_id, status });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// GET badges của một user
router.get("/:user_id/badges", async (req, res) => {
  const { user_id } = req.params;

  const sql = `
    SELECT 
      ub.user_id,
      ub.badge_id,
      ub.quantity,
      ub.favourite,
      b.badge_type,
      b.image_path
    FROM user_badge ub
    JOIN badges b ON ub.badge_id = b.badge_id
    WHERE ub.user_id = ?
  `;

  try {
    const [userBadges] = await db.query(sql, [user_id]);

    const countSql = `
      SELECT COUNT(api_id) AS total_api_count
      FROM user_learning
      WHERE user_id = ?
    `;

    const [countResult] = await db.query(countSql, [user_id]);
    const totalApiCount = countResult[0].total_api_count;

    if (totalApiCount > 50) {
      const hasBadge5 = userBadges.some((badge) => badge.badge_id === 5);
      if (!hasBadge5) {
        const insertSql = `
          INSERT INTO user_badge (user_id, badge_id, quantity)
          VALUES (?, ?, ?)
        `;
        await db.query(insertSql, [user_id, 5, 1]); // Thêm badge_id = 5 với quantity = 1
        console.log("Badge 5 added to user_badge");
      }
    }
    if (totalApiCount > 100) {
      const hasBadge6 = userBadges.some((badge) => badge.badge_id === 6);
      if (!hasBadge6) {
        const insertSql = `
          INSERT INTO user_badge (user_id, badge_id, quantity)
          VALUES (?, ?, ?)
        `;
        await db.query(insertSql, [user_id, 6, 1]); // Thêm badge_id = 5 với quantity = 1
        console.log("Badge 6 added to user_badge");
      }
    }

    res.json(userBadges); // trả về danh sách badges theo user
  } catch (err) {
    console.error("Error fetching badges:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT cập nhật trường favourite cho một user và badge
router.put("/:user_id/favourite", async (req, res) => {
  const { user_id } = req.params;
  const { badge_id, favourite } = req.body; // yêu cầu body chứa trường `favourite` (0 hoặc 1)

  // Kiểm tra giá trị `favourite` hợp lệ (0 hoặc 1)
  if (favourite !== 0 && favourite !== 1) {
    return res
      .status(400)
      .json({ error: "Invalid value for 'favourite'. Must be 0 or 1." });
  }

  const sql = `
    UPDATE user_badge
    SET favourite = ?
    WHERE user_id = ? AND badge_id = ?
  `;

  try {
    const [result] = await db.query(sql, [favourite, user_id, badge_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User or Badge not found" });
    }

    res.json({ message: "Favourite status updated successfully" });
  } catch (err) {
    console.error("Error updating favourite:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET danh sách bạn bè dựa trên user_id
router.get("/:user_id/friendships", async (req, res) => {
  const { user_id } = req.params;

  // Truy vấn 1: Kiểm tra khi user_id là người chủ động gửi lời mời (user_id = user_id)
  const sql1 = `
    SELECT uf.u_f_id, uf.user_id, uf.friend_id, u.username as friend_name, u.photo_url as friend_photo, uf.status, uf.sender, uf.timestamp
    FROM user_friend uf
    JOIN users u ON u.user_id = uf.friend_id
    WHERE uf.user_id = ?
    ORDER BY uf.timestamp DESC
  `;

  // Truy vấn 2: Kiểm tra khi friend_id là người chủ động gửi lời mời (friend_id = user_id)
  const sql2 = `
    SELECT uf.u_f_id, uf.user_id as friend_id, uf.friend_id as user_id, u.username as friend_name, u.photo_url as friend_photo, uf.status, uf.sender, uf.timestamp
    FROM user_friend uf
    JOIN users u ON u.user_id = uf.user_id
    WHERE uf.friend_id = ?
    ORDER BY uf.timestamp DESC
  `;

  try {
    // Thực hiện cả hai truy vấn đồng thời
    const [results1] = await db.query(sql1, [user_id]);
    const [results2] = await db.query(sql2, [user_id]);

    // Kết hợp kết quả từ cả hai truy vấn
    const combinedResults = [...results1, ...results2];

    // Nếu không có kết quả
    if (combinedResults.length === 0) {
      return res.status(200).json([]);
    }

    res.json(combinedResults); // Trả về danh sách bạn bè và trạng thái của họ
  } catch (err) {
    console.error("Error fetching friendships:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST insert
router.post("/:user_id/friendships", async (req, res) => {
  const { user_id } = req.params;
  const { friend_id, status } = req.body; // friend_id và status gửi từ body

  if (!friend_id || !status) {
    return res
      .status(400)
      .json({ error: "Missing 'friend_id' or 'status' in request body" });
  }

  // Đảm bảo user_id luôn nhỏ hơn friend_id để đáp ứng constraint
  let [first_user_id, second_user_id] = [user_id, friend_id];
  if (user_id > friend_id) {
    // Đổi giá trị nếu user_id > friend_id
    [first_user_id, second_user_id] = [friend_id, user_id];
  }

  const sender = user_id;

  const sql = `
    INSERT INTO user_friend (user_id, friend_id, status, sender)
    VALUES (?, ?, ?, ?)
  `;

  try {
    const [result] = await db.query(sql, [
      first_user_id,
      second_user_id,
      status,
      sender,
    ]);

    // Trả về thông tin bạn bè đã được thêm vào
    res.status(201).json({
      user_id: first_user_id,
      friend_id: second_user_id,
      status,
      sender,
      message: "Friendship added successfully",
    });
  } catch (err) {
    console.error("Error adding friendship:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update status bạn bè dựa trên user_id và friend_id
router.put("/:user_id/friendships", async (req, res) => {
  const { user_id } = req.params;
  const { friend_id, status } = req.body; // friend_id và status gửi từ body

  if (!friend_id || !status) {
    return res
      .status(400)
      .json({ error: "Missing 'friend_id' or 'status' in request body" });
  }

  let [first_user_id, second_user_id] = [user_id, friend_id];
  if (user_id > friend_id) {
    // Đổi giá trị nếu user_id > friend_id
    [first_user_id, second_user_id] = [friend_id, user_id];
  }

  const sql = `
    UPDATE user_friend
    SET status = ?
    WHERE user_id = ? AND friend_id = ?
  `;

  try {
    const [result] = await db.query(sql, [
      status,
      first_user_id,
      second_user_id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Friendship not found" });
    }

    res.json({
      message: "Friendship status updated successfully",
      user_id,
      friend_id,
      status,
    });
  } catch (err) {
    console.error("Error updating friendship:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:user_id/friendships/:friend_id", async (req, res) => {
  const { user_id, friend_id } = req.params;

  const sql = `
    DELETE FROM user_friend
    WHERE user_id = ? AND friend_id = ?
  `;

  try {
    const [result] = await db.query(sql, [user_id, friend_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Friendship not found" });
    }

    res.json({
      message: "Friendship deleted successfully",
      user_id,
      friend_id,
    });
  } catch (err) {
    console.error("Error deleting friendship:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Search users theo tên hoặc email
router.get("/:user_id/friendships/search", async (req, res) => {
  const { user_id } = req.params;
  const { q } = req.query;

  if (!q || q.trim() === "") {
    return res.status(400).json({ error: "Missing search query 'q'" });
  }

  const keyword = `%${q}%`;

  const sql = `
    SELECT u.user_id as friend_id, u.username, u.email, u.photo_url, 
           CASE 
               WHEN uf.user_id IS NOT NULL THEN uf.status
               ELSE NULL
           END AS status
    FROM users u
    LEFT JOIN user_friend uf 
        ON uf.friend_id = u.user_id AND uf.user_id = ?  -- So sánh user_id và friend_id
    WHERE (u.username LIKE ? OR u.email LIKE ? OR u.name LIKE ?)
    AND u.user_id != ?
    AND (uf.status != 'Accepted' OR uf.status IS NULL OR uf.status = 'Pending')
  `;

  try {
    const [results] = await db.query(sql, [
      user_id,
      keyword,
      keyword,
      keyword,
      user_id,
    ]);

    res.json(results); // Trả về kết quả tìm kiếm bạn bè
  } catch (err) {
    console.error("Error searching users:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
