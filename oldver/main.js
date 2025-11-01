// main.js (PHIÊN BẢN V17.1 - Nâng cấp Zoom thông minh)
document.addEventListener("DOMContentLoaded", () => {
  // --- Khai báo biến DOM ---
  const imageInput = document.getElementById("imageInput");
  const uploadArea = document.getElementById("upload-area");
  const progressBar = document.getElementById("progressBar");
  const infoMessage = document.getElementById("infoMessage");
  const resultsArea = document.getElementById("results-area");
  const originalInfoTitle = document.getElementById("original-info-title");
  const originalInfo = document.getElementById("originalInfo");
  const resetBtn = document.getElementById("resetBtn");
  const generatedVersionsList = document.getElementById(
    "generatedVersionsList"
  );
  const copyResultsBtn = document.getElementById("copyResultsBtn");
  const previewControls = document.querySelector(".preview-controls");
  const previewImage = document.getElementById("previewImage");
  const previewInfo = document.getElementById("previewInfo");
  const summaryBox = document.getElementById("summaryBox");
  const summaryInfo = document.getElementById("summaryInfo");

  // DOM cho trình crop
  const cropperModal = document.getElementById("cropper-modal");
  const cropperCanvas = document.getElementById("cropper-canvas");
  const cropConfirmBtn = document.getElementById("crop-confirm-btn");
  const cropCancelBtn = document.getElementById("crop-cancel-btn");
  const cropperCtx = cropperCanvas.getContext("2d");

  let originalFileData = {},
    generatedProfiles = [],
    blobUrls = [];
  const compressWorker = new Worker("compress.worker.js");

  // --- Logic Trình Crop ---
  const ZOOM_SENSITIVITY = 1.1; // Tăng/giảm giá trị này để điều chỉnh độ nhạy zoom
  let cropState = {
    image: null,
    scale: 1,
    offset: { x: 0, y: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    cropBox: { x: 0, y: 0, width: 0, height: 0 },
  };

  function initCropper(imageFile) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        cropState.image = img;
        setupCropperCanvas();
        cropperModal.classList.add("visible");
        requestAnimationFrame(drawCropper);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(imageFile);
  }

  function setupCropperCanvas() {
    const containerWidth = cropperCanvas.parentElement.clientWidth;
    const canvasWidth = Math.min(containerWidth, 800);
    const canvasHeight = canvasWidth * 0.75; // Tỷ lệ 4:3 cho canvas

    cropperCanvas.width = canvasWidth;
    cropperCanvas.height = canvasHeight;

    // Khung crop chiếm 90% canvas để có lề
    cropState.cropBox.width = canvasWidth * 0.9;
    cropState.cropBox.height = cropState.cropBox.width * (3 / 4);
    cropState.cropBox.x = (canvasWidth - cropState.cropBox.width) / 2;
    cropState.cropBox.y = (canvasHeight - cropState.cropBox.height) / 2;

    // Tính toán scale và vị trí ban đầu để ảnh fill khung crop
    const imgAspectRatio = cropState.image.width / cropState.image.height;
    const boxAspectRatio = 4 / 3;

    if (imgAspectRatio > boxAspectRatio) {
      // Ảnh rộng hơn khung
      cropState.scale = cropState.cropBox.height / cropState.image.height;
    } else {
      // Ảnh cao hơn hoặc bằng khung
      cropState.scale = cropState.cropBox.width / cropState.image.width;
    }

    // Căn giữa ảnh
    cropState.offset.x =
      (canvasWidth - cropState.image.width * cropState.scale) / 2;
    cropState.offset.y =
      (canvasHeight - cropState.image.height * cropState.scale) / 2;
  }

  function drawCropper() {
    cropperCtx.clearRect(0, 0, cropperCanvas.width, cropperCanvas.height);

    // Vẽ ảnh
    cropperCtx.drawImage(
      cropState.image,
      cropState.offset.x,
      cropState.offset.y,
      cropState.image.width * cropState.scale,
      cropState.image.height * cropState.scale
    );

    // Vẽ lớp phủ mờ bên ngoài
    cropperCtx.fillStyle = "rgba(0, 0, 0, 0.6)";
    cropperCtx.beginPath();
    cropperCtx.rect(0, 0, cropperCanvas.width, cropperCanvas.height);
    cropperCtx.rect(
      cropState.cropBox.x,
      cropState.cropBox.y,
      cropState.cropBox.width,
      cropState.cropBox.height
    );
    cropperCtx.fill("evenodd");
  }

  function getEventPosition(event) {
    const rect = cropperCanvas.getBoundingClientRect();
    const touch = event.touches ? event.touches[0] : event;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }

  function onPointerDown(e) {
    e.preventDefault();
    cropState.isDragging = true;
    cropState.dragStart = getEventPosition(e);
  }

  function onPointerMove(e) {
    if (!cropState.isDragging) return;
    e.preventDefault();
    const pos = getEventPosition(e);
    const dx = pos.x - cropState.dragStart.x;
    const dy = pos.y - cropState.dragStart.y;
    cropState.offset.x += dx;
    cropState.offset.y += dy;
    cropState.dragStart = pos;
    requestAnimationFrame(drawCropper);
  }

  function onPointerUp() {
    if (!cropState.isDragging) return;
    cropState.isDragging = false;
    // Giới hạn di chuyển để ảnh không ra khỏi khung
    const { image, offset, scale, cropBox } = cropState;
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    offset.x = Math.min(
      cropBox.x,
      Math.max(offset.x, cropBox.x + cropBox.width - scaledWidth)
    );
    offset.y = Math.min(
      cropBox.y,
      Math.max(offset.y, cropBox.y + cropBox.height - scaledHeight)
    );
    requestAnimationFrame(drawCropper);
  }

  // === HÀM ZOOM ĐÃ ĐƯỢC NÂNG CẤP ===
  function onWheel(e) {
    e.preventDefault();
    const pos = getEventPosition(e);

    // Xác định hướng và hệ số zoom
    const delta = e.deltaY > 0 ? 1 / ZOOM_SENSITIVITY : ZOOM_SENSITIVITY;
    const newScale = cropState.scale * delta;

    // Giới hạn zoom out: không cho phép ảnh nhỏ hơn khung crop
    const minScale = Math.max(
      cropState.cropBox.width / cropState.image.width,
      cropState.cropBox.height / cropState.image.height
    );
    if (newScale < minScale) {
      return; // Không zoom nhỏ hơn nữa
    }

    // Logic "Zoom thông minh": tính toán lại offset để điểm dưới con trỏ không đổi vị trí
    cropState.offset.x = pos.x - (pos.x - cropState.offset.x) * delta;
    cropState.offset.y = pos.y - (pos.y - cropState.offset.y) * delta;

    cropState.scale = newScale;

    // Gọi lại onPointerUp để kiểm tra và giới hạn lại vị trí ảnh sau khi zoom
    onPointerUp();
    requestAnimationFrame(drawCropper);
  }

  cropperCanvas.addEventListener("mousedown", onPointerDown);
  cropperCanvas.addEventListener("mousemove", onPointerMove);
  window.addEventListener("mouseup", onPointerUp);
  cropperCanvas.addEventListener("mouseleave", onPointerUp);
  cropperCanvas.addEventListener("wheel", onWheel, { passive: false });
  // Touch events
  cropperCanvas.addEventListener("touchstart", onPointerDown);
  cropperCanvas.addEventListener("touchmove", onPointerMove);
  window.addEventListener("touchend", onPointerUp);

  async function handleCropConfirm() {
    const { image, scale, offset, cropBox } = cropState;

    // Tính toán vùng crop trên ảnh gốc
    const sourceX = (cropBox.x - offset.x) / scale;
    const sourceY = (cropBox.y - offset.y) / scale;
    const sourceWidth = cropBox.width / scale;
    const sourceHeight = cropBox.height / scale;

    const finalCanvas = new OffscreenCanvas(sourceWidth, sourceHeight);
    const finalCtx = finalCanvas.getContext("2d");

    finalCtx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight, // Vùng cắt từ ảnh gốc
      0,
      0,
      sourceWidth,
      sourceHeight // Vẽ vào canvas mới
    );

    const blob = await finalCanvas.convertToBlob({ type: "image/png" });
    const croppedFile = new File([blob], "cropped_image.png", {
      type: "image/png",
    });

    cropperModal.classList.remove("visible");
    startCompression(croppedFile);
  }

  function handleCropCancel() {
    cropperModal.classList.remove("visible");
    resetUI();
  }

  cropConfirmBtn.addEventListener("click", handleCropConfirm);
  cropCancelBtn.addEventListener("click", handleCropCancel);

  // --- Logic Chính ---
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      parseFloat(
        (bytes / Math.pow(k, i)).toFixed(decimals < 0 ? 0 : decimals)
      ) +
      " " +
      sizes[i]
    );
  }

  function updateProgress(percent, text) {
    progressBar.style.width = `${percent}%`;
    progressBar.textContent = text;
    infoMessage.textContent = text;
    progressBar.style.backgroundColor =
      percent === 100 ? "var(--success-color)" : "var(--primary-color)";
  }

  function resetUI() {
    updateProgress(0, "Sẵn sàng");
    resultsArea.style.display = "none";
    uploadArea.style.display = "block";
    summaryBox.style.display = "none";
    blobUrls.forEach((url) => URL.revokeObjectURL(url));
    blobUrls = [];
    originalFileData = {};
    generatedProfiles = [];
    imageInput.value = "";
    generatedVersionsList.innerHTML = "";
    previewControls.querySelectorAll(".preview-btn").forEach((btn) => {
      btn.classList.add("disabled");
      btn.classList.remove("active");
    });
  }

  function handleImageUpload(file) {
    if (!file || !file.type.startsWith("image/") || file.type.includes("svg")) {
      alert("Vui lòng chọn một file ảnh hợp lệ (JPG, PNG, WebP, BMP, AVIF).");
      return;
    }
    resetUI();
    initCropper(file);
  }

  function startCompression(file) {
    uploadArea.style.display = "none";
    updateProgress(5, "Đang chuẩn bị nén...");

    const img = new Image();
    const objectURL = URL.createObjectURL(file);
    blobUrls.push(objectURL);

    img.onload = () => {
      originalFileData = {
        type: file.type,
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size,
      };
      originalInfoTitle.textContent = "Ảnh đã Crop (4:3)";
      originalInfo.innerHTML = `<li><span>Định dạng:</span> <span>${
        originalFileData.type
      } (trước khi nén)</span></li><li><span>Kích thước:</span> <span>${
        originalFileData.width
      }x${
        originalFileData.height
      } px</span></li><li><span>Dung lượng:</span> <span>${formatBytes(
        originalFileData.size
      )}</span></li>`;
      compressWorker.postMessage({ file: file });
      URL.revokeObjectURL(objectURL); // Giải phóng sau khi đọc xong
    };
    img.src = objectURL;
  }

  // --- Lắng nghe kết quả từ Worker ---
  compressWorker.onmessage = (e) => {
    const data = e.data;
    if (data.status === "progress") {
      updateProgress(data.percent, data.message);
    } else if (data.status === "complete") {
      generatedProfiles = data.allProfiles;
      generatedVersionsList.innerHTML = "";
      let totalCompressedSize = 0;

      generatedProfiles.forEach((profile) => {
        totalCompressedSize += profile.blob.size;
        const blobUrl = URL.createObjectURL(profile.blob);
        blobUrls.push(blobUrl);
        profile.blobUrl = blobUrl;
        const card = document.createElement("div");
        card.className = "version-card";
        card.innerHTML = `<h4>Phiên bản ${profile.name.toUpperCase()}</h4><ul><li><span>Kích thước:</span> <span>${
          profile.width
        }x${
          profile.height
        } px</span></li><li><span>Dung lượng:</span> <span>${formatBytes(
          profile.blob.size
        )}</span></li><li><span>Chất lượng:</span> <span>~${(
          profile.quality * 100
        ).toFixed(
          0
        )}%</span></li></ul><a href="${blobUrl}" download="compressed_${
          profile.name
        }.webp" class="btn download-version-btn">Tải bản '${profile.name}'</a>`;
        generatedVersionsList.appendChild(card);
      });

      summaryInfo.innerHTML = `<li><span>Số phiên bản tạo ra:</span> <span>${
        generatedProfiles.length
      }</span></li><li><span>Tổng dung lượng nén:</span> <span>${formatBytes(
        totalCompressedSize
      )}</span></li>`;
      summaryBox.style.display = "block";

      generatedProfiles.forEach((profile) => {
        const btn = previewControls.querySelector(
          `[data-device="${profile.name}"]`
        );
        if (btn) btn.classList.remove("disabled");
      });

      const defaultBtn =
        previewControls.querySelector('[data-device="m"]:not(.disabled)') ||
        previewControls.querySelector(".preview-btn:not(.disabled)");
      if (defaultBtn) defaultBtn.click();

      updateProgress(100, "Hoàn tất!");
      infoMessage.textContent = `Đã tạo thành công ${generatedProfiles.length} phiên bản.`;
      resultsArea.style.display = "block";
    } else if (data.status === "error") {
      infoMessage.textContent = data.message;
      updateProgress(0, "LỖI XỬ LÝ");
    }
  };

  // --- Preview & Actions ---
  previewControls.addEventListener("click", (e) => {
    if (!e.target.matches(".preview-btn:not(.disabled)")) return;
    previewControls
      .querySelectorAll(".preview-btn")
      .forEach((btn) => btn.classList.remove("active"));
    e.target.classList.add("active");
    const device = e.target.dataset.device;
    const targetProfile = generatedProfiles.find((p) => p.name === device);
    if (!targetProfile) return;

    previewImage.src = targetProfile.blobUrl;
    const frameDeviceMap = { m: "web", s: "mobile" };
    document.getElementById("preview-frame").className = `device-${
      frameDeviceMap[device] || "web"
    }`;
    previewInfo.textContent = {
      m: "Phiên bản Medium (864px) cho web/laptop và điện thoại.",
      s: "Phiên bản Small (420px) cho preview nhỏ, 1/3 màn hình điện thoại.",
    }[device];
  });

  function handleCopyResults() {
    let report = "--- KẾT QUẢ NÉN ẢNH ---\n\n";
    report += "ẢNH SAU KHI CROP (TRƯỚC KHI NÉN):\n";
    report += `- Kích thước: ${originalFileData.width}x${originalFileData.height} px\n`;
    report += `- Dung lượng tạm thời: ${formatBytes(
      originalFileData.size
    )}\n\n`;
    report += "CÁC PHIÊN BẢN ĐÃ TẠO:\n";
    generatedProfiles.forEach((profile) => {
      report += `\n* PHIÊN BẢN ${profile.name.toUpperCase()}:\n`;
      report += `  - Kích thước: ${profile.width}x${profile.height} px\n`;
      report += `  - Dung lượng: ${formatBytes(profile.blob.size)}\n`;
      report += `  - Chất lượng tương đối: ~${(profile.quality * 100).toFixed(
        0
      )}%\n`;
    });
    navigator.clipboard.writeText(report).then(() => {
      const originalText = copyResultsBtn.textContent;
      copyResultsBtn.textContent = "✓ Đã sao chép!";
      setTimeout(() => {
        copyResultsBtn.textContent = originalText;
      }, 2000);
    });
  }

  // --- Event Listeners ban đầu ---
  imageInput.addEventListener("change", (event) =>
    handleImageUpload(event.target.files[0])
  );
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });
  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });
  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    handleImageUpload(e.dataTransfer.files[0]);
  });
  resetBtn.addEventListener("click", resetUI);
  copyResultsBtn.addEventListener("click", handleCopyResults);
  resetUI();
});
