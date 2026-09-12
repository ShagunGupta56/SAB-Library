const express = require("express");

const router =
    express.Router();

const adminAuth =
    require(
        "../middleware/adminAuth"
    );


// ==========================================
// MANUAL MEMBERSHIP ACTIVATION DISABLED
// Membership is created only after payment
// ==========================================

router.post(
    "/",
    adminAuth,
    (req, res) => {

        return res.status(403).json({
            message:
                "Membership is activated automatically after payment."
        });
    }
);


module.exports = router;