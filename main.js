// main.js (PHIÊN BẢN V15.0 - Hệ thống 3 Cấu hình l, m, s)
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
  const copyResultsBtn = document.getElementById("copyResultsBtn");
  const previewControls = document.querySelector(".preview-controls");
  const previewArea = document.getElementById("preview-area");
  const previewFrame = document.getElementById("preview-frame");
  const previewImage = document.getElementById("previewImage");
  const previewInfo = document.getElementById("previewInfo");
  const summaryBox = document.getElementById("summaryBox");
  const summaryInfo = document.getElementById("summaryInfo");

  let tvModal = null,
    originalFileData = {},
    generatedProfiles = [],
    blobUrls = [];
  const compressWorker = new Worker("compress.worker.js");

  // --- Logic điều khiển Preview ---
  previewControls.addEventListener("click", (e) => {
    if (!e.target.matches(".preview-btn:not(.disabled)")) return;
    previewControls
      .querySelectorAll(".preview-btn")
      .forEach((btn) => btn.classList.remove("active"));
    e.target.classList.add("active");
    const device = e.target.dataset.device;
    const targetProfile = generatedProfiles.find((p) => p.name === device);
    if (!targetProfile) return;

    if (tvModal) tvModal.classList.remove("visible");

    if (device === "l") {
      if (!tvModal) createTvModal();
      tvModal.querySelector("img").src = targetProfile.blobUrl;
      tvModal.classList.add("visible");
    } else {
      updatePreviewImage(targetProfile.blobUrl);
      const frameDeviceMap = { m: "web", s: "mobile" };
      previewFrame.className = `device-${frameDeviceMap[device] || "web"}`;
      previewArea.classList.remove("desktop-bg");
    }
    updatePreviewInfo(device);
  });

  function updatePreviewImage(url) {
    previewImage.src = url;
  }

  function updatePreviewInfo(device) {
    const infoTexts = {
      l: "Phiên bản Large (1080px) cho màn hình lớn.",
      m: "Phiên bản Medium (720px) cho web/laptop và điện thoại.",
      s: "Phiên bản Small (360px) cho preview nhỏ, 1/3 màn hình điện thoại.",
    };
    previewInfo.textContent = infoTexts[device];
  }

  function createTvModal() {
    tvModal = document.createElement("div");
    tvModal.className = "device-tv-modal";
    tvModal.innerHTML = `<button class="close-tv-preview">&times;</button><div class="tv-bezel"><div class="tv-screen"><img src="" alt="TV Preview" /></div></div>`;
    document.body.appendChild(tvModal);
    tvModal.querySelector(".close-tv-preview").addEventListener("click", () => {
      tvModal.classList.remove("visible");
      const activeButton = previewControls.querySelector(".preview-btn.active");
      if (activeButton && activeButton.dataset.device === "l") {
        const defaultBtn = previewControls.querySelector(
          '[data-device="m"]:not(.disabled)'
        );
        if (defaultBtn) defaultBtn.click();
      }
    });
  }

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
    (blobUrls = []), (originalFileData = {}), (generatedProfiles = []);
    (imageInput.value = ""), (generatedVersionsList.innerHTML = "");
    if (tvModal) {
      document.body.removeChild(tvModal);
      tvModal = null;
    }
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
      originalFileData = {
        type: file.type,
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size,
      };
      originalInfo.innerHTML = `<li><span>Định dạng:</span> <span>${
        originalFileData.type
      }</span></li><li><span>Kích thước:</span> <span>${
        originalFileData.width
      }x${
        originalFileData.height
      } px</span></li><li><span>Dung lượng:</span> <span>${formatBytes(
        originalFileData.size
      )}</span></li>`;
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

  // --- Logic Sao chép & Event Listeners (Không đổi) ---
  function handleCopyResults() {
    let report = "--- KẾT QUẢ NÉN ẢNH ---\n\n";
    report += "ẢNH GỐC:\n";
    report += `- Định dạng: ${originalFileData.type}\n`;
    report += `- Kích thước: ${originalFileData.width}x${originalFileData.height} px\n`;
    report += `- Dung lượng: ${formatBytes(originalFileData.size)}\n\n`;
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
