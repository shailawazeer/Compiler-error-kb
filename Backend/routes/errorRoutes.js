const express = require("express");
const router = express.Router();
const controller = require("../controllers/errorController");

// Create / get solution for a query (search history first, then Gemini)
const {
  listHistory,
  getById,
  createOrGetSolution,
} = require("../controllers/errorController");

// ✅ Routes using the imported functions
router.get("/", listHistory);
router.get("/:id", getById);
router.post("/", createOrGetSolution);

module.exports = router;
