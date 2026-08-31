const db = require("../config/db");

const createMembership = (req, res) => {

    const { student_id, months } = req.body;


    // Basic validation
    if (!student_id || !months) {

        return res.status(400).json({
            message: "Student ID and months are required"
        });
    }


    // Only 1, 2 or 3 month plans allowed
    if (![1, 2, 3].includes(Number(months))) {

        return res.status(400).json({
            message: "Plan must be 1, 2 or 3 months"
        });
    }


    // Step 1: Check student
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
                    message: "Failed to check student"
                });
            }


            if (students.length === 0) {

                return res.status(404).json({
                    message: "Student not found"
                });
            }


            if (students[0].status !== "ACTIVE") {

                return res.status(400).json({
                    message: "Student must be active"
                });
            }


            // Step 2:
            // Expire old membership if validity is over
            const expireSql = `
                UPDATE memberships

                SET status = 'EXPIRED'

                WHERE student_id = ?
                AND status = 'ACTIVE'
                AND valid_till < CURRENT_DATE
            `;


            db.query(
                expireSql,
                [student_id],
                (err) => {

                    if (err) {

                        console.log(err);

                        return res.status(500).json({
                            message:
                                "Unable to update expired membership"
                        });
                    }


                    // Step 3:
                    // Check if student still has
                    // a valid ACTIVE membership
                    const existingMembershipSql = `
                        SELECT *
                        FROM memberships

                        WHERE student_id = ?
                        AND status = 'ACTIVE'
                        AND valid_till >= CURRENT_DATE
                    `;


                    db.query(
                        existingMembershipSql,
                        [student_id],
                        (err, memberships) => {

                            if (err) {

                                console.log(err);

                                return res.status(500).json({
                                    message:
                                        "Unable to check existing membership"
                                });
                            }


                            if (memberships.length > 0) {

                                return res.status(400).json({
                                    message:
                                        "Student already has an active membership"
                                });
                            }


                            // Step 4:
                            // Create new membership

                            const plan =
                                `${Number(months)} Month`;


                            const membershipSql = `
                                INSERT INTO memberships
                                (
                                    student_id,
                                    plan,
                                    valid_from,
                                    valid_till,
                                    status
                                )

                                VALUES
                                (
                                    ?,
                                    ?,
                                    CURRENT_DATE,

                                    DATE_ADD(
                                        CURRENT_DATE,
                                        INTERVAL ? MONTH
                                    ),

                                    'ACTIVE'
                                )
                            `;


                            db.query(
                                membershipSql,
                                [
                                    student_id,
                                    plan,
                                    Number(months)
                                ],
                                (err, result) => {

                                    if (err) {

                                        console.log(err);

                                        return res.status(500).json({
                                            message:
                                                "Membership creation failed"
                                        });
                                    }


                                    return res.status(201).json({

                                        message:
                                            "Membership activated successfully",

                                        membershipId:
                                            result.insertId
                                    });
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
    createMembership
};