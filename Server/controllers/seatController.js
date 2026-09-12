const db = require("../config/db");

const getAllSeats = (req, res) => {
    const sql = "SELECT * FROM seats ORDER BY id";

    db.query(sql, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "Failed to fetch seats"
            });
        }

        res.status(200).json(results);
    });
};


const allocateSeat = (req, res) => {

    const { student_id, seat_id } = req.body;


    // ==========================================
    // CHECK STUDENT
    // ==========================================

    const studentSql = `
        SELECT *
        FROM students
        WHERE id = ?
    `;


    db.query(
        studentSql,
        [student_id],
        (err, students) => {

            if (err) {

                console.log(err);

                return res.status(500).json({
                    message:
                        "Failed to check student"
                });
            }


            if (students.length === 0) {

                return res.status(404).json({
                    message:
                        "Student not found"
                });
            }


            if (
                students[0].status !==
                "ACTIVE"
            ) {

                return res.status(400).json({
                    message:
                        "Student must be approved before seat allocation"
                });
            }


            // ==========================================
            // CHECK ACTIVE MEMBERSHIP
            // ==========================================

            const membershipSql = `
                SELECT id
                FROM memberships

                WHERE student_id = ?
                AND status = 'ACTIVE'
                AND valid_till >= CURRENT_DATE

                ORDER BY id DESC
                LIMIT 1
            `;


            db.query(
                membershipSql,
                [student_id],
                (err, memberships) => {

                    if (err) {

                        console.log(err);

                        return res.status(500).json({
                            message:
                                "Failed to check membership"
                        });
                    }


                    if (
                        memberships.length === 0
                    ) {

                        return res.status(400).json({
                            message:
                                "Active membership is required before seat allocation"
                        });
                    }


                    // ==========================================
                    // CHECK EXISTING SEAT
                    // ==========================================

                    const existingAllocationSql = `
                        SELECT
                            sa.id,
                            s.seat_number

                        FROM seat_allocations sa

                        JOIN seats s
                            ON sa.seat_id = s.id

                        WHERE sa.student_id = ?
                        AND sa.status = 'ACTIVE'
                    `;


                    db.query(
                        existingAllocationSql,
                        [student_id],
                        (err, allocations) => {

                            if (err) {

                                console.log(err);

                                return res.status(500).json({
                                    message:
                                        "Failed to check existing seat"
                                });
                            }


                            if (
                                allocations.length >
                                0
                            ) {

                                return res.status(400).json({
                                    message:
                                        `Student already has seat ${allocations[0].seat_number}`
                                });
                            }


                            // ==========================================
                            // CHECK SELECTED SEAT
                            // ==========================================

                            const seatSql = `
                                SELECT *
                                FROM seats
                                WHERE id = ?
                            `;


                            db.query(
                                seatSql,
                                [seat_id],
                                (err, seats) => {

                                    if (err) {

                                        console.log(err);

                                        return res.status(500).json({
                                            message:
                                                "Failed to check seat"
                                        });
                                    }


                                    if (
                                        seats.length === 0
                                    ) {

                                        return res.status(404).json({
                                            message:
                                                "Seat not found"
                                        });
                                    }


                                    if (
                                        seats[0].status ===
                                        "OCCUPIED"
                                    ) {

                                        return res.status(400).json({
                                            message:
                                                "Seat is already occupied"
                                        });
                                    }


                                    // ==========================================
                                    // CREATE ALLOCATION
                                    // ==========================================

                                    const allocationSql = `
                                        INSERT INTO seat_allocations
                                        (
                                            student_id,
                                            seat_id
                                        )

                                        VALUES (?, ?)
                                    `;


                                    db.query(
                                        allocationSql,
                                        [
                                            student_id,
                                            seat_id
                                        ],
                                        (err) => {

                                            if (err) {

                                                console.log(err);

                                                return res.status(500).json({
                                                    message:
                                                        "Seat allocation failed"
                                                });
                                            }


                                            // ==================================
                                            // MARK SEAT OCCUPIED
                                            // ==================================

                                            const updateSeatSql = `
                                                UPDATE seats

                                                SET status = 'OCCUPIED'

                                                WHERE id = ?
                                            `;


                                            db.query(
                                                updateSeatSql,
                                                [seat_id],
                                                (err) => {

                                                    if (err) {

                                                        console.log(err);

                                                        return res.status(500).json({
                                                            message:
                                                                "Seat status update failed"
                                                        });
                                                    }


                                                    return res.status(201).json({

                                                        message:
                                                            "Seat allocated successfully",

                                                        seatNumber:
                                                            seats[0].seat_number
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
        }
    );
};


module.exports = {
    getAllSeats, allocateSeat
};