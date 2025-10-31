// main.js (PHIÊN BẢN V5.3 - Sửa lỗi TV Preview)
document.addEventListener("DOMContentLoaded", () => {
  if (window.location.protocol === "file:") {
    const warningBox = document.getElementById("warningBox");
    warningBox.style.display = "block";
    warningBox.textContent =
      "LỖI: Trang này phải được chạy trên một Server để Web Worker hoạt động.";
  }

  // --- Khai báo biến DOM ---
  const imageInput = document.getElementById("imageInput");
  const uploadArea = document.getElementById("upload-area");
  const progressBar = document.getElementById("progressBar");
  const infoMessage = document.getElementById("infoMessage");
  const resultsArea = document.getElementById("results-area");
  const originalInfo = document.getElementById("originalInfo");
  const resetBtn = document.getElementById("resetBtn");
  const generatedVersionsList = document.getElementById(
    "generatedVersionsList"
  );

  // DOM cho Preview
  const previewArea = document.getElementById("preview-area");
  const previewFrame = document.getElementById("preview-frame");
  const previewImage = document.getElementById("previewImage");
  const previewInfo = document.getElementById("previewInfo");
  const previewControls = document.querySelector(".preview-controls");
  let tvModal = null;

  // Biến lưu trữ trạng thái
  let generatedProfiles = [];
  let blobUrls = [];

  const compressWorker = new Worker("compress.worker.js");

  // --- Logic điều khiển Preview Thông minh ---
  previewControls.addEventListener("click", (e) => {
    if (!e.target.matches(".preview-btn:not(.disabled)")) return;

    previewControls
      .querySelectorAll(".preview-btn")
      .forEach((btn) => btn.classList.remove("active"));
    e.target.classList.add("active");
    const device = e.target.dataset.device;

    const profileMap = { web: "Laptop", mobile: "Mobile", tv: "TV" };
    const profileName = profileMap[device];
    const targetProfile = generatedProfiles.find((p) => p.name === profileName);

    if (!targetProfile) return; // Không tìm thấy profile, không làm gì cả

    if (tvModal) tvModal.classList.remove("visible");

    if (device === "tv") {
      if (!tvModal) createTvModal();

      // === SỬA LỖI TV PREVIEW TẠI ĐÂY ===
      // Luôn chủ động cập nhật nguồn ảnh của TV modal ngay trước khi hiển thị
      tvModal.querySelector("img").src = targetProfile.blobUrl;
      tvModal.classList.add("visible");
    } else {
      // Cập nhật cho các preview khác (Laptop, Mobile)
      updatePreviewImage(targetProfile.blobUrl);
      const frameDeviceMap = { Laptop: "web", Mobile: "mobile" };
      previewFrame.className = `device-${frameDeviceMap[profileName] || "web"}`;
      previewArea.classList.remove("desktop-bg");
    }
    updatePreviewInfo(device);
  });

  function updatePreviewImage(url) {
    previewImage.src = url;
  }

  function updatePreviewInfo(device) {
    const infoTexts = {
      web: "Mô phỏng hiển thị trên Laptop.",
      mobile:
        "Ảnh được hiển thị vừa chiều ngang ở nửa trên màn hình điện thoại.",
      tv: "Mô phỏng ảnh bị kéo dãn trên TV. Chú ý các điểm ảnh bị vỡ hoặc mờ.",
    };
    previewInfo.textContent = infoTexts[device];
  }

  function createTvModal() {
    tvModal = document.createElement("div");
    tvModal.className = "device-tv-modal";
    tvModal.innerHTML = `
            <button class="close-tv-preview">&times;</button>
            <div class="tv-bezel"><div class="tv-screen"><img src="" alt="TV Preview" /></div></div>
            <div class="preview-info"></div>`;
    document.body.appendChild(tvModal);

    tvModal.querySelector(".close-tv-preview").addEventListener("click", () => {
      tvModal.classList.remove("visible");
      const tvButton = previewControls.querySelector('[data-device="tv"]');
      if (tvButton.classList.contains("active")) {
        const defaultBtn = previewControls.querySelector(
          ".preview-btn:not(.disabled)"
        );
        if (defaultBtn) defaultBtn.click();
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
    blobUrls.forEach((url) => URL.revokeObjectURL(url));
    blobUrls = [];
    generatedProfiles = [];
    imageInput.value = "";
    generatedVersionsList.innerHTML = "";
    if (tvModal) document.body.removeChild(tvModal); // Xóa hẳn modal để reset hoàn toàn
    tvModal = null;
    previewControls.querySelectorAll(".preview-btn").forEach((btn) => {
      btn.classList.add("disabled");
      btn.classList.remove("active");
    });
  }

  function handleImageUpload(file) {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }
    if (file.type === "image/gif") {
      return;
    }

    resetUI();
    uploadArea.style.display = "none";
    updateProgress(5, "Đang chuẩn bị...");

    const originalURL = URL.createObjectURL(file);
    blobUrls.push(originalURL);

    const img = new Image();
    img.src = originalURL;
    img.onload = () => {
      originalInfo.innerHTML = `
                <li><span>Định dạng:</span> <span>${file.type}</span></li>
                <li><span>Kích thước:</span> <span>${img.naturalWidth}x${
        img.naturalHeight
      } px</span></li>
                <li><span>Dung lượng:</span> <span>${formatBytes(
                  file.size
                )}</span></li>
            `;
      compressWorker.postMessage({ file: file });
    };
  }

  // --- Lắng nghe kết quả từ Worker ---
  compressWorker.onmessage = (e) => {
    const data = e.data;

    if (data.status === "progress") {
      updateProgress(data.percent, data.message);
    } else if (data.status === "complete") {
      generatedProfiles = data.allProfiles;
      generatedVersionsList.innerHTML = "";

      generatedProfiles.forEach((profile) => {
        const blobUrl = URL.createObjectURL(profile.blob);
        blobUrls.push(blobUrl);
        profile.blobUrl = blobUrl;

        const card = document.createElement("div");
        card.className = "version-card";
        card.innerHTML = `
                    <h4>Phiên bản ${profile.name}</h4>
                    <ul>
                        <li><span>Kích thước:</span> <span>${profile.width}x${
          profile.height
        } px</span></li>
                        <li><span>Dung lượng:</span> <span>${formatBytes(
                          profile.blob.size
                        )}</span></li>
                        <li><span>Chất lượng:</span> <span>~${(
                          profile.quality * 100
                        ).toFixed(0)}%</span></li>
                    </ul>
                    <a href="${blobUrl}" download="compressed_${profile.name.toLowerCase()}.webp" class="btn download-version-btn">Tải phiên bản này</a>
                `;
        generatedVersionsList.appendChild(card);
      });

      const profileMap = { TV: "tv", Laptop: "web", Mobile: "mobile" };
      generatedProfiles.forEach((profile) => {
        const device = profileMap[profile.name];
        if (device) {
          const btn = previewControls.querySelector(
            `[data-device="${device}"]`
          );
          if (btn) btn.classList.remove("disabled");
        }
      });

      const defaultBtn =
        previewControls.querySelector('[data-device="web"]:not(.disabled)') ||
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
    handleImageUpload(e.dataTransfer.files[0]);
  });
  resetBtn.addEventListener("click", resetUI);

  resetUI();
});
