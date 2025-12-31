const socket = io();

/* ===== LOADING SCREEN ===== */
const loadingScreen = document.getElementById("loading-screen");
const loadingLogo = document.getElementById("loading-logo");
const loadingWord = document.getElementById("loading-word");
const typingBubble = document.getElementById("typing-bubble");



const brand = "Veyon";
let charIndex = 0;
let unreadCounts = JSON.parse(
  localStorage.getItem("veyon_unread") || "{}"
);


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

    renderUsers(res.users);
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
function renderUsers(users) {
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
  unreadCounts[user] = 0;
delete unreadCounts[user];
localStorage.setItem("veyon_unread", JSON.stringify(unreadCounts));
  currentChat = user;
  chatTitle.innerText = user;
  localStorage.setItem("veyon_last_chat", user);
  chatBox.innerHTML = "";
  typingBubble.classList.add("hidden");
typingBubble.classList.remove("show");
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

  socket.emit("sendMessage", {
    from: currentUser,
    to: currentChat,
    text,
    time: Date.now()
  });

  input.value = "";
}

/* RECEIVE MESSAGE */
socket.on("message", msg => {
  const isCurrentChat =
    currentChat === msg.from &&
    msg.to === currentUser;

  if (!isCurrentChat && msg.to === currentUser) {
    unreadCounts[msg.from] = (unreadCounts[msg.from] || 0) + 1;
    localStorage.setItem("veyon_unread", JSON.stringify(unreadCounts));
    renderUsers(
      Object.keys(unreadCounts)
        .concat(currentChat ? [currentChat] : [])
        .filter((v, i, a) => a.indexOf(v) === i)
        
    );
    renderUsers(
  Object.keys(unreadCounts)
    .concat([user])
    .filter((v, i, a) => a.indexOf(v) === i)
);

  }

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
  div.innerText = msg.text;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

let typingTimeout;

input.addEventListener("input", () => {
  if (!currentChat) return;

  socket.emit("typing", { to: currentChat });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping", { to: currentChat });
  }, 1200);
});
socket.on("typing", data => {
  if (!currentChat || !currentUser) return;

  if (data.from === currentChat && data.to === currentUser) {
    typingBubble.classList.remove("hidden");
    typingBubble.classList.add("show");

    chatBox.scrollTop = chatBox.scrollHeight;
  }
});

socket.on("stopTyping", data => {
  if (!currentChat || !currentUser) return;

  if (data.from === currentChat && data.to === currentUser) {
    typingBubble.classList.remove("show");
    setTimeout(() => {
      typingBubble.classList.add("hidden");
    }, 250);
  }
});

