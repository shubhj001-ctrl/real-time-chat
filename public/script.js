document.addEventListener("DOMContentLoaded", () => {
  let onlineSet = new Set();
let lastSeenMap = {};
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
  const mediaPreview = document.getElementById("media-preview");
const mediaPreviewImg = document.getElementById("media-preview-img");
const removeMediaBtn = document.getElementById("remove-media");


  /* ========= STATE ========= */
  let currentUser = null;
  let currentChat = null;
  let replyTarget = null;
  let allUsers = [];
  let unreadCounts = JSON.parse(localStorage.getItem("veyon_unread") || "{}");
  let typingTimeout = null;
  let selectedMedia = null;
  // Reactions storage: msgId -> { user: emoji }
  let reactionsMap = {};

  const imageOverlay = document.getElementById("image-preview-overlay");
const imageOverlayImg = document.getElementById("image-preview-img");
const imageOverlayClose = document.getElementById("image-preview-close");

/* ========= SOUND EFFECTS ========= */
function createSoundContext() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

let audioContext = null;

function playSendSound() {
  if (!audioContext) audioContext = createSoundContext();
  
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  osc.connect(gain);
  gain.connect(audioContext.destination);
  
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
  
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  
  osc.start(now);
  osc.stop(now + 0.1);
}

function playReceiveSound() {
  if (!audioContext) audioContext = createSoundContext();
  
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  osc.connect(gain);
  gain.connect(audioContext.destination);
  
  osc.frequency.setValueAtTime(1000, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
  
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  
  osc.start(now);
  osc.stop(now + 0.15);
}

function openImagePreview(src) {
  imageOverlayImg.src = src;
  imageOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeImagePreview() {
  imageOverlay.classList.add("hidden");
  imageOverlayImg.src = "";
  document.body.style.overflow = "";
}

imageOverlayClose.onclick = closeImagePreview;
imageOverlay.onclick = (e) => {
  if (e.target === imageOverlay) closeImagePreview();
};

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeImagePreview();
});


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

const savedUser = localStorage.getItem("veyon_user");
const savedPass = localStorage.getItem("veyon_pass");

if (savedUser && savedPass) {
  // Auto-login - skip loading animation
  loadingScreen.style.display = "none";
  
  socket.emit("login", { username: savedUser, password: savedPass }, res => {
    if (res?.ok) {
      currentUser = savedUser;
      loginScreen.classList.add("hidden");
      app.classList.remove("hidden");
      allUsers = res.users;
      renderUsers();
      
      // Restore previous chat if within 5 minutes
      const lastChat = localStorage.getItem("veyon_last_chat");
      const chatTimestamp = localStorage.getItem("veyon_chat_timestamp");
      
      if (lastChat && chatTimestamp) {
        const elapsed = Date.now() - parseInt(chatTimestamp);
        const fiveMinutes = 5 * 60 * 1000;
        
        if (elapsed < fiveMinutes && allUsers.includes(lastChat)) {
          setTimeout(() => {
            openChat(lastChat);
          }, 300);
        } else {
          showEmptyChat();
        }
      } else {
        showEmptyChat();
      }
    } else {
      // Failed auto-login, show login screen
      loadingScreen.classList.add("fade-out");
      setTimeout(() => {
        loadingScreen.style.display = "none";
        loginScreen.classList.remove("hidden");
      }, 600);
    }
  });
} else {
  // No saved credentials - show loading animation
  startTypingOnce(() => {
    loadingScreen.classList.add("fade-out");
    setTimeout(() => {
      loadingScreen.style.display = "none";
      loginScreen.classList.remove("hidden");
    }, 600);
  });
}

socket.on("typing", data => {
  if (
    data.from === currentChat &&
    data.to === currentUser
  ) {
    typingBubble.classList.remove("hidden");
    typingBubble.classList.add("show");

    // ensure it stays at bottom of messages
    chatBox.appendChild(typingBubble);
    requestAnimationFrame(() => {
  chatBox.scrollTop = chatBox.scrollHeight;
});
  }
});
socket.on("connect", () => {
  console.log("✅ Socket connected");
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

socket.on("message", msg => {
  // 🔥 Ignore echo of own message (already rendered)
  if (msg.from === currentUser) return;

  if (
    msg.from === currentChat &&
    msg.to === currentUser
  ) {
    // If typing indicator visible for this chat, hide it first then render
    if (typingBubble.classList.contains('show') && msg.from === currentChat) {
      typingBubble.classList.remove('show');
      setTimeout(() => {
        typingBubble.classList.add('hidden');
        renderMessage(msg);
        playReceiveSound();
      }, 200);
    } else {
      renderMessage(msg);
      playReceiveSound();
    }
  } else {
    unreadCounts[msg.from] = (unreadCounts[msg.from] || 0) + 1;
    localStorage.setItem("veyon_unread", JSON.stringify(unreadCounts));
    renderUsers();
    playReceiveSound();
  }
});

const backBtn = document.getElementById("back-btn");
if (backBtn) {
backBtn.onclick = () => {
  const sidebar = document.querySelector(".sidebar");
  const chatArea = document.querySelector(".chat-area");

  chatArea.classList.remove("active");
  chatArea.style.display = "none";
  sidebar.style.display = "flex";

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
    requestAnimationFrame(() => {
  chatBox.scrollTop = chatBox.scrollHeight;
});
  }

  viewport.addEventListener("resize", adjustForKeyboard);
  viewport.addEventListener("scroll", adjustForKeyboard);
}

const mediaBtn = document.getElementById("media-btn");
const mediaInput = document.getElementById("media-input");

mediaBtn.onclick = () => mediaInput.click();
/* ========= SYSTEM TIME ========= */
function updateSystemTime() {
  const timeEl = document.getElementById("chat-system-time");
  if (timeEl) {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }
}

// Update time every minute
setInterval(updateSystemTime, 60000);
updateSystemTime();
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
  function renderUsers(filterText = "") {
    userList.innerHTML = "";

    allUsers
      .filter(u => u.toLowerCase().includes(filterText.toLowerCase()))
      .forEach(u => {
        const div = document.createElement("div");
        div.className = "user-card";
        div.textContent = u;

        if (unreadCounts[u]) {
          const badge = document.createElement("span");
          badge.className = "unread-badge show";
          div.appendChild(badge);
        }

        div.onclick = () => openChat(u);
        userList.appendChild(div);
      });
  }

  /* ========= USER SEARCH ========= */
  const searchInput = document.getElementById("user-search");
  searchInput.addEventListener("input", (e) => {
    renderUsers(e.target.value);
  });

  /* ========= CHAT ========= */
function showEmptyChat() {
  chatTitle.textContent = "Select a chat";
  emptyChat.classList.remove("hidden");
  emptyChat.style.display = "flex";

  chatBox.classList.add("hidden");
  chatFooter.classList.add("hidden");
}

function openChat(user) {
  emptyChat.classList.add("hidden");
emptyChat.style.display = "none"; // 🔥 THIS FIXES IT

  currentChat = user;

  localStorage.setItem("veyon_last_chat", user);
  localStorage.setItem("veyon_chat_timestamp", Date.now().toString());

  // avatar letter
document.getElementById("chat-avatar-letter").textContent =
  user.charAt(0).toUpperCase();


  if (isMobile) {
  const sidebar = document.querySelector(".sidebar");
  const chatArea = document.querySelector(".chat-area");

  sidebar.style.display = "none";
  chatArea.classList.add("active");
  chatArea.style.display = "flex"; // 🔥 FORCE REPAINT
}

  chatTitle.textContent = user;
  chatBox.classList.remove("hidden");
  chatFooter.classList.remove("hidden");

  delete unreadCounts[user];
  localStorage.setItem("veyon_unread", JSON.stringify(unreadCounts));
  renderUsers();

  chatBox.innerHTML = "";

socket.emit("loadMessages", { withUser: user }, msgs => {
  msgs.forEach(renderMessage);
  requestAnimationFrame(() => {
  chatBox.scrollTop = chatBox.scrollHeight;
});
});


  setTimeout(() => {
    input.disabled = false;
    input.focus();
  }, 100);

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
/* ========= MESSAGE CONTEXT MENU ========= */
const messageMenu = document.getElementById("message-menu");
const reactionPicker = document.getElementById("reaction-picker");
let selectedMessageDiv = null;
let selectedMsg = null;

function showMessageMenu(e, messageDiv, msg, isMobile = false) {
  selectedMessageDiv = messageDiv;
  selectedMsg = msg;

  messageMenu.classList.remove("hidden");

  // Position with slight clamping to viewport
  const pageW = window.innerWidth;
  const pageH = window.innerHeight;
  let left = e.clientX;
  let top = e.clientY;

  if (isMobile) {
    // on mobile center above input area
    left = pageW / 2;
    top = pageH - 180;
  } else {
    // clamp near edges
    if (left + 180 > pageW) left = pageW - 180;
    if (top + 80 > pageH) top = pageH - 120;
  }

  messageMenu.style.left = left + "px";
  messageMenu.style.top = top + "px";
}

// Menu item click handlers (includes copy)
document.querySelectorAll(".menu-item").forEach(item => {
  item.addEventListener("click", async (e) => {
    const action = e.target.dataset.action;

    if (action === "react") {
      showReactionPicker(e);
    } else if (action === "reply") {
      startReply(selectedMsg);
      messageMenu.classList.add("hidden");
    } else if (action === "copy") {
      try {
        await navigator.clipboard.writeText(selectedMsg?.text || "");
      } catch (err) {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = selectedMsg?.text || "";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      messageMenu.classList.add("hidden");
    }
  });
});

function showReactionPicker(e) {
  const rect = selectedMessageDiv.getBoundingClientRect();
  reactionPicker.classList.remove("hidden");
  // center reaction picker above the message
  let left = rect.left + rect.width / 2 - 72;
  let top = rect.top - 60;

  // clamp to viewport
  if (left < 8) left = 8;
  if (left + 160 > window.innerWidth) left = window.innerWidth - 168;
  if (top < 60) top = rect.bottom + 8; // if not enough space above, show below

  reactionPicker.style.left = left + "px";
  reactionPicker.style.top = top + "px";
}

// Send reaction to server; server will broadcast to both users
document.querySelectorAll(".reaction-emoji").forEach(btn => {
  btn.addEventListener("click", (e) => {
    const emoji = e.target.dataset.emoji;
    if (!selectedMsg) return;

    const payload = {
      msgId: selectedMsg.id,
      emoji,
      from: currentUser,
      to: selectedMsg.from === currentUser ? selectedMsg.to : selectedMsg.from
    };

    socket.emit('react', payload);
    reactionPicker.classList.add("hidden");
    messageMenu.classList.add("hidden");
  });
});

// Local reaction state and DOM update helpers
function applyReactionsToDOM(msgId) {
  const map = reactionsMap[msgId] || {};
  const counts = {};
  Object.values(map).forEach(emoji => { counts[emoji] = (counts[emoji] || 0) + 1; });

  const msgEl = document.querySelector(`[data-id="${msgId}"]`);
  if (!msgEl) return;

  let reactionsDiv = msgEl.querySelector('.message-reactions');
  if (!reactionsDiv) {
    reactionsDiv = document.createElement('div');
    reactionsDiv.className = 'message-reactions';
    msgEl.appendChild(reactionsDiv);
  }
  reactionsDiv.innerHTML = '';

  Object.keys(counts).forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'reaction-btn';
    btn.dataset.emoji = emoji;
    btn.textContent = emoji + (counts[emoji] > 1 ? ' ' + counts[emoji] : '');
    reactionsDiv.appendChild(btn);
  });
}

// When server notifies about a reaction, update local map and DOM
socket.on('reaction', (payload) => {
  const { msgId, emoji, from } = payload;
  if (!reactionsMap[msgId]) reactionsMap[msgId] = {};
  // toggle off if same emoji already set by user
  if (reactionsMap[msgId][from] === emoji) {
    delete reactionsMap[msgId][from];
  } else {
    reactionsMap[msgId][from] = emoji;
  }
  applyReactionsToDOM(msgId);
});

// Close menu when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".message-menu") && !e.target.closest(".reaction-picker") && !e.target.closest(".message")) {
    messageMenu.classList.add("hidden");
    reactionPicker.classList.add("hidden");
  }
});
 async function sendMessage() {
  console.log("🚀 sendMessage triggered");

  if (!currentChat) return;

  const text = input.value.trim();
  if (!text && !selectedMedia) return;

  let mediaPayload = null;

  if (selectedMedia) {
    const formData = new FormData();
    formData.append("file", selectedMedia);

    const res = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    if (!data.ok) return;

    mediaPayload = {
      url: data.url,
      type: data.type
    };
  }

  const msg = {
    id: "msg_" + Date.now(),
    from: currentUser,
    to: currentChat,
    text: text || null,
    media: mediaPayload,
    replyTo: replyTarget,
    timestamp: Date.now()
  };

  socket.emit("sendMessage", msg);
  renderMessage(msg);
  playSendSound();

  input.value = "";
  selectedMedia = null;
  mediaInput.value = "";

  mediaPreview.classList.add("hidden");
  mediaPreviewImg.src = "";

  replyTarget = null;
  replyPreview.classList.add("hidden");

  input.focus();
}

function renderMessage(msg) {
  const div = document.createElement("div");
  div.className = "message" + (msg.from === currentUser ? " me" : "");
  div.dataset.id = msg.id;
  div.dataset.from = msg.from;

  div.oncontextmenu = (e) => {
    e.preventDefault();
    showMessageMenu(e, div, msg);
  };

  // Long press for mobile — show menu without selecting text
  let longPressTimer;
  div.addEventListener("touchstart", (ev) => {
    ev.preventDefault();
    const touch = ev.touches && ev.touches[0];
    longPressTimer = setTimeout(() => {
      showMessageMenu({ clientX: touch.clientX, clientY: touch.clientY }, div, msg, true);
    }, 500);
  }, { passive: false });

  div.addEventListener("touchend", (ev) => {
    clearTimeout(longPressTimer);
  });

  if (msg.replyTo) {
    const reply = document.createElement("div");
    reply.className = "reply-inside";
    reply.textContent = msg.replyTo.text || "Media message";
    reply.onclick = () => jumpToMessage(msg.replyTo.id);
    div.appendChild(reply);
  }

  if (msg.media) {
  if (msg.media.type.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = msg.media.url;
    img.style.maxWidth = "220px";
    img.style.borderRadius = "10px";
    img.onclick = () => openImagePreview(msg.media.url);
    div.appendChild(img);
  } else if (msg.media.type.startsWith("video/")) {
    const video = document.createElement("video");
    video.src = msg.media.url;
    video.controls = true;
    video.style.maxWidth = "240px";
    div.appendChild(video);
  }
}

  if (msg.text) {
    const text = document.createElement("div");
    text.textContent = msg.text;
    div.appendChild(text);
  }

  const time = document.createElement("div");
  time.className = "timestamp";
  const ts = msg.timestamp || msg.createdAt || msg.id.replace("msg_", "");
  time.textContent = new Date(Number(ts)).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
  div.appendChild(time);

  chatBox.appendChild(div);
  requestAnimationFrame(() => {
  chatBox.scrollTop = chatBox.scrollHeight;
});
}

  cancelReplyBtn.onclick = () => {
    replyTarget = null;
    replyPreview.classList.add("hidden");
  };

  function startReply(msg) {
  replyTarget = msg;
  replyUser.textContent = msg.from;
  replyText.textContent = msg.text || "Media message";
  replyPreview.classList.remove("hidden");
  input.focus();
}


function jumpToMessage(id) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("highlight");

  setTimeout(() => el.classList.remove("highlight"), 1200);
}
document.addEventListener("touchend", (e) => {
  if (e.target === input) {
    e.preventDefault();
    input.focus();
  }
}, { passive: false });



mediaInput.addEventListener("change", () => {
  const file = mediaInput.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    alert("Only images and videos allowed");
    return;
  }

  selectedMedia = file;

  // Preview (image only)
  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = () => {
      mediaPreviewImg.src = reader.result;
      mediaPreview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  }
});

removeMediaBtn.onclick = () => {
  selectedMedia = null;
  mediaInput.value = "";
  mediaPreview.classList.add("hidden");
  mediaPreviewImg.src = "";
};

socket.on("connect", () => {
  const user = localStorage.getItem("veyon_user");
  if (user) {
    socket.emit("reconnectUser", user);

    // Restore previous chat if within 5 minutes
    const lastChat = localStorage.getItem("veyon_last_chat");
    const chatTimestamp = localStorage.getItem("veyon_chat_timestamp");
    
    if (lastChat && chatTimestamp) {
      const elapsed = Date.now() - parseInt(chatTimestamp);
      const fiveMinutes = 5 * 60 * 1000;
      
      if (elapsed < fiveMinutes && allUsers.includes(lastChat)) {
        setTimeout(() => {
          openChat(lastChat);
        }, 500);
      }
    }
  }
});


});
