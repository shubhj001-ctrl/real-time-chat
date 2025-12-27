const socket = io({ autoConnect: true });

const usernameScreen = document.getElementById("username-screen");
const chatScreen = document.getElementById("chat-screen");

const usernameForm = document.getElementById("username-form");
const usernameInput = document.getElementById("username-input");

const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message");
const chatBox = document.getElementById("chat-box");
const leaveBtn = document.getElementById("leave-btn");

let username = localStorage.getItem("vibe-username") || "";
let joined = false;

/* ---------- AUTO REJOIN ON RECONNECT ---------- */
socket.on("connect", () => {
  if (username) {
    socket.emit("join", username);
    joined = true;

    usernameScreen.classList.remove("active");
    chatScreen.classList.add("active");
  }
});

/* ---------- JOIN ---------- */
usernameForm.addEventListener("submit", (e) => {
  e.preventDefault();

  username = usernameInput.value.trim();
  if (!username) return;

  localStorage.setItem("vibe-username", username);
  socket.emit("join", username);
  joined = true;

  usernameScreen.classList.remove("active");
  chatScreen.classList.add("active");

  setTimeout(() => messageInput.focus(), 300);
});

/* ---------- SEND MESSAGE ---------- */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!joined || !socket.connected) {
    alert("Reconnecting… please try again ✨");
    return;
  }

  if (!messageInput.value.trim()) return;

  socket.emit("chatMessage", messageInput.value);
  messageInput.value = "";
});

/* ---------- RECEIVE MESSAGE ---------- */
socket.on("chatMessage", (data) => {
  if (!data || !data.user) return;

  const div = document.createElement("div");
  div.classList.add("message");

  if (data.user === username) {
    div.classList.add("me");
    div.textContent = data.text;
  } else {
    div.classList.add("other");
    div.textContent = `${data.user}: ${data.text}`;
  }

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
});

/* ---------- SYSTEM ---------- */
socket.on("systemMessage", (msg) => {
  const div = document.createElement("div");
  div.className = "system";
  div.textContent = msg;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
});

/* ---------- LEAVE CHAT ---------- */
leaveBtn.addEventListener("click", () => {
  localStorage.removeItem("vibe-username");
  joined = false;
  username = "";

  socket.disconnect();
  socket.connect();

  chatBox.innerHTML = "";

  chatScreen.classList.remove("active");
  usernameScreen.classList.add("active");
});
