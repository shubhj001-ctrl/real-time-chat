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
   USERS (PRIVATE BETA)
====================== */
const defaultUsers = require("./defaultUsers");
const users = { ...defaultUsers };

/* ======================
   STATE
====================== */
const onlineUsers = {}; // socket.id -> username
const conversations = {}; // convoId -> messages[]

/* ======================
   HELPERS
====================== */
function getConvoId(u1, u2) {
  return [u1, u2].sort().join("__");
}

/* ======================
   SOCKET
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

    io.emit("onlineUsers", Object.values(onlineUsers));

    cb?.({ ok: true, users: Object.keys(users).filter(u => u !== username) });
  });

  /* ---------- LOAD CHAT ---------- */
  socket.on("loadChat", ({ withUser }, cb) => {
    if (!socket.username) return;

    const convoId = getConvoId(socket.username, withUser);
    conversations[convoId] ??= [];

    cb?.({ history: conversations[convoId] });
  });

  /* ---------- SEND MESSAGE ---------- */
  socket.on("privateMessage", ({ to, message }, cb) => {
    if (!socket.username || !users[to]) return;

    const convoId = getConvoId(socket.username, to);

    const msg = {
      id: Date.now() + Math.random(),
      from: socket.username,
      to,
      type: message.type,
      content: message.content,
      time: new Date().toISOString()
    };

    conversations[convoId] ??= [];
    conversations[convoId].push(msg);

    // Send to both users
    for (const [sid, user] of Object.entries(onlineUsers)) {
      if (user === socket.username || user === to) {
        io.to(sid).emit("privateMessage", msg);
      }
    }

    cb?.({ delivered: true });
  });

  /* ---------- DISCONNECT ---------- */
  socket.on("disconnect", () => {
    delete onlineUsers[socket.id];
    io.emit("onlineUsers", Object.values(onlineUsers));
  });
});

/* ======================
   START
====================== */
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log("Server running on", PORT);
});
