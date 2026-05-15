export const PARTS = ["background", "hour", "minute", "second"];
export const HANDS = ["hour", "minute", "second"];

export const partLabels = {
  en: {
    background: "Background",
    hour: "Hour",
    minute: "Minute",
    second: "Second",
  },
  ja: {
    background: "\u80cc\u666f",
    hour: "\u6642",
    minute: "\u5206",
    second: "\u79d2",
  },
};

function getInitialLanguage() {
  const browserLanguage = typeof navigator === "undefined" ? "" : navigator.language?.toLowerCase() ?? "";
  return browserLanguage.startsWith("en") ? "en" : "ja";
}

function getInitialTheme() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

const defaultTransforms = {
  background: {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    followRotation: false,
  },
  hour: {
    x: 0,
    y: -82,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    followRotation: true,
  },
  minute: {
    x: 0,
    y: -112,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    followRotation: true,
  },
  second: {
    x: 0,
    y: -130,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    followRotation: true,
  },
};

const defaultDigitalStyle = {
  size: 44,
  opacity: 1,
  borderColor: "#3b3b3b",
  borderTransparent: false,
  textColor: "#f3f3f3",
  textTransparent: false,
  backgroundColor: "#222222",
  backgroundTransparent: false,
};

const digitalThemeDefaults = {
  dark: {
    borderColor: "#3b3b3b",
    textColor: "#f3f3f3",
    backgroundColor: "#222222",
  },
  light: {
    borderColor: "#cfd6df",
    textColor: "#18212b",
    backgroundColor: "#ffffff",
  },
};

const defaultDigitalStyleCustom = {
  borderColor: false,
  textColor: false,
  backgroundColor: false,
};

const defaultDigitalPosition = {
  x: 0,
  y: 340,
};

const defaultHandVisible = {
  hour: true,
  minute: true,
  second: true,
};

export const state = {
  backgroundColor: "#202020",
  digitalClock: true,
  theme: getInitialTheme(),
  digitalStyle: structuredClone(defaultDigitalStyle),
  digitalStyleCustom: structuredClone(defaultDigitalStyleCustom),
  digitalPosition: structuredClone(defaultDigitalPosition),
  language: getInitialLanguage(),
  clockClip: "circle",
  clockFrameVisible: true,
  clockFrameColor: "#ffffff",
  clockFrameSize: 1,
  tickShape: "circle",
  tickVisible: true,
  tickColor: "#ffffff",
  tickSize: 1,
  numeralsVisible: false,
  numeralType: "arabic",
  numeralColor: "#ffffff",
  numeralSize: 24,
  pinVisible: true,
  pinColor: "#ffffff",
  smoothHands: false,
  handOrder: [...HANDS],
  handVisible: structuredClone(defaultHandVisible),
  parts: {
    background: null,
    hour: null,
    minute: null,
    second: null,
  },
  transform: structuredClone(defaultTransforms),
};

export function getTransform(part) {
  return state.transform[part];
}

export function resetTransform(part) {
  state.transform[part] = structuredClone(defaultTransforms[part]);
}

export function setPartImage(part, imageData) {
  state.parts[part] = imageData;
}

export function resetHandDisplay() {
  state.handOrder = [...HANDS];
  state.handVisible = structuredClone(defaultHandVisible);
  state.pinVisible = true;
  state.smoothHands = false;
}

export function resetDigitalDisplay() {
  state.digitalClock = true;
  state.digitalStyle = structuredClone(defaultDigitalStyle);
  Object.assign(state.digitalStyle, digitalThemeDefaults[state.theme]);
  state.digitalStyleCustom = structuredClone(defaultDigitalStyleCustom);
  state.digitalPosition = structuredClone(defaultDigitalPosition);
}
