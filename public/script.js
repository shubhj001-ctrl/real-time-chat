const socket = io();

let currentUser = localStorage.getItem("user");
let currentChat = null;
let onlineSet = new Set();

const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const userList = document.getElementById("user-list");
const chatBox = document.getElementById("chat-box");
const chatTitle = document.getElementById("chat-title");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

/* ---------------------------
   INITIAL STATE
---------------------------- */
loginView.style.display = "none";
appView.style.display = "none";

/* ---------------------------
   AUTO LOGIN (REFRESH SAFE)
---------------------------- */
if (currentUser) {
  appView.style.display = "flex";

  socket.emit(
    "login",
    { username: currentUser, password: "jaggibaba" },
    res => {
      if (!res || !res.ok) {
        logout();
        return;
      }
      renderUsers(res.users);
    }
  );
} else {
  loginView.style.display = "flex";
}

/* ---------------------------
   LOGIN
---------------------------- */
document.getElementById("login-btn").onclick = () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    alert("Enter username and password");
    return;
  }

  socket.emit("login", { username, password }, res => {
    if (!res || !res.ok) {
      alert("Invalid login");
      return;
    }

    currentUser = username;
    localStorage.setItem("user", username);

    loginView.style.display = "none";
    appView.style.display = "flex";

    renderUsers(res.users);
  });
};

/* ---------------------------
   USERS LIST
---------------------------- */
function renderUsers(users) {
  userList.innerHTML = "";

  users
    .filter(u => u !== currentUser)
    .forEach(u => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="status-dot" data-user="${u}"></span>
        <span class="username">${u}</span>
        <span class="badge" id="badge-${u}"></span>
      `;
      li.onclick = () => openChat(u);
      userList.appendChild(li);
    });

  updatePresenceUI();
}

/* ---------------------------
   OPEN CHAT
---------------------------- */
function openChat(user) {
  currentChat = user;
  chatTitle.innerText = user;
  chatBox.innerHTML = "";

  const badge = document.getElementById(`badge-${user}`);
  if (badge) badge.innerText = "";

  socket.emit("loadMessages", { withUser: user }, msgs => {
    if (Array.isArray(msgs)) {
      msgs.forEach(renderMessage);
    }
  });

  updatePresenceUI();
}

/* ---------------------------
   SEND MESSAGE (FIXED)
---------------------------- */
sendBtn.onclick = sendMessage;
messageInput.onkeydown = e => {
  if (e.key === "Enter") sendMessage();
};

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentChat) return;

  const msg = {
    from: currentUser,
    to: currentChat,
    text,
    time: Date.now()
  };

  socket.emit("sendMessage", msg, res => {
    if (!res || !res.ok) return;

    renderMessage(msg);
    messageInput.value = "";
  });
}

/* ---------------------------
   RECEIVE MESSAGE
---------------------------- */
socket.on("message", msg => {
  if (
    (msg.from === currentUser && msg.to === currentChat) ||
    (msg.from === currentChat && msg.to === currentUser)
  ) {
    renderMessage(msg);
  } else if (msg.to === currentUser) {
    const badge = document.getElementById(`badge-${msg.from}`);
    if (badge) badge.innerText = "●";
  }
});

/* ---------------------------
   RENDER MESSAGE
---------------------------- */
function renderMessage(msg) {
  const div = document.createElement("div");
  div.className = msg.from === currentUser ? "msg me" : "msg";
  div.innerText = msg.text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* ---------------------------
   PRESENCE
---------------------------- */
socket.on("presence", users => {
  onlineSet = new Set(users);
  updatePresenceUI();
});

function updatePresenceUI() {
  document.querySelectorAll(".status-dot").forEach(dot => {
    dot.classList.toggle("online", onlineSet.has(dot.dataset.user));
  });

  const headerDot = document.getElementById("chat-status-dot");
  if (headerDot && currentChat) {
    headerDot.classList.toggle("online", onlineSet.has(currentChat));
  }
}

/* ---------------------------
   LOGOUT
---------------------------- */
function logout() {
  localStorage.removeItem("user");
  location.reload();
}
