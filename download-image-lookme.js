// ===== BLOG IMAGE DOWNLOADER CLASS =====

class BlogImageDownloader {
  constructor(options = {}) {
    this.delayMs = options.delayMs || 1500;
    this.contentSelectors = [
      ".entry-content",
      ".post-content",
      ".content",
      "article .content",
      ".single-post .content",
      ".post-body",
      "#content .post",
      "main article",
    ];
    this.downloadedCount = 0;
    this.failedCount = 0;
    this.folderPrefix = this.getFolderPrefixFromUrl();
  }

  // Lấy prefix từ URL hiện tại để đặt tên file
  getFolderPrefixFromUrl() {
    const url = window.location.href;
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Lấy phần cuối của path, bỏ dấu / ở đầu và cuối
    const segments = pathname
      .split("/")
      .filter((segment) => segment.length > 0);

    if (segments.length === 0) {
      return "blog-images";
    }

    // Lấy segment cuối cùng làm prefix
    const prefix = segments[segments.length - 1];

    // Làm sạch prefix (chỉ giữ ký tự an toàn)
    const cleanPrefix = prefix
      .replace(/[<>:"/\\|?*]/g, "-") // Thay thế ký tự không hợp lệ
      .replace(/\s+/g, "-") // Thay thế space bằng dash
      .replace(/--+/g, "-") // Gộp nhiều dash thành một
      .replace(/^-+|-+$/g, ""); // Bỏ dash ở đầu và cuối

    console.log(`📝 File prefix: "${cleanPrefix}_"`);
    return cleanPrefix || "blog-images";
  }

  // Lấy URL hình ảnh lớn nhất (bỏ size suffix)
  getOriginalImageUrl(url) {
    // Pattern để match -<width>x<height> trước extension
    // Ví dụ: image-1024x682.jpg -> image.jpg
    const sizePattern = /-\d+x\d+(\.[a-zA-Z]{3,4})$/;

    if (sizePattern.test(url)) {
      return url.replace(sizePattern, "$1");
    }

    return url;
  }

  // Lấy tất cả hình ảnh trong nội dung blog
  getBlogContentImages() {
    console.log("🔍 Đang quét hình ảnh trong nội dung blog...");

    // Tìm phần nội dung blog
    let contentArea = null;
    for (const selector of this.contentSelectors) {
      contentArea = document.querySelector(selector);
      if (contentArea) {
        console.log(`✅ Tìm thấy nội dung blog với selector: ${selector}`);
        break;
      }
    }

    if (!contentArea) {
      console.warn(
        "⚠️  Không tìm thấy vùng nội dung cụ thể, sẽ quét toàn bộ trang..."
      );
      contentArea = document.body;
    }

    const images = [];
    const imgElements = contentArea.querySelectorAll("img");
    const seenUrls = new Set(); // Để tránh duplicate URLs

    imgElements.forEach((img, index) => {
      let src =
        img.src ||
        img.getAttribute("data-src") ||
        img.getAttribute("data-lazy-src");

      if (src && (src.startsWith("http") || src.startsWith("//"))) {
        // Chuẩn hóa URL
        if (src.startsWith("//")) {
          src = "https:" + src;
        }

        // Lấy URL hình lớn nhất
        const originalUrl = this.getOriginalImageUrl(src);

        // Tránh duplicate URLs
        if (seenUrls.has(originalUrl)) {
          console.log(`⚠️  Bỏ qua hình trùng lặp: ${originalUrl}`);
          return;
        }
        seenUrls.add(originalUrl);

        // Tạo tên file từ URL
        const urlParts = originalUrl.split("/");
        let originalFileName = urlParts[urlParts.length - 1];

        // Xử lý URL có query parameters
        if (originalFileName.includes("?")) {
          originalFileName = originalFileName.split("?")[0];
        }

        // Nếu không có extension, thêm .jpg
        if (!originalFileName.includes(".")) {
          originalFileName += ".jpg";
        }

        // Tạo tên file với prefix
        const fileName = `${this.folderPrefix}_${originalFileName}`;

        // Tránh tên file trùng
        let finalFileName = fileName;
        let counter = 1;
        while (images.some((img) => img.fileName === finalFileName)) {
          const nameParts = fileName.split(".");
          const extension = nameParts.pop();
          const baseName = nameParts.join(".");
          finalFileName = `${baseName}-${counter}.${extension}`;
          counter++;
        }

        images.push({
          index: images.length + 1,
          originalUrl: src, // URL gốc từ HTML
          url: originalUrl, // URL đã được optimize để lấy hình lớn nhất
          fileName: finalFileName,
          originalFileName: originalFileName,
          alt: img.alt || `Image ${images.length + 1}`,
          width: img.width || img.getAttribute("width") || "",
          height: img.height || img.getAttribute("height") || "",
          element: img,
        });

        // Log để debug
        if (src !== originalUrl) {
          console.log(`🔧 Optimized: ${src} -> ${originalUrl}`);
        }
      }
    });

    console.log(`📸 Tìm thấy ${images.length} hình ảnh unique`);
    return images;
  }

  // Download một hình ảnh với tên file có prefix
  async downloadImage(imageUrl, fileName) {
    try {
      console.log(`📥 Downloading: ${fileName}`);

      const response = await fetch(imageUrl, {
        mode: "cors",
        headers: {
          Accept: "image/*",
          "User-Agent": "Mozilla/5.0 (compatible; BlogImageDownloader)",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const contentType = response.headers.get("content-type") || "image/jpeg";

      // Kiểm tra nếu response không phải là hình ảnh
      if (!contentType.startsWith("image/")) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      // Tạo URL tạm cho blob
      const url = URL.createObjectURL(blob);

      // Tạo link download
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.style.display = "none";

      // Thêm vào DOM và click
      document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        try {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 100);

      this.downloadedCount++;
      console.log(`✅ Downloaded: ${fileName} (${blob.size} bytes)`);
      return { success: true, fileName, size: blob.size };
    } catch (error) {
      this.failedCount++;
      console.error(`❌ Lỗi download ${fileName}:`, error.message);
      return { success: false, fileName, error: error.message };
    }
  }

  // Download tất cả hình ảnh
  async downloadAllImages(images) {
    if (images.length === 0) {
      console.log("❌ Không có hình ảnh nào để download!");
      return [];
    }

    console.log(`🚀 Bắt đầu download ${images.length} hình ảnh...`);
    console.log(`⏱️  Delay giữa các download: ${this.delayMs}ms`);

    const results = [];
    this.downloadedCount = 0;
    this.failedCount = 0;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      console.log(`\n📸 (${i + 1}/${images.length}) ${image.fileName}`);
      console.log(`🔗 URL: ${image.url}`);

      if (image.originalUrl !== image.url) {
        console.log(`🔧 Original: ${image.originalUrl}`);
      }

      const result = await this.downloadImage(image.url, image.fileName);
      results.push({ ...image, ...result });

      // Delay trước download tiếp theo
      if (i < images.length - 1) {
        console.log(`⏳ Chờ ${this.delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, this.delayMs));
      }
    }

    // Báo cáo kết quả cuối cùng
    this.printResults(results);

    return results;
  }

  // In báo cáo kết quả
  printResults(results) {
    const totalSize = results
      .filter((r) => r.success && r.size)
      .reduce((sum, r) => sum + r.size, 0);

    console.log(`\n🎉 HOÀN THÀNH!`);
    console.log(`📝 File prefix: "${this.folderPrefix}_"`);
    console.log(`✅ Thành công: ${this.downloadedCount}/${results.length}`);
    console.log(`❌ Thất bại: ${this.failedCount}/${results.length}`);

    if (totalSize > 0) {
      const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
      console.log(`📦 Tổng dung lượng: ${sizeMB} MB`);
    }

    if (this.failedCount > 0) {
      console.log("\n❌ Các file thất bại:");
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`  - ${r.fileName}: ${r.error}`);
        });
    }

    if (this.downloadedCount > 0) {
      console.log(
        `\n💡 Hình ảnh đã được download với tên file có prefix "${this.folderPrefix}_"`
      );
      console.log("💡 Kiểm tra thư mục Downloads của bạn!");
      console.log(
        "💡 Bạn có thể tạo folder riêng và di chuyển các file có cùng prefix vào đó."
      );
    }
  }

  // Function chính để chạy toàn bộ quá trình
  async run(showPreview = true) {
    console.log("🎯 BLOG IMAGE DOWNLOADER STARTING...");
    console.log(`📝 File prefix: "${this.folderPrefix}_"`);
    console.log(`🌐 URL: ${window.location.href}\n`);

    // Bước 1: Quét hình ảnh
    const images = this.getBlogContentImages();

    if (images.length === 0) {
      console.log("❌ Không tìm thấy hình ảnh nào trong blog!");
      return [];
    }

    // Hiển thị preview
    if (showPreview) {
      console.log(`\n📋 DANH SÁCH ${images.length} HÌNH ẢNH ĐƯỢC TÌM THẤY:`);
      console.log("=".repeat(60));
      images.forEach((img, index) => {
        console.log(`${index + 1}. ${img.fileName}`);
        console.log(`   Alt: ${img.alt}`);
        console.log(`   Size: ${img.width}x${img.height}`);
        console.log(`   URL: ${img.url}`);
        if (img.originalUrl !== img.url) {
          console.log(`   Original: ${img.originalUrl}`);
        }
      });
    }

    // Bước 2: Download
    const results = await this.downloadAllImages(images);
    return results;
  }

  // Download chỉ những hình được chọn
  async downloadSelected(indices) {
    const allImages = this.getBlogContentImages();

    if (allImages.length === 0) {
      console.log("❌ Không tìm thấy hình ảnh nào!");
      return [];
    }

    const selectedImages = allImages.filter((img, index) =>
      indices.includes(index + 1)
    );

    if (selectedImages.length === 0) {
      console.log("❌ Không có hình ảnh nào được chọn với indices:", indices);
      return [];
    }

    console.log(
      `📋 Sẽ download ${selectedImages.length} hình ảnh được chọn với prefix "${this.folderPrefix}_":`
    );
    selectedImages.forEach((img) => {
      console.log(`  ✓ ${img.fileName}`);
    });

    const results = await this.downloadAllImages(selectedImages);
    return results;
  }
}

// ===== KHỞI TẠO VÀ SỬ DỤNG =====

// Tạo instance downloader
const downloader = new BlogImageDownloader({
  delayMs: 50, // Delay 1.5 giây giữa các download
});

// Tự động chạy preview
downloader.run();
