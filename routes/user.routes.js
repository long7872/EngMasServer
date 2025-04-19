const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// GET tất cả users
router.get('/', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results); // trả về danh sách user
  });
});

// GET user
router.get('/:user_id', (req, res) => {
  console.log("Received id:", req.params);
  const { user_id } = req.params;

  db.query('SELECT * FROM users WHERE user_id = ?', [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });

    res.json(results[0]);
  });
});

// PUT cập nhật status user
router.put('/:user_id/status', (req, res) => {
  console.log("Received paras:", req.params);
  console.log("Received status:", req.body);
  const { user_id } = req.params;
  const { status } = req.body;

  const sql = 'UPDATE users SET status = ? WHERE user_id = ?';
  db.query(sql, [status, user_id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ user_id, status });
  });
});

// POST thêm user
router.post('/', (req, res) => {
  console.log("Received payload:", req.body);

  const {
    user_id,
    username,
    email,
    facebook,
    photo_url,
    privilege,
    status
  } = req.body;

  const sql = `
    INSERT INTO users (user_id, username, email, facebook, photo_url, privilege, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [user_id, username, email, facebook, photo_url, privilege, status],
    (err, result) => {
      if (err) {
        console.error("SQL error:", err); // 🔍 Add this line
        return res.status(500).json({ error: err });
      }

      res.status(201).json({
        user_id,
        username,
        email,
        facebook,
        photo_url,
        privilege,
        status
      });
    }
  );
});


module.exports = router;
