import express from "express";
import { getCompanies, getCompanyBySlug } from "../controllers/companyController.js";
import { optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", optionalAuth, getCompanies);
router.get("/:slug", optionalAuth, getCompanyBySlug);

export default router;
