// ==========================================================================
// AQUADIVI — Simple, Bulletproof LocalStorage Water Tracker
// ==========================================================================

// 1. THE DATA VAULT (Default starting values)
const STORAGE_KEY = "aquadivi_gym_water_v1";

let appData = {
  todayDate: getTodayDateString(),
  todayWater: 0,
  dailyGoal: 4000, // 4.0 Liters default for gym rats
  history: {}     // Saves past days: { "2026-10-13": 3500 }
};

// 2. HELPER: Get today's date formatted as "YYYY-MM-DD"
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 3. LOAD DATA FROM PHONE STORAGE (With Midnight Rollover)
function loadFromStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    appData = { ...appData, ...parsed };
  }

  // Check if a new day has arrived since last open!
  const today = getTodayDateString();
  if (appData.todayDate !== today) {
    // Save yesterday's water to history
    if (appData.todayWater > 0) {
      appData.history[appData.todayDate] = appData.todayWater;
    }
    // Reset today to 0 for the new day
    appData.todayDate = today;
    appData.todayWater = 0;
    saveToStorage();
  }
}

// 4. SAVE TO PHONE STORAGE
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  syncWithCloud(); // ☁️ Sends update to Google Firebase if logged in!

}

// 5. DOM ELEMENTS (Connecting to HTML IDs)
const currentAmount = document.getElementById("currentAmount");
const currentLiters = document.getElementById("currentLiters");
const goalDisplay = document.getElementById("goalDisplay");
const goalLitersDisplay = document.getElementById("goalLitersDisplay");
const pctBadge = document.getElementById("pctBadge");
const remainingText = document.getElementById("remainingText");
const progressRing = document.getElementById("progressRing");
const historyList = document.getElementById("historyList");
const undoBtn = document.getElementById("undoBtn");
const targetPills = document.querySelectorAll(".target-pill");
const drinkBtns = document.querySelectorAll(".drink-btn");

// Memory of recent drinks for the Undo button
let drinkHistoryStack = [];

// 6. UPDATE THE ENTIRE SCREEN (Render)
function renderUI() {
  const total = appData.todayWater;
  const goal = appData.dailyGoal;
  const pct = Math.min(100, Math.round((total / goal) * 100));
  const remaining = Math.max(0, goal - total);

  // Update numbers
  currentAmount.textContent = total.toLocaleString();
  currentLiters.textContent = `${(total / 1000).toFixed(2)} L`;
  goalDisplay.textContent = goal.toLocaleString();
  goalLitersDisplay.textContent = `${(goal / 1000).toFixed(1)} L`;
  pctBadge.textContent = `${pct}%`;

  // Update status pill
  if (remaining === 0) {
    remainingText.textContent = `⚡ TARGET CRUSHED! (${(total / 1000).toFixed(2)}L logged)`;
    remainingText.style.color = "var(--volt)";
  } else {
    remainingText.textContent = `${remaining.toLocaleString()} ml remaining today`;
    remainingText.style.color = "var(--text-dim)";
  }

  // Animate the SVG Ring (Circumference = 628.32)
  const circumference = 628.32;
  const offset = circumference - (pct / 100) * circumference;
  progressRing.style.strokeDashoffset = offset;

  // Highlight active target pill (3.5L, 4.0L, etc.)
  targetPills.forEach(pill => {
    const pillTarget = parseInt(pill.getAttribute("data-target"), 10);
    pill.classList.toggle("active", pillTarget === goal);
  });

  // Render Past Days History
  renderHistory();
}

// 7. RENDER PAST HISTORY
function renderHistory() {
  historyList.innerHTML = "";
  const dates = Object.keys(appData.history).sort().reverse();

  if (dates.length === 0) {
    historyList.innerHTML = `<p class="empty-history">No past days yet. Yesterday's logs will appear here!</p>`;
    return;
  }

  dates.forEach(date => {
    const amount = appData.history[date];
    const row = document.createElement("div");
    row.className = "history-item";
    row.innerHTML = `
      <span class="history-date">📅 ${date}</span>
      <span class="history-amount">${(amount / 1000).toFixed(2)} Liters</span>
    `;
    historyList.appendChild(row);
  });
}

// 8. LOG WATER WHEN BUTTON IS CLICKED
function addWater(amount) {
  appData.todayWater += amount;
  drinkHistoryStack.push(amount);
  saveToStorage();
  renderUI();
}

// 9. UNDO LAST LOG
function undoLastDrink() {
  if (drinkHistoryStack.length === 0) return;
  const lastAmount = drinkHistoryStack.pop();
  appData.todayWater = Math.max(0, appData.todayWater - lastAmount);
  saveToStorage();
  renderUI();
}

// 10. SETUP CLICK EVENT LISTENERS
drinkBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const amount = parseInt(btn.getAttribute("data-amount"), 10);
    addWater(amount);
  });
});

undoBtn.addEventListener("click", undoLastDrink);

targetPills.forEach(pill => {
  pill.addEventListener("click", () => {
    const newGoal = parseInt(pill.getAttribute("data-target"), 10);
    appData.dailyGoal = newGoal;
    saveToStorage();
    renderUI();
  });
});

// START THE APP!
loadFromStorage();
renderUI();
/* ==========================================================================
   FIREBASE AUTHENTICATION & SCREEN SWITCHER
   ========================================================================== */

let currentUser = null;

// Grab Screen & Auth Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const googleLoginBtn = document.getElementById('google-login-btn');
const guestBtn = document.getElementById('guest-btn');
const userChip = document.getElementById('user-chip');
const userNameEl = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');

// Helper to switch screens
function showDashboard(name) {
    if (loginScreen) {
        loginScreen.classList.add('hidden');
        loginScreen.style.display = 'none';
    }
    if (dashboardScreen) {
        dashboardScreen.classList.remove('hidden');
        dashboardScreen.style.display = 'block';
    }
    if (userChip) {
        userChip.classList.remove('hidden');
        userChip.style.display = 'inline-flex';
        userNameEl.textContent = `⚡ ${name}`;
    }
}

function showLoginScreen() {
    if (loginScreen) {
        loginScreen.classList.remove('hidden');
        loginScreen.style.display = 'flex';
    }
    if (dashboardScreen) {
        dashboardScreen.classList.add('hidden');
        dashboardScreen.style.display = 'none';
    }
    if (userChip) {
        userChip.classList.add('hidden');
        userChip.style.display = 'none';
    }
}


// 1. Google Login Button Click
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        if (!window.auth || !window.fbOps) {
            alert("Firebase is still connecting. Please try again in 2 seconds!");
            return;
        }
        try {
            const result = await window.fbOps.signInWithPopup(window.auth, window.googleProvider);
            currentUser = result.user;
            showDashboard(currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'Gym Rat');
            syncWithCloud();
        } catch (error) {
            console.error("Login failed:", error);
            alert("Login failed: " + error.message);
        }
    });
}

// 2. Offline / Guest Button Click
if (guestBtn) {
    guestBtn.addEventListener('click', () => {
        currentUser = null;
        showDashboard('Guest Rat');
    });
}

// 3. Logout Button Click
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        if (window.auth && window.fbOps) {
            await window.fbOps.signOut(window.auth);
        }
        currentUser = null;
        showLoginScreen();
    });
}

// 4. Auto-detect if user was already logged in
function checkAuthState() {
    if (window.auth && window.fbOps) {
        window.fbOps.onAuthStateChanged(window.auth, (user) => {
            if (user) {
                currentUser = user;
                const firstName = user.displayName ? user.displayName.split(' ')[0] : 'Gym Rat';
                showDashboard(firstName);
                syncWithCloud();
            } else {
                showLoginScreen();
            }
        });
    } else {
        // If Firebase hasn't loaded yet, retry in 200ms
        setTimeout(checkAuthState, 200);
    }
}

// 5. Cloud Sync: Saves your water liters to Google Firestore!
async function syncWithCloud() {
    if (!currentUser || !window.db || !window.fbOps) return;
    try {
        const todayKey = appData.todayDate;
        const userDocRef = window.fbOps.doc(window.db, "users", currentUser.uid, "daily_logs", todayKey);
        
        // Save current water and target to cloud
        await window.fbOps.setDoc(userDocRef, {
            email: currentUser.email,
            name: currentUser.displayName,
           currentMl: appData.todayWater,
           targetMl: appData.dailyGoal,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log("☁️ Water data synced to Google Cloud!");
    } catch (err) {
        console.error("Cloud sync error:", err);
    }
}

// Start checking login status when page loads
checkAuthState();
