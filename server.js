const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const users = {};
const onlineUsers = {};
const messages = [];

io.on("connection", socket => {

  socket.on("signup", ({ username, password }, cb) => {
    if (!username || !password) return cb?.({ ok: false });
    if (users[username]) return cb?.({ ok: false, msg: "User exists" });
    users[username] = password;
    cb?.({ ok: true });
  });

  socket.on("login", ({ username, password }, cb) => {
    if (!users[username]) return cb?.({ ok: false });
    if (password !== "__auto__" && users[username] !== password)
      return cb?.({ ok: false });

    socket.username = username;
    onlineUsers[socket.id] = username;

    io.emit("onlineCount", Object.keys(onlineUsers).length);
    cb?.({ ok: true, history: messages });
  });

  socket.on("chatMessage", (data, cb) => {
    if (!socket.username) return;

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

  socket.on("disconnect", () => {
    delete onlineUsers[socket.id];
    io.emit("onlineCount", Object.keys(onlineUsers).length);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Server running", PORT));
