const express = require("express");

const router = express.Router();

const {
    getAdminDashboard
} = require("../controllers/adminController");

const adminAuth =
    require("../middleware/adminAuth");

router.get(
    "/dashboard",
    adminAuth,
    getAdminDashboard
);

module.exports = router;