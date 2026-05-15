import { createEditor } from "./editor.js";
import { createRenderer, requestRender } from "./renderer.js";
import { state } from "./state.js";

const cardsRoot = document.querySelector("#cardsRoot");
const languageSelect = document.querySelector("#languageSelect");
const themeToggle = document.querySelector("#themeToggle");
const clockCanvas = document.querySelector("#clockCanvas");
const handsCanvas = document.querySelector("#handsCanvas");
const digitalClock = document.querySelector("#digitalClock");

const themeDefaults = {
  dark: {
    clockFace: "#202020",
    clockFrame: "#ffffff",
    clockTicks: "#ffffff",
    numerals: "#ffffff",
    pin: "#ffffff",
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

function bindDigitalDrag() {
  let dragging = false;
  let startPointer = null;
  let startPosition = null;

  digitalClock.addEventListener("pointerdown", (event) => {
    if (!state.digitalClock) {
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
  updateClockColorInput("clockFrameColor", defaults.clockFrame);
  updateClockColorInput("tickColor", defaults.clockTicks);
  updateClockColorInput("numeralColor", defaults.numerals);
  updateClockColorInput("pinColor", defaults.pin);

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

themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  applyTheme();
});

applyClockClip();
applyDigitalStyle();
applyTheme();
createEditor(cardsRoot, languageSelect, requestRender, applyClockClip, applyDigitalStyle);
createRenderer(clockCanvas, handsCanvas, digitalClock);
bindDigitalDrag();
