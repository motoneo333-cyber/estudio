// Custom node-based testing script to run in the terminal for FSM logic and business rules
// It parses and mocks parts of app.js or reimplements its transitions to prove N / 2 reward logic and precision

const assert = require('assert');

// Simplified FSM model representing app.js logic
class PomodoroFSM {
    constructor() {
        this.currentState = "IDLE";
        this.targetTimestamp = 0;
        this.totalDurationMs = 0;
        this.rewardBalanceMs = 0;
        this.completedWorkMs = 0;
        this.blockedDomains = ["youtube.com"];
    }

    startWork(mins, secs) {
        if (this.currentState !== "IDLE") return;
        const durationMs = (mins * 60 + secs) * 1000;
        if (durationMs <= 0) return;

        this.currentState = "WORK";
        this.totalDurationMs = durationMs;
        this.targetTimestamp = Date.now() + durationMs;
        this.completedWorkMs = 0;
    }

    tick(currentTime) {
        if (this.currentState === "WORK") {
            const remaining = this.targetTimestamp - currentTime;
            if (remaining <= 0) {
                this.currentState = "AWAITING_CONFIRMATION";
                this.completedWorkMs = this.totalDurationMs;
                this.targetTimestamp = 0;
            }
        } else if (this.currentState === "BREAK") {
            const remaining = this.targetTimestamp - currentTime;
            if (remaining <= 0) {
                this.currentState = "IDLE";
                this.targetTimestamp = 0;
                this.totalDurationMs = 0;
            }
        } else if (this.currentState === "REWARD") {
            const remaining = this.targetTimestamp - currentTime;
            this.rewardBalanceMs = Math.max(0, remaining);
            if (remaining <= 0) {
                this.currentState = "IDLE";
                this.rewardBalanceMs = 0;
                this.targetTimestamp = 0;
                this.totalDurationMs = 0;
            }
        }
    }

    confirmReward(breakMins, breakSecs) {
        if (this.currentState !== "AWAITING_CONFIRMATION") return;

        // Exact N / 2 reward formula
        const rewardGained = this.completedWorkMs / 2;
        this.rewardBalanceMs = (this.rewardBalanceMs || 0) + rewardGained;
        this.completedWorkMs = 0;

        const breakDurationMs = (breakMins * 60 + breakSecs) * 1000;
        if (breakDurationMs > 0) {
            this.currentState = "BREAK";
            this.totalDurationMs = breakDurationMs;
            this.targetTimestamp = Date.now() + breakDurationMs;
        } else {
            this.currentState = "IDLE";
            this.totalDurationMs = 0;
            this.targetTimestamp = 0;
        }
    }

    useReward() {
        if (this.currentState !== "IDLE" && this.currentState !== "BREAK") return;
        if (this.rewardBalanceMs <= 0) return;

        this.currentState = "REWARD";
        this.totalDurationMs = this.rewardBalanceMs;
        this.targetTimestamp = Date.now() + this.rewardBalanceMs;
    }

    reset() {
        const wasInReward = this.currentState === "REWARD";
        this.currentState = "IDLE";
        this.targetTimestamp = 0;
        this.totalDurationMs = 0;
        this.completedWorkMs = 0;
        if (wasInReward) {
            this.rewardBalanceMs = 0;
        }
    }

    recover(savedState, currentTime) {
        this.currentState = savedState.currentState;
        this.targetTimestamp = savedState.targetTimestamp;
        this.totalDurationMs = savedState.totalDurationMs;
        this.rewardBalanceMs = savedState.rewardBalanceMs;
        this.completedWorkMs = savedState.completedWorkMs;

        if (this.currentState === "WORK") {
            const remaining = this.targetTimestamp - currentTime;
            if (remaining <= 0) {
                this.currentState = "AWAITING_CONFIRMATION";
                this.completedWorkMs = this.totalDurationMs;
                this.targetTimestamp = 0;
            }
        } else if (this.currentState === "BREAK") {
            const remaining = this.targetTimestamp - currentTime;
            if (remaining <= 0) {
                this.currentState = "IDLE";
                this.targetTimestamp = 0;
                this.totalDurationMs = 0;
            }
        } else if (this.currentState === "REWARD") {
            const remaining = this.targetTimestamp - currentTime;
            if (remaining <= 0) {
                this.currentState = "IDLE";
                this.rewardBalanceMs = 0;
                this.targetTimestamp = 0;
                this.totalDurationMs = 0;
            } else {
                this.rewardBalanceMs = remaining;
            }
        }
    }
}

// RUN TESTS
try {
    console.log("Starting tests...");

    // 1. Initial State
    const fsm = new PomodoroFSM();
    assert.strictEqual(fsm.currentState, "IDLE");
    assert.strictEqual(fsm.rewardBalanceMs, 0);

    // 2. Start Work
    fsm.startWork(10, 0); // 10 minutes = 600,000 ms
    assert.strictEqual(fsm.currentState, "WORK");
    assert.strictEqual(fsm.totalDurationMs, 600000);

    // 3. Complete work session
    fsm.tick(fsm.targetTimestamp); // simulated tick at target time
    assert.strictEqual(fsm.currentState, "AWAITING_CONFIRMATION");
    assert.strictEqual(fsm.completedWorkMs, 600000);
    assert.strictEqual(fsm.rewardBalanceMs, 0); // Should remain 0 BEFORE confirmation!

    // 4. Confirm Reward (transitions to BREAK state, and does NOT auto-start reward)
    fsm.confirmReward(5, 0); // 5 minutes break
    assert.strictEqual(fsm.currentState, "BREAK");
    assert.strictEqual(fsm.rewardBalanceMs, 300000); // 600,000 / 2 = 300,000 ms (exactly 5 minutes)
    assert.strictEqual(fsm.completedWorkMs, 0);

    // 5. Use Reward (Can trigger manual reward from BREAK or IDLE)
    fsm.useReward();
    assert.strictEqual(fsm.currentState, "REWARD");
    assert.strictEqual(fsm.totalDurationMs, 300000);

    // 6. Complete reward
    fsm.tick(fsm.targetTimestamp);
    assert.strictEqual(fsm.currentState, "IDLE");
    assert.strictEqual(fsm.rewardBalanceMs, 0);

    // 7. Test persistence and recovery (F5 reload)
    const fsm2 = new PomodoroFSM();
    fsm2.startWork(25, 0); // 1,500,000 ms
    const saved = {
        currentState: fsm2.currentState,
        targetTimestamp: fsm2.targetTimestamp,
        totalDurationMs: fsm2.totalDurationMs,
        rewardBalanceMs: fsm2.rewardBalanceMs,
        completedWorkMs: fsm2.completedWorkMs
    };

    // Recover mid-work
    const recoveredFsm = new PomodoroFSM();
    const midTime = fsm2.targetTimestamp - 100000; // 100s remaining
    recoveredFsm.recover(saved, midTime);
    assert.strictEqual(recoveredFsm.currentState, "WORK");
    assert.strictEqual(recoveredFsm.targetTimestamp - midTime, 100000);

    // Recover after work finished in background
    const finishedTime = fsm2.targetTimestamp + 5000; // 5s past end
    const recoveredFsm2 = new PomodoroFSM();
    recoveredFsm2.recover(saved, finishedTime);
    assert.strictEqual(recoveredFsm2.currentState, "AWAITING_CONFIRMATION");
    assert.strictEqual(recoveredFsm2.completedWorkMs, 1500000);

    console.log("✅ All new FSM, Break state, and 'Usar Recompensa' unit tests passed successfully!");
} catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
}
