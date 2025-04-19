const express = require("express");
const router = express.Router();
const db = require("../db/connection");

// GET random word
router.get("/random", (req, res) => {
  const sql = `SELECT * FROM vocab_api ORDER BY RAND() LIMIT 1`;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });

    if (results.length === 0)
      return res.status(404).json({ error: "No word found" });

    res.json(results[0]);
  });
});

// GET search word (by query)
router.get("/search/:query", (req, res) => {
  console.log("Received query:", req.params.query);
  const searchTerm = `${req.params.query}%`;
  const sql = `SELECT * FROM vocab_api WHERE word LIKE ? LIMIT 10`;

  db.query(sql, [searchTerm], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.json([]);

    res.json(results);
  });
});

module.exports = router;
