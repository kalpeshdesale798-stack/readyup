import express from "express";
import {
    getBookmarks,
    addBookmark,
    removeBookmark,
} from "../controllers/bookmarkController.js";
import { protect, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, allowRoles("student"));

router.get("/", getBookmarks);
router.post("/", addBookmark);
router.delete("/:questionId", removeBookmark);

export default router;
