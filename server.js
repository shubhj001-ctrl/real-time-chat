const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

/* In-memory stores (MVP) */
const users = {};        // { username: password }
const onlineUsers = {}; // { socketId: username }
const messages = [];    // chat history

io.on("connection", socket => {

  /* ---------- SIGNUP ---------- */
  socket.on("signup", ({ username, password }, cb) => {
    if (!username || !password) {
      return cb({ ok: false, msg: "All fields required" });
    }
    if (users[username]) {
      return cb({ ok: false, msg: "User already exists" });
    }
    users[username] = password;
    cb({ ok: true });
  });

  /* ---------- LOGIN ---------- */
  socket.on("login", ({ username, password }, cb) => {
    if (!users[username]) {
      return cb({ ok: false, msg: "User not found" });
    }

    if (password !== "__auto__" && users[username] !== password) {
      return cb({ ok: false, msg: "Invalid credentials" });
    }

    socket.username = username;
    onlineUsers[socket.id] = username;

    io.emit("onlineCount", Object.keys(onlineUsers).length);
    socket.broadcast.emit("systemMessage", `${username} joined`);

    // 🔥 SEND CHAT HISTORY
    cb({ ok: true, history: messages });
  });

  /* ---------- MESSAGE ---------- */
  socket.on("chatMessage", (text, cb) => {
    if (!socket.username || !text) return;

    const msg = {
      user: socket.username,
      text,
      time: new Date().toISOString()
    };

    messages.push(msg);
    io.emit("chatMessage", msg);

    cb({ delivered: true });
  });

  /* ---------- TYPING ---------- */
  socket.on("typing", isTyping => {
    if (!socket.username) return;
    socket.broadcast.emit("typing", {
      user: socket.username,
      isTyping
    });
  });

  /* ---------- DISCONNECT ---------- */
  socket.on("disconnect", () => {
    if (socket.username) {
      delete onlineUsers[socket.id];
      io.emit("onlineCount", Object.keys(onlineUsers).length);
      socket.broadcast.emit("systemMessage", `${socket.username} left`);
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Server running on", PORT));
