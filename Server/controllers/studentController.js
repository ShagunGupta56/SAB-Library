const db = require("../config/db");
const bcrypt = require("bcryptjs");
const registerStudent = (req, res) => {

    const {
        full_name,
        father_name,
        phone,
        student_class,
        school_college,
        address
    } = req.body;

    const sql = `
        INSERT INTO students
        (full_name, father_name, phone, student_class, school_college, address)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
        full_name,
        father_name,
        phone,
        student_class,
        school_college,
        address
    ];

    db.query(sql, values, (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Registration failed"
            });
        }

        res.status(201).json({
            message: "Student registered successfully",
            studentId: result.insertId
        });
    });
};

const getAllStudents = (req, res) => {

    const sql = `
        SELECT
            s.*,
            se.seat_number,
            m.plan,
            m.valid_from,
            m.valid_till,

            CASE
                WHEN m.valid_till < CURRENT_DATE
                    THEN 'EXPIRED'
                ELSE m.status
            END AS membership_status

        FROM students s

        LEFT JOIN seat_allocations sa
            ON sa.student_id = s.id
            AND sa.status = 'ACTIVE'

        LEFT JOIN seats se
            ON se.id = sa.seat_id

        LEFT JOIN memberships m
            ON m.id = (
                SELECT id
                FROM memberships
                WHERE student_id = s.id
                ORDER BY id DESC
                LIMIT 1
            )

        ORDER BY s.id DESC
    `;


    db.query(sql, (err, students) => {

        if (err) {

            console.log(err);

            return res.status(500).json({
                message: "Unable to load students"
            });
        }

        return res.json(students);
    });
};

const getStudentById = (req, res) => {
    const { id } = req.params;

    const sql = "SELECT * FROM students WHERE id = ?";

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Failed to fetch student"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.status(200).json(results[0]);
    });
};

const approveStudent = (req, res) => {

    const { id } = req.params;

    const findStudentSql =
        "SELECT * FROM students WHERE id = ?";

    db.query(findStudentSql, [id], async (err, results) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Failed to approve student"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        const student = results[0];

        if (student.status === "ACTIVE") {
            return res.status(400).json({
                message: "Student is already approved"
            });
        }

        const libraryId =
            `SAB-${String(id).padStart(3, "0")}`;

        // Generate 6 digit PIN
        const portalPin =
            String(
                Math.floor(
                    100000 + Math.random() * 900000
                )
            );

        try {

            const hashedPin =
                await bcrypt.hash(portalPin, 10);

            const updateSql = `
                UPDATE students
                SET
                    library_id = ?,
                    portal_pin_hash = ?,
                    status = 'ACTIVE'
                WHERE id = ?
            `;

            db.query(
                updateSql,
                [libraryId, hashedPin, id],
                (err) => {

                    if (err) {
                        console.log(err);

                        return res.status(500).json({
                            message:
                                "Failed to approve student"
                        });
                    }

                    res.status(200).json({
                        message:
                            "Student approved successfully",
                        libraryId,
                        portalPin
                    });
                }
            );

        } catch (error) {

            console.log(error);

            res.status(500).json({
                message:
                    "Unable to create student PIN"
            });
        }
    });
};

const getStudentDashboard = (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT
            s.id,
            s.library_id,
            s.full_name,
            s.student_class,
            s.school_college,
            s.registration_date,
            s.status AS student_status,

            se.seat_number,

            m.plan,
            m.valid_from,
            m.valid_till,
            m.status AS membership_status

        FROM students s

        LEFT JOIN seat_allocations sa
            ON s.id = sa.student_id
            AND sa.status = 'ACTIVE'

        LEFT JOIN seats se
            ON sa.seat_id = se.id

        LEFT JOIN memberships m
            ON s.id = m.student_id
            AND m.status = 'ACTIVE'

        WHERE s.id = ?
    `;

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Failed to fetch dashboard"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.status(200).json(results[0]);
    });
};

const getStudentDashboardByLibraryId = (req, res) => {

    const { libraryId } = req.params;

    const sql = `
        SELECT
            s.id,
            s.library_id,
            s.full_name,
            s.student_class,
            s.school_college,
            s.registration_date,
            s.status AS student_status,

            se.seat_number,

            m.plan,
            m.valid_from,
            m.valid_till,

            CASE
                WHEN m.valid_till < CURRENT_DATE
                THEN 'EXPIRED'
                ELSE m.status
            END AS membership_status,

            CASE
                WHEN m.valid_till >= CURRENT_DATE
                THEN DATEDIFF(m.valid_till, CURRENT_DATE)
                ELSE 0
            END AS days_remaining

        FROM students s

        LEFT JOIN seat_allocations sa
            ON s.id = sa.student_id
            AND sa.status = 'ACTIVE'

        LEFT JOIN seats se
            ON sa.seat_id = se.id

        LEFT JOIN memberships m
            ON m.id = (
                SELECT id
                FROM memberships
                WHERE student_id = s.id
                AND status = 'ACTIVE'
                ORDER BY id DESC
                LIMIT 1
            )

        WHERE s.library_id = ?
    `;

    db.query(sql, [libraryId], (err, results) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Failed to fetch student dashboard"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Library ID not found"
            });
        }

        res.status(200).json(results[0]);
    });
};

const getMyDashboard = (req, res) => {

    const studentId = req.student.studentId;

    const sql = `
        SELECT
            s.library_id,
            s.full_name,
            s.student_class,
            s.school_college,
            s.registration_date,
            s.status AS student_status,

            se.seat_number,

            m.plan,
            m.valid_from,
            m.valid_till,

            CASE
                WHEN m.valid_till < CURRENT_DATE
                    THEN 'EXPIRED'
                ELSE m.status
            END AS membership_status,

            CASE
                WHEN m.valid_till >= CURRENT_DATE
                    THEN DATEDIFF(m.valid_till, CURRENT_DATE)
                ELSE 0
            END AS days_remaining

        FROM students s

        LEFT JOIN seat_allocations sa
            ON s.id = sa.student_id
            AND sa.status = 'ACTIVE'

        LEFT JOIN seats se
            ON se.id = sa.seat_id

        LEFT JOIN memberships m
            ON m.id = (
                SELECT id
                FROM memberships
                WHERE student_id = s.id
                ORDER BY id DESC
                LIMIT 1
            )

        WHERE s.id = ?
    `;

    db.query(sql, [studentId], (err, results) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Unable to load dashboard"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.status(200).json(results[0]);
    });
};

const deactivateStudent = (req, res) => {

    const { id } = req.params;

    // First find student's active seat allocation
    const allocationSql = `
        SELECT seat_id
        FROM seat_allocations
        WHERE student_id = ?
        AND status = 'ACTIVE'
        LIMIT 1
    `;

    db.query(
        allocationSql,
        [id],
        (err, allocations) => {

            if (err) {

                console.log(err);

                return res.status(500).json({
                    message:
                        "Unable to check seat allocation"
                });
            }


            const seatId =
                allocations.length > 0
                    ? allocations[0].seat_id
                    : null;


            // Deactivate student
            const studentSql = `
                UPDATE students
                SET status = 'INACTIVE'
                WHERE id = ?
                AND status = 'ACTIVE'
            `;


            db.query(
                studentSql,
                [id],
                (err, result) => {

                    if (err) {

                        console.log(err);

                        return res.status(500).json({
                            message:
                                "Unable to deactivate student"
                        });
                    }


                    if (result.affectedRows === 0) {

                        return res.status(400).json({
                            message:
                                "Student is not active"
                        });
                    }


                    // Deactivate membership
                    const membershipSql = `
                        UPDATE memberships
                        SET status = 'EXPIRED'
                        WHERE student_id = ?
                        AND status = 'ACTIVE'
                    `;


                    db.query(
                        membershipSql,
                        [id],
                        (err) => {

                            if (err) {

                                console.log(err);

                                return res.status(500).json({
                                    message:
                                        "Unable to deactivate membership"
                                });
                            }


                            // Deactivate seat allocation
                            const allocationUpdateSql = `
                                UPDATE seat_allocations
                                SET status = 'INACTIVE'
                                WHERE student_id = ?
                                AND status = 'ACTIVE'
                            `;


                            db.query(
                                allocationUpdateSql,
                                [id],
                                (err) => {

                                    if (err) {

                                        console.log(err);

                                        return res.status(500).json({
                                            message:
                                                "Unable to release allocation"
                                        });
                                    }


                                    // If student had no seat
                                    if (!seatId) {

                                        return res.json({
                                            message:
                                                "Student deactivated successfully"
                                        });
                                    }


                                    // Make seat available again
                                    const seatSql = `
                                        UPDATE seats
                                        SET status = 'AVAILABLE'
                                        WHERE id = ?
                                    `;


                                    db.query(
                                        seatSql,
                                        [seatId],
                                        (err) => {

                                            if (err) {

                                                console.log(err);

                                                return res.status(500).json({
                                                    message:
                                                        "Student deactivated but seat release failed"
                                                });
                                            }


                                            return res.json({
                                                message:
                                                    "Student deactivated and seat released successfully"
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

module.exports = {
    registerStudent,
    getAllStudents,
    getStudentById,
    approveStudent,
    getStudentDashboard,
    getStudentDashboardByLibraryId,
    getMyDashboard,
    deactivateStudent

};