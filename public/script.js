const socket = io();

/* ELEMENTS */
const loginScreen = document.getElementById("login-screen");
const app = document.getElementById("app");
const loginBtn = document.getElementById("login-btn");
const loginMsg = document.getElementById("login-msg");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const userList = document.getElementById("user-list");
const chatTitle = document.getElementById("chat-title");
const chatWelcome = document.getElementById("chat-welcome");
const messages = document.getElementById("messages");

const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");

/* STORAGE KEYS */
const USER_KEY = "veyon_user";
const CHAT_KEY = "veyon_active_chat";

/* STATE */
let currentUser = null;
let currentChat = null;

/* ---------------- LOGIN ---------------- */
loginBtn.onclick = login;

function login() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    loginMsg.innerText = "Enter credentials";
    return;
  }

  socket.emit("login", { username, password }, res => {
    if (!res.ok) {
      loginMsg.innerText = res.msg;
      return;
    }

    currentUser = username;
    localStorage.setItem(USER_KEY, username);

    loginScreen.classList.add("hidden");
    app.classList.remove("hidden");

    renderUsers(res.users);
    showWelcome();
  });
}

/* ---------------- AUTO LOGIN (REFRESH FIX) ---------------- */
socket.on("connect", () => {
  const savedUser = localStorage.getItem(USER_KEY);
  if (!savedUser) return;

  socket.emit(
    "login",
    { username: savedUser, password: "jaggibaba" },
    res => {
      if (!res.ok) return;

      currentUser = savedUser;
      loginScreen.classList.add("hidden");
      app.classList.remove("hidden");

      renderUsers(res.users);

      const savedChat = localStorage.getItem(CHAT_KEY);
      if (savedChat) {
        openChat(savedChat);
      } else {
        showWelcome();
      }
    }
  );
});

/* ---------------- USERS ---------------- */
function renderUsers(users) {
  userList.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.innerText = u;
    li.onclick = () => openChat(u);
    userList.appendChild(li);
  });
}

/* ---------------- CHAT ---------------- */
function openChat(user) {
  currentChat = user;
  localStorage.setItem(CHAT_KEY, user);

  chatTitle.innerText = user;
  showChatUI();

  socket.emit("loadChat", { withUser: user }, res => {
    messages.innerHTML = "";
    res.history.forEach(addMessage);
  });
}

/* ---------------- SEND (ENTER KEY FIX) ---------------- */
chatForm.addEventListener("submit", e => {
  e.preventDefault();

  if (!messageInput.value || !currentChat) return;

  socket.emit("sendMessage", {
    to: currentChat,
    text: messageInput.value
  });

  messageInput.value = "";
});

/* ---------------- RECEIVE ---------------- */
socket.on("message", msg => {
  if (
    (msg.from === currentUser && msg.to === currentChat) ||
    (msg.from === currentChat && msg.to === currentUser)
  ) {
    addMessage(msg);
  }
});

/* ---------------- UI HELPERS ---------------- */
function addMessage(msg) {
  const div = document.createElement("div");
  div.className = "message";
  div.innerText = `${msg.from}: ${msg.text}`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function showWelcome() {
  chatWelcome.classList.remove("hidden");
  messages.classList.add("hidden");
  chatForm.classList.add("hidden");
}

function showChatUI() {
  chatWelcome.classList.add("hidden");
  messages.classList.remove("hidden");
  chatForm.classList.remove("hidden");
}
