import multer from "multer";

// Gunakan memoryStorage agar gambar tidak tersimpan di folder server
const storage = multer.memoryStorage();

// Filter file image tetap sama
function fileFilter(_req, file, cb) {
  const allowedTypes = /jpeg|jpg|png|webp|avif/; // Ditambah avif
  const mimeType = allowedTypes.test(file.mimetype);

  if (mimeType) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed (jpeg, jpg, png, webp, avif)"));
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Ditingkatkan ke 2MB agar lebih fleksibel
  fileFilter,
});

export default upload;