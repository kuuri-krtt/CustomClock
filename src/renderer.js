import { HANDS, state } from "./state.js";

const BASE_SIZE = 560;
const BASE_CENTER = BASE_SIZE / 2;
const NONE_FRAME_PADDING = 24;
const FRAME_LAYOUT_PADDING = 8;
const TEST_SPEED = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

let needsRender = true;

export function requestRender() {
  needsRender = true;
}

export function startClockTest() {
  const timeSource = getDisplayTime();

  state.timeMode.mode = "test";
  state.timeMode.testBaseTimeMs = getTimeOfDayMs(timeSource.date);
  state.timeMode.testStartedAt = performance.now();
  needsRender = true;
}

export function useRealtimeClock() {
  state.timeMode.mode = "realtime";
  needsRender = true;
}

export function pauseClock() {
  const timeSource = getDisplayTime();
  state.timeMode.mode = "fixed";
  state.timeMode.fixedTimeMs = getTimeOfDayMs(timeSource.date);
  needsRender = true;
}

export function setFixedClockTime(timeOfDayMs) {
  state.timeMode.mode = "fixed";
  state.timeMode.fixedTimeMs = normalizeTimeOfDayMs(timeOfDayMs);
  needsRender = true;
}

export function getCurrentClockTimeOfDayMs() {
  return getTimeOfDayMs(getDisplayTime().date);
}

export function playClock() {
  if (state.timeMode.mode !== "fixed") {
    return;
  }

  state.timeMode.mode = "play";
  state.timeMode.playBaseTimeMs = state.timeMode.fixedTimeMs;
  state.timeMode.playStartedAt = performance.now();
  needsRender = true;
}

export function createRenderer(faceCanvas, handsCanvas, digitalClock) {
  const faceContext = faceCanvas.getContext("2d");
  const handsContext = handsCanvas.getContext("2d");
  const animatedLayers = createAnimatedLayers(faceCanvas, handsCanvas);
  let currentSecond = "";
  let currentAngles = calculateAngles(getDisplayTime().date);

  function render() {
    const timeSource = getDisplayTime();
    const now = timeSource.date;
    const nextSecond = formatTime(now);
    const smooth = state.smoothHands || timeSource.mode === "test";
    const uploadedImages = hasUploadedImages();

    if (nextSecond !== currentSecond) {
      currentSecond = nextSecond;
      updateDigitalClock(digitalClock, now);
      needsRender = true;
    }

    if (smooth) {
      currentAngles = calculateAngles(now, true);
      needsRender = true;
    } else if (uploadedImages) {
      currentAngles = calculateAngles(now);
      needsRender = true;
    } else if (needsRender) {
      currentAngles = calculateAngles(now);
    }

    if (needsRender) {
      drawClock(faceContext, handsContext, faceCanvas, handsCanvas, animatedLayers, currentAngles);
      needsRender = false;
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

function createAnimatedLayers(faceCanvas, handsCanvas) {
  const stage = faceCanvas.parentElement;
  const faceLayer = document.createElement("div");
  const handsLayer = document.createElement("div");

  faceLayer.id = "animatedFaceLayer";
  faceLayer.className = "animated-parts-layer animated-face-layer";
  handsLayer.id = "animatedHandsLayer";
  handsLayer.className = "animated-parts-layer animated-hands-layer";
  stage.insertBefore(faceLayer, faceCanvas.nextSibling);
  stage.insertBefore(handsLayer, handsCanvas);

  return {
    face: faceLayer,
    hands: handsLayer,
  };
}

function hasUploadedImages() {
  if (state.backgroundPartVisible && state.parts.background) {
    return true;
  }

  return HANDS.some((hand) => state.handVisible[hand] && state.parts[hand]);
}

function getDisplayTime() {
  if (state.timeMode.mode === "fixed") {
    return {
      date: createLocalTimeDate(state.timeMode.fixedTimeMs),
      mode: "fixed",
    };
  }

  if (state.timeMode.mode === "play") {
    const elapsed = performance.now() - state.timeMode.playStartedAt;
    return {
      date: createLocalTimeDate(state.timeMode.playBaseTimeMs + elapsed),
      mode: "play",
    };
  }

  if (state.timeMode.mode === "test") {
    const elapsed = performance.now() - state.timeMode.testStartedAt;
    return {
      date: createLocalTimeDate(state.timeMode.testBaseTimeMs + elapsed * TEST_SPEED),
      mode: "test",
    };
  }

  return {
    date: new Date(),
    mode: "realtime",
  };
}

function createLocalTimeDate(timeOfDayMs) {
  const normalizedTime = normalizeTimeOfDayMs(timeOfDayMs);
  const localMidnight = new Date();
  localMidnight.setHours(0, 0, 0, 0);
  return new Date(localMidnight.getTime() + normalizedTime);
}

function normalizeTimeOfDayMs(timeOfDayMs) {
  return ((timeOfDayMs % DAY_MS) + DAY_MS) % DAY_MS;
}

function getTimeOfDayMs(date) {
  return (
    date.getHours() * 60 * 60 * 1000
    + date.getMinutes() * 60 * 1000
    + date.getSeconds() * 1000
    + date.getMilliseconds()
  );
}

export function calculateAngles(date, smooth = false) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds() + (smooth ? date.getMilliseconds() / 1000 : 0);
  const minuteProgress = minutes + (smooth ? seconds / 60 : 0);
  const hourProgress = (hours % 12) + minuteProgress / 60;

  return {
    hour: smooth ? hourProgress * 30 : (hours % 12) * 30 + minutes * 0.5,
    minute: smooth ? minuteProgress * 6 : minutes * 6 + seconds * 0.1,
    second: seconds * 6,
  };
}

function drawClock(faceContext, handsContext, faceCanvas, handsCanvas, animatedLayers, angles) {
  const layout = getCanvasLayout(angles);
  const handsLayout = getHandsCanvasLayout(angles);
  applyCanvasLayout(faceCanvas, layout, {
    x: BASE_CENTER - layout.centerX,
    y: BASE_CENTER - layout.centerY,
  });
  applyCanvasLayout(handsCanvas, handsLayout, {
    x: BASE_CENTER - handsLayout.centerX,
    y: BASE_CENTER - handsLayout.centerY,
  });
  handsCanvas.dataset.centerX = String(handsLayout.centerX);
  handsCanvas.dataset.centerY = String(handsLayout.centerY);
  syncAnimatedLayer(animatedLayers, angles);

  const width = layout.width;
  const height = layout.height;
  const centerX = layout.centerX;
  const centerY = layout.centerY;
  const handsCenterX = handsLayout.centerX;
  const handsCenterY = handsLayout.centerY;
  const radius = BASE_SIZE * 0.44;

  faceContext.clearRect(0, 0, width, height);
  handsContext.clearRect(0, 0, handsLayout.width, handsLayout.height);

  if (state.clockFrameVisible) {
    faceContext.save();
    clipToFrame(faceContext, centerX, centerY, radius * state.clockFrameSize);
  }

  if (state.backgroundColorVisible) {
    faceContext.fillStyle = state.backgroundColor;
    faceContext.fillRect(0, 0, width, height);
  }

  drawBackground(faceContext, centerX, centerY);

  if (state.clockFrameVisible) {
    faceContext.restore();
  }

  drawFace(faceContext, centerX, centerY, radius);

  if (state.numeralsVisible) {
    drawNumerals(faceContext, centerX, centerY, radius);
  }

  // The first item in handOrder is visually frontmost, so draw the list in
  // reverse order because later canvas draws sit above earlier ones.
  const orderedHands = [...state.handOrder].reverse().filter((hand) => HANDS.includes(hand));

  for (const hand of orderedHands) {
    if (!state.handVisible[hand]) {
      continue;
    }

    const imageData = state.parts[hand];

    if (imageData) {
      continue;
    }

    drawPlaceholderHand(handsContext, hand, handsCenterX, handsCenterY, angles[hand]);
  }

  if (state.pinVisible) {
    drawCenterPin(handsContext, handsCenterX, handsCenterY);
  }
}

function clipToFrame(context, centerX, centerY, radius) {
  context.beginPath();

  if (state.clockClip === "square") {
    context.rect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  } else {
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  }

  context.clip();
}

function drawFace(context, centerX, centerY, radius) {
  if (state.clockFrameVisible) {
    drawFrame(context, centerX, centerY, radius * state.clockFrameSize);
  }

  if (!state.tickVisible) {
    return;
  }

  if (state.tickShape === "square") {
    drawSquareTicks(context, centerX, centerY, radius * state.tickSize);
    return;
  }

  drawCircleTicks(context, centerX, centerY, radius * state.tickSize);
}

function drawFrame(context, centerX, centerY, radius) {
  context.save();
  context.translate(centerX, centerY);

  context.strokeStyle = state.clockFrameColor;
  context.lineWidth = 2;

  if (state.clockClip === "square") {
    context.strokeRect(-radius, -radius, radius * 2, radius * 2);
  } else {
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

function drawCircleTicks(context, centerX, centerY, radius) {
  context.save();
  context.translate(centerX, centerY);

  for (let i = 0; i < 60; i += 1) {
    const angle = (i * 6 * Math.PI) / 180;
    const isHour = i % 5 === 0;
    const inner = radius - (isHour ? 20 : 10);
    const outer = radius - 2;

    context.strokeStyle = getTickColor(isHour);
    context.lineWidth = isHour ? 3 : 1;
    context.beginPath();
    context.moveTo(Math.sin(angle) * inner, -Math.cos(angle) * inner);
    context.lineTo(Math.sin(angle) * outer, -Math.cos(angle) * outer);
    context.stroke();
  }

  context.restore();
}

function drawSquareTicks(context, centerX, centerY, radius) {
  const halfSize = radius;

  context.save();
  context.translate(centerX, centerY);

  for (let i = 0; i < 60; i += 1) {
    const angle = (i * 6 * Math.PI) / 180;
    const isHour = i % 5 === 0;
    const outer = pointOnSquare(angle, halfSize - 2);
    const inner = pointOnSquare(angle, halfSize - (isHour ? 22 : 12));

    context.strokeStyle = getTickColor(isHour);
    context.lineWidth = isHour ? 3 : 1;
    context.beginPath();
    context.moveTo(inner.x, inner.y);
    context.lineTo(outer.x, outer.y);
    context.stroke();
  }

  context.restore();
}

function drawNumerals(context, centerX, centerY, radius) {
  const values = state.numeralType === "roman"
    ? ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"]
    : ["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
  const textRadius = radius * 0.76;

  context.save();
  context.translate(centerX, centerY);
  context.fillStyle = state.numeralColor;
  context.font = `${state.numeralSize}px Georgia, "Times New Roman", serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (let i = 0; i < values.length; i += 1) {
    const angle = (i * 30 * Math.PI) / 180;
    context.fillText(values[i], Math.sin(angle) * textRadius, -Math.cos(angle) * textRadius);
  }

  context.restore();
}

function pointOnSquare(angle, halfSize) {
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const scale = halfSize / Math.max(Math.abs(dx), Math.abs(dy));

  return {
    x: dx * scale,
    y: dy * scale,
  };
}

function drawBackground(context, centerX, centerY) {
  if (!state.backgroundPartVisible || !state.parts.background) {
    return;
  }

  return;
}

function syncAnimatedLayer(layers, angles) {
  const activeParts = getUploadedLayerParts();
  const activePartNames = new Set(activeParts.map(({ part }) => part));

  applyAnimatedFaceClip(layers.face);

  for (const layer of [layers.face, layers.hands]) {
    layer.querySelectorAll(".uploaded-clock-part").forEach((element) => {
      if (!activePartNames.has(element.dataset.part)) {
        element.remove();
      }
    });
  }

  for (const { part, zIndex } of activeParts) {
    const imageData = state.parts[part];
    const transform = state.transform[part];
    const handAngle = part === "background" ? 0 : angles[part];
    const position = getTransformedPosition(transform, handAngle);
    const rotation = transform.followRotation ? handAngle + transform.rotation : transform.rotation;
    const layer = part === "background" ? layers.face : layers.hands;
    const image = getAnimatedLayerImage(layer, part, imageData);

    image.style.left = `${BASE_CENTER + position.x}px`;
    image.style.top = `${BASE_CENTER + position.y}px`;
    image.style.width = `${imageData.width}px`;
    image.style.height = `${imageData.height}px`;
    image.style.zIndex = String(zIndex);
    image.style.transform = [
      "translate(-50%, -50%)",
      `rotate(${rotation}deg)`,
      `scale(${transform.scaleX}, ${transform.scaleY})`,
    ].join(" ");
  }
}

function applyAnimatedFaceClip(layer) {
  if (!state.clockFrameVisible) {
    layer.style.clipPath = "none";
    return;
  }

  const radius = BASE_SIZE * 0.44 * state.clockFrameSize;

  if (state.clockClip === "square") {
    layer.style.clipPath = `inset(${BASE_CENTER - radius}px ${BASE_CENTER - radius}px)`;
    return;
  }

  layer.style.clipPath = `circle(${radius}px at ${BASE_CENTER}px ${BASE_CENTER}px)`;
}

function getUploadedLayerParts() {
  const parts = [];

  if (state.backgroundPartVisible && state.parts.background) {
    parts.push({ part: "background", zIndex: 1 });
  }

  for (const [index, hand] of state.handOrder.entries()) {
    if (state.handVisible[hand] && state.parts[hand]) {
      parts.push({ part: hand, zIndex: 100 + state.handOrder.length - index });
    }
  }

  return parts;
}

function getAnimatedLayerImage(layer, part, imageData) {
  let image = layer.querySelector(`.uploaded-clock-part[data-part="${part}"]`);

  if (!image) {
    image = document.createElement("img");
    image.className = "uploaded-clock-part";
    image.dataset.part = part;
    image.alt = "";
    layer.appendChild(image);
  }

  const src = imageData.displaySrc ?? imageData.objectUrl ?? imageData.src;

  if (image.src !== src) {
    image.src = src;
  }

  return image;
}

function drawImagePart(context, part, centerX, centerY, handAngle) {
  const imageData = state.parts[part];
  const transform = state.transform[part];

  context.save();
  context.translate(centerX, centerY);

  if (transform.followRotation) {
    context.rotate(toRadians(handAngle));
    context.translate(transform.x, transform.y);
  } else {
    // Move on the circular path without inheriting the hand's rotation.
    const radius = Math.sqrt(transform.x ** 2 + transform.y ** 2);
    const baseAngle = Math.atan2(transform.y, transform.x);
    const finalAngle = baseAngle + toRadians(handAngle);
    const x = Math.cos(finalAngle) * radius;
    const y = Math.sin(finalAngle) * radius;
    context.translate(x, y);
  }

  context.rotate(toRadians(transform.rotation));
  context.scale(transform.scaleX, transform.scaleY);
  context.drawImage(imageData.image, -imageData.width / 2, -imageData.height / 2);
  context.restore();
}

function getCanvasLayout(angles) {
  if (state.clockFrameVisible) {
    const radius = BASE_SIZE * 0.44;
    const frameRadius = radius * state.clockFrameSize;
    const tickRadius = state.tickVisible ? radius * state.tickSize : 0;
    const pinRadius = state.pinVisible ? 12 : 0;
    const boundsRadius = Math.max(frameRadius, tickRadius, pinRadius) + FRAME_LAYOUT_PADDING;
    const size = Math.ceil(boundsRadius * 2);

    return {
      width: size,
      height: size,
      centerX: size / 2,
      centerY: size / 2,
    };
  }

  const bounds = getNoFrameBounds(angles);
  const minX = Math.floor(bounds.minX - NONE_FRAME_PADDING);
  const minY = Math.floor(bounds.minY - NONE_FRAME_PADDING);
  const maxX = Math.ceil(bounds.maxX + NONE_FRAME_PADDING);
  const maxY = Math.ceil(bounds.maxY + NONE_FRAME_PADDING);

  return {
    width: Math.max(BASE_SIZE, maxX - minX),
    height: Math.max(BASE_SIZE, maxY - minY),
    centerX: BASE_CENTER - minX,
    centerY: BASE_CENTER - minY,
  };
}

function getHandsCanvasLayout(angles) {
  const bounds = getNoFrameBounds(angles);
  const minX = Math.floor(bounds.minX - NONE_FRAME_PADDING);
  const minY = Math.floor(bounds.minY - NONE_FRAME_PADDING);
  const maxX = Math.ceil(bounds.maxX + NONE_FRAME_PADDING);
  const maxY = Math.ceil(bounds.maxY + NONE_FRAME_PADDING);

  return {
    width: Math.max(BASE_SIZE, maxX - minX),
    height: Math.max(BASE_SIZE, maxY - minY),
    centerX: BASE_CENTER - minX,
    centerY: BASE_CENTER - minY,
  };
}

function applyCanvasLayout(canvas, layout, offset = { x: 0, y: 0 }) {
  if (canvas.width !== layout.width) {
    canvas.width = layout.width;
  }

  if (canvas.height !== layout.height) {
    canvas.height = layout.height;
  }

  canvas.style.width = `${layout.width}px`;
  canvas.style.height = `${layout.height}px`;
  canvas.style.left = `${offset.x}px`;
  canvas.style.top = `${offset.y}px`;
}

function getNoFrameBounds(angles) {
  const bounds = {
    minX: 0,
    minY: 0,
    maxX: BASE_SIZE,
    maxY: BASE_SIZE,
  };
  const radius = BASE_SIZE * 0.44;

  if (state.tickVisible) {
    addCenteredBounds(bounds, radius * state.tickSize + FRAME_LAYOUT_PADDING);
  }

  if (state.pinVisible) {
    addCenteredBounds(bounds, 12 + FRAME_LAYOUT_PADDING);
  }

  addImageBounds(bounds, "background", 0);

  for (const hand of HANDS) {
    if (!state.handVisible[hand]) {
      continue;
    }

    addImageBounds(bounds, hand, angles[hand]);
  }

  return bounds;
}

function addCenteredBounds(bounds, radius) {
  bounds.minX = Math.min(bounds.minX, BASE_CENTER - radius);
  bounds.minY = Math.min(bounds.minY, BASE_CENTER - radius);
  bounds.maxX = Math.max(bounds.maxX, BASE_CENTER + radius);
  bounds.maxY = Math.max(bounds.maxY, BASE_CENTER + radius);
}

function addImageBounds(bounds, part, handAngle) {
  const imageData = state.parts[part];

  if (!imageData) {
    return;
  }

  const transform = state.transform[part];
  const position = getTransformedPosition(transform, handAngle);
  const rotation = toRadians(transform.followRotation ? handAngle + transform.rotation : transform.rotation);
  const scaledWidth = imageData.width * Math.abs(transform.scaleX);
  const scaledHeight = imageData.height * Math.abs(transform.scaleY);
  const cos = Math.abs(Math.cos(rotation));
  const sin = Math.abs(Math.sin(rotation));
  const halfWidth = (scaledWidth * cos + scaledHeight * sin) / 2;
  const halfHeight = (scaledWidth * sin + scaledHeight * cos) / 2;
  const centerX = BASE_CENTER + position.x;
  const centerY = BASE_CENTER + position.y;

  bounds.minX = Math.min(bounds.minX, centerX - halfWidth);
  bounds.minY = Math.min(bounds.minY, centerY - halfHeight);
  bounds.maxX = Math.max(bounds.maxX, centerX + halfWidth);
  bounds.maxY = Math.max(bounds.maxY, centerY + halfHeight);
}

function getTransformedPosition(transform, handAngle) {
  const handRadians = toRadians(handAngle);

  if (transform.followRotation) {
    return {
      x: transform.x * Math.cos(handRadians) - transform.y * Math.sin(handRadians),
      y: transform.x * Math.sin(handRadians) + transform.y * Math.cos(handRadians),
    };
  }

  const radius = Math.sqrt(transform.x ** 2 + transform.y ** 2);
  const baseAngle = Math.atan2(transform.y, transform.x);
  const finalAngle = baseAngle + handRadians;

  return {
    x: Math.cos(finalAngle) * radius,
    y: Math.sin(finalAngle) * radius,
  };
}

function drawPlaceholderHand(context, hand, centerX, centerY, handAngle) {
  const lengthByHand = {
    hour: 90,
    minute: 120,
    second: 140,
  };

  const widthByHand = {
    hour: 10,
    minute: 7,
    second: 3,
  };

  context.save();
  context.translate(centerX, centerY);
  context.rotate(toRadians(handAngle));

  context.strokeStyle = getPlaceholderHandColor(hand);
  context.lineWidth = widthByHand[hand];
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(0, 18);
  context.lineTo(0, -lengthByHand[hand]);
  context.stroke();

  context.restore();
}

function drawCenterPin(context, centerX, centerY) {
  context.save();
  context.translate(centerX, centerY);
  context.fillStyle = state.pinColor;
  context.beginPath();
  context.arc(0, 0, 8, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = state.theme === "light" ? "rgba(255, 255, 255, 0.65)" : "rgba(0, 0, 0, 0.45)";
  context.lineWidth = 2;
  context.stroke();
  context.restore();
}

function getTickColor(isHour) {
  return hexToRgba(state.tickColor, isHour ? 0.72 : 0.36);
}

function getPlaceholderHandColor(hand) {
  return state.defaultHandColors[hand];
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  const value = parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function updateDigitalClock(digitalClock, date) {
  const textElement = digitalClock.querySelector(".digital-clock-text") ?? digitalClock;

  if (state.digitalClock) {
    if (document.activeElement !== textElement) {
      textElement.textContent = formatTime(date);
    }
    digitalClock.classList.remove("hidden");
  } else {
    digitalClock.classList.add("hidden");
  }
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}
