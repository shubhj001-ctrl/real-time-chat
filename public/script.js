const socket = io();

/* ===== LOADING SCREEN ===== */
const loadingScreen = document.getElementById("loading-screen");
const loadingLogo = document.getElementById("loading-logo");
const loadingWord = document.getElementById("loading-word");
const typingBubble = document.getElementById("typing-bubble");
const chatFooter = document.getElementById("chat-footer");


let replyTarget = null;

const replyPreview = document.getElementById("reply-preview");
const replyUser = document.getElementById("reply-user");
const replyText = document.getElementById("reply-text");
const cancelReplyBtn = document.getElementById("cancel-reply");

cancelReplyBtn.onclick = () => {
  replyTarget = null;
  replyPreview.classList.add("hidden");
};


const brand = "Veyon";
let charIndex = 0;
let unreadCounts = JSON.parse(
  localStorage.getItem("veyon_unread") || "{}"
);
let allUsers = [];



/* Smooth letter-by-letter typing */
function startTyping() {
  charIndex = 0;
  loadingLogo.textContent = "";
  loadingWord.textContent = "";

  const typing = setInterval(() => {
    if (charIndex < brand.length) {
      loadingLogo.textContent += brand[charIndex];
      loadingWord.textContent += brand[charIndex];
      charIndex++;
    } else {
      clearInterval(typing);
    }
  }, 220); // smooth human-like typing
}

startTyping();
let loadingDone = false;

/* Force loader to end after max time */
const MAX_LOADING_TIME = 3200; // 3.2 seconds

setTimeout(() => {
  if (!loadingDone) {
    endLoading();
  }
}, MAX_LOADING_TIME);

function endLoading() {
  loadingDone = true;
  loadingScreen.classList.add("fade-out");
  setTimeout(() => {
    loadingScreen.style.display = "none";
  }, 600);
}



/* LOGIN ELEMENTS */
const loginScreen = document.getElementById("login-screen");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");
const usernameInput = document.getElementById("login-username");
const passwordInput = document.getElementById("login-password");

/* APP ELEMENTS */
const app = document.getElementById("app");
const logoutBtn = document.getElementById("logout-btn");
const userList = document.getElementById("user-list");
const chatBox = document.getElementById("chat-box");
const chatTitle = document.getElementById("chat-title");
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

/* STATE */
let currentUser = null;
let currentChat = null;

/* ===== AUTO LOGIN ON REFRESH ===== */
const savedUser = localStorage.getItem("veyon_user");
const savedPass = localStorage.getItem("veyon_pass");

if (savedUser && savedPass) {
  attemptLogin(savedUser, savedPass, true);
} else {
  setTimeout(() => {
    endLoading();
    loginScreen.classList.remove("hidden");
  }, 2800);
}

/* LOGIN CLICK */
loginBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  loginError.classList.add("hidden");

  if (!username || !password) {
    loginError.textContent = "Username and password are required.";
    loginError.classList.remove("hidden");
    return;
  }

  attemptLogin(username, password, false);
});

/* LOGIN FUNCTION */
function attemptLogin(username, password, silent) {
  socket.emit("login", { username, password }, res => {
    if (!res || !res.ok) {
      if (!silent) {
        loginError.textContent = "You don’t have access to this portal.";
        loginError.classList.remove("hidden");
      }
     localStorage.clear();
     currentChat = null;
chatFooter.classList.add("hidden");

endLoading();
loginScreen.classList.remove("hidden");
return;

    }

    currentUser = username;

    localStorage.setItem("veyon_user", username);
    localStorage.setItem("veyon_pass", password);

    endLoading();
    loginScreen.classList.add("hidden");
    app.classList.remove("hidden");

    allUsers = res.users;
renderUsers(allUsers);
    const lastChat = localStorage.getItem("veyon_last_chat");
if (lastChat) {
  setTimeout(() => {
    openChat(lastChat);
  }, 300); // wait for UI to render
}

  });
}

/* LOGOUT */
logoutBtn.onclick = () => {
  localStorage.removeItem("veyon_user");
  localStorage.removeItem("veyon_pass");
  localStorage.removeItem("veyon_last_chat");
  location.reload();
};

/* USERS */
function renderUsers(users=allUsers) {
  userList.innerHTML = "";

  users.forEach(u => {
    const div = document.createElement("div");
    div.className = "user-card";

    const name = document.createElement("span");
    name.textContent = u;

    const badge = document.createElement("span");
    badge.className = "unread-badge";

    if (unreadCounts[u]) {
     badge.textContent = unreadCounts[u] > 9 ? "9+" : unreadCounts[u];
      badge.classList.add("show");
    }

    div.appendChild(name);
    div.appendChild(badge);

    div.onclick = () => openChat(u);

    userList.appendChild(div);
  });
}

/* OPEN CHAT */
function openChat(user) {
  
  // 1️⃣ Set current chat FIRST
  currentChat = user;
  chatFooter.classList.remove("hidden");

  // 2️⃣ Clear unread count IMMEDIATELY
  if (unreadCounts[user]) {
    delete unreadCounts[user];
    localStorage.setItem("veyon_unread", JSON.stringify(unreadCounts));
  }

if (unreadCounts[user]) {
  delete unreadCounts[user];
  localStorage.setItem("veyon_unread", JSON.stringify(unreadCounts));
}

renderUsers(allUsers);

  // 4️⃣ Reset typing bubble (safety)
  typingBubble.classList.add("hidden");
  typingBubble.classList.remove("show");

  // 5️⃣ Load chat messages
  chatTitle.innerText = user;
  chatBox.innerHTML = "";

  socket.emit("loadMessages", { withUser: user }, msgs => {
    msgs.forEach(renderMessage);
  });
}


/* SEND MESSAGE */
sendBtn.onclick = sendMessage;
input.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  if (!currentChat) return;

  const text = input.value.trim();
  if (!text) return;

  const msg = {
    id: "msg_" + Date.now(),
    from: currentUser,
    to: currentChat,
    text,
    time: Date.now(),
    replyTo: replyTarget
      ? {
          id: replyTarget.id,
          text: replyTarget.text,
          from: replyTarget.from
        }
      : null
  };

  socket.emit("sendMessage", msg);

  replyTarget = null;
  replyPreview.classList.add("hidden");
  input.value = "";
}


/* RECEIVE MESSAGE */
socket.on("message", msg => {
  const isIncoming = msg.to === currentUser;
  const isCurrentChat = msg.from === currentChat;

  // 🔔 Increment unread ONLY if chat is NOT open
  if (isIncoming && !isCurrentChat) {
    unreadCounts[msg.from] = (unreadCounts[msg.from] || 0) + 1;
    localStorage.setItem("veyon_unread", JSON.stringify(unreadCounts));

    renderUsers(
      Object.keys(unreadCounts)
        .concat(currentChat ? [currentChat] : [])
        .filter((v, i, a) => a.indexOf(v) === i)
    );
  }

  // 💬 Render message only if it belongs to open chat
  if (
    (msg.from === currentChat && msg.to === currentUser) ||
    (msg.from === currentUser && msg.to === currentChat)
  ) {
    renderMessage(msg);
  }
});

/* RENDER MESSAGE */
function renderMessage(msg) {
  const div = document.createElement("div");
  div.className = "message" + (msg.from === currentUser ? " me" : "");
  div.dataset.id = msg.id;

  // Reply preview inside message
  if (msg.replyTo) {
    const replyBox = document.createElement("div");
    replyBox.className = "reply-inside";
    replyBox.innerHTML = `
      <strong>${msg.replyTo.from}</strong>
      <span>${msg.replyTo.text}</span>
    `;

    replyBox.onclick = () => jumpToMessage(msg.replyTo.id);
    div.appendChild(replyBox);
  }

  const text = document.createElement("div");
  text.textContent = msg.text;
  div.appendChild(text);

  // Click to reply
  div.onclick = () => {
    replyTarget = msg;
    replyUser.textContent = msg.from;
    replyText.textContent = msg.text;
    replyPreview.classList.remove("hidden");
    input.focus();
  };

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}


socket.on("stopTyping", data => {
  if (!currentChat || !currentUser) return;

  if (data.from === currentChat && data.to === currentUser) {
    typingBubble.classList.remove("show");
    setTimeout(() => {
      typingBubble.classList.add("hidden");
    }, 250);
  }
});

function jumpToMessage(id) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  el.classList.add("highlight");
  setTimeout(() => el.classList.remove("highlight"), 1200);
}

