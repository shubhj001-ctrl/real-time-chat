const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

// Serve frontend files
app.use(express.static("public"));

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("User connected");

  // Receive message and send to everyone
  socket.on("chatMessage", (msg) => {
    io.emit("chatMessage", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Use Render / cloud provided port OR fallback to 3000
const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
