import express from "express";
import { globalSearch } from "../controllers/searchController.js";
import { optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", optionalAuth, globalSearch);

export default router;
