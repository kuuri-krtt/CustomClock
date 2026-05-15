import { HANDS, state } from "./state.js";

const darkHandColors = {
  hour: "#f1f1f1",
  minute: "#d7ecff",
  second: "#ff786f",
};

const lightHandColors = {
  hour: "#18212b",
  minute: "#1677c8",
  second: "#c7322b",
};

const BASE_SIZE = 560;
const BASE_CENTER = BASE_SIZE / 2;
const NONE_FRAME_PADDING = 24;
const FRAME_LAYOUT_PADDING = 8;

let needsRender = true;

export function requestRender() {
  needsRender = true;
}

export function createRenderer(faceCanvas, handsCanvas, digitalClock) {
  const faceContext = faceCanvas.getContext("2d");
  const handsContext = handsCanvas.getContext("2d");
  let currentSecond = -1;
  let currentAngles = calculateAngles(new Date());

  function render() {
    const now = new Date();
    const nextSecond = Math.floor(now.getTime() / 1000);
    const smooth = state.smoothHands;

    // requestAnimationFrame keeps rendering coordinated with the browser, but
    // clock math and digital text only update when the local second changes.
    if (nextSecond !== currentSecond) {
      currentSecond = nextSecond;
      updateDigitalClock(digitalClock, now);
      needsRender = true;
    }

    if (smooth) {
      currentAngles = calculateAngles(now, true);
      needsRender = true;
    } else if (needsRender) {
      currentAngles = calculateAngles(now);
    }

    if (needsRender) {
      drawClock(faceContext, handsContext, faceCanvas, handsCanvas, currentAngles);
      needsRender = false;
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
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

function drawClock(faceContext, handsContext, faceCanvas, handsCanvas, angles) {
  const layout = getCanvasLayout(angles);
  const handsLayout = getHandsCanvasLayout(angles);
  applyCanvasLayout(faceCanvas, layout);
  applyCanvasLayout(handsCanvas, handsLayout, {
    x: layout.centerX - handsLayout.centerX,
    y: layout.centerY - handsLayout.centerY,
  });

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
      drawImagePart(handsContext, hand, handsCenterX, handsCenterY, angles[hand]);
    } else {
      drawPlaceholderHand(handsContext, hand, handsCenterX, handsCenterY, angles[hand]);
    }
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
  if (!state.parts.background) {
    return;
  }

  drawImagePart(context, "background", centerX, centerY, 0);
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
  return state.theme === "light" ? lightHandColors[hand] : darkHandColors[hand];
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
  if (state.digitalClock) {
    digitalClock.textContent = formatTime(date);
    digitalClock.classList.remove("hidden");
  } else {
    digitalClock.classList.add("hidden");
  }
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}
