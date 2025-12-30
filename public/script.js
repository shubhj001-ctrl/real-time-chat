const socket = io();

let currentUser = localStorage.getItem("user");
let currentChat = null;
let replyTo = null;
let onlineUsers = new Set();
let presenceReady = false;

/* ELEMENTS */
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const userList = document.getElementById("user-list");
const chatBox = document.getElementById("chat-box");
const chatTitle = document.getElementById("chat-title");
const statusDot = document.getElementById("chat-status-dot");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const backBtn = document.getElementById("mobile-back-btn");

const replyPreview = document.getElementById("reply-preview");
const replyUser = document.getElementById("reply-user");
const replyText = document.getElementById("reply-text");
const cancelReply = document.getElementById("cancel-reply");

/* INIT */
loginView.style.display = "none";
appView.style.display = "none";

if (currentUser) {
  appView.style.display = "flex";
  socket.emit(
    "login",
    { username: currentUser, password: "jaggibaba" },
    res => {
      if (!res?.ok) logout();
      else renderUsers(res.users);
    }
  );
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

/* PRESENCE */
socket.on("presence", users => {
  onlineUsers = new Set(users);
  presenceReady = true;
  updateUserListPresence();
  updateStatusDot();
});

/* USERS */
function renderUsers(users) {
  userList.innerHTML = "";

  users.forEach(u => {
    const li = document.createElement("li");
    li.dataset.user = u;
    li.innerText = u;
    li.onclick = () => openChat(u);
    userList.appendChild(li);
  });

  updateUserListPresence();
}

function updateUserListPresence() {
  if (!presenceReady) return;

  document.querySelectorAll("#user-list li").forEach(li => {
    li.style.opacity = onlineUsers.has(li.dataset.user) ? "1" : "0.4";
  });
}

function updateStatusDot() {
  if (!currentChat || !presenceReady) {
    statusDot.classList.remove("online");
    return;
  }
  onlineUsers.has(currentChat)
    ? statusDot.classList.add("online")
    : statusDot.classList.remove("online");
}

/* MOBILE BACK */
backBtn.onclick = () => {
  appView.classList.remove("mobile-chat-open");
  currentChat = null;
  chatTitle.innerText = "Select a chat";
  statusDot.classList.remove("online");
  appView.classList.remove("chat-active");

};

/* CHAT */
function openChat(user) {
  currentChat = user;
  chatTitle.innerText = user;
  chatBox.innerHTML = "";
  clearReply();
  updateStatusDot();
appView.classList.add("chat-active");
appView.classList.add("chat-active");


  if (window.innerWidth <= 768) {
    appView.classList.add("mobile-chat-open");
  }

  socket.emit("loadMessages", { withUser: user }, msgs => {
    msgs.forEach(renderMessage);
  });
}

/* SEND */
sendBtn.onclick = sendMessage;
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentChat) return;

  const msg = {
    id: Date.now(),
    from: currentUser,
    to: currentChat,
    text,
    time: Date.now(),
    replyTo
  };

  messageInput.value = "";
  clearReply();
  socket.emit("sendMessage", msg);
}

/* RECEIVE */
socket.on("message", msg => {
  if (!currentChat) return;

  const relevant =
    (msg.from === currentChat && msg.to === currentUser) ||
    (msg.from === currentUser && msg.to === currentChat);

  if (relevant) renderMessage(msg);
});

/* RENDER MESSAGE */
function renderMessage(msg) {
  const wrap = document.createElement("div");
  wrap.className = msg.from === currentUser ? "msg-wrapper me" : "msg-wrapper";
  wrap.dataset.msgId = msg.id || msg.time;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";

  if (msg.replyTo) {
    const r = document.createElement("div");
    r.className = "reply-box";
    r.innerText =
      (msg.replyTo.user === currentUser ? "Me" : msg.replyTo.user) +
      ": " +
      msg.replyTo.text;

    r.onclick = () => jumpToMessage(msg.replyTo.id);
    bubble.appendChild(r);
  }

  const textNode = document.createElement("div");
  textNode.innerText = msg.text;
  bubble.appendChild(textNode);

  const time = document.createElement("div");
  time.className = "msg-time";
  time.innerText = new Date(msg.time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
  bubble.appendChild(time);

  bubble.onclick = () =>
    setReply({
      user: msg.from,
      text: msg.text,
      id: msg.id || msg.time
    });

  wrap.appendChild(bubble);
  chatBox.appendChild(wrap);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* JUMP TO ORIGINAL */
function jumpToMessage(id) {
  const target = document.querySelector(`[data-msg-id="${id}"]`);
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("highlight");

  setTimeout(() => target.classList.remove("highlight"), 1200);
}

/* REPLY */
function setReply(msg) {
  replyTo = msg;
  replyUser.innerText = msg.user === currentUser ? "Me" : msg.user;
  replyText.innerText = msg.text;
  replyPreview.classList.remove("hidden");

  // 🔥 UX enhancement: focus input immediately
  messageInput.focus();
}


cancelReply.onclick = clearReply;

function clearReply() {
  replyTo = null;
  replyPreview.classList.add("hidden");
}

/* LOGOUT */
function logout() {
  localStorage.removeItem("user");
  location.reload();
}
