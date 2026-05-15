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

export function loadImageFile(part, file, onLoaded) {
  if (!acceptedTypes.has(file.type) && !file.type.startsWith("image/")) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const src = String(reader.result);
    const image = new Image();

    image.addEventListener("load", () => {
      const imageData = {
        name: file.name,
        type: file.type,
        src,
        image,
        width: image.naturalWidth,
        height: image.naturalHeight,
      };

      setPartImage(part, imageData);
      onLoaded?.(part);
    });

    image.addEventListener("error", () => {
      // Ignore invalid image data. Rendering keeps using the existing state.
    });

    image.src = src;
  });

  reader.addEventListener("error", () => {
    // Ignore unreadable files so the clock preview never stops running.
  });

  reader.readAsDataURL(file);
}
