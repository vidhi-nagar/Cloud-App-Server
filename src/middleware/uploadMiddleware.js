import multer from "multer";

// Hum file ko disk par nahi balki memory mein store karenge temporary
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 * 1024 },
});
