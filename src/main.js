import { createEditor } from "./editor.js";
import { createRenderer, getCurrentClockTimeOfDayMs, pauseClock, playClock, requestRender, setFixedClockTime, startClockTest, useRealtimeClock } from "./renderer.js";
import { state } from "./state.js";

const cardsRoot = document.querySelector("#cardsRoot");
const languageSelect = document.querySelector("#languageSelect");
const pauseButton = document.querySelector("#pauseButton");
const playButton = document.querySelector("#playButton");
const realtimeButton = document.querySelector("#realtimeButton");
const testButton = document.querySelector("#testButton");
const themeToggle = document.querySelector("#themeToggle");
const clockCanvas = document.querySelector("#clockCanvas");
const handsCanvas = document.querySelector("#handsCanvas");
const digitalClock = document.querySelector("#digitalClock");
const digitalClockText = document.querySelector("#digitalClockText");

const themeDefaults = {
  dark: {
    clockFace: "#202020",
    clockFrame: "#ffffff",
    clockTicks: "#ffffff",
    numerals: "#ffffff",
    pin: "#ffffff",
    hands: {
      hour: "#f1f1f1",
      minute: "#d7ecff",
      second: "#ff786f",
    },
    digitalBorder: "#3b3b3b",
    digitalText: "#f3f3f3",
    digitalBackground: "#222222",
  },
  light: {
    clockFace: "#f8fafc",
    clockFrame: "#18212b",
    clockTicks: "#18212b",
    numerals: "#18212b",
    pin: "#18212b",
    hands: {
      hour: "#18212b",
      minute: "#1677c8",
      second: "#c7322b",
    },
    digitalBorder: "#cfd6df",
    digitalText: "#18212b",
    digitalBackground: "#ffffff",
  },
};

function applyClockClip() {
  clockCanvas.classList.toggle("clip-circle", state.clockClip === "circle");
  clockCanvas.classList.toggle("clip-square", state.clockClip === "square");
  clockCanvas.classList.toggle("clip-none", state.clockClip === "none");
  clockCanvas.classList.toggle("frame-hidden", !state.clockFrameVisible);
}

function applyDigitalStyle() {
  const style = state.digitalStyle;
  digitalClock.style.fontSize = `${style.size}px`;
  digitalClock.style.opacity = String(style.opacity);
  digitalClock.style.borderColor = style.borderTransparent ? "transparent" : style.borderColor;
  digitalClock.style.color = style.textTransparent ? "transparent" : style.textColor;
  digitalClock.style.backgroundColor = style.backgroundTransparent ? "transparent" : style.backgroundColor;
  digitalClock.style.transform = `translate(-50%, -50%) translate(${state.digitalPosition.x}px, ${state.digitalPosition.y}px)`;
  digitalClock.classList.toggle("hidden", !state.digitalClock);
}

function parseDigitalTime(value) {
  const match = value.trim().match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] === undefined ? 0 : Number(match[3]);

  if (hours > 23 || minutes > 59 || seconds > 59) {
    return null;
  }

  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

function formatTimeOfDay(timeOfDayMs) {
  const totalSeconds = Math.floor(timeOfDayMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function normalizeTimeOfDayMs(timeOfDayMs) {
  const dayMs = 24 * 60 * 60 * 1000;
  return ((timeOfDayMs % dayMs) + dayMs) % dayMs;
}

function splitTimeOfDay(timeOfDayMs) {
  const totalSeconds = Math.round(normalizeTimeOfDayMs(timeOfDayMs) / 1000) % (24 * 60 * 60);

  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function bindDigitalTimeInput() {
  let lastValidText = digitalClockText.textContent;
  digitalClockText.contentEditable = "plaintext-only";
  digitalClockText.inputMode = "numeric";
  digitalClockText.spellcheck = false;
  digitalClockText.setAttribute("aria-label", "Time input");

  function commit() {
    const timeOfDayMs = parseDigitalTime(digitalClockText.textContent);

    if (timeOfDayMs === null) {
      digitalClockText.textContent = lastValidText;
      requestRender();
      return;
    }

    setFixedClockTime(timeOfDayMs);
    lastValidText = formatTimeOfDay(timeOfDayMs);
    digitalClockText.textContent = lastValidText;
    applyTimeButtons();
    requestRender();
  }

  digitalClockText.addEventListener("focus", () => {
    lastValidText = digitalClockText.textContent;
    digitalClockText.classList.add("editing");
  });

  digitalClockText.addEventListener("blur", () => {
    digitalClockText.classList.remove("editing");
    commit();
  });

  digitalClockText.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      digitalClockText.blur();
    }
  });
}

function bindDigitalDrag() {
  let dragging = false;
  let startPointer = null;
  let startPosition = null;

  digitalClock.addEventListener("pointerdown", (event) => {
    if (!state.digitalClock || event.target.closest(".digital-clock-text")) {
      return;
    }

    dragging = true;
    startPointer = { x: event.clientX, y: event.clientY };
    startPosition = { ...state.digitalPosition };
    digitalClock.setPointerCapture(event.pointerId);
  });

  digitalClock.addEventListener("pointermove", (event) => {
    if (!dragging) {
      return;
    }

    state.digitalPosition.x = Math.round(startPosition.x + event.clientX - startPointer.x);
    state.digitalPosition.y = Math.round(startPosition.y + event.clientY - startPointer.y);
    applyDigitalStyle();
    requestRender();
  });

  digitalClock.addEventListener("pointerup", (event) => {
    dragging = false;
    digitalClock.releasePointerCapture(event.pointerId);
  });

  digitalClock.addEventListener("pointercancel", () => {
    dragging = false;
  });
}

function applyTheme() {
  const defaults = themeDefaults[state.theme];

  document.body.dataset.theme = state.theme;
  themeToggle.textContent = state.theme === "light" ? "\u263c" : "\u263d";
  themeToggle.setAttribute("aria-label", state.theme === "light" ? "Light theme" : "Dark theme");

  state.backgroundColor = defaults.clockFace;
  state.clockFrameColor = defaults.clockFrame;
  state.tickColor = defaults.clockTicks;
  state.numeralColor = defaults.numerals;
  state.pinColor = defaults.pin;
  for (const [hand, color] of Object.entries(defaults.hands)) {
    if (!state.defaultHandColorCustom[hand]) {
      state.defaultHandColors[hand] = color;
    }
  }
  updateClockColorInput("backgroundColor", defaults.clockFace);
  updateClockColorInput("clockFrameColor", defaults.clockFrame);
  updateClockColorInput("tickColor", defaults.clockTicks);
  updateClockColorInput("numeralColor", defaults.numerals);
  updateClockColorInput("pinColor", defaults.pin);
  for (const hand of Object.keys(defaults.hands)) {
    updateClockColorInput(`defaultHandColors.${hand}`, state.defaultHandColors[hand]);
    document.documentElement.style.setProperty(`--dummy-${hand}-color`, state.defaultHandColors[hand]);
  }

  applyThemeColorDefault("borderColor", defaults.digitalBorder);
  applyThemeColorDefault("textColor", defaults.digitalText);
  applyThemeColorDefault("backgroundColor", defaults.digitalBackground);
  applyDigitalStyle();
  requestRender();
}

function applyThemeColorDefault(property, value) {
  if (state.digitalStyleCustom[property]) {
    return;
  }

  state.digitalStyle[property] = value;
  document.querySelectorAll(`[data-digital-color="${property}"]`).forEach((input) => {
    input.value = value;
  });
}

function updateClockColorInput(property, value) {
  document.querySelectorAll(`[data-clock-color="${property}"]`).forEach((input) => {
    input.value = value;
  });
}

function applyTimeButtons() {
  if (!pauseButton || !playButton || !realtimeButton || !testButton) {
    return;
  }

  realtimeButton.disabled = state.timeMode.mode === "realtime";
  playButton.disabled = state.timeMode.mode !== "fixed";
}

function bindHandTimeDrag() {
  let dragState = null;

  function getPointerInfo(event) {
    const rect = handsCanvas.getBoundingClientRect();
    const scaleX = rect.width / handsCanvas.width || 1;
    const scaleY = rect.height / handsCanvas.height || 1;
    const centerX = (Number(handsCanvas.dataset.centerX) || handsCanvas.width / 2) * scaleX;
    const centerY = (Number(handsCanvas.dataset.centerY) || handsCanvas.height / 2) * scaleY;
    const x = event.clientX - rect.left - centerX;
    const y = event.clientY - rect.top - centerY;

    return {
      angle: (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360,
      distance: Math.sqrt(x ** 2 + y ** 2) / Math.max(scaleX, scaleY),
    };
  }

  function shortestAngleDistance(a, b) {
    return Math.abs(((a - b + 540) % 360) - 180);
  }

  function getNearestHand(pointer, timeOfDayMs) {
    const time = splitTimeOfDay(timeOfDayMs);
    const secondAngle = time.seconds * 6;
    const minuteAngle = time.minutes * 6 + time.seconds * 0.1;
    const hourAngle = (time.hours % 12) * 30 + time.minutes * 0.5;
    const hitAreas = {
      hour: { maxAngle: 18, minDistance: 16, maxDistance: 130 },
      minute: { maxAngle: 12, minDistance: 20, maxDistance: 170 },
      second: { maxAngle: 8, minDistance: 24, maxDistance: 190 },
    };

    return [
      { hand: "second", angleDistance: shortestAngleDistance(pointer.angle, secondAngle), visible: state.handVisible.second },
      { hand: "minute", angleDistance: shortestAngleDistance(pointer.angle, minuteAngle), visible: state.handVisible.minute },
      { hand: "hour", angleDistance: shortestAngleDistance(pointer.angle, hourAngle), visible: state.handVisible.hour },
    ]
      .filter(({ hand, angleDistance, visible }) => {
        const area = hitAreas[hand];
        return visible
          && angleDistance <= area.maxAngle
          && pointer.distance >= area.minDistance
          && pointer.distance <= area.maxDistance;
      })
      .sort((a, b) => a.angleDistance - b.angleDistance)[0]?.hand ?? null;
  }

  function updateDraggedTime(event) {
    const { angle } = getPointerInfo(event);
    const angleDelta = ((angle - dragState.lastAngle + 540) % 360) - 180;
    let timeDeltaMs;

    dragState.angleDelta += angleDelta;
    dragState.lastAngle = angle;

    if (dragState.hand === "hour") {
      timeDeltaMs = Math.round(dragState.angleDelta * 2) * 60 * 1000;
    } else if (dragState.hand === "minute") {
      timeDeltaMs = Math.round(dragState.angleDelta / 6) * 60 * 1000;
    } else {
      timeDeltaMs = Math.round(dragState.angleDelta / 6) * 1000;
    }

    const nextTimeMs = normalizeTimeOfDayMs(dragState.baseTimeMs + timeDeltaMs);
    setFixedClockTime(nextTimeMs);
    digitalClockText.textContent = formatTimeOfDay(nextTimeMs);
    applyTimeButtons();
    requestRender();
  }

  function updateHandHover(event) {
    if (dragState) {
      handsCanvas.classList.add("hand-hover");
      return;
    }

    const baseTimeMs = getCurrentClockTimeOfDayMs();
    const hand = getNearestHand(getPointerInfo(event), baseTimeMs);
    handsCanvas.classList.toggle("hand-hover", Boolean(hand));
  }

  handsCanvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target !== handsCanvas) {
      return;
    }

    const baseTimeMs = getCurrentClockTimeOfDayMs();
    const pointer = getPointerInfo(event);
    const hand = getNearestHand(pointer, baseTimeMs);

    if (!hand) {
      return;
    }

    dragState = {
      hand,
      baseTimeMs,
      lastAngle: pointer.angle,
      angleDelta: 0,
    };
    handsCanvas.setPointerCapture(event.pointerId);
    setFixedClockTime(baseTimeMs);
    digitalClockText.textContent = formatTimeOfDay(baseTimeMs);
    applyTimeButtons();
    requestRender();
  });

  handsCanvas.addEventListener("pointermove", (event) => {
    if (!dragState) {
      updateHandHover(event);
      return;
    }

    updateDraggedTime(event);
  });

  handsCanvas.addEventListener("pointerup", (event) => {
    if (!dragState) {
      return;
    }

    dragState = null;
    handsCanvas.releasePointerCapture(event.pointerId);
    updateHandHover(event);
  });

  handsCanvas.addEventListener("pointercancel", () => {
    dragState = null;
    handsCanvas.classList.remove("hand-hover");
  });

  handsCanvas.addEventListener("pointerleave", () => {
    if (!dragState) {
      handsCanvas.classList.remove("hand-hover");
    }
  });
}

function bindTimeControls() {
  pauseButton?.addEventListener("click", () => {
    pauseClock();
    applyTimeButtons();
    requestRender();
  });

  playButton?.addEventListener("click", () => {
    playClock();
    applyTimeButtons();
    requestRender();
  });

  realtimeButton?.addEventListener("click", () => {
    useRealtimeClock();
    applyTimeButtons();
    requestRender();
  });

  testButton?.addEventListener("click", () => {
    startClockTest();
    applyTimeButtons();
    requestRender();
  });
}
themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  applyTheme();
});

applyClockClip();
applyDigitalStyle();
bindTimeControls();
applyTimeButtons();
applyTheme();
createEditor(cardsRoot, languageSelect, requestRender, applyClockClip, applyDigitalStyle);
createRenderer(clockCanvas, handsCanvas, digitalClock);
bindDigitalTimeInput();
bindDigitalDrag();
bindHandTimeDrag();
