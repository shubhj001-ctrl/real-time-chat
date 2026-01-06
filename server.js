const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const userSockets = new Map();
const USERS = require("./defaultUsers");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e8 // 100 MB
});

app.use(express.static("public"));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});


let onlineUsers = new Set();
let messages = {};

function chatKey(a, b) {
  return [a, b].sort().join("|");
}

io.on("connection", socket => {
  console.log("🔌 New socket connected:", socket.id);

  app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false });

  res.json({
    ok: true,
    url: `/uploads/${req.file.filename}`,
    type: req.file.mimetype
  });
});


  // LOGIN
  socket.on("login", (data, cb) => {
    console.log("➡️ Login attempt:", data);

    if (
      !data ||
      !data.username ||
      !data.password ||
      !USERS[data.username] ||
      USERS[data.username] !== data.password
    ) {
      console.log("❌ Login failed for:", data?.username);
      if (cb) cb({ ok: false });
      return;
    }

    socket.username = data.username;
    onlineUsers.add(data.username);
    userSockets.set(data.username, socket.id);

    console.log("✅ Login success:", data.username);

    if (cb) {
      cb({
        ok: true,
        users: Object.keys(USERS).filter(u => u !== data.username)
      });
    }

    io.emit("online", [...onlineUsers]);
  });

  // TYPING INDICATOR (SERVER ONLY RELAYS)
  socket.on("typing", ({ to }) => {
    if (!socket.username) return;

    io.emit("typing", {
      from: socket.username,
      to
    });
  });

  socket.on("stopTyping", ({ to }) => {
    if (!socket.username) return;

    io.emit("stopTyping", {
      from: socket.username,
      to
    });
  });

  // LOAD MESSAGES
  socket.on("loadMessages", ({ withUser }, cb) => {
    const key = chatKey(socket.username, withUser);
    cb(messages[key] || []);
  });

 socket.on("sendMessage", msg => {
  const key = chatKey(msg.from, msg.to);
  if (!messages[key]) messages[key] = [];
  messages[key].push(msg);

  const toSocket = userSockets.get(msg.to);

  // send ONLY to receiver
  if (toSocket) {
    io.to(toSocket).emit("message", msg);
  }
});

  // DISCONNECT
  socket.on("disconnect", () => {
  if (socket.username) {
    onlineUsers.delete(socket.username);
    userSockets.delete(socket.username);
  }

  io.emit("online", [...onlineUsers]);
});

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});


