// ABOUTME: QRKY home page logic. Handles thumbnail selection, URL debouncing, upload+crop modal.
// ABOUTME: Calls /api/v1/qr/graphical on qrky.ai to generate the photo-realistic QR.

const QRKY_API_KEY = "qrp_free_317aba499d4f8fa7bdfaa8a81beb7038214a414668c1a5af";
const QRKY_ENDPOINT = "https://api.app.qrky.ai/api/v1/qr/graphical";
// Fallback host if the primary doesn't expose CORS:
const QRKY_FALLBACK = "https://dev.qrplus.ai/api/v1/qr/graphical";

const DEFAULT_IMAGES = ["image1.jpg", "image2.jpg", "image3.jpg"];
const DEFAULT_QRS    = ["banner_qr1.png", "banner_qr2.png", "banner_qr3.png"];
const DEFAULT_URL    = "https://www.qrky.ai";

// ---------- State ----------
const state = {
  url: "",
  selectedSrc: DEFAULT_IMAGES[0],   // string path OR data URL for custom
  selectedIsCustom: false,
  customDataUrl: null,
  cachedBlobs: new Map(),           // path -> Blob (for built-in thumbs)
  reqId: 0,                         // to drop stale responses
};

// ---------- Elements ----------
const urlInput = document.getElementById("urlInput");
const thumbGrid = document.getElementById("thumbGrid");
const uploadSlot = document.getElementById("uploadSlot");
const uploadEmpty = document.getElementById("uploadEmpty");
const uploadFilled = document.getElementById("uploadFilled");
const uploadSelect = document.getElementById("uploadSelect");
const uploadReplace = document.getElementById("uploadReplace");
const uploadImg = document.getElementById("uploadImg");

const submitBtn = document.getElementById("submitBtn");

const qrImage = document.getElementById("qrImage");
const qrOverlay = document.getElementById("qrOverlay");
const qrCountdown = document.getElementById("qrCountdown");
const qrError = document.getElementById("qrError");
const qrCaption = document.getElementById("qrCaption");
const qrMiniThumbImg = document.getElementById("qrMiniThumbImg");

const modal = document.getElementById("uploadModal");
const modalClose = document.getElementById("modalClose");
const dropZone = document.getElementById("dropZone");
const dropText = document.getElementById("dropText");
const fileInput = document.getElementById("fileInput");
const cropper = document.getElementById("cropper");
const cropViewport = document.getElementById("cropViewport");
const cropImg = document.getElementById("cropImg");
const zoomSlider = document.getElementById("zoomSlider");
const nextBtn = document.getElementById("nextBtn");
const chooseAnother = document.getElementById("chooseAnother");
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const confirmImg = document.getElementById("confirmImg");
const editBtn = document.getElementById("editBtn");
const confirmBtn = document.getElementById("confirmBtn");

const carouselTrack = document.getElementById("carouselTrack");

// ---------- Carousel ----------
// Each slide is a photo + its photo-realistic QR (encoding https://www.qrky.ai).
// The list is duplicated so the CSS translateX(-50%) loop seams cleanly.
(function initCarousel() {
  const pairs = DEFAULT_IMAGES.map((img, i) => ({ img, qr: DEFAULT_QRS[i] }));
  const doubled = [...pairs, ...pairs];
  carouselTrack.innerHTML = doubled
    .map(
      (p) => `
        <div class="pair">
          <img src="${p.img}" alt="Sample photo" />
          <span class="arrow">&rarr;</span>
          <img src="${p.qr}" alt="Photo-realistic QR for https://www.qrky.ai" />
        </div>
      `
    )
    .join("");
})();

// ---------- URL input + Submit ----------
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); submitBtn.click(); }
});
submitBtn.addEventListener("click", () => {
  const v = urlInput.value.trim();
  if (!v) {
    state.url = "";
    qrError.classList.add("hidden");
    selectThumb(state.selectedSrc, state.selectedIsCustom);
    return;
  }
  if (!/^https?:\/\/.+\..+/.test(v)) {
    showError("Enter a valid URL (must start with http:// or https://).");
    return;
  }
  state.url = v;
  regenerateQR();
});

// ---------- Thumbnail selection ----------
thumbGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".thumb");
  if (!btn) return;
  selectThumb(btn.dataset.src, false);
});
uploadSelect.addEventListener("click", () => {
  if (state.customDataUrl) selectThumb(state.customDataUrl, true);
});

function selectThumb(src, isCustom) {
  state.selectedSrc = src;
  state.selectedIsCustom = isCustom;
  document.querySelectorAll(".thumb").forEach((t) => t.classList.remove("selected"));
  uploadSlot.classList.remove("selected");
  if (isCustom) {
    uploadSlot.classList.add("selected");
  } else {
    const match = document.querySelector(`.thumb[data-src="${src}"]`);
    if (match) match.classList.add("selected");
  }
  qrMiniThumbImg.src = src;
  if (state.url) {
    regenerateQR();
  } else if (!isCustom) {
    const idx = DEFAULT_IMAGES.indexOf(src);
    if (idx >= 0) {
      qrImage.src = DEFAULT_QRS[idx];
      qrCaption.textContent = "Scan to open: " + DEFAULT_URL;
    }
  } else {
    regenerateQR(DEFAULT_URL);
  }
}

// ---------- QR generation ----------
let countdownTimer = null;

function startGeneratingUI() {
  qrError.classList.add("hidden");
  qrImage.classList.add("blurred");
  qrOverlay.classList.remove("hidden");
  submitBtn.disabled = true;
  let remaining = 15;
  qrCountdown.textContent = remaining;
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      qrCountdown.textContent = "0";
      clearInterval(countdownTimer);
    } else {
      qrCountdown.textContent = remaining;
    }
  }, 1000);
}

function stopGeneratingUI() {
  clearInterval(countdownTimer);
  qrImage.classList.remove("blurred");
  qrOverlay.classList.add("hidden");
  submitBtn.disabled = false;
}

function showError(msg) {
  qrError.textContent = msg;
  qrError.classList.remove("hidden");
}

async function regenerateQR(overrideUrl) {
  const urlToUse = overrideUrl || state.url;
  const myReq = ++state.reqId;
  startGeneratingUI();
  qrCaption.textContent = "";

  try {
    const fileBlob = await getSelectedImageBlob();
    const form = new FormData();
    form.append("file", fileBlob, "embed.png");
    form.append("content", urlToUse);
    form.append("name", "QRKY home-page QR");
    form.append("isTrackable", "false");

    const result = await callQRKY(form);
    if (myReq !== state.reqId) return; // stale

    const base64 = result?.data?.qrImageUrl;
    if (!base64) throw new Error("Malformed API response");

    const src = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
    qrImage.src = src;
    qrCaption.textContent = "Scan to open: " + urlToUse;
    stopGeneratingUI();
  } catch (err) {
    if (myReq !== state.reqId) return;
    console.error(err);
    stopGeneratingUI();
    showError("Couldn't generate QR: " + (err.message || "unknown error"));
    qrCaption.textContent = "";
  }
}

async function callQRKY(form) {
  const hosts = [QRKY_ENDPOINT, QRKY_FALLBACK];
  let lastErr = null;
  for (const url of hosts) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "X-API-Key": QRKY_API_KEY },
        body: form,
      });
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        throw new Error(`HTTP ${r.status}: ${text.slice(0, 160)}`);
      }
      return await r.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Request failed");
}

async function getSelectedImageBlob() {
  const src = state.selectedSrc;
  if (state.selectedIsCustom) {
    return dataUrlToBlob(src);
  }
  if (state.cachedBlobs.has(src)) return state.cachedBlobs.get(src);
  const resp = await fetch(src);
  const blob = await resp.blob();
  state.cachedBlobs.set(src, blob);
  return blob;
}

function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(",");
  const mime = (meta.match(/data:(.*?);/) || [])[1] || "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// ---------- Upload modal ----------
uploadEmpty.addEventListener("click", () => openModal());
uploadReplace.addEventListener("click", () => openModal());
modalClose.addEventListener("click", () => closeModal());
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

function openModal() {
  resetCropper();
  step1.classList.remove("hidden");
  step2.classList.add("hidden");
  modal.classList.remove("hidden");
}
function closeModal() { modal.classList.add("hidden"); }

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("drag"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag");
  const f = e.dataTransfer.files?.[0];
  if (f) handleFile(f);
});
fileInput.addEventListener("change", () => {
  const f = fileInput.files?.[0];
  if (f) handleFile(f);
});
chooseAnother.addEventListener("click", () => {
  resetCropper();
  fileInput.value = "";
});

function handleFile(file) {
  if (!file.type.startsWith("image/")) {
    dropText.textContent = "Please choose an image file.";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => loadIntoCropper(reader.result);
  reader.readAsDataURL(file);
}

// ---------- Cropper ----------
const cropState = {
  natW: 0, natH: 0,         // intrinsic image size
  viewSize: 0,              // viewport is square: viewSize x viewSize
  minScale: 1, scale: 1,
  x: 0, y: 0,
  dragging: false, dragStartX: 0, dragStartY: 0, imgStartX: 0, imgStartY: 0,
};

function resetCropper() {
  cropper.classList.add("hidden");
  dropZone.classList.remove("hidden");
  dropText.textContent = "Drag & drop an image here, or click to choose a file.";
  nextBtn.disabled = true;
  cropImg.removeAttribute("src");
}

function loadIntoCropper(dataUrl) {
  dropZone.classList.add("hidden");
  cropper.classList.remove("hidden");
  cropImg.onload = () => {
    cropState.natW = cropImg.naturalWidth;
    cropState.natH = cropImg.naturalHeight;
    cropState.viewSize = cropViewport.clientWidth;
    // Scale so the smaller dimension fills the square viewport.
    cropState.minScale = cropState.viewSize / Math.min(cropState.natW, cropState.natH);
    cropState.scale = cropState.minScale;
    zoomSlider.min = cropState.minScale.toFixed(4);
    zoomSlider.max = (cropState.minScale * 4).toFixed(4);
    zoomSlider.step = (cropState.minScale / 100).toFixed(6);
    zoomSlider.value = cropState.scale;
    // Center image inside viewport.
    cropState.x = (cropState.viewSize - cropState.natW * cropState.scale) / 2;
    cropState.y = (cropState.viewSize - cropState.natH * cropState.scale) / 2;
    applyTransform();
    nextBtn.disabled = false;
  };
  cropImg.src = dataUrl;
}

function applyTransform() {
  clampPosition();
  cropImg.style.transform = `translate(${cropState.x}px, ${cropState.y}px) scale(${cropState.scale})`;
}

function clampPosition() {
  const w = cropState.natW * cropState.scale;
  const h = cropState.natH * cropState.scale;
  const minX = cropState.viewSize - w;
  const minY = cropState.viewSize - h;
  if (cropState.x > 0) cropState.x = 0;
  if (cropState.y > 0) cropState.y = 0;
  if (cropState.x < minX) cropState.x = minX;
  if (cropState.y < minY) cropState.y = minY;
}

zoomSlider.addEventListener("input", () => {
  const prev = cropState.scale;
  const next = parseFloat(zoomSlider.value);
  // Zoom about the viewport center so the frame stays over the same spot.
  const cx = cropState.viewSize / 2;
  const cy = cropState.viewSize / 2;
  cropState.x = cx - ((cx - cropState.x) * next) / prev;
  cropState.y = cy - ((cy - cropState.y) * next) / prev;
  cropState.scale = next;
  applyTransform();
});

cropViewport.addEventListener("pointerdown", (e) => {
  cropState.dragging = true;
  cropState.dragStartX = e.clientX;
  cropState.dragStartY = e.clientY;
  cropState.imgStartX = cropState.x;
  cropState.imgStartY = cropState.y;
  cropViewport.setPointerCapture(e.pointerId);
});
cropViewport.addEventListener("pointermove", (e) => {
  if (!cropState.dragging) return;
  cropState.x = cropState.imgStartX + (e.clientX - cropState.dragStartX);
  cropState.y = cropState.imgStartY + (e.clientY - cropState.dragStartY);
  applyTransform();
});
cropViewport.addEventListener("pointerup", (e) => {
  cropState.dragging = false;
  cropViewport.releasePointerCapture(e.pointerId);
});

// ---------- Step 2: confirm ----------
nextBtn.addEventListener("click", () => {
  const dataUrl = renderCropTo512();
  confirmImg.src = dataUrl;
  state._pendingCropDataUrl = dataUrl;
  step1.classList.add("hidden");
  step2.classList.remove("hidden");
});
editBtn.addEventListener("click", () => {
  step2.classList.add("hidden");
  step1.classList.remove("hidden");
});
confirmBtn.addEventListener("click", () => {
  const dataUrl = state._pendingCropDataUrl;
  if (!dataUrl) return;
  state.customDataUrl = dataUrl;
  uploadImg.src = dataUrl;
  uploadEmpty.classList.add("hidden");
  uploadFilled.classList.remove("hidden");
  selectThumb(dataUrl, true);
  closeModal();
});

function renderCropTo512() {
  // Pixel-perfect: map the viewport-visible region back onto source pixels, scaled to 512x512.
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  // Source rect (in natural pixels): origin = (-x/scale, -y/scale), size = viewSize/scale.
  const sx = -cropState.x / cropState.scale;
  const sy = -cropState.y / cropState.scale;
  const sSize = cropState.viewSize / cropState.scale;
  ctx.drawImage(cropImg, sx, sy, sSize, sSize, 0, 0, 512, 512);
  return canvas.toDataURL("image/png");
}
