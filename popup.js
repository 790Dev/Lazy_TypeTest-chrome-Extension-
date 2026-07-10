document.addEventListener("DOMContentLoaded", () => {
  loadHistory();

  document.getElementById("clearBtn").addEventListener("click", () => {
    chrome.storage.local.set({ history: [], bestWpm: 0 }, () => {
      loadHistory();
    });
  });

  document.getElementById("dashboardBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  });
});

function loadHistory() {
  
  chrome.storage.local.get({ history: [], bestWpm: 0 }, (result) => {
    const history = result.history.reverse();
    const listContainer = document.getElementById("historyList");
    const bestWpmEl = document.getElementById("bestWpm");

    listContainer.innerHTML = "";

    // Display the stored All-Time Best
    bestWpmEl.innerText = result.bestWpm;

    // Calculate and display Streak
    const uniqueDates = [...new Set(history.map(item => item.date))];
    const dateTimestamps = uniqueDates.map(dateStr => {
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }).sort((a, b) => b - a);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    let streak = 0;
    let expectedTs = todayTs;

    if (dateTimestamps.length > 0) {
        if (dateTimestamps[0] === todayTs) {
            streak = 1;
            expectedTs = todayTs - ONE_DAY;
            for (let i = 1; i < dateTimestamps.length; i++) {
                if (dateTimestamps[i] === expectedTs) {
                    streak++;
                    expectedTs -= ONE_DAY;
                } else {
                    break;
                }
            }
        } else if (dateTimestamps[0] === todayTs - ONE_DAY) {
            streak = 1;
            expectedTs = todayTs - 2 * ONE_DAY;
            for (let i = 1; i < dateTimestamps.length; i++) {
                if (dateTimestamps[i] === expectedTs) {
                    streak++;
                    expectedTs -= ONE_DAY;
                } else {
                    break;
                }
            }
        }
    }
    
    document.getElementById("streakNum").innerText = streak;

    if (history.length === 0) {
      listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#444; font-size:13px;">No tests taken yet.</div>`;
      return;
    }

    history.forEach((item) => {
      const div = document.createElement("div");
      div.className = "history-item";

      const accClass = item.acc >= 90 ? "good" : "";

      div.innerHTML = `
                <div class="item-left">
                    <span class="item-date">${item.date} • ${item.time}</span>
                    <span class="item-wpm">${item.wpm} WPM</span>
                </div>
                <div class="item-right">
                    <span class="item-acc ${accClass}">${item.acc}%</span>
                </div>
            `;
      listContainer.appendChild(div);
    });
  });
}
