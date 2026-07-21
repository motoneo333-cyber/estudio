// Pomodoro Lock & Reward App Logic
// Developer: Jules

// Elements
const stateBadge = document.getElementById("state-badge");
const timerStateLabel = document.getElementById("timer-state-label");
const timerDisplay = document.getElementById("timer-display");
const progressRing = document.getElementById("progress-ring");
const rewardBalanceDisplay = document.getElementById("reward-balance-display");
const estimatedRewardDisplay = document.getElementById("estimated-reward");

const workDurationMinInput = document.getElementById("work-duration-min");
const workDurationSecInput = document.getElementById("work-duration-sec");

const btnStart = document.getElementById("btn-start");
const btnConfirm = document.getElementById("btn-confirm");
const btnReset = document.getElementById("btn-reset");

const addDomainForm = document.getElementById("add-domain-form");
const domainInput = document.getElementById("domain-input");
const domainList = document.getElementById("domain-list");
const blockedCount = document.getElementById("blocked-count");

// State Definition
let state = {
    currentState: "IDLE", // IDLE, WORK, AWAITING_CONFIRMATION, REWARD
    targetTimestamp: 0,   // Target timestamp when current phase ends (for WORK and REWARD)
    totalDurationMs: 0,   // Total duration of current phase (for progress ring & calculations)
    rewardBalanceMs: 0,   // Accumulated reward time in ms
    completedWorkMs: 0,   // Work duration waiting to be confirmed
    blockedDomains: ["youtube.com", "facebook.com", "twitter.com", "instagram.com"] // Defaults
};

// SVG progress ring calculation
const RING_CIRCUMFERENCE = 2 * Math.PI * 45; // 282.74

// Timer interval variable
let timerInterval = null;

// Load state from localStorage
function loadState() {
    const saved = localStorage.getItem("pomodoro_lock_reward_state");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Re-hydrate state fields
            state = { ...state, ...parsed };
        } catch (e) {
            console.error("Error reading saved state, resetting to default.", e);
        }
    }
}

// Save state to localStorage
function saveState() {
    localStorage.setItem("pomodoro_lock_reward_state", JSON.stringify(state));
}

// Post message to browser extension
function broadcastState() {
    const message = {
        source: "pomodoro-webapp",
        action: "STATE_CHANGE",
        state: {
            currentState: state.currentState,
            targetTimestamp: state.targetTimestamp,
            totalDurationMs: state.totalDurationMs,
            rewardBalanceMs: state.rewardBalanceMs,
            completedWorkMs: state.completedWorkMs,
            blockedDomains: [...state.blockedDomains]
        }
    };
    window.postMessage(message, "*");
}

// Helper: Format milliseconds to MM:SS.hh
function formatTime(ms) {
    if (ms < 0) ms = 0;
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const hundredths = Math.floor((ms % 1000) / 10);

    const minsStr = String(mins).padStart(2, '0');
    const secsStr = String(secs).padStart(2, '0');
    const hundStr = String(hundredths).padStart(2, '0');

    return `${minsStr}:${secsStr}.${hundStr}`;
}

// Render dynamic elements
function renderUI() {
    // 1. Update State Badge
    stateBadge.textContent = state.currentState;
    stateBadge.className = "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ";

    if (state.currentState === "IDLE") {
        stateBadge.classList.add("bg-slate-800", "text-slate-300");
        timerStateLabel.textContent = "Listo para comenzar";
    } else if (state.currentState === "WORK") {
        stateBadge.classList.add("bg-red-500/20", "text-red-400", "border", "border-red-500/30");
        timerStateLabel.textContent = "¡Tiempo de Concentración!";
    } else if (state.currentState === "AWAITING_CONFIRMATION") {
        stateBadge.classList.add("bg-orange-500/20", "text-orange-400", "border", "border-orange-500/30");
        timerStateLabel.textContent = "Sesión Completada - Esperando Confirmación";
    } else if (state.currentState === "REWARD") {
        stateBadge.classList.add("bg-emerald-500/20", "text-emerald-400", "border", "border-emerald-500/30");
        timerStateLabel.textContent = "¡Tiempo de Recompensa Activo!";
    }

    // 2. Buttons visibility
    if (state.currentState === "IDLE") {
        btnStart.classList.remove("hidden");
        btnConfirm.classList.add("hidden");
        btnReset.classList.add("hidden");

        // Enable config inputs
        workDurationMinInput.disabled = false;
        workDurationSecInput.disabled = false;
    } else if (state.currentState === "WORK") {
        btnStart.classList.add("hidden");
        btnConfirm.classList.add("hidden");
        btnReset.classList.remove("hidden");

        // Disable config inputs
        workDurationMinInput.disabled = true;
        workDurationSecInput.disabled = true;
    } else if (state.currentState === "AWAITING_CONFIRMATION") {
        btnStart.classList.add("hidden");
        btnConfirm.classList.remove("hidden");
        btnReset.classList.remove("hidden");

        workDurationMinInput.disabled = true;
        workDurationSecInput.disabled = true;
    } else if (state.currentState === "REWARD") {
        btnStart.classList.add("hidden");
        btnConfirm.classList.add("hidden");
        btnReset.classList.remove("hidden");

        workDurationMinInput.disabled = true;
        workDurationSecInput.disabled = true;
    }

    // 3. Reward Display
    rewardBalanceDisplay.textContent = formatTime(state.rewardBalanceMs);

    // 4. Domains List
    renderDomains();

    // 5. Update progress ring & clock based on state
    updateClockAndProgress();
}

// Render dynamic domains list
function renderDomains() {
    domainList.innerHTML = "";
    blockedCount.textContent = state.blockedDomains.length;

    state.blockedDomains.forEach((domain, idx) => {
        const li = document.createElement("li");
        li.className = "flex justify-between items-center bg-slate-900/50 hover:bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 transition-colors";

        const span = document.createElement("span");
        span.className = "text-sm text-slate-300 font-mono";
        span.textContent = domain;

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "text-xs text-red-400 hover:text-red-300 transition-colors font-semibold px-2 py-1";
        deleteBtn.textContent = "Eliminar";
        deleteBtn.addEventListener("click", () => {
            removeDomain(idx);
        });

        li.appendChild(span);
        li.appendChild(deleteBtn);
        domainList.appendChild(li);
    });
}

function removeDomain(idx) {
    state.blockedDomains.splice(idx, 1);
    saveState();
    broadcastState();
    renderDomains();
}

// Update clock numbers and the SVG ring stroke
function updateClockAndProgress() {
    let displayMs = 0;
    let percent = 1;

    if (state.currentState === "IDLE") {
        const mins = parseInt(workDurationMinInput.value) || 0;
        const secs = parseInt(workDurationSecInput.value) || 0;
        displayMs = (mins * 60 + secs) * 1000;
        percent = 1;
    } else if (state.currentState === "WORK") {
        const remaining = state.targetTimestamp - Date.now();
        displayMs = Math.max(0, remaining);
        if (state.totalDurationMs > 0) {
            percent = displayMs / state.totalDurationMs;
        } else {
            percent = 0;
        }
    } else if (state.currentState === "AWAITING_CONFIRMATION") {
        displayMs = 0;
        percent = 0;
    } else if (state.currentState === "REWARD") {
        const remaining = state.targetTimestamp - Date.now();
        displayMs = Math.max(0, remaining);
        if (state.totalDurationMs > 0) {
            percent = displayMs / state.totalDurationMs;
        } else {
            percent = 0;
        }
    }

    timerDisplay.textContent = formatTime(displayMs);

    // SVG ring offset
    const offset = RING_CIRCUMFERENCE * (1 - percent);
    progressRing.style.strokeDashoffset = offset;
}

// State Transitions & Actions
function startWork() {
    if (state.currentState !== "IDLE") return;

    const mins = parseInt(workDurationMinInput.value) || 0;
    const secs = parseInt(workDurationSecInput.value) || 0;
    const durationMs = (mins * 60 + secs) * 1000;

    if (durationMs <= 0) {
        alert("Por favor establece una duración mayor a 0 segundos.");
        return;
    }

    state.currentState = "WORK";
    state.totalDurationMs = durationMs;
    state.targetTimestamp = Date.now() + durationMs;
    state.completedWorkMs = 0;

    saveState();
    broadcastState();
    renderUI();

    startTimerLoop();
}

function confirmReward() {
    if (state.currentState !== "AWAITING_CONFIRMATION") return;

    // Reward calculation: exactly N / 2 ms gained for each N ms of work completed and confirmed.
    const rewardGained = state.completedWorkMs / 2;
    state.rewardBalanceMs = (state.rewardBalanceMs || 0) + rewardGained;

    state.currentState = "REWARD";
    state.totalDurationMs = state.rewardBalanceMs;
    state.targetTimestamp = Date.now() + state.rewardBalanceMs;
    state.completedWorkMs = 0;

    saveState();
    broadcastState();
    renderUI();

    startTimerLoop();
}

function resetTimer() {
    const wasInReward = state.currentState === "REWARD";
    state.currentState = "IDLE";
    state.targetTimestamp = 0;
    state.totalDurationMs = 0;
    state.completedWorkMs = 0;
    // Note: We preserve the reward balance on reset, or can we reset it too? Let's keep the existing balance.
    // If resetting during REWARD state, the remaining reward is set to 0.
    if (wasInReward) {
        state.rewardBalanceMs = 0;
    }

    saveState();
    broadcastState();
    renderUI();

    stopTimerLoop();
}

// Main Precise Timer Loop
function startTimerLoop() {
    stopTimerLoop(); // clear any previous interval

    timerInterval = setInterval(() => {
        const now = Date.now();

        if (state.currentState === "WORK") {
            const remaining = state.targetTimestamp - now;

            // Save state / update on every tick to ensure localStorage is perfectly synchronized
            saveState();

            if (remaining <= 0) {
                // Work timer finished!
                state.currentState = "AWAITING_CONFIRMATION";
                state.completedWorkMs = state.totalDurationMs; // Record completed work N
                state.targetTimestamp = 0;

                stopTimerLoop();
                saveState();
                broadcastState();
                renderUI();
                return;
            }
        } else if (state.currentState === "REWARD") {
            const remaining = state.targetTimestamp - now;

            // In REWARD phase, the remaining time is the active reward balance
            state.rewardBalanceMs = Math.max(0, remaining);
            saveState();

            if (remaining <= 0) {
                // Reward timer finished!
                state.currentState = "IDLE";
                state.rewardBalanceMs = 0;
                state.targetTimestamp = 0;
                state.totalDurationMs = 0;

                stopTimerLoop();
                saveState();
                broadcastState();
                renderUI();
                return;
            }
        }

        updateClockAndProgress();
    }, 30); // 30ms interval for smooth UI and precision
}

function stopTimerLoop() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Handle Page recovery on F5 / Load
function recoverSession() {
    loadState();

    const now = Date.now();

    if (state.currentState === "WORK") {
        const remaining = state.targetTimestamp - now;
        if (remaining <= 0) {
            // Finished while page was closed
            state.currentState = "AWAITING_CONFIRMATION";
            state.completedWorkMs = state.totalDurationMs;
            state.targetTimestamp = 0;
            saveState();
        } else {
            // Continue timer
            startTimerLoop();
        }
    } else if (state.currentState === "REWARD") {
        const remaining = state.targetTimestamp - now;
        if (remaining <= 0) {
            // Reward ended while closed
            state.currentState = "IDLE";
            state.rewardBalanceMs = 0;
            state.targetTimestamp = 0;
            saveState();
        } else {
            state.rewardBalanceMs = remaining;
            startTimerLoop();
        }
    }

    broadcastState();
    renderUI();
}

// Event Listeners
btnStart.addEventListener("click", startWork);
btnConfirm.addEventListener("click", confirmReward);
btnReset.addEventListener("click", resetTimer);

addDomainForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const domain = domainInput.value.trim().toLowerCase();

    // Quick validation
    if (domain && !state.blockedDomains.includes(domain)) {
        state.blockedDomains.push(domain);
        saveState();
        broadcastState();
        renderDomains();
        domainInput.value = "";
    }
});

// Update estimated reward when inputs change
function updateEstimatedReward() {
    const mins = parseInt(workDurationMinInput.value) || 0;
    const secs = parseInt(workDurationSecInput.value) || 0;
    const totalMs = (mins * 60 + secs) * 1000;
    const rewardMs = totalMs / 2;
    estimatedRewardDisplay.textContent = formatTime(rewardMs);
}

workDurationMinInput.addEventListener("input", updateEstimatedReward);
workDurationSecInput.addEventListener("input", updateEstimatedReward);

// Receive sync request messages from content/background script if needed
window.addEventListener("message", (event) => {
    // Only accept messages from ourselves or from content script
    if (event.data && event.data.source === "pomodoro-extension" && event.data.action === "REQUEST_SYNC") {
        broadcastState();
    }
});

// Initialization
recoverSession();
updateEstimatedReward();
