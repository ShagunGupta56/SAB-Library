const db = require("../config/db");

const getAdminDashboard = (req, res) => {

    const sql = `
        SELECT

        (SELECT COUNT(*) FROM students)
            AS total_students,

        (SELECT COUNT(*) FROM students
         WHERE status = 'PENDING')
            AS pending_students,

        (SELECT COUNT(*) FROM students
         WHERE status = 'ACTIVE')
            AS active_students,

        (SELECT COUNT(*) FROM students
         WHERE status = 'INACTIVE')
            AS inactive_students,

        (SELECT COUNT(*) FROM seats)
            AS total_seats,

        (SELECT COUNT(*) FROM seats
         WHERE status = 'AVAILABLE')
            AS available_seats,

        (SELECT COUNT(*) FROM seats
         WHERE status = 'OCCUPIED')
            AS occupied_seats,

        (
          SELECT COUNT(DISTINCT student_id)
          FROM memberships
          WHERE status = 'ACTIVE'
          AND valid_till >= CURRENT_DATE
        ) AS active_memberships,


        (SELECT COUNT(*) FROM memberships
         WHERE status = 'EXPIRED')
            AS expired_memberships
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Failed to fetch admin dashboard"
            });
        }

        res.status(200).json(results[0]);
    });
};

module.exports = {
    getAdminDashboard
};