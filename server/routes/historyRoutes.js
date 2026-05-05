const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getHistory,
  getOne,
  deleteOne,
  getDashboardStats,
} = require("../controllers/historyController");

const router = express.Router();

router.get("/", protect, getHistory);
router.get("/stats", protect, getDashboardStats);
router.get("/:id", protect, getOne);
router.delete("/:id", protect, deleteOne);

module.exports = router;