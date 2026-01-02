document.addEventListener("DOMContentLoaded", () => {
  
  const socket = io();

  /* ========= ELEMENTS ========= */
  const loadingScreen = document.getElementById("loading-screen");
  const loginScreen = document.getElementById("login-screen");
  const app = document.getElementById("app");
  const isMobile = window.innerWidth <= 768;


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
  let typingTimeout = null;

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

socket.on("typing", data => {
  if (
    data.from === currentChat &&
    data.to === currentUser
  ) {
    typingBubble.classList.remove("hidden");
    typingBubble.classList.add("show");

    // ensure it stays at bottom of messages
    chatBox.appendChild(typingBubble);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
});

socket.on("stopTyping", data => {
  if (
    data.from === currentChat &&
    data.to === currentUser
  ) {
    typingBubble.classList.remove("show");
    setTimeout(() => {
      typingBubble.classList.add("hidden");
    }, 200);
  }
});

const backBtn = document.getElementById("back-btn");
if (backBtn) {
  backBtn.onclick = () => {
    document.querySelector(".chat-area").classList.remove("active");
    document.querySelector(".sidebar").style.display = "flex";
    currentChat = null;
  };
}

if (window.visualViewport) {
  const viewport = window.visualViewport;

  function adjustForKeyboard() {
    const keyboardHeight =
      window.innerHeight - viewport.height - viewport.offsetTop;

    if (keyboardHeight > 0) {
      chatFooter.style.bottom = `${keyboardHeight}px`;
    } else {
      chatFooter.style.bottom = "0px";
    }

    // keep messages visible
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  viewport.addEventListener("resize", adjustForKeyboard);
  viewport.addEventListener("scroll", adjustForKeyboard);
}

const mediaBtn = document.getElementById("media-btn");
const mediaInput = document.getElementById("media-input");

mediaBtn.onclick = () => mediaInput.click();

mediaInput.onchange = async () => {
  const file = mediaInput.files[0];
  if (!file || !currentChat) return;

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  // ❌ Invalid file
  if (!isImage && !isVideo) {
    alert("Only images and videos are allowed");
    return;
  }

  // ❌ Size limits
  if (isImage && file.size > 8 * 1024 * 1024) {
    alert("Image must be under 8MB");
    return;
  }

  if (isVideo && file.size > 50 * 1024 * 1024) {
    alert("Video must be under 50MB");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    socket.emit("sendMedia", {
      id: "msg_" + Date.now(),
      from: currentUser,
      to: currentChat,
      type: isImage ? "image" : "video",
      name: file.name,
      data: reader.result
    });
  };

  reader.readAsDataURL(file);
  mediaInput.value = "";
};


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
  chatTitle.textContent = "Select a chat"; // desktop only
  emptyChat.classList.remove("hidden");
  chatBox.classList.add("hidden");
  chatFooter.classList.add("hidden");
}


  function scrollIfNearBottom() {
  const threshold = 120;
  const position = chatBox.scrollTop + chatBox.clientHeight;
  const height = chatBox.scrollHeight;

  if (height - position < threshold) {
    chatBox.scrollTop = height;
  }
}


  function openChat(user) {
  currentChat = user;

  localStorage.setItem("veyon_last_chat", user);

  const sidebar = document.querySelector(".sidebar");
  const chatArea = document.querySelector(".chat-area");

  // ✅ MOBILE NAVIGATION
  if (isMobile) {
    sidebar.style.display = "none";
    chatArea.style.display = "flex";
    chatArea.classList.add("active");
  }
   chatTitle.textContent = user;

  emptyChat.classList.add("hidden");
  chatBox.classList.remove("hidden");
  chatFooter.classList.remove("hidden");

  unreadCounts[user] && delete unreadCounts[user];
  localStorage.setItem("veyon_unread", JSON.stringify(unreadCounts));
  renderUsers();

  chatTitle.textContent = user;
  chatBox.innerHTML = "";

  socket.emit("loadMessages", { withUser: user }, msgs => {
    msgs.forEach(renderMessage);
    scrollIfNearBottom();
  });

  setTimeout(() => {
    input.disabled = false;
    input.removeAttribute("disabled");
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
    e.preventDefault();
    sendMessage();
  }
});

input.addEventListener("input", () => {
  if (!currentChat) return;

  socket.emit("typing", {
    from: currentUser,
    to: currentChat
  });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping", {
      from: currentUser,
      to: currentChat
    });
  }, 900);
});


  function sendMessage() {
  if (!currentChat || !input.value.trim()) return;

  socket.emit("sendMessage", {
    id: "msg_" + Date.now(),
    from: currentUser,
    to: currentChat,
    text: input.value.trim(),
    replyTo: replyTarget
      ? {
          id: replyTarget.id,
          from: replyTarget.from,
          text: replyTarget.text
        }
      : null
  });

  replyTarget = null;
  replyPreview.classList.add("hidden");
  input.value = "";

  // 🔥 keep keyboard open
  setTimeout(() => input.focus(), 0);
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

  socket.on("media", msg => {
  if (
    (msg.from === currentChat && msg.to === currentUser) ||
    (msg.from === currentUser && msg.to === currentChat)
  ) {
    renderMessage(msg);
  } else {
    unreadCounts[msg.from] = (unreadCounts[msg.from] || 0) + 1;
    localStorage.setItem("veyon_unread", JSON.stringify(unreadCounts));
    renderUsers();
  }
});


 function renderMessage(msg) {
  const div = document.createElement("div");
  div.className = "message" + (msg.from === currentUser ? " me" : "");
  div.dataset.id = msg.id;

  // 🔁 Reply preview (unchanged)
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

  // 🖼 IMAGE
  if (msg.type === "image") {
    const img = document.createElement("img");
    img.src = msg.data;
    img.style.maxWidth = "220px";
    img.style.borderRadius = "10px";
    img.style.cursor = "pointer";

    div.appendChild(img);
  }

  // 🎥 VIDEO
  else if (msg.type === "video") {
    const video = document.createElement("video");
    video.src = msg.data;
    video.controls = true;
    video.style.maxWidth = "240px";
    video.style.borderRadius = "10px";

    div.appendChild(video);
  }

  // 💬 TEXT
  else {
    const text = document.createElement("div");
    text.textContent = msg.text;
    div.appendChild(text);
  }

  // Click to reply
  div.onclick = () => {
    replyTarget = msg;
    replyUser.textContent = msg.from;
    replyText.textContent = msg.text || "Media";
    replyPreview.classList.remove("hidden");
    input.focus();
  };

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

  cancelReplyBtn.onclick = () => {
    replyTarget = null;
    replyPreview.classList.add("hidden");
  };
});

function jumpToMessage(id) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("highlight");

  setTimeout(() => el.classList.remove("highlight"), 1200);
}

document.getElementById("back-btn").onclick = () => {
  document.querySelector(".chat-area").classList.remove("active");
  document.querySelector(".sidebar").style.display = "flex";
  currentChat = null;
};
function scrollIfNearBottom() {
  const threshold = 120;
  const position = chatBox.scrollTop + chatBox.clientHeight;
  const height = chatBox.scrollHeight;

  if (height - position < threshold) {
    chatBox.scrollTop = height;
  }
}
document.addEventListener("touchend", (e) => {
  if (e.target === input) {
    e.preventDefault();
    input.focus();
  }
}, { passive: false });
