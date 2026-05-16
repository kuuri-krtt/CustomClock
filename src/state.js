export const PARTS = ["background", "hour", "minute", "second"];
export const HANDS = ["second", "minute", "hour"];

const BASE_SIZE = 560;
const BASE_FRAME_RADIUS = BASE_SIZE * 0.44;
const FRAME_FIT_MARGIN = 8;

const loadedImageFitFactor = {
  background: 0.98,
  second: 0.96,
  minute: 0.65,
  hour: 0.45,
};

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
  "zh-CN": {
    background: "\u80cc\u666f",
    hour: "\u65f6",
    minute: "\u5206",
    second: "\u79d2",
  },
};

function getInitialLanguage() {
  const browserLanguage = typeof navigator === "undefined" ? "" : navigator.language?.toLowerCase() ?? "";
  if (browserLanguage.startsWith("zh")) {
    return "zh-CN";
  }

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

const defaultHandColors = {
  hour: "#f1f1f1",
  minute: "#d7ecff",
  second: "#ff786f",
};

const defaultHandColorCustom = {
  hour: false,
  minute: false,
  second: false,
};

const defaultPreviewZoom = {
  background: 1,
  hour: 1,
  minute: 1,
  second: 1,
};

export const state = {
  backgroundColor: "#202020",
  backgroundColorVisible: true,
  backgroundPartVisible: true,
  defaultHandColors: structuredClone(defaultHandColors),
  defaultHandColorCustom: structuredClone(defaultHandColorCustom),
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
  timeMode: {
    mode: "realtime",
    fixedTimeMs: 0,
    playBaseTimeMs: 0,
    playStartedAt: 0,
    testBaseTimeMs: 0,
    testStartedAt: 0,
  },
  handOrder: [...HANDS],
  handVisible: structuredClone(defaultHandVisible),
  parts: {
    background: null,
    hour: null,
    minute: null,
    second: null,
  },
  transform: structuredClone(defaultTransforms),
  previewZoom: structuredClone(defaultPreviewZoom),
};

export function getTransform(part) {
  return state.transform[part];
}

export function resetTransform(part) {
  state.transform[part] = structuredClone(defaultTransforms[part]);
  state.previewZoom[part] = defaultPreviewZoom[part];
}

export function setPartImage(part, imageData) {
  state.parts[part]?.dispose?.();
  state.parts[part] = imageData;
  fitLoadedImageToClockFrame(part, imageData);
}

function fitLoadedImageToClockFrame(part, imageData) {
  if (!imageData || !state.clockFrameVisible) {
    return;
  }

  const transform = state.transform[part];

  if (!transform || !imageData.width || !imageData.height) {
    return;
  }

  const frameRadius = Math.max(0, BASE_FRAME_RADIUS * state.clockFrameSize - FRAME_FIT_MARGIN);
  const aspect = getTransformAspect(transform);
  const fitScale = state.clockClip === "square"
    ? getSquareFrameFitScale(imageData, transform, frameRadius, aspect)
    : getCircleFrameFitScale(imageData, transform, frameRadius, aspect);
  const partFactor = loadedImageFitFactor[part] ?? 1;
  const scaleY = clampNumber(fitScale * partFactor, 0.001, 5);

  transform.scaleY = scaleY;
  transform.scaleX = scaleY * aspect;
}

function getTransformAspect(transform) {
  const aspect = Math.abs(transform.scaleX / transform.scaleY);
  return Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
}

function getCircleFrameFitScale(imageData, transform, frameRadius, aspect) {
  const centerDistance = Math.sqrt(transform.x ** 2 + transform.y ** 2);
  const availableRadius = Math.max(0, frameRadius - centerDistance);
  const imageHalfDiagonal = Math.sqrt(((imageData.width * aspect) / 2) ** 2 + (imageData.height / 2) ** 2);

  if (imageHalfDiagonal <= 0) {
    return 1;
  }

  return availableRadius / imageHalfDiagonal;
}

function getSquareFrameFitScale(imageData, transform, frameRadius, aspect) {
  const availableHalfWidth = Math.max(0, frameRadius - Math.abs(transform.x));
  const availableHalfHeight = Math.max(0, frameRadius - Math.abs(transform.y));
  const widthScale = availableHalfWidth / Math.max((imageData.width * aspect) / 2, 1);
  const heightScale = availableHalfHeight / Math.max(imageData.height / 2, 1);

  return Math.min(widthScale, heightScale);
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

export function resetHandDisplay() {
  state.handOrder = [...HANDS];
  state.handVisible = structuredClone(defaultHandVisible);
  state.pinVisible = true;
  state.smoothHands = false;
  state.defaultHandColorCustom = structuredClone(defaultHandColorCustom);
}

export function resetDigitalDisplay() {
  state.digitalClock = true;
  state.digitalStyle = structuredClone(defaultDigitalStyle);
  Object.assign(state.digitalStyle, digitalThemeDefaults[state.theme]);
  state.digitalStyleCustom = structuredClone(defaultDigitalStyleCustom);
  state.digitalPosition = structuredClone(defaultDigitalPosition);
}
