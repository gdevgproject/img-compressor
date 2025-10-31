// main.js
document.addEventListener("DOMContentLoaded", () => {
  // Kiểm tra server
  if (window.location.protocol === "file:") {
    const warningBox = document.getElementById("warningBox");
    warningBox.style.display = "block";
    warningBox.textContent =
      "LỖI: Trang này phải được chạy trên một Server (ví dụ: VS Code Live Server) để Web Worker hoạt động.";
  }

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

  const compressWorker = new Worker("compress.worker.js");

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
    originalImage.src = "";
    compressedImage.src = "";
    URL.revokeObjectURL(originalImage.src);
    URL.revokeObjectURL(compressedImage.src);
    downloadBtn.href = "#";
    imageInput.value = ""; // Reset file input
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

    // --- Reset và Chuẩn bị ---
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

      // --- CẤU HÌNH PHÂN LOẠI ĐA TẦNG TỐI ƯU ---
      const compressionTiers = [
        { thresholdKB: 8, targetKB: 3, name: "Tối giản" },
        { thresholdKB: 35, targetKB: 20, name: "Đồ họa phẳng" },
        { thresholdKB: 80, targetKB: 45, name: "Ảnh Web chuẩn" },
      ];

      compressWorker.postMessage({
        file: file,
        maxDimension: 960,
        // Gửi các mục tiêu cho từng loại ảnh đã được phân loại
        targets: {
          grayscale: 15,
          minimal: 8,
          graphic: 25,
          standard: 50,
          complex: 75, // Đây là defaultTargetKB cũ
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

        let finalMessage = `Nén thành công! Dung lượng giảm ${ratio.toFixed(
          1
        )}%.`;
        if (compressedSize > (data.finalTargetKB || 70) * 1024) {
          finalMessage = `Đã nén hết mức có thể nhưng vẫn chưa đạt mục tiêu.`;
        }
        updateProgress(100, "Hoàn tất!");
        infoMessage.textContent = finalMessage;

        downloadBtn.href = compressedURL;
        resultsArea.style.display = "block"; // Hiển thị khu vực kết quả
      };
    } else if (data.status === "error") {
      infoMessage.textContent = data.message;
      updateProgress(0, "LỖI XỬ LÝ");
      resultsArea.style.display = "block"; // Vẫn hiển thị nút reset
    }
  };

  // --- Event Listeners ---
  // Dòng 'uploadArea.addEventListener("click", ...)' đã được XÓA để sửa lỗi
  imageInput.addEventListener("change", (event) =>
    handleImageUpload(event.target.files[0])
  );

  // Drag and Drop
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

  // Khởi tạo giao diện
  resetUI();
});
