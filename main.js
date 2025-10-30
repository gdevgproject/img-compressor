// main.js
document.addEventListener("DOMContentLoaded", () => {
  // Kiểm tra xem có đang chạy trên server không
  if (window.location.protocol === "file:") {
    const warningBox = document.getElementById("warningBox");
    warningBox.style.display = "block";
    warningBox.textContent =
      "LỖI: Trang này phải được chạy trên một Server (ví dụ: VS Code Live Server) để Web Worker hoạt động. Vui lòng không mở file HTML trực tiếp.";
  }

  const input = document.getElementById("imageInput");
  const progressBar = document.getElementById("progressBar");
  const infoMessage = document.getElementById("infoMessage");
  const originalInfo = document.getElementById("originalInfo");
  const compressedInfo = document.getElementById("compressedInfo");
  const originalImage = document.getElementById("originalImage");
  const compressedImage = document.getElementById("compressedImage");
  const downloadBtn = document.getElementById("downloadBtn");

  // Khởi tạo Worker
  const compressWorker = new Worker("compress.worker.js");

  function updateProgress(percent, text) {
    progressBar.style.width = `${percent}%`;
    progressBar.textContent = `${percent}%`;
    infoMessage.textContent = text;
    progressBar.style.backgroundColor = percent === 100 ? "#28a745" : "#007bff";
    downloadBtn.style.display = "none";
  }

  function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      infoMessage.textContent =
        "Vui lòng chọn một file ảnh hợp lệ (JPG, PNG, WebP).";
      return;
    }

    if (file.type === "image/gif") {
      infoMessage.textContent =
        "GIF không được hỗ trợ nén bằng phương pháp này.";
      return;
    }

    // --- Reset và Chuẩn bị ---
    updateProgress(0, "Đang chuẩn bị...");
    compressedImage.src = "";
    compressedInfo.textContent = "";
    downloadBtn.style.display = "none";
    downloadBtn.href = "#";

    // Hiển thị ảnh gốc
    const originalURL = URL.createObjectURL(file);
    originalImage.src = originalURL;
    originalImage.onload = () => {
      originalInfo.textContent = `Loại: ${file.type} | Kích thước: ${
        originalImage.naturalWidth
      }x${originalImage.naturalHeight} px | Dung lượng: ${(
        file.size /
        1024 /
        1024
      ).toFixed(2)} MB`;
    };

    // --- Gửi tác vụ nén đến Worker ---
    // 1. Resize về 1/4 Full HD (960px)
    // 2. Nén về đích 100KB
    // 3. Chất lượng tối thiểu (để không mờ chữ) là 0.4
    compressWorker.postMessage({
      file: file,
      maxDimension: 960,
      targetSizeKB: 100,
      minQuality: 0.4,
    });

    // --- Lắng nghe kết quả từ Worker ---
    compressWorker.onmessage = (e) => {
      const data = e.data;

      if (data.status === "progress") {
        // Cập nhật Progress Bar theo các mốc
        updateProgress(data.percent, data.message);
      } else if (data.status === "complete") {
        const { compressedBlob, originalSize, compressedSize, compressedMime } =
          data;

        const compressedURL = URL.createObjectURL(compressedBlob);

        compressedImage.src = compressedURL;
        compressedImage.onload = () => {
          const ratio = ((originalSize - compressedSize) / originalSize) * 100;
          const finalSizeKB = (compressedSize / 1024).toFixed(0);

          let message = `Đích < 100KB. Kết quả: ${finalSizeKB} KB.`;
          if (compressedSize > 100 * 1024) {
            message = `Không thể nén về < 100KB (đã cố gắng hết sức).`;
          }

          compressedInfo.textContent = `${message} | Loại: ${compressedMime} | Kích thước: ${
            compressedImage.naturalWidth
          }x${compressedImage.naturalHeight} px | Giảm: ${ratio.toFixed(2)}%`;

          updateProgress(100, "Nén hoàn tất!");

          // Gán link cho nút Download
          downloadBtn.href = compressedURL;
          downloadBtn.style.display = "inline-block"; // Hiển thị nút Download
        };
      } else if (data.status === "error") {
        infoMessage.className = "info error";
        infoMessage.textContent = data.message;
        updateProgress(0, "LỖI XỬ LÝ");
      }
    };
  }

  input.addEventListener("change", handleImageUpload);
});
