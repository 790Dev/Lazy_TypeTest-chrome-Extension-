let testState = {
  chars: [],
  currentIndex: 0,
  startTime: null,
  errors: 0,
  correctChars: 0,
  totalTyped: 0,
  timerInterval: null,
  wpmHistory: [],
  isActive: false,
};

let overlayDiv = null;
let caretDiv = null;
let statsDiv = null;
let resultsDiv = null;

window.addEventListener('resize', () => {
  if (testState.isActive) {
    testState.chars.forEach(item => {
      item.pos = {
        left: item.span.offsetLeft,
        top: item.span.offsetTop,
        width: item.span.offsetWidth,
        height: item.span.offsetHeight
      };
    });
    updateCaret();
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "initTest") setupTest();
});

function getEffectiveBackgroundColor(el) {
  let current = el;
  while (current) {
    const style = window.getComputedStyle(current);
    const bgColor = style.backgroundColor;
    if (
      bgColor &&
      bgColor !== "rgba(0, 0, 0, 0)" &&
      bgColor !== "transparent"
    ) {
      return bgColor;
    }
    current = current.parentElement;
  }
  return "white";
}

function setupTest() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);

  [overlayDiv, statsDiv, resultsDiv].forEach((el) => el && el.remove());
  testState = {
    chars: [],
    currentIndex: 0,
    startTime: null,
    errors: 0,
    correctChars: 0,
    totalTyped: 0,
    timerInterval: null,
    wpmHistory: [],
    isActive: true,
  };

  const parentElement =
    range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;

  const parentStyle = window.getComputedStyle(parentElement);
  const rect = range.getBoundingClientRect();
  const detectedBg = getEffectiveBackgroundColor(parentElement);
  const detectedColor = parentStyle.color;

  const fragment = range.cloneContents();

  overlayDiv = document.createElement("div");
  overlayDiv.className = "tt-overlay-container";
  overlayDiv.style.top = window.scrollY + rect.top + "px";
  overlayDiv.style.left = window.scrollX + rect.left + "px";
  overlayDiv.style.width = rect.width + "px";
  overlayDiv.style.height = rect.height + "px";

  overlayDiv.style.fontFamily = parentStyle.fontFamily;
  overlayDiv.style.fontSize = parentStyle.fontSize;
  overlayDiv.style.lineHeight = parentStyle.lineHeight;
  overlayDiv.style.letterSpacing = parentStyle.letterSpacing;
  overlayDiv.style.textAlign = parentStyle.textAlign;
  overlayDiv.style.whiteSpace = parentStyle.whiteSpace;

  const rgbMatch = detectedColor.match(/\d+/g);
  let dimColor = "rgba(128, 128, 128, 0.4)";
  if (rgbMatch && rgbMatch.length >= 3) {
    dimColor = `rgba(${rgbMatch[0]}, ${rgbMatch[1]}, ${rgbMatch[2]}, 0.35)`;
  }

  overlayDiv.style.setProperty("--tt-color-dim", dimColor);
  overlayDiv.style.setProperty("--tt-color-full", detectedColor);

  overlayDiv.style.backgroundColor = detectedBg;

  overlayDiv.appendChild(fragment);
  processTextNodes(overlayDiv);

  document.body.appendChild(overlayDiv);

  // Cache positions AFTER appending to DOM so layout is calculated
  testState.chars.forEach(item => {
    item.pos = {
      left: item.span.offsetLeft,
      top: item.span.offsetTop,
      width: item.span.offsetWidth,
      height: item.span.offsetHeight
    };
  });

  caretDiv = document.createElement("div");
  caretDiv.className = "tt-caret";
  overlayDiv.appendChild(caretDiv);

  selection.removeAllRanges();

  createStatsBox();
  updateCaret();

  document.addEventListener("keydown", handleTyping);
  overlayDiv.click();
}

function normalizeChar(char) {
  // Non-breaking space → regular space
  if (char === "\u00A0") return " ";
  // Various Unicode dashes → regular hyphen
  if ("\u2013\u2014\u2015\u2212".includes(char)) return "-";
  // Smart quotes → regular quotes
  if ("\u2018\u2019\u201A".includes(char)) return "'";
  if ("\u201C\u201D\u201E".includes(char)) return '"';
  // Ellipsis → keep as-is (user can't easily type it)
  return char;
}

function isInvisibleChar(char) {
  // Zero-width and other invisible Unicode characters
  return /[\u200B\u200C\u200D\uFEFF\u00AD]/.test(char);
}

function processTextNodes(element) {
  const childNodes = Array.from(element.childNodes);

  childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      const text = node.nodeValue;
      if (text.length === 0) return;

      const spanFragment = document.createDocumentFragment();

      // Use Array.from for proper Unicode handling (surrogate pairs)
      Array.from(text).forEach((char) => {
        // Skip invisible zero-width characters entirely
        if (isInvisibleChar(char)) return;

        const normalized = normalizeChar(char);
        const span = document.createElement("span");
        span.textContent = char;
        span.className = "tt-char";
        testState.chars.push({ char: normalized, span: span });
        spanFragment.appendChild(span);
      });

      node.parentNode.replaceChild(spanFragment, node);
    } else if (node.nodeType === 1) {
      processTextNodes(node);
    }
  });
}

function updateCaret() {
  if (!testState.isActive) return;

  let targetPos;
  if (testState.currentIndex >= testState.chars.length) {
    const lastItem = testState.chars[testState.chars.length - 1];
    if (lastItem && lastItem.pos) {
      targetPos = {
        left: lastItem.pos.left + lastItem.pos.width,
        top: lastItem.pos.top,
        height: lastItem.pos.height
      };
    }
  } else {
    targetPos = testState.chars[testState.currentIndex].pos;
  }

  if (targetPos) {
    caretDiv.style.transform = `translate(${targetPos.left}px, ${targetPos.top}px)`;
    caretDiv.style.height = targetPos.height + "px";
  }
}

function createStatsBox() {
  statsDiv = document.createElement("div");
  statsDiv.className = "tt-stats-box";
  statsDiv.innerHTML = `
        <div class="tt-instructions">
            <div class="tt-instruct-item"><span class="tt-dot"></span><span>Press <span class="tt-key">[Tab]</span> to skip word</span></div>
            <div class="tt-instruct-item"><span class="tt-dot"></span><span>Press <span class="tt-key">[ESC]</span> to finish</span></div>
        </div>
        <div class="tt-stats-area">
            <div class="tt-stats-row"><span class="tt-label">Time:</span><span class="tt-value" id="tt-time">0s</span></div>
            <div class="tt-stats-row"><span class="tt-label">Speed:</span><span class="tt-value"><span id="tt-wpm">0</span> WPM</span></div>
            <div class="tt-stats-row"><span class="tt-label">Accuracy:</span><span class="tt-value"><span id="tt-acc">100</span>%</span></div>
        </div>
    `;
  document.body.appendChild(statsDiv);
}

function handleTyping(e) {
  const navKeys = [
    " ",
    "Tab",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "PageUp",
    "PageDown",
    "Home",
    "End",
  ];
  if (navKeys.includes(e.key)) {
    e.preventDefault();
  }

  if (e.key === "Escape") {
    endTest();
    return;
  }

  if (!testState.startTime && e.key.length === 1) {
    testState.startTime = new Date();
    testState.timerInterval = setInterval(updateStats, 1000);
  }

  const currentItem = testState.chars[testState.currentIndex];
  const targetChar = currentItem ? currentItem.char : null;

  if (e.key === "Backspace") {
    if (testState.currentIndex > 0) {
      testState.currentIndex--;
      const item = testState.chars[testState.currentIndex];
      
      if (item.span.classList.contains("correct")) {
        testState.correctChars--;
      } else if (item.span.classList.contains("incorrect")) {
        testState.errors--;
      }

      item.span.classList.remove("correct", "incorrect");
      updateCaret();
    }
    return;
  }

  if (e.key === "Tab") {
    let idx = testState.currentIndex;
    const chars = testState.chars;

    while (idx < chars.length && chars[idx].char !== " ") {
      idx++;
    }
    if (idx < chars.length && chars[idx].char === " ") {
      idx++;
    }

    testState.currentIndex = idx;
    if (testState.currentIndex >= chars.length) endTest();
    else updateCaret();
    return;
  }

  if (e.key === "Enter") {
    if (targetChar === "\n" || targetChar === "\r") {
      currentItem.span.classList.add("correct");
      testState.correctChars++;
      testState.totalTyped++;
      testState.currentIndex++;
      if (testState.currentIndex >= testState.chars.length) endTest();
      else updateCaret();
    }
    return;
  }

  if (e.key.length === 1) {
    if (e.key === targetChar) {
      currentItem.span.classList.add("correct");
      testState.correctChars++;
    } else {
      currentItem.span.classList.add("incorrect");
      testState.errors++;
    }
    testState.totalTyped++;

    testState.currentIndex++;

    if (testState.currentIndex >= testState.chars.length) endTest();
    else updateCaret();
  }
}

function updateStats() {
  const elapsedSec = Math.floor((new Date() - testState.startTime) / 1000);
  const wpm = Math.round((testState.correctChars / 5) / (elapsedSec / 60));
  const accuracy =
    testState.totalTyped === 0
      ? 100
      : Math.round((testState.correctChars / testState.totalTyped) * 100);

  testState.wpmHistory.push(isFinite(wpm) ? wpm : 0);
  document.getElementById("tt-time").innerText = elapsedSec + "s";
  document.getElementById("tt-wpm").innerText = isFinite(wpm) ? wpm : 0;
  document.getElementById("tt-acc").innerText = accuracy;
}

function endTest() {
  clearInterval(testState.timerInterval);
  document.removeEventListener("keydown", handleTyping);
  testState.isActive = false;
  if (statsDiv) statsDiv.remove();
  showResults();
}

function showResults() {
  const finalWpm =
    testState.wpmHistory.length > 0
      ? testState.wpmHistory[testState.wpmHistory.length - 1]
      : 0;
  const accuracy =
    testState.totalTyped === 0
      ? 0
      : Math.round((testState.correctChars / testState.totalTyped) * 100);

  chrome.storage.local.get({ history: [], bestWpm: 0 }, (result) => {
    const history = result.history;
    let bestWpm = result.bestWpm;

    if (finalWpm > bestWpm) bestWpm = finalWpm;

    history.push({
      site: window.location.hostname,
      wpm: finalWpm,
      acc: accuracy,
      chars: testState.totalTyped,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    if (history.length > 50) history.shift();

    chrome.storage.local.set({ history: history, bestWpm: bestWpm });
  });

  resultsDiv = document.createElement("div");
  resultsDiv.className = "tt-results-box";
  resultsDiv.innerHTML = `
        <div class="tt-res-header">
            <div class="tt-big-stat"><span class="tt-big-label">WPM</span><span class="tt-big-val">${finalWpm}</span></div>
            <div class="tt-big-stat"><span class="tt-big-label">ACC</span><span class="tt-big-val">${accuracy}%</span></div>
        </div>
        <div class="tt-graph-container">
            <canvas id="ttGraph"></canvas>
        </div>
        <div class="tt-actions">
            <button class="tt-btn" id="ttCloseBtn">Close</button>
        </div>
    `;
  document.body.appendChild(resultsDiv);

  document.getElementById("ttCloseBtn").onclick = () => {
    resultsDiv.remove();
    overlayDiv.remove();
  };

  drawGraph(testState.wpmHistory);
}

function drawGraph(data) {
  const canvas = document.getElementById("ttGraph");
  const ctx = canvas.getContext("2d");

  const rect = canvas.parentElement.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;


  const padL = 30;
  const padB = 45;
  const padT = 15;
  const padR = 10;
  const graphW = width - padL - padR;
  const graphH = height - padB - padT;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  if (data.length < 2) return;

  const realMax = Math.max(...data, 10);
  const maxY = Math.ceil(realMax / 10) * 10;

  const totalTime = data.length;
  let timeStep = 5;
  if (totalTime > 120) timeStep = 30;
  else if (totalTime > 60) timeStep = 10;
  else if (totalTime > 30) timeStep = 5;
  else if (totalTime > 10) timeStep = 2;
  else timeStep = 1;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();

  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const value = (maxY / ySteps) * i;
    const yRatio = value / maxY;
    const y = padT + graphH - yRatio * graphH;
    const snapY = Math.floor(y) + 0.5;

    ctx.moveTo(padL, snapY);
    ctx.lineTo(width - padR, snapY);

    ctx.fillStyle = "#555";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(Math.round(value), padL - 6, y + 3);
  }

  for (let t = 0; t < totalTime; t += timeStep) {
    if (t === 0) continue;

    const xRatio = t / (totalTime - 1);
    const x = padL + xRatio * graphW;
    const snapX = Math.floor(x) + 0.5;

    ctx.moveTo(snapX, padT);
    ctx.lineTo(snapX, height - padB);

    ctx.fillStyle = "#555";
    ctx.textAlign = "center";
   
    ctx.fillText(t, x, height - padB + 15);
  }
  ctx.stroke();

  ctx.save();
  ctx.fillStyle = "#444";
  ctx.font = "bold 9px sans-serif";
  ctx.textAlign = "center";


  ctx.fillText("Time Elapsed (sec)", padL + graphW / 2, height - 8);

  // Y Title
  ctx.translate(10, padT + graphH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("WPM", 0, 0);
  ctx.restore();

  ctx.beginPath();
  data.forEach((val, i) => {
    const xRatio = i / (data.length - 1);
    const yRatio = val / maxY;

    const x = padL + xRatio * graphW;
    const y = padT + graphH - yRatio * graphH;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.lineTo(padL + graphW, padT + graphH);
  ctx.lineTo(padL, padT + graphH);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, padT, 0, height - padB);
  grad.addColorStop(0, "rgba(59, 130, 246, 0.15)");
  grad.addColorStop(1, "rgba(59, 130, 246, 0)");
  ctx.fillStyle = grad;
  ctx.fill();
}

