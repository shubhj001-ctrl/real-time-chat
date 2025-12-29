const socket = io();

/* ===== STATE ===== */
let currentUser = "";
let activeChatUser = null;
let replyContext = null;

/* ===== ELEMENTS ===== */
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

/* ===== LOGIN ===== */
loginBtn.onclick = () => {
  socket.emit(
    "login",
    {
      username: userInput.value.trim(),
      password: passInput.value.trim()
    },
    res => {
      if (!res.ok) {
        authMsg.textContent = res.msg;
        return;
      }

      currentUser = userInput.value.trim();
      authScreen.style.display = "none";
      chatScreen.classList.add("active");
      renderUserList(res.users);
    }
  );
};

/* ===== USERS ===== */
function renderUserList(users) {
  userList.innerHTML = "";
  users.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u;
    li.onclick = () => openChat(u);
    userList.appendChild(li);
  });
}

/* ===== OPEN CHAT ===== */
function openChat(user) {
  activeChatUser = user;
  chatHeader.textContent = user;
  chatBox.innerHTML = "";
  clearReply();

  socket.emit("loadChat", { withUser: user }, res => {
    res.history.forEach(addMessage);
  });
}

/* ===== SEND ===== */
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

/* ===== RECEIVE ===== */
socket.on("privateMessage", msg => {
  if (
    (msg.from === currentUser && msg.to === activeChatUser) ||
    (msg.from === activeChatUser && msg.to === currentUser)
  ) {
    if (!msg.replyTo && msg.message?.replyTo) {
      msg.replyTo = msg.message.replyTo;
    }
    addMessage(msg);
  }
});

/* ===== REPLY ===== */
cancelReply.onclick = clearReply;

function setReply(msg) {
  replyContext = {
    user: msg.from,
    content: msg.content
  };

  replyUser.textContent = msg.from;
  replyText.textContent = msg.content;
  replyBar.style.display = "flex";
}

function clearReply() {
  replyContext = null;
  replyBar.style.display = "none";
}

/* ===== RENDER ===== */
function addMessage(msg) {
  const isMe = msg.from === currentUser;

  const row = document.createElement("div");
  row.className = `message-row ${isMe ? "me" : "other"}`;

  let replyHtml = "";
  if (msg.replyTo) {
    replyHtml = `
      <div class="reply-preview">
        <strong>${msg.replyTo.user}</strong><br>
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
