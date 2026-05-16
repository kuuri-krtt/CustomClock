import { setPartImage } from "./state.js";

const acceptedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"]);

export function openImagePicker(part, onLoaded) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) {
      loadImageFile(part, file, onLoaded);
    }
  });
  input.click();
}

export function bindDropUpload(element, part, onLoaded) {
  element.addEventListener("dragover", (event) => {
    event.preventDefault();
    element.classList.add("drag-over");
  });

  element.addEventListener("dragleave", () => {
    element.classList.remove("drag-over");
  });

  element.addEventListener("drop", (event) => {
    event.preventDefault();
    element.classList.remove("drag-over");

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      loadImageFile(part, file, onLoaded);
    }
  });
}

export async function loadImageFile(part, file, onLoaded) {
  if (!acceptedTypes.has(file.type) && !file.type.startsWith("image/")) {
    return;
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const animated = isAnimatedImage(file, bytes);
  const objectUrl = URL.createObjectURL(file);

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const src = String(reader.result);
    const image = new Image();

    image.addEventListener("load", () => {
      const imageData = {
        name: file.name,
        type: file.type,
        src,
        objectUrl,
        displaySrc: animated ? objectUrl : src,
        image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        animated,
        dispose: () => URL.revokeObjectURL(objectUrl),
      };

      setPartImage(part, imageData);
      onLoaded?.(part);
    });

    image.addEventListener("error", () => {
      // Ignore invalid image data. Rendering keeps using the existing state.
      URL.revokeObjectURL(objectUrl);
    });

    image.src = animated ? objectUrl : src;
  });

  reader.addEventListener("error", () => {
    // Ignore unreadable files so the clock preview never stops running.
    URL.revokeObjectURL(objectUrl);
  });

  reader.readAsDataURL(file);
}

function isAnimatedImage(file, bytes) {
  if (isGif(bytes) || file.name.toLowerCase().endsWith(".gif")) {
    return true;
  }

  return isAnimatedPng(bytes);
}

function isGif(bytes) {
  return bytes.length >= 6
    && bytes[0] === 0x47
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x38;
}

function isAnimatedPng(bytes) {
  for (let index = 8; index + 8 < bytes.length;) {
    const length = readUint32(bytes, index);
    const type = String.fromCharCode(
      bytes[index + 4],
      bytes[index + 5],
      bytes[index + 6],
      bytes[index + 7],
    );

    if (type === "acTL") {
      return true;
    }

    if (type === "IDAT") {
      return false;
    }

    index += 12 + length;
  }

  return false;
}

function readUint32(bytes, index) {
  return (
    bytes[index] * 0x1000000
    + (bytes[index + 1] << 16)
    + (bytes[index + 2] << 8)
    + bytes[index + 3]
  );
}
