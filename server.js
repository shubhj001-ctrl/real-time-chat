const express = require("express");
const app = express();
const http = require("http").createServer(app);

/* ======================
   SOCKET.IO CONFIG
   (mobile + media safe)
====================== */
const io = require("socket.io")(http, {
  pingTimeout: 60000,      // allow backgrounding on mobile
  pingInterval: 25000,
  maxHttpBufferSize: 5e6  // 5MB max payload (base64 safety)
});

/* ======================
   STATIC FILES
====================== */
app.use(express.static("public"));

/* ======================
   LOAD PRIVATE USERS
====================== */
/*
  This file contains only default users.
  Easy to delete later to go public.
*/
const defaultUsers = require("./defaultUsers");

/*
  Users store starts with default users.
  Later replace this with DB.
*/
const users = { ...defaultUsers };

/* ======================
   IN-MEMORY STORES
====================== */
const onlineUsers = {};
const messages = [];

/* ======================
   SOCKET HANDLERS
====================== */
io.on("connection", socket => {

  /* ---------- LOGIN ONLY (PRIVATE BETA) ---------- */
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

    cb?.({
      ok: true,
      history: messages
    });
  });

  /* ---------- SIGNUP DISABLED ---------- */
  socket.on("signup", (_, cb) => {
    cb?.({
      ok: false,
      msg: "Signup is disabled (private beta)"
    });
  });

  /* ---------- CHAT MESSAGE ---------- */
  socket.on("chatMessage", (data, cb) => {
    if (!socket.username) return;
    if (!data?.type || !data?.content) return;

    const msg = {
      id: Date.now() + Math.random(),
      user: socket.username,
      type: data.type,       // text | image | video
      content: data.content, // text or base64
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
