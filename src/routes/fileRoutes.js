import express from "express";
import {
  deleteFile,
  getSharedWithMe,
  getStorageStats,
  getUserFiles,
  permanentDelete,
  searchFiles,
  uploadFile,
  toggleStar,
} from "../controllers/fileController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";
import {
  createFolder,
  getSecureLink,
  getSharedItemByLink,
  getTrashItems,
  moveToTrash,
  renameItem,
  restoreItem,
  shareItem,
} from "../controllers/folderController.js";

const router = express.Router();

// Route: User logged in hona chahiye aur 1 file 'file' field mein honi chahiye
router.post("/upload", protect, upload.single("file"), uploadFile);
router.post("/folder", protect, createFolder);
router.put("/rename/:id", protect, renameItem);
router.get("/trash", protect, getTrashItems);
router.get("/my-files", protect, getUserFiles);
router.patch("/trash/:id", protect, moveToTrash);
router.patch("/restore/:id", protect, restoreItem);
router.patch("/star/:id", protect, toggleStar);
router.delete("/:id", protect, deleteFile);
router.post("/share", protect, shareItem);
router.get("/share/secure/:file_id", protect, getSecureLink);
router.get("/shared-with-me", protect, getSharedWithMe);
router.get("/shared/:linkId", getSharedItemByLink);
router.get("/search", protect, searchFiles);
router.get("/storage-stats", protect, getStorageStats);
router.delete("/delete-permanently/:id", protect, permanentDelete);
export default router;
