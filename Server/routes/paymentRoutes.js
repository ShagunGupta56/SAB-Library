const express = require("express");

const router =
    express.Router();

const {
    markCashPaymentPaid,
    createOnlineOrder,
    verifyOnlinePayment
} = require(
    "../controllers/paymentController"
);

const adminAuth =
    require("../middleware/adminAuth");

const studentAuth =
    require("../middleware/studentAuth");


// Cash payment - admin only

router.post(
    "/cash/:studentId",
    adminAuth,
    markCashPaymentPaid
);


// Create Razorpay order - student

router.post(
    "/online/order",
    studentAuth,
    createOnlineOrder
);


// Verify Razorpay payment - student

router.post(
    "/online/verify",
    studentAuth,
    verifyOnlinePayment
);


module.exports = router;