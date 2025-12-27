const socket = io();

const usernameScreen = document.getElementById("username-screen");
const chatScreen = document.getElementById("chat-screen");

const usernameForm = document.getElementById("username-form");
const usernameInput = document.getElementById("username-input");

const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message");
const chatBox = document.getElementById("chat-box");

let username = "";
let joined = false;

// Join chat
usernameForm.addEventListener("submit", (e) => {
  e.preventDefault();

  username = usernameInput.value.trim();
  if (!username) return;

  socket.emit("join", username);
  joined = true;

  usernameScreen.classList.remove("active");
  chatScreen.classList.add("active");

  // Auto focus input (important for mobile)
  setTimeout(() => {
    messageInput.focus();
  }, 300);
});

// Send message
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // HARD GUARD
  if (!joined) {
    alert("Enter a vibe name first ✨");
    return;
  }

  if (!messageInput.value.trim()) return;

  socket.emit("chatMessage", messageInput.value);
  messageInput.value = "";
});

// Receive message
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

// System messages
socket.on("systemMessage", (msg) => {
  if (!msg) return;

  const div = document.createElement("div");
  div.className = "system";
  div.textContent = msg;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
});
