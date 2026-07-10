document.addEventListener("DOMContentLoaded", () => {
    loadDashboardData();

    document.getElementById("clearBtn").addEventListener("click", () => {
        if (confirm("Are you sure you want to clear all history? This cannot be undone.")) {
            chrome.storage.local.set({ history: [], bestWpm: 0 }, () => {
                loadDashboardData();
            });
        }
    });
});

function loadDashboardData() {
    chrome.storage.local.get({ history: [], bestWpm: 0 }, (result) => {
        const history = result.history;
        const bestWpm = result.bestWpm;

        document.getElementById("bestWpm").innerText = bestWpm;

        if (history.length === 0) {
            document.getElementById("avgWpm").innerText = "0";
            document.getElementById("avgAcc").innerText = "0";
            document.getElementById("topSite").innerText = "N/A";
            document.getElementById("totalTests").innerText = "0";
            document.getElementById("totalChars").innerText = "0";
            document.getElementById("streakNum").innerText = "0";
            
            const tbody = document.getElementById("historyBody");
            tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No typing tests completed yet. Select some text and start typing!</td></tr>`;
            drawChart([]);
            return;
        }

        let totalWpm = 0;
        let totalAcc = 0;
        const siteCounts = {};

        history.forEach(test => {
            totalWpm += test.wpm;
            totalAcc += test.acc;
            if (test.site) {
                siteCounts[test.site] = (siteCounts[test.site] || 0) + 1;
            }
        });

        const avgWpm = Math.round(totalWpm / history.length);
        const avgAcc = Math.round(totalAcc / history.length);

        let topSite = "N/A";
        let maxCount = 0;
        for (const [site, count] of Object.entries(siteCounts)) {
            if (count > maxCount) {
                maxCount = count;
                topSite = site;
            }
        }

        // Streak
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
                    } else break;
                }
            } else if (dateTimestamps[0] === todayTs - ONE_DAY) {
                streak = 1;
                expectedTs = todayTs - 2 * ONE_DAY;
                for (let i = 1; i < dateTimestamps.length; i++) {
                    if (dateTimestamps[i] === expectedTs) {
                        streak++;
                        expectedTs -= ONE_DAY;
                    } else break;
                }
            }
        }

        // Characters Typed
        const totalChars = history.reduce((sum, t) => sum + (t.chars || 0), 0);

        document.getElementById("avgWpm").innerText = avgWpm;
        document.getElementById("avgAcc").innerText = avgAcc;
        document.getElementById("topSite").innerText = topSite;
        document.getElementById("totalTests").innerText = history.length;
        document.getElementById("totalChars").innerText = totalChars.toLocaleString();
        document.getElementById("streakNum").innerText = streak;

        // Table
        const tbody = document.getElementById("historyBody");
        tbody.innerHTML = "";
        const displayHistory = [...history].reverse();

        displayHistory.forEach(test => {
            const tr = document.createElement("tr");
            const accClass = test.acc >= 90 ? "acc-good" : "";
            const siteDisplay = test.site || "Unknown";

            tr.innerHTML = `
                <td>${test.date} ${test.time}</td>
                <td>${siteDisplay}</td>
                <td class="wpm-cell">${test.wpm}</td>
                <td class="${accClass}">${test.acc}%</td>
            `;
            tbody.appendChild(tr);
        });

        // Chart
        const wpmData = history.map(t => t.wpm);
        drawChart(wpmData);
    });
}

function drawChart(data) {
    const canvas = document.getElementById("wpmChart");
    const ctx = canvas.getContext("2d");

    const rect = canvas.parentElement.getBoundingClientRect();
    const width = rect.width - 48;
    const height = rect.height - 48;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.clearRect(0, 0, width, height);

    if (data.length < 2) {
        ctx.fillStyle = "#444";
        ctx.font = "14px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Need at least 2 tests to show a chart", width / 2, height / 2);
        return;
    }

    const padL = 40;
    const padB = 30;
    const padT = 10;
    const padR = 10;
    const graphW = width - padL - padR;
    const graphH = height - padB - padT;

    const realMax = Math.max(...data, 10);
    const maxY = Math.ceil(realMax / 10) * 10;

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
        const value = (maxY / ySteps) * i;
        const yRatio = value / maxY;
        const y = Math.floor(padT + graphH - yRatio * graphH) + 0.5;

        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(width - padR, y);
        ctx.stroke();

        ctx.fillStyle = "#444";
        ctx.font = "11px Inter, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(Math.round(value), padL - 8, y + 4);
    }

    // Data line
    ctx.beginPath();
    data.forEach((val, i) => {
        const x = padL + (i / (data.length - 1)) * graphW;
        const y = padT + graphH - (val / maxY) * graphH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = "#e2b714";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    // Fill gradient
    ctx.lineTo(padL + graphW, padT + graphH);
    ctx.lineTo(padL, padT + graphH);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, padT, 0, padT + graphH);
    grad.addColorStop(0, "rgba(226, 183, 20, 0.12)");
    grad.addColorStop(1, "rgba(226, 183, 20, 0)");
    ctx.fillStyle = grad;
    ctx.fill();

    // Data points
    data.forEach((val, i) => {
        const x = padL + (i / (data.length - 1)) * graphW;
        const y = padT + graphH - (val / maxY) * graphH;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#e2b714";
        ctx.fill();
    });

    // X labels
    ctx.fillStyle = "#444";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    const labelStep = Math.max(1, Math.floor(data.length / 8));
    for (let i = 0; i < data.length; i += labelStep) {
        const x = padL + (i / (data.length - 1)) * graphW;
        ctx.fillText(`#${i + 1}`, x, height - 6);
    }
}
