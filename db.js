const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./chat.db", err => {
  if (err) {
    console.error("❌ Failed to connect DB", err);
  } else {
    console.log("✅ SQLite connected");
  }
});

/* =========================
   INIT TABLE
========================= */
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chatKey TEXT,
      fromUser TEXT,
      toUser TEXT,
      text TEXT,
      mediaUrl TEXT,
      mediaType TEXT,
      createdAt INTEGER
    )
  `);
});

/* =========================
   HELPERS
========================= */

function saveMessage(msg, chatKey) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO messages
      (id, chatKey, fromUser, toUser, text, mediaUrl, mediaType, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        msg.id,
        chatKey,
        msg.from,
        msg.to,
        msg.text || null,
        msg.media?.url || null,
        msg.media?.type || null,
        msg.createdAt || Date.now()
      ],
      err => (err ? reject(err) : resolve())
    );
  });
}

function loadMessages(chatKey) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM messages WHERE chatKey = ? ORDER BY createdAt`,
      [chatKey],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

module.exports = {
  db,
  saveMessage,
  loadMessages
};
