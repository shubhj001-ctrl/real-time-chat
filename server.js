const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const USERS = require("./defaultUsers");
const { saveMessage, loadMessages } = require("./db");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
  pingInterval: 10000,
  pingTimeout: 20000
});

/* =========================
   STATIC + UPLOAD SETUP
========================= */

app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false });

  res.json({
    ok: true,
    url: `/uploads/${req.file.filename}`,
    type: req.file.mimetype
  });
});

/* =========================
   SOCKET STATE
========================= */

const userSockets = new Map(); // username → socket
const onlineUsers = new Set();

const chatKey = (a, b) => [a, b].sort().join("|");

/* =========================
   SOCKET LOGIC
========================= */

io.on("connection", socket => {
  console.log("🔌 Connected:", socket.id);

  /* ---------- LOGIN ---------- */
  socket.on("login", (data, cb) => {
    if (!data?.username || USERS[data.username] !== data.password) {
      cb?.({ ok: false });
      return;
    }

    socket.username = data.username;
    userSockets.set(data.username, socket);
    onlineUsers.add(data.username);

    cb?.({
      ok: true,
      users: Object.keys(USERS).filter(u => u !== data.username)
    });

    io.emit("online", [...onlineUsers]);
  });

  /* ---------- RECONNECT ---------- */
  socket.on("reconnectUser", username => {
    socket.username = username;
    userSockets.set(username, socket);
    onlineUsers.add(username);
    io.emit("online", [...onlineUsers]);
  });

  /* ---------- TYPING ---------- */
  socket.on("typing", ({ to }) => {
    if (!socket.username) return;
    userSockets.get(to)?.emit("typing", {
      from: socket.username,
      to
    });
  });

  socket.on("stopTyping", ({ to }) => {
    if (!socket.username) return;
    userSockets.get(to)?.emit("stopTyping", {
      from: socket.username,
      to
    });
  });

  /* ---------- LOAD MESSAGES ---------- */
  socket.on("loadMessages", async ({ withUser }, cb) => {
    if (!socket.username) return cb([]);

    const key = chatKey(socket.username, withUser);

    try {
      const msgs = await loadMessages(key);
      cb(msgs);
    } catch (err) {
      console.error("❌ Load messages error", err);
      cb([]);
    }
  });

  /* ---------- SEND MESSAGE ---------- */
  socket.on("sendMessage", async msg => {
    if (!msg?.from || !msg?.to) return;

    // bind identity safely
    if (!socket.username) {
      socket.username = msg.from;
      userSockets.set(msg.from, socket);
      onlineUsers.add(msg.from);
    }

    const key = chatKey(msg.from, msg.to);
    msg.createdAt = Date.now();

    try {
      await saveMessage(msg, key);

      userSockets.get(msg.to)?.emit("message", msg);
      userSockets.get(msg.from)?.emit("message", msg);
    } catch (err) {
      console.error("❌ Message save failed", err);
    }
  });

  /* ---------- DISCONNECT ---------- */
  socket.on("disconnect", () => {
    if (socket.username) {
      userSockets.delete(socket.username);
      onlineUsers.delete(socket.username);
      io.emit("online", [...onlineUsers]);
    }
    console.log("❌ Disconnected:", socket.id);
  });
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
