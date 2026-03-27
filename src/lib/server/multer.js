import multer from "multer";
import path from "path";
import fs from "fs";

// Pastikan folder upload ada jika belum maka buat foldernya
const uploadPath = "static/uploads/";
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

// Konfigurasi storage
const storage = multer.diskStorage({
  // Menentukan destinasi path gambar
  destination: (_req, _file, cb) => {
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    // Memberikan nama unik ke file gambar
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

// Filter file image saja
// _ tanda tidak pernah dipakai menghindari warn typescript
function fileFilter(_req, file, cb) {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedTypes.test(file.mimetype);

  if (extName && mimeType) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed (jpeg, jpg, png, webp)"));
  }
}

// Atur limit max 1 MB
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 }, // 1 MB
  fileFilter,
});

export default upload;