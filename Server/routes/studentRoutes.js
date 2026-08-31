const express = require("express");
const router = express.Router();

const {
    registerStudent,
    getAllStudents,
    getStudentById,
    approveStudent,
    getStudentDashboard,
    getStudentDashboardByLibraryId,
    getMyDashboard,
    deactivateStudent
} = require("../controllers/studentController");

const adminAuth =
    require("../middleware/adminAuth");

const studentAuth =
    require("../middleware/studentAuth");


// Public registration
router.post(
    "/register",
    registerStudent
);


// Student protected dashboard
router.get(
    "/me/dashboard",
    studentAuth,
    getMyDashboard
);


// Admin protected
router.get(
    "/",
    adminAuth,
    getAllStudents
);

router.patch(
    "/:id/approve",
    adminAuth,
    approveStudent
);

router.get(
    "/:id",
    adminAuth,
    getStudentById
);

router.patch(
    "/:id/deactivate",
    adminAuth,
    deactivateStudent
);

module.exports = router;