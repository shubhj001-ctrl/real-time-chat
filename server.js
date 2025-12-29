const express = require("express");
const app = express();
const http = require("http").createServer(app);

const io = require("socket.io")(http, {
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 5e6
});

app.use(express.static("public"));

/* ======================
   PRIVATE USERS
====================== */
const defaultUsers = require("./defaultUsers");
const users = { ...defaultUsers };

/* ======================
   MEMORY STORES
====================== */
const onlineUsers = {};
const messages = [];

/* ======================
   SOCKET LOGIC
====================== */
io.on("connection", socket => {

  /* ---------- LOGIN ---------- */
  socket.on("login", ({ username, password }, cb) => {
    if (!users[username]) {
      return cb?.({ ok: false, msg: "Access denied" });
    }

    if (users[username] !== password) {
      return cb?.({ ok: false, msg: "Invalid password" });
    }

    socket.username = username;
    onlineUsers[socket.id] = username;

    io.emit("onlineCount", Object.keys(onlineUsers).length);
    cb?.({ ok: true, history: messages });
  });

  /* ---------- KEEP ALIVE (IMPORTANT) ---------- */
  socket.on("keepAlive", () => {
    // do nothing — this keeps the socket active
    // intentionally silent
  });

  /* ---------- CHAT ---------- */
  socket.on("chatMessage", (data, cb) => {
    if (!socket.username || !data?.type || !data?.content) return;

    const msg = {
      id: Date.now() + Math.random(),
      user: socket.username,
      type: data.type,
      content: data.content,
      replyTo: data.replyTo || null,
      time: new Date().toISOString()
    };

    messages.push(msg);
    io.emit("chatMessage", msg);
    cb?.({ delivered: true });
  });

  /* ---------- DISCONNECT ---------- */
  socket.on("disconnect", () => {
    if (socket.username) {
      delete onlineUsers[socket.id];
      io.emit("onlineCount", Object.keys(onlineUsers).length);
    }
  });
});

/* ======================
   START SERVER
====================== */
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
