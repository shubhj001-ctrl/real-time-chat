const loginScreen = document.getElementById("login-screen");
const app = document.getElementById("app");

const chatWelcome = document.getElementById("chat-welcome");
const messages = document.getElementById("messages");
const chatInput = document.getElementById("chat-input");
const chatTitle = document.getElementById("chat-title");

const loginBtn = document.getElementById("login-btn");
const sendBtn = document.getElementById("send-btn");
const messageInput = document.getElementById("message-input");

let currentChat = null;

/* LOGIN */
loginBtn.onclick = () => {
  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");
};

/* OPEN CHAT */
document.querySelectorAll(".chat-card").forEach(card => {
  card.onclick = () => {
    currentChat = card.dataset.user;
    chatTitle.innerText = currentChat;

    chatWelcome.classList.add("hidden");
    messages.classList.remove("hidden");
    chatInput.classList.remove("hidden");
  };
});

/* SEND MESSAGE */
sendBtn.onclick = () => {
  if (!messageInput.value) return;

  const msg = document.createElement("div");
  msg.className = "message";
  msg.innerText = messageInput.value;

  messages.appendChild(msg);
  messageInput.value = "";
  messages.scrollTop = messages.scrollHeight;
};

// ---- SESSION ----
const SESSION_KEY = "veyon_user";

// On page load
const savedUser = localStorage.getItem(SESSION_KEY);
if (savedUser) {
  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");
}

// On login
loginBtn.onclick = () => {
  const user = document.getElementById("username").value;
  if (!user) return;

  localStorage.setItem(SESSION_KEY, user);

  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");
};
