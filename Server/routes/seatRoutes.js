const express = require("express");
const router = express.Router();

const {
    getAllSeats,
    allocateSeat
} = require("../controllers/seatController");

const adminAuth =
    require("../middleware/adminAuth");

router.get(
    "/",
    adminAuth,
    getAllSeats
);

router.post(
    "/allocate",
    adminAuth,
    allocateSeat
);

module.exports = router;