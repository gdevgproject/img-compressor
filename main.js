// main.js (Phiên bản Hoàn chỉnh - Preview Nâng cao)
document.addEventListener("DOMContentLoaded", () => {
  if (window.location.protocol === "file:") {
    const warningBox = document.getElementById("warningBox");
    warningBox.style.display = "block";
    warningBox.textContent =
      "LỖI: Trang này phải được chạy trên một Server (ví dụ: VS Code Live Server) để Web Worker hoạt động.";
  }

  // --- Khai báo biến DOM ---
  const imageInput = document.getElementById("imageInput");
  const uploadArea = document.getElementById("upload-area");
  const progressBar = document.getElementById("progressBar");
  const infoMessage = document.getElementById("infoMessage");
  const resultsArea = document.getElementById("results-area");
  const originalInfo = document.getElementById("originalInfo");
  const compressedInfo = document.getElementById("compressedInfo");
  const originalImage = document.getElementById("originalImage");
  const compressedImage = document.getElementById("compressedImage");
  const downloadBtn = document.getElementById("downloadBtn");
  const resetBtn = document.getElementById("resetBtn");

  // Khai báo biến cho khu vực Preview
  const previewArea = document.getElementById("preview-area");
  const previewFrame = document.getElementById("preview-frame");
  const previewImage = document.getElementById("previewImage");
  const previewInfo = document.getElementById("previewInfo");
  const previewControls = document.querySelector(".preview-controls");
  let tvModal = null;

  const compressWorker = new Worker("compress.worker.js");

  // --- Logic điều khiển Preview ---
  previewControls.addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") return;

    previewControls
      .querySelectorAll(".preview-btn")
      .forEach((btn) => btn.classList.remove("active"));
    e.target.classList.add("active");
    const device = e.target.dataset.device;

    if (tvModal) tvModal.classList.remove("visible");

    if (device === "tv") {
      if (!tvModal) createTvModal();
      tvModal.classList.add("visible");
    } else {
      previewFrame.className = `device-${device}`;
      previewArea.classList.toggle("desktop-bg", device === "desktop");
    }
    updatePreviewInfo(device);
  });

  function updatePreviewInfo(device) {
    const infoTexts = {
      web: "Mô phỏng hiển thị bên trong một cửa sổ trình duyệt trên Laptop.",
      mobile: "Ảnh được hiển thị full-screen trên một điện thoại mô phỏng.",
      desktop:
        "Đây là kích thước thật (pixel-by-pixel) của ảnh nén khi xem trên một màn hình lớn.",
      tv: "Mô phỏng ảnh bị kéo dãn trên TV. Chú ý các điểm ảnh bị vỡ hoặc mờ.",
    };
    previewInfo.textContent = infoTexts[device];
  }

  function createTvModal() {
    tvModal = document.createElement("div");
    tvModal.className = "device-tv-modal";
    tvModal.innerHTML = `
            <button class="close-tv-preview">&times;</button>
            <div class="tv-bezel">
                <div class="tv-screen">
                    <img src="${previewImage.src}" alt="TV Preview" />
                </div>
            </div>
            <div class="preview-info"></div>`;
    document.body.appendChild(tvModal);

    tvModal.querySelector(".close-tv-preview").addEventListener("click", () => {
      tvModal.classList.remove("visible");
      const tvButton = previewControls.querySelector('[data-device="tv"]');
      if (tvButton.classList.contains("active")) {
        tvButton.classList.remove("active");
        const webButton = previewControls.querySelector('[data-device="web"]');
        webButton.classList.add("active");
        previewFrame.className = "device-web";
        previewArea.classList.remove("desktop-bg");
        updatePreviewInfo("web");
      }
    });
  }

  // --- Các hàm tiện ích và quản lý UI ---
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
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
    infoMessage.textContent = "";
    resultsArea.style.display = "none";
    uploadArea.style.display = "block";
    if (originalImage.src) URL.revokeObjectURL(originalImage.src);
    if (compressedImage.src) URL.revokeObjectURL(compressedImage.src);
    originalImage.src = "";
    compressedImage.src = "";
    downloadBtn.href = "#";
    imageInput.value = "";
    if (tvModal) tvModal.classList.remove("visible");
  }

  function renderInfo(element, data) {
    element.innerHTML = `
            <li><span>Định dạng:</span> <span>${data.type}</span></li>
            <li><span>Kích thước:</span> <span>${data.width}x${
      data.height
    } px</span></li>
            <li><span>Dung lượng:</span> <span>${formatBytes(
              data.size
            )}</span></li>
            ${
              data.quality
                ? `<li><span>Chất lượng:</span> <span>${(
                    data.quality * 100
                  ).toFixed(0)}%</span></li>`
                : ""
            }
            ${
              data.ratio
                ? `<li style="color: var(--success-color);"><span>Giảm:</span> <span>${data.ratio.toFixed(
                    2
                  )}%</span></li>`
                : ""
            }
        `;
  }

  function handleImageUpload(file) {
    if (!file || !file.type.startsWith("image/")) {
      infoMessage.textContent = "Vui lòng chọn một file ảnh hợp lệ.";
      return;
    }
    if (file.type === "image/gif") {
      infoMessage.textContent =
        "GIF không được hỗ trợ nén bằng phương pháp này.";
      return;
    }

    uploadArea.style.display = "none";
    updateProgress(5, "Đang chuẩn bị...");

    const originalURL = URL.createObjectURL(file);
    originalImage.src = originalURL;

    originalImage.onload = () => {
      renderInfo(originalInfo, {
        type: file.type,
        width: originalImage.naturalWidth,
        height: originalImage.naturalHeight,
        size: file.size,
      });

      compressWorker.postMessage({
        file: file,
        maxDimension: 960,
        targets: {
          minimal: 2,
          vector: 5,
          graphic: 15,
          art: 30,
          standard: 45,
          complex: 65,
        },
      });
    };
  }

  // --- Lắng nghe kết quả từ Worker ---
  compressWorker.onmessage = (e) => {
    const data = e.data;

    if (data.status === "progress") {
      updateProgress(data.percent, data.message);
    } else if (data.status === "complete") {
      const { compressedBlob, originalSize, compressedSize, bestQuality } =
        data;
      const compressedURL = URL.createObjectURL(compressedBlob);

      compressedImage.src = compressedURL;
      compressedImage.onload = () => {
        const ratio = ((originalSize - compressedSize) / originalSize) * 100;

        renderInfo(compressedInfo, {
          type: compressedBlob.type,
          width: compressedImage.naturalWidth,
          height: compressedImage.naturalHeight,
          size: compressedSize,
          quality: bestQuality,
          ratio: ratio,
        });

        updateProgress(100, "Hoàn tất!");
        infoMessage.textContent = `Nén thành công! Dung lượng giảm ${ratio.toFixed(
          1
        )}%.`;

        downloadBtn.href = compressedURL;
        resultsArea.style.display = "block";

        // === CẬP NHẬT GIAO DIỆN PREVIEW ===
        previewImage.src = compressedURL;
        const webButton = previewControls.querySelector('[data-device="web"]');
        webButton.click(); // Tự động click vào nút web để reset về trạng thái mặc định
        if (tvModal) {
          tvModal.querySelector("img").src = compressedURL;
        }
      };
    } else if (data.status === "error") {
      infoMessage.textContent = data.message;
      updateProgress(0, "LỖI XỬ LÝ");
    }
  };

  // --- Event Listeners ---
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
    const file = e.dataTransfer.files[0];
    handleImageUpload(file);
  });

  resetBtn.addEventListener("click", resetUI);
  resetUI();
});
