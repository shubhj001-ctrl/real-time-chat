const socket = io();

/* ================= STATE ================= */
let currentUser = null;
let activeChatUser = null;
let replyContext = null;

/* ================= ELEMENTS ================= */
const authScreen = document.getElementById("auth-screen");
const chatScreen = document.getElementById("chat-screen");

const userInput = document.getElementById("auth-user");
const passInput = document.getElementById("auth-pass");
const loginBtn = document.getElementById("primary-btn");
const authMsg = document.getElementById("auth-msg");

const userList = document.getElementById("user-list");
const chatHeader = document.getElementById("chat-header");
const chatBox = document.getElementById("chat-box");

const chatForm = document.getElementById("chat-form");
const msgInput = document.getElementById("message");

const replyBar = document.getElementById("reply-bar");
const replyUser = document.getElementById("reply-user");
const replyText = document.getElementById("reply-text");
const cancelReply = document.getElementById("cancel-reply");

/* ================= LOCAL STORAGE ================= */
const LS_USER = "vibechat_user";
const LS_ACTIVE_CHAT = "vibechat_active_chat";

/* ================= AUTO LOGIN ON LOAD ================= */
document.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem(LS_USER);
  const savedChat = localStorage.getItem(LS_ACTIVE_CHAT);

  if (savedUser) {
    autoLogin(savedUser, savedChat);
  }
});

/* ================= LOGIN ================= */
loginBtn.onclick = () => {
  const username = userInput.value.trim();
  const password = passInput.value.trim();

  if (!username || !password) {
    authMsg.textContent = "Please enter credentials";
    return;
  }

  socket.emit("login", { username, password }, res => {
    if (!res.ok) {
      authMsg.textContent = res.msg;
      return;
    }

    currentUser = username;
    localStorage.setItem(LS_USER, username);

    showChatUI();
    renderUserList(res.users);
  });
};

/* ================= AUTO LOGIN ================= */
function autoLogin(username, savedChat) {
  socket.emit("login", { username, password: "jaggibaba" }, res => {
    if (!res.ok) {
      localStorage.clear();
      return;
    }

    currentUser = username;
    showChatUI();
    renderUserList(res.users);

    if (savedChat) {
      openChat(savedChat);
    }
  });
}

/* ================= UI HELPERS ================= */
function showChatUI() {
  authScreen.style.display = "none";
  chatScreen.classList.add("active");
}

/* ================= USERS ================= */
function renderUserList(users) {
  userList.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u;
    li.onclick = () => openChat(u);
    userList.appendChild(li);
  });
}

/* ================= OPEN CHAT ================= */
function openChat(user) {
  activeChatUser = user;
  localStorage.setItem(LS_ACTIVE_CHAT, user);

  chatHeader.textContent = user;
  chatBox.innerHTML = "";
  clearReply();

  socket.emit("loadChat", { withUser: user }, res => {
    res.history.forEach(addMessage);
  });
}

/* ================= SEND MESSAGE ================= */
chatForm.onsubmit = e => {
  e.preventDefault();
  if (!activeChatUser) return;

  const text = msgInput.value.trim();
  if (!text) return;

  socket.emit("privateMessage", {
    to: activeChatUser,
    message: {
      type: "text",
      content: text,
      replyTo: replyContext
    }
  });

  clearReply();
  msgInput.value = "";
};

/* ================= RECEIVE MESSAGE ================= */
socket.on("privateMessage", msg => {
  if (
    (msg.from === currentUser && msg.to === activeChatUser) ||
    (msg.from === activeChatUser && msg.to === currentUser)
  ) {
    addMessage(msg);
  }
});

/* ================= REPLY ================= */
cancelReply.onclick = clearReply;

function setReply(msg) {
  replyContext = {
    user: msg.from,
    content: msg.content
  };

  replyUser.textContent = msg.from === currentUser ? "Me" : msg.from;
  replyText.textContent = msg.content;
  replyBar.style.display = "flex";
}

function clearReply() {
  replyContext = null;
  replyBar.style.display = "none";
}

/* ================= RENDER MESSAGE ================= */
function addMessage(msg) {
  const isMe = msg.from === currentUser;

  const row = document.createElement("div");
  row.className = `message-row ${isMe ? "me" : "other"}`;

  let replyHtml = "";
  if (msg.replyTo) {
    const displayName =
      msg.replyTo.user === currentUser ? "Me" : msg.replyTo.user;

    replyHtml = `
      <div class="reply-preview">
        <strong>${displayName}</strong><br>
        ${msg.replyTo.content}
      </div>
    `;
  }

  row.innerHTML = `
    <div class="bubble ${isMe ? "me" : "other"}">
      ${replyHtml}
      <div>${msg.content}</div>
      <button class="reply-btn"></button>
    </div>
  `;

  row.querySelector(".reply-btn").onclick = () => setReply(msg);

  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
}
