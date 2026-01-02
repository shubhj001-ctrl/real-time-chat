document.addEventListener("DOMContentLoaded", () => {
  
  const socket = io();

  /* ========= ELEMENTS ========= */
  const loadingScreen = document.getElementById("loading-screen");
  const loginScreen = document.getElementById("login-screen");
  const app = document.getElementById("app");

  const loginBtn = document.getElementById("login-btn");
  const loginError = document.getElementById("login-error");
  const usernameInput = document.getElementById("login-username");
  const passwordInput = document.getElementById("login-password");

  const logoutBtn = document.getElementById("logout-btn");
  const userList = document.getElementById("user-list");
  const chatBox = document.getElementById("chat-box");
  const chatTitle = document.getElementById("chat-title");
  const input = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-btn");

  const emptyChat = document.getElementById("empty-chat");
  const chatFooter = document.getElementById("chat-footer");
  const typingBubble = document.getElementById("typing-bubble");

  const replyPreview = document.getElementById("reply-preview");
  const replyUser = document.getElementById("reply-user");
  const replyText = document.getElementById("reply-text");
  const cancelReplyBtn = document.getElementById("cancel-reply");

  /* ========= STATE ========= */
  let currentUser = null;
  let currentChat = null;
  let replyTarget = null;
  let allUsers = [];
  let unreadCounts = JSON.parse(localStorage.getItem("veyon_unread") || "{}");

  /* ========= LOADER ========= */
  const brand = "Veyon";
let charIndex = 0;
let typingInterval = null;

const loadingWord = document.getElementById("loading-word");

function startTypingOnce(onComplete) {
  if (typingInterval) clearInterval(typingInterval);

  loadingWord.textContent = "";
  charIndex = 0;

  typingInterval = setInterval(() => {
    if (charIndex < brand.length) {
      loadingWord.textContent += brand[charIndex];
      charIndex++;
    } else {
      clearInterval(typingInterval);
      typingInterval = null;

      setTimeout(() => {
        onComplete && onComplete();
      }, 400);
    }
  }, 200);
}
startTypingOnce(() => {
  loadingScreen.classList.add("fade-out");
  setTimeout(() => {
    loadingScreen.style.display = "none";
    loginScreen.classList.remove("hidden");
  }, 600);
});


  /* ========= LOGIN ========= */
  loginBtn.onclick = () => {
    const u = usernameInput.value.trim();
    const p = passwordInput.value.trim();

    if (!u || !p) {
      loginError.textContent = "Username and password required.";
      loginError.classList.remove("hidden");
      return;
    }

    socket.emit("login", { username: u, password: p }, res => {
      if (!res?.ok) {
        loginError.textContent = "Access denied.";
        loginError.classList.remove("hidden");
        return;
      }

      currentUser = u;
      localStorage.setItem("veyon_user", u);
      localStorage.setItem("veyon_pass", p);

      loginScreen.classList.add("hidden");
      app.classList.remove("hidden");

      allUsers = res.users;
      renderUsers();

      showEmptyChat();
    });
  };

  logoutBtn.onclick = () => {
    localStorage.clear();
    location.reload();
  };

  /* ========= USERS ========= */
  function renderUsers() {
    userList.innerHTML = "";

    allUsers.forEach(u => {
      const div = document.createElement("div");
      div.className = "user-card";
      div.textContent = u;

      if (unreadCounts[u]) {
        const badge = document.createElement("span");
        badge.className = "unread-badge show";
        badge.textContent = unreadCounts[u] > 9 ? "9+" : unreadCounts[u];
        div.appendChild(badge);
      }

      div.onclick = () => openChat(u);
      userList.appendChild(div);
    });
  }

  /* ========= CHAT ========= */
  function showEmptyChat() {
    emptyChat.classList.remove("hidden");
    chatBox.classList.add("hidden");
    chatFooter.classList.add("hidden");
  }

  function openChat(user) {
    currentChat = user;
    localStorage.setItem("veyon_last_chat", user);

    emptyChat.classList.add("hidden");
    chatBox.classList.remove("hidden");
    chatFooter.classList.remove("hidden");
setTimeout(() => {
  input.removeAttribute("readonly");
  input.disabled = false;
  input.focus();
}, 100);

    unreadCounts[user] && delete unreadCounts[user];
    localStorage.setItem("veyon_unread", JSON.stringify(unreadCounts));
    renderUsers();

    chatTitle.textContent = user;
    chatBox.innerHTML = "";

    socket.emit("loadMessages", { withUser: user }, msgs => {
  msgs.forEach(renderMessage);
  chatBox.scrollTop = chatBox.scrollHeight;

  // ✅ focus input after chat opens
  setTimeout(() => {
  input.focus(); // desktop Safari/Chrome fix
}, 50);

});

  }

  sendBtn.onclick = sendMessage;
  input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault(); // prevent form submit
    sendMessage();
  }
});


  function sendMessage() {
    if (!currentChat || !input.value.trim()) return;

    const msg = {
      id: "msg_" + Date.now(),
      from: currentUser,
      to: currentChat,
      text: input.value.trim(),
      replyTo: replyTarget
    };

    socket.emit("sendMessage", msg);
    replyTarget = null;
    replyPreview.classList.add("hidden");
    input.value = "";
  }

  socket.on("message", msg => {
    if (msg.to === currentUser && msg.from !== currentChat) {
      unreadCounts[msg.from] = (unreadCounts[msg.from] || 0) + 1;
      localStorage.setItem("veyon_unread", JSON.stringify(unreadCounts));
      renderUsers();
    }

    if (
      (msg.from === currentChat && msg.to === currentUser) ||
      (msg.from === currentUser && msg.to === currentChat)
    ) {
      renderMessage(msg);
    }
  });

  function renderMessage(msg) {
    const div = document.createElement("div");
    div.className = "message" + (msg.from === currentUser ? " me" : "");
    div.textContent = msg.text;

    div.onclick = () => {
      replyTarget = msg;
      replyUser.textContent = msg.from;
      replyText.textContent = msg.text;
      replyPreview.classList.remove("hidden");
    };

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  cancelReplyBtn.onclick = () => {
    replyTarget = null;
    replyPreview.classList.add("hidden");
  };
});
