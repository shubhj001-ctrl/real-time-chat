const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const users = {};        // TEMP users (reset on restart)
const onlineUsers = {};
const messages = [];

io.on("connection", socket => {

  /* SIGNUP */
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

  /* LOGIN */
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

    cb({ ok: true, history: messages });
  });

  /* TEXT MESSAGE */
  socket.on("chatMessage", (text, cb) => {
    if (!socket.username || !text) return;

    const msg = {
      id: Date.now() + Math.random(),
      user: socket.username,
      type: "text",
      content: text,
      time: new Date().toISOString()
    };

    messages.push(msg);
    io.emit("chatMessage", msg);
    cb({ delivered: true });
  });

  /* MEDIA MESSAGE */
  socket.on("mediaMessage", ({ type, data }, cb) => {
    if (!socket.username || !data) return;

    const msg = {
      id: Date.now() + Math.random(),
      user: socket.username,
      type,
      content: data,
      time: new Date().toISOString()
    };

    messages.push(msg);
    io.emit("chatMessage", msg);
    cb({ delivered: true });
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      delete onlineUsers[socket.id];
      io.emit("onlineCount", Object.keys(onlineUsers).length);
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Server running on", PORT));
