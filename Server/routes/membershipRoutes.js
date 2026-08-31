const express = require("express");
const router = express.Router();

const {
    createMembership
} = require("../controllers/membershipController");

const adminAuth =
    require("../middleware/adminAuth");

router.post(
    "/",
    adminAuth,
    createMembership
);

module.exports = router;