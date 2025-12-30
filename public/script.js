const socket = io();

let currentUser = localStorage.getItem("user");
let currentChat = null;

/* ELEMENTS */
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const userList = document.getElementById("user-list");
const chatBox = document.getElementById("chat-box");
const chatTitle = document.getElementById("chat-title");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const backBtn = document.getElementById("mobile-back-btn");
const welcomeScreen = document.getElementById("welcome-screen");

/* INIT */
loginView.style.display = "none";
appView.style.display = "none";

if (currentUser) {
  appView.style.display = "flex";
  socket.emit("login", { username: currentUser, password: "jaggibaba" }, res => {
    if (!res?.ok) logout();
    else renderUsers(res.users);
  });
} else {
  loginView.style.display = "flex";
}

/* LOGIN */
document.getElementById("login-btn").onclick = () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!username || !password) return;

  socket.emit("login", { username, password }, res => {
    if (!res.ok) return alert("Invalid login");

    currentUser = username;
    localStorage.setItem("user", username);

    loginView.style.display = "none";
    appView.style.display = "flex";
    renderUsers(res.users);
  });
};

/* USERS */
function renderUsers(users) {
  userList.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.innerText = u;
    li.onclick = () => openChat(u);
    userList.appendChild(li);
  });
}

/* OPEN CHAT */
function openChat(user) {
  currentChat = user;
  chatTitle.innerText = user;
  chatBox.innerHTML = "";

  // 🔥 HARD ENTER CHAT MODE
  welcomeScreen.classList.add("hidden");
  appView.classList.add("chat-active");

  if (window.innerWidth <= 768) {
    appView.classList.add("mobile-chat-open");
  }

  socket.emit("loadMessages", { withUser: user }, msgs => {
    msgs.forEach(renderMessage);
  });
}

/* BACK (MOBILE) */
backBtn.onclick = () => {
  appView.classList.remove("mobile-chat-open");
  appView.classList.remove("chat-active");

  welcomeScreen.classList.remove("hidden");
  currentChat = null;
  chatTitle.innerText = "Select a chat";
  chatBox.innerHTML = "";
};

/* SEND */
sendBtn.onclick = sendMessage;
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  if (!currentChat) return;

  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit("sendMessage", {
    from: currentUser,
    to: currentChat,
    text,
    time: Date.now()
  });

  messageInput.value = "";
}

/* RECEIVE */
socket.on("message", msg => {
  if (
    (msg.from === currentChat && msg.to === currentUser) ||
    (msg.from === currentUser && msg.to === currentChat)
  ) {
    renderMessage(msg);
  }
});

/* RENDER MESSAGE */
function renderMessage(msg) {
  const wrap = document.createElement("div");
  wrap.className = msg.from === currentUser ? "msg-wrapper me" : "msg-wrapper";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.innerText = msg.text;

  const time = document.createElement("div");
  time.className = "msg-time";
  time.innerText = new Date(msg.time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  bubble.appendChild(time);
  wrap.appendChild(bubble);
  chatBox.appendChild(wrap);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* LOGOUT */
function logout() {
  localStorage.removeItem("user");
  location.reload();
}
