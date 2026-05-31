/* 
  app.js - Career Website Interactivity & Dual-Mode Comment System
  Features: Essay Tabs, Timeline Filter, Time Redesign Bars, Realtime Firebase/Local Comment Wall
*/

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all interactive subsystems
  initTabs();
  initTimelineFilter();
  initTimeBars();
  initCommentSystem();
});

/* ==========================================================================
   1. ESSAY TABS SYSTEM
   ========================================================================== */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.getAttribute('data-tab');

      // Deactivate all tabs & buttons
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      // Activate clicked tab & content
      btn.classList.add('active');
      const targetContent = document.getElementById(`essay-${targetTabId}`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

/* ==========================================================================
   2. TIMELINE ROADMAP FILTER
   ========================================================================== */
function initTimelineFilter() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const blocks = document.querySelectorAll('.timeline-block');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');

      // Update active button styling
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Filter timeline blocks
      blocks.forEach(block => {
        const type = block.getAttribute('data-type');
        if (filter === 'all' || type === filter) {
          block.classList.add('active-track');
          block.style.opacity = '1';
          block.style.transform = 'scale(1)';
        } else {
          block.classList.remove('active-track');
          block.style.opacity = '0.5';
          block.style.transform = 'scale(0.98)';
        }
      });
    });
  });

  // Activate 'all' by default
  const defaultBtn = document.querySelector('.filter-btn[data-filter="all"]');
  if (defaultBtn) defaultBtn.click();
}

/* ==========================================================================
   3. TIME REDESIGN PROGRESS BARS
   ========================================================================== */
function initTimeBars() {
  // We trigger the smooth filling animation for the time progress bars
  const fills = document.querySelectorAll('.time-bar-fill');
  
  // Use a slight timeout to let the page render first, triggering the transition
  setTimeout(() => {
    fills.forEach(fill => {
      const percent = fill.getAttribute('data-percent');
      fill.style.width = `${percent}%`;
    });
  }, 300);
}

/* ==========================================================================
   4. DUAL-MODE COMMENT SYSTEM (FIREBASE OR LOCALSTORAGE)
   ========================================================================== */
let isFirebaseMode = false;
let dbRef = null; // Holds Firebase database reference if active

function initCommentSystem() {
  const commentForm = document.getElementById('comment-form');
  const avatarOpts = document.querySelectorAll('.avatar-opt');
  const selectedAvatarInput = document.getElementById('selected-avatar');
  const statusPill = document.getElementById('db-status-pill');
  
  // Handle Avatar Selection
  avatarOpts.forEach(opt => {
    opt.addEventListener('click', () => {
      avatarOpts.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedAvatarInput.value = opt.getAttribute('data-avatar');
    });
  });

  // Check if Firebase config is defined and valid
  const hasFirebaseConfig = window.firebaseConfig && 
                             window.firebaseConfig.apiKey && 
                             window.firebaseConfig.apiKey.trim() !== "";

  if (hasFirebaseConfig) {
    loadFirebaseSDKs()
      .then(() => {
        // Initialize Firebase
        firebase.initializeApp(window.firebaseConfig);
        dbRef = firebase.database().ref('comments');
        isFirebaseMode = true;

        // Set status bar to online
        statusPill.innerHTML = '<span class="status-dot"></span>데이터 저장소: Firebase (실시간 Cloud)';
        statusPill.querySelector('.status-dot').style.backgroundColor = '#10B981';

        // Listen for Realtime updates
        listenForFirebaseComments();
      })
      .catch(err => {
        console.error("Firebase SDK load failed, falling back to LocalStorage:", err);
        setupLocalStorageMode(statusPill);
      });
  } else {
    setupLocalStorageMode(statusPill);
  }

  // Handle Form Submission
  commentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitComment();
  });
}

// Fallback setup helper
function setupLocalStorageMode(statusPill) {
  isFirebaseMode = false;
  statusPill.innerHTML = '<span class="status-dot local"></span>데이터 저장소: LocalStorage (로컬 보관)';
  statusPill.querySelector('.status-dot').style.backgroundColor = '#F59E0B';
  renderLocalComments();
}

// Dynamically inject Firebase scripts for file:// protocol compatibility (prevents standard npm errors)
function loadFirebaseSDKs() {
  return new Promise((resolve, reject) => {
    const appScript = document.createElement('script');
    appScript.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js";
    
    appScript.onload = () => {
      const dbScript = document.createElement('script');
      dbScript.src = "https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js";
      dbScript.onload = resolve;
      dbScript.onerror = reject;
      document.head.appendChild(dbScript);
    };
    appScript.onerror = reject;
    document.head.appendChild(appScript);
  });
}

/* --- Submission Logic --- */
function submitComment() {
  const authorInput = document.getElementById('comment-author');
  const passwordInput = document.getElementById('comment-password');
  const contentInput = document.getElementById('comment-content');
  const avatarInput = document.getElementById('selected-avatar');

  const author = authorInput.value.trim();
  const password = passwordInput.value.trim();
  const content = contentInput.value.trim();
  const avatar = avatarInput.value || '👨‍💻';

  if (!author || !password || !content) {
    alert("이름, 비밀번호, 내용을 모두 입력해 주세요.");
    return;
  }

  const commentData = {
    id: Date.now().toString(),
    author: author,
    password: password, // In real apps, hash this. For demo/homework, plaintext checks are fine.
    content: content,
    avatar: avatar,
    timestamp: new Date().toISOString()
  };

  if (isFirebaseMode && dbRef) {
    dbRef.push(commentData)
      .then(() => {
        resetCommentForm(contentInput);
      })
      .catch(err => {
        alert("Firebase 전송 실패: " + err.message);
      });
  } else {
    // LocalStorage Save
    const localComments = getLocalComments();
    localComments.unshift(commentData); // Put new comment on top
    localStorage.setItem('sh_portfolio_comments', JSON.stringify(localComments));
    resetCommentForm(contentInput);
    renderLocalComments();
  }
}

function resetCommentForm(contentField) {
  contentField.value = '';
  // Keep name & password populated for user convenience when submitting consecutive comments
}

/* --- Fetch & Render Logic --- */
// Firebase Mode Fetching
function listenForFirebaseComments() {
  dbRef.on('value', (snapshot) => {
    const data = snapshot.val();
    const commentsList = [];
    if (data) {
      Object.keys(data).forEach(key => {
        commentsList.push({
          key: key,
          ...data[key]
        });
      });
    }
    // Sort descending by timestamp
    commentsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    displayComments(commentsList);
  });
}

// LocalStorage Mode Fetching
function getLocalComments() {
  const data = localStorage.getItem('sh_portfolio_comments');
  return data ? JSON.parse(data) : [];
}

function renderLocalComments() {
  const commentsList = getLocalComments();
  displayComments(commentsList);
}

// Common Rendering Engine
function displayComments(comments) {
  const commentsContainer = document.getElementById('comments-container');
  commentsContainer.innerHTML = '';

  if (comments.length === 0) {
    commentsContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px 0; font-size: 0.95rem;">
        아직 등록된 댓글이 없습니다. 첫 번째 발자취를 남겨보세요!
      </div>
    `;
    return;
  }

  comments.forEach(comment => {
    const card = document.createElement('div');
    card.className = 'comment-card';
    
    // Format Date beautifully
    const dateObj = new Date(comment.timestamp);
    const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

    card.innerHTML = `
      <div class="comment-avatar">${escapeHtml(comment.avatar)}</div>
      <div class="comment-content-wrapper">
        <div class="comment-header">
          <span class="comment-author">${escapeHtml(comment.author)}</span>
          <div class="comment-meta-row">
            <span class="comment-date">${dateStr}</span>
            <button class="delete-btn" onclick="deleteComment('${comment.key || comment.id}')">삭제</button>
          </div>
        </div>
        <div class="comment-text">${escapeHtml(comment.content)}</div>
      </div>
    `;
    commentsContainer.appendChild(card);
  });
}

// Delete Logic
window.deleteComment = function(idOrKey) {
  const password = prompt("댓글 작성 시 설정한 비밀번호를 입력하세요:");
  if (password === null) return; // Cancelled

  if (isFirebaseMode && dbRef) {
    // Read the password from database first
    dbRef.child(idOrKey).once('value')
      .then(snapshot => {
        const val = snapshot.val();
        if (val && val.password === password) {
          dbRef.child(idOrKey).remove()
            .then(() => alert("댓글이 정상적으로 삭제되었습니다."))
            .catch(err => alert("삭제 실패: " + err.message));
        } else {
          alert("비밀번호가 올바르지 않습니다.");
        }
      });
  } else {
    // LocalStorage Delete
    const localComments = getLocalComments();
    const targetIdx = localComments.findIndex(c => c.id === idOrKey);
    
    if (targetIdx !== -1) {
      if (localComments[targetIdx].password === password) {
        localComments.splice(targetIdx, 1);
        localStorage.setItem('sh_portfolio_comments', JSON.stringify(localComments));
        alert("댓글이 정상적으로 삭제되었습니다.");
        renderLocalComments();
      } else {
        alert("비밀번호가 올바르지 않습니다.");
      }
    }
  }
};

// Security helper to prevent XSS attacks in inputs
function escapeHtml(unsafeStr) {
  return unsafeStr
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
