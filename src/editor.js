import { getTransform, HANDS, partLabels, resetDigitalDisplay, resetHandDisplay, resetTransform, setPartImage, state } from "./state.js";
import { bindDropUpload, openImagePicker } from "./uploader.js";

const translations = {
  en: {
    appTitle: "Clock Maker",
    language: "Language",
    images: "Images",
    layerOrder: "Hands",
    pin: "Pin",
    digital: "Digital",
    digitalVisible: "Digital",
    size: "Size",
    opacity: "Opacity",
    frame: "Frame",
    text: "Text",
    background: "Background",
    noColor: "No color",
    clipShape: "Clock frame",
    clipCircle: "Circle",
    clipSquare: "Square",
    tickMarks: "Ticks",
    timeDisplay: "Time display",
    arabicNumerals: "Numbers",
    romanNumerals: "Roman",
    uploadTitle: "Choose image",
    uploadHelp: "",
    reupload: "🖼️",
    rotation: "Rotation",
    scale: "Scale",
    aspect: "Aspect",
    followRotation: "Follow hand rotation",
    removeImage: "Remove image",
    reset: "Reset",
    smoothHands: "Smooth",
    realtimeMode: "realtime",
    testMode: "Test",
  },
  ja: {
    appTitle: "マイ時計メーカー",
    language: "言語",
    images: "画像",
    layerOrder: "針",
    pin: "ピン",
    digital: "デジタル",
    digitalVisible: "デジタル",
    size: "サイズ",
    opacity: "透明度",
    frame: "枠",
    text: "文字",
    background: "背景",
    noColor: "無色",
    clipShape: "時計枠",
    clipCircle: "円形",
    clipSquare: "四角形",
    tickMarks: "目盛り",
    timeDisplay: "時刻表示",
    arabicNumerals: "数字",
    romanNumerals: "ローマ数字",
    uploadTitle: "画像を選ぶ",
    uploadHelp: "",
    reupload: "🖼️",
    rotation: "回転",
    scale: "拡大縮小",
    aspect: "縦横比",
    followRotation: "針の回転に追従",
    removeImage: "画像を削除",
    reset: "リセット",
    smoothHands: "スムーズ",
    realtimeMode: "実時刻",
    testMode: "テスト",
  },
  "zh-CN": {
    appTitle: "自定义时钟工具",
    language: "语言",
    images: "图像",
    layerOrder: "指针",
    pin: "中心点",
    digital: "数字时钟",
    digitalVisible: "数字",
    size: "大小",
    opacity: "透明度",
    frame: "边框",
    text: "文字",
    background: "背景",
    noColor: "无色",
    clipShape: "时钟边框",
    clipCircle: "圆形",
    clipSquare: "方形",
    tickMarks: "刻度",
    timeDisplay: "时刻显示",
    arabicNumerals: "数字",
    romanNumerals: "罗马数字",
    uploadTitle: "选择图像",
    uploadHelp: "",
    reupload: "🖼️",
    rotation: "旋转",
    scale: "缩放",
    aspect: "宽高比",
    followRotation: "跟随指针旋转",
    removeImage: "移除图像",
    reset: "重置",
    smoothHands: "平滑",
    realtimeMode: "实时",
    testMode: "测试",
  },
};

let activeClipChange = () => {};
let activeDigitalChange = () => {};

export function createEditor(
  cardsRoot,
  languageSelect,
  onChange = () => {},
  onClipChange = () => {},
  onDigitalChange = () => {},
) {
  activeClipChange = onClipChange;
  activeDigitalChange = onDigitalChange;
  languageSelect.value = state.language;
  languageSelect.addEventListener("change", () => {
    state.language = languageSelect.value;
    renderEditor(cardsRoot, onChange, onClipChange, onDigitalChange);
    applyLanguage();
  });

  renderEditor(cardsRoot, onChange, onClipChange, onDigitalChange);
  applyLanguage();
}

function renderEditor(
  cardsRoot,
  onChange,
  onClipChange = activeClipChange,
  onDigitalChange = activeDigitalChange,
) {
  cardsRoot.replaceChildren();

  const backgroundRow = document.createElement("div");
  backgroundRow.className = "card-row card-row-background";
  const topControls = document.createElement("div");
  topControls.className = "top-controls";

  backgroundRow.appendChild(createImageCard("background", onChange));
  topControls.append(createOrderEditor(onChange), createDigitalControl(onChange, onDigitalChange));
  backgroundRow.appendChild(topControls);

  const handsRow = document.createElement("div");
  handsRow.className = "card-row card-row-hands";

  for (const part of HANDS) {
    handsRow.appendChild(createImageCard(part, onChange));
  }

  cardsRoot.append(backgroundRow, handsRow, createClipControl(onChange, onClipChange));
}

function createImageCard(part, onChange) {
  const card = document.createElement("article");
  card.className = `image-card image-card-${part}`;

  const header = document.createElement("div");
  header.className = "card-header";

  header.appendChild(createCardTitle(part, onChange));

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const imageData = state.parts[part];

  if (imageData) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reupload-button";
    button.textContent = t("reupload");
    button.addEventListener("click", () => openImagePicker(part, () => {
      renderEditor(document.querySelector("#cardsRoot"), onChange);
      onChange();
    }));
    actions.appendChild(button);
    actions.appendChild(createIconButton("\u00d7", t("removeImage"), () => {
      setPartImage(part, null);
      resetTransform(part);
      renderEditor(document.querySelector("#cardsRoot"), onChange);
      onChange();
    }));
  }

  actions.appendChild(createIconButton("↺", t("reset"), () => {
    resetTransform(part);
    renderEditor(document.querySelector("#cardsRoot"), onChange);
    onChange();
  }));
  if (part === "background") {
    actions.append(createHeaderColorInput(part, onChange), createBackgroundColorVisibleInput(onChange));
  } else if (!imageData) {
    actions.appendChild(createHeaderColorInput(part, onChange));
  }

  if (part === "background" && imageData) {
    const [, removeButton, resetButton] = actions.children;
    actions.append(removeButton, resetButton);
  }

  orderImageCardActions(actions);

  header.appendChild(actions);

  card.appendChild(header);

  if (imageData) {
    card.appendChild(createUploadedBody(part, imageData, onChange));
  } else {
    const uploadArea = createUploadArea(part, onChange);
    card.appendChild(uploadArea);
  }

  return card;
}

function createCardTitle(part, onChange) {
  const title = document.createElement("h3");
  title.className = "card-title";

  if (part === "background") {
    title.append(createBackgroundPartVisibleInput(onChange), document.createTextNode(partLabels[state.language][part]));
    return title;
  }

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = state.handVisible[part];
  input.addEventListener("change", () => {
    state.handVisible[part] = input.checked;
    renderEditor(document.querySelector("#cardsRoot"), onChange);
    onChange();
  });

  title.append(input, document.createTextNode(partLabels[state.language][part]));
  return title;
}

function createBackgroundPartVisibleInput(onChange) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = state.backgroundPartVisible;
  input.addEventListener("change", () => {
    state.backgroundPartVisible = input.checked;
    onChange();
  });
  return input;
}

function createBackgroundColorVisibleInput(onChange) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "header-color-visible-input";
  input.checked = state.backgroundColorVisible;
  input.addEventListener("change", () => {
    state.backgroundColorVisible = input.checked;
    onChange();
  });
  return input;
}

function orderImageCardActions(actions) {
  const imageButton = actions.querySelector(".reupload-button");
  const colorCheckbox = actions.querySelector(".header-color-visible-input");
  const colorInput = actions.querySelector(".header-color-input");
  const iconButtons = [...actions.querySelectorAll(".icon-button")];
  const removeButton = iconButtons.find((button) => button.textContent === "\u00d7");
  const resetButton = iconButtons.find((button) => button !== removeButton);

  actions.replaceChildren(
    ...[imageButton, colorCheckbox, colorInput, removeButton, resetButton].filter(Boolean),
  );
}

function createHeaderColorInput(part, onChange) {
  const input = document.createElement("input");
  input.type = "color";
  input.className = "header-color-input";

  if (part === "background") {
    input.value = state.backgroundColor;
    input.dataset.clockColor = "backgroundColor";
    input.addEventListener("input", () => {
      state.backgroundColor = input.value;
      onChange();
    });
    return input;
  }

  input.value = state.defaultHandColors[part];
  input.dataset.clockColor = `defaultHandColors.${part}`;
  input.addEventListener("input", () => {
    state.defaultHandColors[part] = input.value;
    state.defaultHandColorCustom[part] = true;
    document.documentElement.style.setProperty(`--dummy-${part}-color`, input.value);
    onChange();
  });
  return input;
}

function createOrderEditor(onChange) {
  const section = document.createElement("section");
  section.className = "order-editor";

  const header = document.createElement("div");
  header.className = "control-card-header";

  const title = document.createElement("h3");
  title.textContent = t("layerOrder");

  const resetButton = createIconButton("↺", t("reset"), () => {
    resetHandDisplay();
    renderEditor(document.querySelector("#cardsRoot"), onChange);
    onChange();
  });

  const list = document.createElement("div");
  list.className = "order-list";

  for (const hand of state.handOrder) {
    list.appendChild(createOrderItem(hand, onChange));
  }

  header.append(title, resetButton);
  section.append(header, list, createSmoothControl(onChange), createPinControl(onChange));
  return section;
}

function createSmoothControl(onChange) {
  const row = document.createElement("label");
  row.className = "smooth-control";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = state.smoothHands;

  const labelText = document.createElement("span");
  labelText.textContent = t("smoothHands");

  checkbox.addEventListener("change", () => {
    state.smoothHands = checkbox.checked;
    onChange();
  });

  row.append(checkbox, labelText);
  return row;
}

function createOrderItem(hand, onChange) {
  const item = document.createElement("div");
  item.className = "order-item";
  item.draggable = true;
  item.dataset.hand = hand;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = state.handVisible[hand];
  checkbox.addEventListener("change", () => {
    state.handVisible[hand] = checkbox.checked;
    renderEditor(document.querySelector("#cardsRoot"), onChange);
    onChange();
  });

  const label = document.createElement("span");
  label.textContent = partLabels[state.language][hand];

  item.append(checkbox, label);

  item.addEventListener("dragstart", (event) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", hand);
    item.classList.add("dragging");
  });

  item.addEventListener("dragend", () => {
    item.classList.remove("dragging");
  });

  item.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    item.classList.add("drag-over");
  });

  item.addEventListener("dragleave", () => {
    item.classList.remove("drag-over");
  });

  item.addEventListener("drop", (event) => {
    event.preventDefault();
    item.classList.remove("drag-over");

    const draggedHand = event.dataTransfer.getData("text/plain");
    const targetHand = item.dataset.hand;

    if (!draggedHand || draggedHand === targetHand) {
      return;
    }

    const rect = item.getBoundingClientRect();
    const insertAfter = event.clientY > rect.top + rect.height / 2;

    moveHand(draggedHand, targetHand, insertAfter);
    renderEditor(document.querySelector("#cardsRoot"), onChange);
    onChange();
  });

  return item;
}

function moveHand(draggedHand, targetHand, insertAfter) {
  const nextOrder = state.handOrder.filter((hand) => hand !== draggedHand);
  const targetIndex = nextOrder.indexOf(targetHand);
  const insertIndex = insertAfter ? targetIndex + 1 : targetIndex;
  nextOrder.splice(insertIndex, 0, draggedHand);
  state.handOrder = nextOrder;
}

function createPinControl(onChange) {
  const row = document.createElement("label");
  row.className = "pin-control";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = state.pinVisible;

  const labelText = document.createElement("span");
  labelText.textContent = t("pin");

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = state.pinColor;
  colorInput.dataset.clockColor = "pinColor";
  colorInput.disabled = !state.pinVisible;

  const codeInput = createColorCodeInput(state.pinColor, "clockColor", "pinColor");
  codeInput.disabled = !state.pinVisible;

  checkbox.addEventListener("change", () => {
    state.pinVisible = checkbox.checked;
    colorInput.disabled = !state.pinVisible;
    codeInput.disabled = !state.pinVisible;
    onChange();
  });

  colorInput.addEventListener("input", () => {
    state.pinColor = colorInput.value;
    codeInput.value = colorInput.value;
    onChange();
  });

  bindColorCodeInput(codeInput, colorInput, (value) => {
    state.pinColor = value;
    onChange();
  });

  row.append(checkbox, labelText, codeInput, colorInput);
  return row;
}

function createDigitalControl(onChange, onDigitalChange) {
  const section = document.createElement("section");
  section.className = "digital-control";

  const title = createDigitalTitle(onChange, onDigitalChange);
  const resetButton = createIconButton("↺", t("reset"), () => {
    resetDigitalDisplay();
    renderEditor(document.querySelector("#cardsRoot"), onChange);
    onDigitalChange();
    onChange();
  });
  const header = document.createElement("div");
  header.className = "control-card-header";
  header.append(title, resetButton);

  const controls = document.createElement("div");
  controls.className = "digital-control-body";

  controls.append(
    createDigitalRangeControl("size", t("size"), 1, 100, 1, "px", onChange, onDigitalChange),
    createDigitalRangeControl("opacity", t("opacity"), 0, 1, 0.01, "", onChange, onDigitalChange),
    createDigitalColorControl("backgroundColor", "backgroundTransparent", t("background"), onChange, onDigitalChange),
    createDigitalColorControl("borderColor", "borderTransparent", t("frame"), onChange, onDigitalChange),
    createDigitalColorControl("textColor", "textTransparent", t("text"), onChange, onDigitalChange),
  );

  section.append(header, controls);
  return section;
}

function createIconButton(symbol, label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.textContent = symbol;
  button.title = label;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", onClick);
  return button;
}

function createDigitalTitle(onChange, onDigitalChange) {
  const title = document.createElement("h3");
  title.className = "digital-title";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = state.digitalClock;

  const text = document.createElement("span");
  text.textContent = t("digitalVisible");

  input.addEventListener("change", () => {
    state.digitalClock = input.checked;
    onDigitalChange();
    onChange();
  });

  title.append(input, text);
  return title;
}

function createDigitalRangeControl(property, label, min, max, step, suffix, onChange, onDigitalChange) {
  const row = document.createElement("label");
  row.className = "digital-range";

  const labelText = document.createElement("span");
  labelText.textContent = label;

  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(state.digitalStyle[property]);

  const valueInput = createSliderValueInput(min, max, step, state.digitalStyle[property]);

  input.addEventListener("input", () => {
    const value = Number(input.value);
    state.digitalStyle[property] = value;
    valueInput.value = formatNumericInputValue(value, step);
    onDigitalChange();
    onChange();
  });

  valueInput.addEventListener("change", () => {
    const value = clampNumber(Number(valueInput.value), min, max);
    state.digitalStyle[property] = value;
    input.value = String(value);
    valueInput.value = formatNumericInputValue(value, step);
    onDigitalChange();
    onChange();
  });

  row.append(labelText, input, valueInput);
  return row;
}

function createDigitalColorControl(colorProperty, transparentProperty, label, onChange, onDigitalChange) {
  const row = document.createElement("div");
  row.className = "digital-color-row";

  const labelText = document.createElement("span");
  labelText.textContent = label;

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = state.digitalStyle[colorProperty];
  colorInput.dataset.digitalColor = colorProperty;
  colorInput.disabled = state.digitalStyle[transparentProperty];

  const codeInput = createColorCodeInput(state.digitalStyle[colorProperty], "digitalColor", colorProperty);
  codeInput.disabled = state.digitalStyle[transparentProperty];

  const visibleInput = document.createElement("input");
  visibleInput.type = "checkbox";
  visibleInput.checked = !state.digitalStyle[transparentProperty];
  visibleInput.title = t("noColor");

  colorInput.addEventListener("input", () => {
    state.digitalStyle[colorProperty] = colorInput.value;
    state.digitalStyleCustom[colorProperty] = true;
    codeInput.value = colorInput.value;
    onDigitalChange();
    onChange();
  });

  visibleInput.addEventListener("change", () => {
    state.digitalStyle[transparentProperty] = !visibleInput.checked;
    colorInput.disabled = !visibleInput.checked;
    codeInput.disabled = !visibleInput.checked;
    onDigitalChange();
    onChange();
  });

  bindColorCodeInput(codeInput, colorInput, (value) => {
    state.digitalStyle[colorProperty] = value;
    state.digitalStyleCustom[colorProperty] = true;
    onDigitalChange();
    onChange();
  });

  row.append(visibleInput, labelText, codeInput, colorInput);
  return row;
}

function formatDigitalValue(property, value, suffix) {
  if (property === "opacity") {
    return value.toFixed(2);
  }

  return `${Math.round(value)}${suffix}`;
}

function createClipControl(onChange, onClipChange) {
  const section = document.createElement("section");
  section.className = "clip-control";

  section.append(
    createShapeControlRow({
      label: t("clipShape"),
      visibleProperty: "clockFrameVisible",
      colorProperty: "clockFrameColor",
      sizeProperty: "clockFrameSize",
      shapeProperty: "clockClip",
      options: [
        ["circle", t("clipCircle")],
        ["square", t("clipSquare")],
      ],
      onChange,
      onShapeChange: onClipChange,
    }),
    createShapeControlRow({
      label: t("tickMarks"),
      visibleProperty: "tickVisible",
      colorProperty: "tickColor",
      sizeProperty: "tickSize",
      shapeProperty: "tickShape",
      options: [
        ["circle", t("clipCircle")],
        ["square", t("clipSquare")],
      ],
      onChange,
      onShapeChange: () => {},
    }),
    createNumeralControl(onChange),
  );
  return section;
}

function createNumeralControl(onChange) {
  const row = document.createElement("div");
  row.className = "shape-control-row";

  const visibleInput = document.createElement("input");
  visibleInput.type = "checkbox";
  visibleInput.checked = state.numeralsVisible;

  const labelText = document.createElement("span");
  labelText.className = "shape-control-label";
  labelText.textContent = t("timeDisplay");

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = state.numeralColor;
  colorInput.dataset.clockColor = "numeralColor";
  colorInput.disabled = !state.numeralsVisible;

  const codeInput = createColorCodeInput(state.numeralColor, "clockColor", "numeralColor");
  codeInput.disabled = !state.numeralsVisible;

  const typeList = document.createElement("div");
  typeList.className = "clip-options";
  typeList.append(
    createNumeralTypeOption("arabic", t("arabicNumerals"), onChange),
    createNumeralTypeOption("roman", t("romanNumerals"), onChange),
  );

  const sizeRow = createNumeralSizeControl(onChange);

  visibleInput.addEventListener("change", () => {
    state.numeralsVisible = visibleInput.checked;
    colorInput.disabled = !visibleInput.checked;
    codeInput.disabled = !visibleInput.checked;
    onChange();
  });

  colorInput.addEventListener("input", () => {
    state.numeralColor = colorInput.value;
    codeInput.value = colorInput.value;
    onChange();
  });

  bindColorCodeInput(codeInput, colorInput, (value) => {
    state.numeralColor = value;
    onChange();
  });

  row.append(visibleInput, labelText, codeInput, colorInput, typeList, sizeRow);
  return row;
}

function createNumeralTypeOption(value, labelText, onChange) {
  const label = document.createElement("label");
  label.className = "clip-option";

  const input = document.createElement("input");
  input.type = "radio";
  input.name = "numeralType";
  input.value = value;
  input.checked = state.numeralType === value;

  const text = document.createElement("span");
  text.textContent = labelText;

  input.addEventListener("change", () => {
    if (!input.checked) {
      return;
    }

    state.numeralType = value;
    onChange();
  });

  label.append(input, text);
  return label;
}

function createShapeControlRow({
  label,
  visibleProperty,
  colorProperty,
  sizeProperty,
  shapeProperty,
  options,
  onChange,
  onShapeChange,
}) {
  const row = document.createElement("div");
  row.className = "shape-control-row";

  const visibleInput = document.createElement("input");
  visibleInput.type = "checkbox";
  visibleInput.checked = state[visibleProperty];

  const labelText = document.createElement("span");
  labelText.className = "shape-control-label";
  labelText.textContent = label;

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = state[colorProperty];
  colorInput.dataset.clockColor = colorProperty;
  colorInput.disabled = !state[visibleProperty];

  const codeInput = createColorCodeInput(state[colorProperty], "clockColor", colorProperty);
  codeInput.disabled = !state[visibleProperty];

  colorInput.addEventListener("input", () => {
    state[colorProperty] = colorInput.value;
    codeInput.value = colorInput.value;
    onChange();
  });

  visibleInput.addEventListener("change", () => {
    state[visibleProperty] = visibleInput.checked;
    colorInput.disabled = !visibleInput.checked;
    codeInput.disabled = !visibleInput.checked;
    onShapeChange();
    onChange();
  });

  bindColorCodeInput(codeInput, colorInput, (value) => {
    state[colorProperty] = value;
    onChange();
  });

  const optionList = document.createElement("div");
  optionList.className = "clip-options";

  for (const [value, optionLabel] of options) {
    optionList.appendChild(createShapeOption(value, optionLabel, shapeProperty, onChange, onShapeChange));
  }

  const sizeRow = createShapeSizeControl(sizeProperty, onChange);

  row.append(visibleInput, labelText, codeInput, colorInput, optionList, sizeRow);
  return row;
}

function createNumeralSizeControl(onChange) {
  const row = document.createElement("label");
  row.className = "shape-size-row";

  const input = document.createElement("input");
  input.type = "range";
  input.min = "10";
  input.max = "100";
  input.step = "1";
  input.value = String(state.numeralSize);

  const valueInput = createSliderValueInput(10, 100, 1, state.numeralSize);

  input.addEventListener("input", () => {
    state.numeralSize = Number(input.value);
    valueInput.value = formatNumericInputValue(state.numeralSize, 1);
    onChange();
  });

  valueInput.addEventListener("change", () => {
    state.numeralSize = clampNumber(Number(valueInput.value), 10, 100);
    input.value = String(state.numeralSize);
    valueInput.value = formatNumericInputValue(state.numeralSize, 1);
    onChange();
  });

  row.append(input, valueInput);
  return row;
}

function createColorCodeInput(value, datasetName, datasetValue) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "color-code-input";
  input.value = value;
  input.maxLength = 7;
  input.spellcheck = false;
  input.dataset[datasetName] = datasetValue;
  return input;
}

function bindColorCodeInput(codeInput, colorInput, onColorChange) {
  codeInput.addEventListener("input", () => {
    const normalized = normalizeHexColor(codeInput.value);

    if (!normalized) {
      return;
    }

    colorInput.value = normalized;
    codeInput.value = normalized;
    onColorChange(normalized);
  });

  codeInput.addEventListener("blur", () => {
    const normalized = normalizeHexColor(codeInput.value);

    codeInput.value = normalized ?? colorInput.value;
  });
}

function normalizeHexColor(value) {
  const raw = value.trim();
  const normalized = raw.startsWith("#") ? raw : `#${raw}`;

  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  return normalized.toLowerCase();
}

function createShapeSizeControl(sizeProperty, onChange) {
  const row = document.createElement("label");
  row.className = "shape-size-row";

  const input = document.createElement("input");
  input.type = "range";
  input.min = "0.1";
  input.max = "2";
  input.step = "0.01";
  input.value = String(state[sizeProperty]);

  const valueInput = createSliderValueInput(0.1, 2, 0.01, state[sizeProperty]);

  input.addEventListener("input", () => {
    state[sizeProperty] = Number(input.value);
    valueInput.value = formatNumericInputValue(state[sizeProperty], 0.01);
    onChange();
  });

  valueInput.addEventListener("change", () => {
    state[sizeProperty] = clampNumber(Number(valueInput.value), 0.1, 2);
    input.value = String(state[sizeProperty]);
    valueInput.value = formatNumericInputValue(state[sizeProperty], 0.01);
    onChange();
  });

  row.append(input, valueInput);
  return row;
}

function createSliderValueInput(min, max, step, value) {
  const input = document.createElement("input");
  input.type = "number";
  input.className = "slider-value-input";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = formatNumericInputValue(Number(value), step);
  return input;
}

function formatNumericInputValue(value, step) {
  const stepText = String(step);
  const decimals = stepText.includes(".") ? stepText.split(".")[1].length : 0;
  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function createShapeOption(value, labelText, shapeProperty, onChange, onShapeChange) {
  const label = document.createElement("label");
  label.className = "clip-option";

  const input = document.createElement("input");
  input.type = "radio";
  input.name = shapeProperty;
  input.value = value;
  input.checked = state[shapeProperty] === value;

  const text = document.createElement("span");
  text.textContent = labelText;

  input.addEventListener("change", () => {
    if (!input.checked) {
      return;
    }

    state[shapeProperty] = value;
    onShapeChange();
    onChange();
  });

  label.append(input, text);
  return label;
}

function createUploadArea(part, onChange) {
  const uploadArea = document.createElement("button");
  uploadArea.type = "button";
  uploadArea.className = "upload-area";
  uploadArea.append(createDummyPreview(part, onChange));
  uploadArea.addEventListener("click", () => openImagePicker(part, () => {
    renderEditor(document.querySelector("#cardsRoot"), onChange);
    onChange();
  }));
  bindDropUpload(uploadArea, part, () => {
    renderEditor(document.querySelector("#cardsRoot"), onChange);
    onChange();
  });
  return uploadArea;
}

function createDummyPreview(part, onChange = () => {}) {
  const preview = document.createElement("div");
  preview.className = `dummy-preview dummy-preview-${part}`;

  if (part !== "background") {
    preview.appendChild(createDummyHandSvg(part));
    const guide = document.createElement("div");
    guide.className = "preview-vertical-guide";
    preview.appendChild(guide);
  }

  const center = createPreviewCenter();
  preview.appendChild(center);
  updateDummyPreviewImage(preview, part);
  requestAnimationFrame(() => updateDummyPreviewImage(preview, part));
  return preview;
}

function createPreviewCenter() {
  const center = document.createElement("div");
  const cover = document.createElement("div");

  center.className = "preview-center";
  cover.className = "preview-center-cover";
  center.appendChild(cover);
  return center;
}

function createDummyHandSvg(part) {
  const specs = {
    hour: { width: 44, height: 190, x: 22, y1: 168, y2: 24, strokeWidth: 12, dash: "10 10", pin: 8 },
    minute: { width: 34, height: 250, x: 17, y1: 226, y2: 20, strokeWidth: 9, dash: "10 10", pin: 7 },
    second: { width: 22, height: 284, x: 11, y1: 254, y2: 18, strokeWidth: 4, dash: "8 8", pin: 5 },
  };
  const spec = specs[part];
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  const line = document.createElementNS(namespace, "line");
  const pin = document.createElementNS(namespace, "circle");

  svg.classList.add("dummy-hand");
  svg.setAttribute("width", String(spec.width));
  svg.setAttribute("height", String(spec.height));
  svg.setAttribute("viewBox", `0 0 ${spec.width} ${spec.height}`);
  svg.setAttribute("aria-hidden", "true");

  line.setAttribute("x1", String(spec.x));
  line.setAttribute("y1", String(spec.y1));
  line.setAttribute("x2", String(spec.x));
  line.setAttribute("y2", String(spec.y2));
  line.setAttribute("stroke", "currentColor");
  line.setAttribute("stroke-width", String(spec.strokeWidth));
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute("stroke-dasharray", spec.dash);

  pin.setAttribute("cx", String(spec.x));
  pin.setAttribute("cy", String(spec.y1));
  pin.setAttribute("r", String(spec.pin));
  pin.setAttribute("fill", "currentColor");

  svg.append(line, pin);
  return svg;
}

function updateDummyPreviewImage(preview, part) {
  const image = preview.querySelector("img, .dummy-hand");
  const center = preview.querySelector(".preview-center");
  const origin = getPreviewOrigin(preview, HANDS.includes(part));
  const previewScale = image ? getPreviewZoom(part) * getDummyPreviewScale(part) : getPreviewZoom(part);

  preview.style.setProperty("--preview-scale", String(previewScale));
  preview.style.setProperty("--preview-checker-size", `${16 * previewScale}px`);
  preview.style.setProperty("--preview-checker-half", `${8 * previewScale}px`);

  if (!image) {
    center.style.transform = `translate(-50%, -50%) translate(${origin.x}px, ${origin.y}px) scale(${previewScale})`;
    return;
  }

  const transform = getTransform(part);
  const previewX = origin.x + transform.x * previewScale;
  const previewY = origin.y + transform.y * previewScale;

  image.style.transform = [
    "translate(-50%, -50%)",
    `translate(${previewX}px, ${previewY}px)`,
    `rotate(${transform.rotation}deg)`,
    `scale(${transform.scaleX * previewScale}, ${transform.scaleY * previewScale})`,
  ].join(" ");

  center.style.transform = `translate(-50%, -50%) translate(${origin.x}px, ${origin.y}px) scale(${previewScale})`;
}

function createUploadedBody(part, imageData, onChange) {
  const body = document.createElement("div");
  body.className = "uploaded-body";

  const preview = createMiniPreview(part, imageData, onChange);
  const controls = createControls(part, () => {
    updatePreviewImage(preview, part);
    onChange();
  });

  body.append(preview, createPreviewZoomControl(part, preview, onChange), controls);
  return body;
}

function createMiniPreview(part, imageData, onChange) {
  const preview = document.createElement("div");
  preview.className = "mini-preview";

  const image = document.createElement("img");
  image.alt = "";
  image.src = imageData.src;
  image.addEventListener("load", () => updatePreviewImage(preview, part));

  const guide = document.createElement("div");
  guide.className = "preview-vertical-guide";

  const center = createPreviewCenter();

  preview.append(image, guide, center);
  updatePreviewImage(preview, part);
  requestAnimationFrame(() => updatePreviewImage(preview, part));
  bindPreviewDrag(preview, part, () => {
    updatePreviewImage(preview, part);
    onChange();
  });
  bindPreviewWheel(preview, part, onChange);

  return preview;
}

function getPreviewZoom(part) {
  return clampNumber(Number(state.previewZoom[part]) || 1, 0.05, 20);
}

function setPreviewZoom(part, value) {
  state.previewZoom[part] = clampNumber(value, 0.05, 20);
}

function syncPreviewZoomControl(preview, part) {
  const row = preview.closest(".image-card")?.querySelector(".preview-zoom-row");
  const range = row?.querySelector("input[type=\"range\"]");
  const valueInput = row?.querySelector(".slider-value-input");

  if (range) {
    range.value = String(state.previewZoom[part]);
  }

  if (valueInput) {
    valueInput.value = formatNumericInputValue(state.previewZoom[part], 0.01);
  }
}

function createPreviewZoomControl(part, preview, onChange) {
  const row = document.createElement("label");
  row.className = "preview-zoom-row";

  const labelText = document.createElement("span");
  labelText.textContent = String.fromCodePoint(0x1F50D);

  const input = document.createElement("input");
  input.type = "range";
  input.min = "0.05";
  input.max = "20";
  input.step = "0.01";
  input.value = String(getPreviewZoom(part));

  const valueInput = createSliderValueInput(0.05, 20, 0.01, getPreviewZoom(part));

  function apply(value) {
    setPreviewZoom(part, value);
    input.value = String(state.previewZoom[part]);
    valueInput.value = formatNumericInputValue(state.previewZoom[part], 0.01);
    updatePreviewImage(preview, part);
    onChange();
  }

  input.addEventListener("input", () => apply(Number(input.value)));
  valueInput.addEventListener("change", () => apply(Number(valueInput.value)));

  row.append(labelText, input, valueInput);
  return row;
}
function bindPreviewWheel(preview, part, onUpdate) {
  preview.addEventListener("wheel", (event) => {
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    const factor = direction > 0 ? 1.08 : 1 / 1.08;

    setPreviewZoom(part, getPreviewZoom(part) * factor);
    syncPreviewZoomControl(preview, part);
    updatePreviewImage(preview, part);
    onUpdate();
  }, { passive: false });
}
function updatePreviewImage(preview, part) {
  const image = preview.querySelector("img, .dummy-hand");
  const center = preview.querySelector(".preview-center");
  const transform = getTransform(part);
  const previewScale = getPreviewZoom(part);
  const origin = getPreviewOrigin(preview, HANDS.includes(part));
  const previewX = origin.x + transform.x * previewScale;
  const previewY = origin.y + transform.y * previewScale;

  preview.dataset.previewScale = String(previewScale);
  preview.style.setProperty("--preview-scale", String(previewScale));
  preview.style.setProperty("--preview-checker-size", `${16 * previewScale}px`);
  preview.style.setProperty("--preview-checker-half", `${8 * previewScale}px`);

  image.style.transform = [
    "translate(-50%, -50%)",
    `translate(${previewX}px, ${previewY}px)`,
    `rotate(${transform.rotation}deg)`,
    `scale(${transform.scaleX * previewScale}, ${transform.scaleY * previewScale})`,
  ].join(" ");

  center.style.transform = `translate(-50%, -50%) translate(${origin.x}px, ${origin.y}px) scale(${previewScale})`;
}

function fitImagePreview(preview, image, transform, lowerOrigin = false) {
  const bounds = getPreviewImageBounds(image, transform);

  if (!bounds || bounds.width === 0 || bounds.height === 0) {
    return 1;
  }

  const previewRect = preview.getBoundingClientRect();
  const availableHalfWidth = previewRect.width * (lowerOrigin ? 0.9 : 0.44);

  if (!lowerOrigin) {
    const availableHalfHeight = previewRect.height * 0.46;
    return Math.min(1, availableHalfWidth / bounds.halfWidth, availableHalfHeight / bounds.halfHeight);
  }

  // Hand previews should fill upward from the low rotation center. Use the
  // top margin as the primary fit target so the preview does not shrink just
  // because a small part of the image extends below the center.
  const availableTop = previewRect.height * 0.7;
  const verticalScale = availableTop / Math.max(bounds.top, 1);

  return Math.min(4, availableHalfWidth / bounds.halfWidth, verticalScale);
}

function getDummyPreviewScale(part) {
  const scaleByPart = {
    hour: 90 / 144,
    minute: 120 / 206,
    second: 140 / 236,
  };

  return scaleByPart[part] ?? 1;
}

function getPreviewOrigin(preview, lower = false) {
  const rect = preview.getBoundingClientRect();

  return {
    x: 0,
    y: lower ? rect.height * 0.3 : 0,
  };
}

function getPreviewImageBounds(image, transform) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    return null;
  }

  const scaledWidth = width * Math.abs(transform.scaleX);
  const scaledHeight = height * Math.abs(transform.scaleY);
  const rotation = (transform.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rotation));
  const sin = Math.abs(Math.sin(rotation));

  const boxHalfWidth = (scaledWidth * cos + scaledHeight * sin) / 2;
  const boxHalfHeight = (scaledWidth * sin + scaledHeight * cos) / 2;

  return {
    halfWidth: Math.abs(transform.x) + boxHalfWidth,
    halfHeight: Math.abs(transform.y) + boxHalfHeight,
    top: Math.max(0, boxHalfHeight - transform.y),
    bottom: Math.max(0, boxHalfHeight + transform.y),
  };
}

function bindPreviewDrag(preview, part, onUpdate) {
  let dragging = false;
  let startPointer = null;
  let startTransform = null;

  preview.addEventListener("pointerdown", (event) => {
    dragging = true;
    startPointer = { x: event.clientX, y: event.clientY };
    startTransform = { x: getTransform(part).x, y: getTransform(part).y };
    preview.setPointerCapture(event.pointerId);
  });

  preview.addEventListener("pointermove", (event) => {
    if (!dragging) {
      return;
    }

    const transform = getTransform(part);
    const previewScale = Number(preview.dataset.previewScale) || 1;
    transform.x = Math.round(startTransform.x + (event.clientX - startPointer.x) / previewScale);
    transform.y = Math.round(startTransform.y + (event.clientY - startPointer.y) / previewScale);
    onUpdate();
  });

  preview.addEventListener("pointerup", (event) => {
    dragging = false;
    preview.releasePointerCapture(event.pointerId);
  });

  preview.addEventListener("pointercancel", () => {
    dragging = false;
  });
}

function createControls(part, onTransformChange) {
  const controls = document.createElement("div");
  controls.className = "controls-grid";

  controls.append(
    createRange(part, "rotation", t("rotation"), -180, 180, 0.1, onTransformChange),
    createRange(part, "scale", t("scale"), 0.01, 5, 0.001, onTransformChange),
    createRange(part, "aspect", t("aspect"), 0.1, 5, 0.001, onTransformChange),
  );

  if (HANDS.includes(part)) {
    controls.appendChild(createFollowRotationControl(part, onTransformChange));
  }

  return controls;
}

function createRange(part, property, label, min, max, step, onTransformChange) {
  const transform = getTransform(part);
  const row = document.createElement("label");
  row.className = "range-row";

  const labelText = document.createElement("span");
  labelText.textContent = label;

  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(getRangeValue(transform, property));

  const valueInput = createSliderValueInput(min, max, step, Number(input.value));

  input.addEventListener("input", () => {
    const value = Number(input.value);
    setRangeValue(transform, property, value);
    valueInput.value = formatNumericInputValue(value, step);
    onTransformChange();
  });

  valueInput.addEventListener("change", () => {
    const value = clampNumber(Number(valueInput.value), min, max);
    setRangeValue(transform, property, value);
    input.value = String(value);
    valueInput.value = formatNumericInputValue(value, step);
    onTransformChange();
  });

  row.append(labelText, input, valueInput);
  return row;
}

function getRangeValue(transform, property) {
  if (property === "scale") {
    return transform.scaleY;
  }

  if (property === "aspect") {
    return transform.scaleX / transform.scaleY;
  }

  return transform[property];
}

function setRangeValue(transform, property, value) {
  if (property === "scale") {
    const aspect = transform.scaleX / transform.scaleY;
    transform.scaleY = value;
    transform.scaleX = value * aspect;
    return;
  }

  if (property === "aspect") {
    transform.scaleX = transform.scaleY * value;
    return;
  }

  transform[property] = value;
}

function formatRangeValue(property, value) {
  if (property === "rotation") {
    return `${Math.round(value)}°`;
  }

  return value.toFixed(2);
}

function createFollowRotationControl(part, onTransformChange) {
  const label = document.createElement("label");
  label.className = "checkbox-row";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = getTransform(part).followRotation;
  checkbox.addEventListener("change", () => {
    getTransform(part).followRotation = checkbox.checked;
    onTransformChange();
  });

  const text = document.createElement("span");
  text.textContent = t("followRotation");

  label.append(checkbox, text);
  return label;
}

function applyLanguage() {
  document.documentElement.lang = state.language;
  document.title = t("appTitle");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
}

function t(key) {
  return translations[state.language][key] ?? translations.en[key] ?? key;
}
