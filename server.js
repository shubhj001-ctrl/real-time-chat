const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const userSockets = new Map();
const USERS = require("./defaultUsers");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let onlineUsers = new Set();
let messages = {};

function chatKey(a, b) {
  return [a, b].sort().join("|");
}

io.on("connection", socket => {
  console.log("🔌 New socket connected:", socket.id);

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


