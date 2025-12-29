/* ===============================
   ELEMENT REFERENCES
================================ */
const loginScreen = document.getElementById("login-screen");
const app = document.getElementById("app");

const chatWelcome = document.getElementById("chat-welcome");
const messages = document.getElementById("messages");
const chatInput = document.getElementById("chat-input");
const chatTitle = document.getElementById("chat-title");

const loginBtn = document.getElementById("login-btn");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const sendBtn = document.getElementById("send-btn");
const messageInput = document.getElementById("message-input");

/* ===============================
   STORAGE KEYS
================================ */
const USER_KEY = "veyon_user";
const CHAT_KEY = "veyon_active_chat";
const CHAT_STORE_KEY = "veyon_chats";

/* ===============================
   STATE
================================ */
let currentUser = null;
let currentChat = null;

/* ===============================
   STORAGE HELPERS
================================ */
function loadAllChats() {
  return JSON.parse(localStorage.getItem(CHAT_STORE_KEY)) || {};
}

function saveAllChats(data) {
  localStorage.setItem(CHAT_STORE_KEY, JSON.stringify(data));
}

function getChatHistory(user, peer) {
  const allChats = loadAllChats();
  if (!allChats[user]) return [];
  if (!allChats[user][peer]) return [];
  return allChats[user][peer];
}

function saveMessage(user, peer, message) {
  const allChats = loadAllChats();

  if (!allChats[user]) allChats[user] = {};
  if (!allChats[user][peer]) allChats[user][peer] = [];

  allChats[user][peer].push(message);
  saveAllChats(allChats);
}

/* ===============================
   VIEW HELPERS
================================ */
function showLogin() {
  loginScreen.classList.remove("hidden");
  app.classList.add("hidden");
}

function showApp() {
  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");
}

function showChatWelcome() {
  chatWelcome.classList.remove("hidden");
  messages.classList.add("hidden");
  chatInput.classList.add("hidden");
  chatTitle.innerText = "Welcome";
}

function showChatUI() {
  chatWelcome.classList.add("hidden");
  messages.classList.remove("hidden");
  chatInput.classList.remove("hidden");
}

/* ===============================
   CHAT LOGIC
================================ */
function openChat(username) {
  currentChat = username;
  localStorage.setItem(CHAT_KEY, username);

  chatTitle.innerText = username;
  showChatUI();

  renderChatHistory();
}

/* ===============================
   RENDER MESSAGES
================================ */
function renderChatHistory() {
  messages.innerHTML = "";

  const history = getChatHistory(currentUser, currentChat);

  history.forEach(msg => {
    const div = document.createElement("div");
    div.className = "message";
    div.innerText = msg.text;
    messages.appendChild(div);
  });

  messages.scrollTop = messages.scrollHeight;
}

/* ===============================
   LOGIN HANDLING
================================ */
loginBtn.onclick = () => {
  const user = usernameInput.value.trim();
  const pass = passwordInput.value.trim();

  if (!user || !pass) {
    alert("Please enter username and password");
    return;
  }

  currentUser = user;
  localStorage.setItem(USER_KEY, user);

  showApp();
  showChatWelcome();
};

/* ===============================
   MESSAGE SENDING
================================ */
sendBtn.onclick = () => {
  const text = messageInput.value.trim();
  if (!text || !currentChat) return;

  const message = {
    from: currentUser,
    text,
    time: Date.now()
  };

  saveMessage(currentUser, currentChat, message);
  saveMessage(currentChat, currentUser, message); // mirror for other user

  messageInput.value = "";
  renderChatHistory();
};

/* ===============================
   CHAT LIST CLICK
================================ */
document.querySelectorAll(".chat-card").forEach(card => {
  card.onclick = () => {
    openChat(card.dataset.user);
  };
});

/* ===============================
   APP INIT (ON PAGE LOAD)
================================ */
(function initApp() {
  const savedUser = localStorage.getItem(USER_KEY);
  const savedChat = localStorage.getItem(CHAT_KEY);

  if (!savedUser) {
    showLogin();
    return;
  }

  currentUser = savedUser;
  showApp();

  if (savedChat) {
    openChat(savedChat);
  } else {
    showChatWelcome();
  }
})();
