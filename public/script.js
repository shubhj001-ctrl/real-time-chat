const socket = io({
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});

/* ======================
   STATE
====================== */
let currentUser = "";
let activeChatUser = null;
let isUploading = false;
let replyContext = null;

/* ======================
   AUTH ELEMENTS
====================== */
const authScreen = document.getElementById("auth-screen");
const chatScreen = document.getElementById("chat-screen");
const authMsg = document.getElementById("auth-msg");
const userInput = document.getElementById("auth-user");
const passInput = document.getElementById("auth-pass");
const loginBtn = document.getElementById("primary-btn");

/* ======================
   CHAT ELEMENTS
====================== */
const userList = document.getElementById("user-list");
const chatHeader = document.getElementById("chat-header");
const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const msgInput = document.getElementById("message");
const fileInput = document.getElementById("file-input");

/* ======================
   REPLY UI
====================== */
const replyBar = document.getElementById("reply-bar");
const replyUser = document.getElementById("reply-user");
const replyText = document.getElementById("reply-text");
const cancelReply = document.getElementById("cancel-reply");

/* ======================
   LOGIN
====================== */
loginBtn.onclick = () => {
  const username = userInput.value.trim();
  const password = passInput.value.trim();

  if (!username || !password) {
    authMsg.textContent = "⚠️ Enter username & password";
    authMsg.style.color = "orange";
    return;
  }

  socket.emit("login", { username, password }, res => {
    if (!res?.ok) {
      authMsg.textContent = res.msg || "Login failed";
      authMsg.style.color = "red";
      return;
    }

    currentUser = username;
    authScreen.style.display = "none";
    chatScreen.classList.add("active");

    renderUserList(res.users);
  });
};

/* ======================
   USER LIST
====================== */
function renderUserList(users) {
  userList.innerHTML = "";
  users.forEach(user => {
    const li = document.createElement("li");
    li.textContent = user;
    li.onclick = () => openChat(user);
    userList.appendChild(li);
  });
}

/* ======================
   OPEN PRIVATE CHAT
====================== */
function openChat(user) {
  activeChatUser = user;
  chatHeader.textContent = `Chat with ${user}`;
  chatBox.innerHTML = "";
  clearReply();

  socket.emit("loadChat", { withUser: user }, res => {
    res.history.forEach(addMessage);
  });
}

/* ======================
   SEND TEXT MESSAGE
====================== */
chatForm.onsubmit = e => {
  e.preventDefault();
  if (!activeChatUser || isUploading) return;

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

/* ======================
   SEND MEDIA
====================== */
fileInput.onchange = () => {
  if (!activeChatUser) return;

  const file = fileInput.files[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  if (!isImage && !isVideo) {
    alert("Unsupported file type");
    return;
  }

  const maxSize = isImage ? 2 * 1024 * 1024 : 4 * 1024 * 1024;
  if (file.size > maxSize) {
    alert(isImage ? "Image max 2MB" : "Video max 4MB");
    return;
  }

  isUploading = true;
  msgInput.disabled = true;

  const reader = new FileReader();
  reader.onload = () => {
    socket.emit("privateMessage", {
      to: activeChatUser,
      message: {
        type: isImage ? "image" : "video",
        content: reader.result,
        replyTo: replyContext
      }
    });

    isUploading = false;
    msgInput.disabled = false;
    clearReply();
  };

  reader.readAsDataURL(file);
  fileInput.value = "";
};

/* ======================
   RECEIVE PRIVATE MESSAGE
====================== */
socket.on("privateMessage", msg => {
  if (
    (msg.from === currentUser && msg.to === activeChatUser) ||
    (msg.from === activeChatUser && msg.to === currentUser)
  ) {
    addMessage(msg);
  }
});

/* ======================
   REPLY HANDLING
====================== */
cancelReply.onclick = clearReply;

function setReply(msg) {
  replyContext = {
    user: msg.from,
    type: msg.type,
    content: msg.content
  };

  replyUser.textContent = msg.from;
  replyText.textContent =
    msg.type === "text" ? msg.content : msg.type.toUpperCase();

  replyBar.style.display = "flex";
}

function clearReply() {
  replyContext = null;
  replyBar.style.display = "none";
}

/* ======================
   RENDER MESSAGE
====================== */
function addMessage(msg) {
  const isMe = msg.from === currentUser;
  const row = document.createElement("div");
  row.className = `message-row ${isMe ? "me" : "other"}`;

  let content = "";
  if (msg.type === "text") {
    content = `<div class="text">${msg.content}</div>`;
  } else if (msg.type === "image") {
    content = `<img src="${msg.content}" />`;
  } else if (msg.type === "video") {
    content = `<video src="${msg.content}" controls></video>`;
  }

  let replyHtml = "";
  if (msg.replyTo) {
    replyHtml = `
      <div class="reply-preview">
        <strong>${msg.replyTo.user}</strong><br/>
        <span>${
          msg.replyTo.type === "text"
            ? msg.replyTo.content
            : msg.replyTo.type.toUpperCase()
        }</span>
      </div>
    `;
  }

  row.innerHTML = `
    <div class="bubble ${isMe ? "me" : "other"}">
      ${replyHtml}
      ${content}
      <div class="meta">
        ${new Date(msg.time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })}
      </div>
      <button class="reply-btn">↩️</button>
    </div>
  `;

  row.querySelector(".reply-btn").onclick = () => setReply(msg);

  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
}
