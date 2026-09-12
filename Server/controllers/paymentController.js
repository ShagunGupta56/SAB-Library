const db = require("../config/db");

const Razorpay = require("razorpay");
const crypto = require("crypto");

const {
    applyMembershipForPayment
} = require("../services/membershipService");



const MONTHLY_FEE = 800;

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


// ==========================================
// CONFIRM CASH PAYMENT
// ==========================================

const markCashPaymentPaid = (
    req,
    res
) => {

    const { studentId } =
        req.params;

    const months =
        Number(req.body.months);


    // ======================================
    // VALIDATE PLAN
    // ======================================

    if (
        ![1, 2, 3].includes(months)
    ) {

        return res.status(400).json({
            message:
                "Please select 1, 2 or 3 months"
        });
    }


    // Backend calculates amount
    // Never trust frontend amount

    const amount =
        MONTHLY_FEE * months;


    db.getConnection(
        (err, connection) => {

            if (err) {

                console.log(err);

                return res.status(500).json({
                    message:
                        "Database connection failed"
                });
            }


            connection.beginTransaction(
                (err) => {

                    if (err) {

                        connection.release();

                        return res.status(500).json({
                            message:
                                "Unable to start payment"
                        });
                    }


                    // ==================================
                    // CHECK STUDENT
                    // ==================================

                    const studentSql = `
                        SELECT
                            id,
                            full_name,
                            status
                        FROM students
                        WHERE id = ?
                    `;


                    connection.query(
                        studentSql,
                        [studentId],
                        (err, students) => {

                            if (
                                err ||
                                students.length === 0
                            ) {

                                return connection.rollback(
                                    () => {

                                        connection.release();

                                        return res.status(
                                            students?.length === 0
                                                ? 404
                                                : 500
                                        ).json({
                                            message:
                                                students?.length === 0
                                                    ? "Student not found"
                                                    : "Unable to check student"
                                        });
                                    }
                                );
                            }


                            const student =
                                students[0];


                            if (
                                student.status !==
                                "ACTIVE"
                            ) {

                                return connection.rollback(
                                    () => {

                                        connection.release();

                                        return res.status(
                                            400
                                        ).json({
                                            message:
                                                "Approve student before payment"
                                        });
                                    }
                                );
                            }


                            // ==================================
                            // RECORD PAYMENT
                            // ==================================

                            const paymentSql = `
                                INSERT INTO payments
                                (
                                    student_id,
                                    months,
                                    amount,
                                    payment_method,
                                    payment_status,
                                    paid_at
                                )

                                VALUES
                                (
                                    ?,
                                    ?,
                                    ?,
                                    'CASH',
                                    'PAID',
                                    NOW()
                                )
                            `;


                            connection.query(
                                paymentSql,
                                [
                                    studentId,
                                    months,
                                    amount
                                ],
                                (
                                    err,
                                    paymentResult
                                ) => {

                                    if (err) {

                                        return connection.rollback(
                                            () => {

                                                connection.release();

                                                return res.status(
                                                    500
                                                ).json({
                                                    message:
                                                        "Unable to save payment"
                                                });
                                            }
                                        );
                                    }


                                    // ==================================
                                    // CREATE / EXTEND MEMBERSHIP
                                    // ==================================

                                    applyMembershipForPayment(
                                        connection,
                                        studentId,
                                        months,
                                        (
                                            err,
                                            membershipResult
                                        ) => {

                                            if (err) {

                                                console.log(err);

                                                return connection.rollback(
                                                    () => {

                                                        connection.release();

                                                        return res.status(
                                                            500
                                                        ).json({
                                                            message:
                                                                "Payment received but membership activation failed"
                                                        });
                                                    }
                                                );
                                            }


                                            // ==================================
                                            // UPDATE STUDENT PAYMENT INFO
                                            // ==================================

                                            const updateStudentSql = `
                                                UPDATE students

                                                SET
                                                    fee_amount = ?,
                                                    payment_status = 'PAID',
                                                    payment_method = 'CASH'

                                                WHERE id = ?
                                            `;


                                            connection.query(
                                                updateStudentSql,
                                                [
                                                    amount,
                                                    studentId
                                                ],
                                                (err) => {

                                                    if (err) {

                                                        return connection.rollback(
                                                            () => {

                                                                connection.release();

                                                                return res.status(
                                                                    500
                                                                ).json({
                                                                    message:
                                                                        "Unable to update student payment"
                                                                });
                                                            }
                                                        );
                                                    }


                                                    // ==================================
                                                    // COMMIT EVERYTHING
                                                    // ==================================

                                                    connection.commit(
                                                        (err) => {

                                                            if (err) {

                                                                return connection.rollback(
                                                                    () => {

                                                                        connection.release();

                                                                        return res.status(
                                                                            500
                                                                        ).json({
                                                                            message:
                                                                                "Payment transaction failed"
                                                                        });
                                                                    }
                                                                );
                                                            }


                                                            connection.release();


                                                            return res.status(
                                                                200
                                                            ).json({

                                                                message:
                                                                    "Payment confirmed and membership activated successfully",

                                                                paymentId:
                                                                    paymentResult.insertId,

                                                                months,

                                                                amount,

                                                                membership:
                                                                    membershipResult
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
        }
    );
};


// ==========================================
// CREATE ONLINE PAYMENT ORDER
// ==========================================

const createOnlineOrder = async (req, res) => {

    const studentId =
        req.student.studentId;

    const months =
        Number(req.body.months);


    if (![1, 2, 3].includes(months)) {

        return res.status(400).json({
            message:
                "Please select 1, 2 or 3 months"
        });
    }


    const amount =
        MONTHLY_FEE * months;


    const studentSql = `
        SELECT
            id,
            full_name,
            status
        FROM students
        WHERE id = ?
    `;


    db.query(
        studentSql,
        [studentId],
        async (err, students) => {

            if (err) {

                console.log(err);

                return res.status(500).json({
                    message:
                        "Unable to check student"
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
                        "Student account must be active"
                });
            }


            try {

                const order =
                    await razorpay.orders.create({

                        amount:
                            amount * 100,

                        currency:
                            "INR",

                        receipt:
                            `sab_${studentId}_${Date.now()}`,

                        notes: {
                            studentId:
                                String(studentId),

                            months:
                                String(months)
                        }
                    });


                const paymentSql = `
                    INSERT INTO payments
                    (
                        student_id,
                        months,
                        amount,
                        payment_method,
                        payment_status,
                        razorpay_order_id
                    )

                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        'ONLINE',
                        'PENDING',
                        ?
                    )
                `;


                db.query(
                    paymentSql,
                    [
                        studentId,
                        months,
                        amount,
                        order.id
                    ],
                    (err) => {

                        if (err) {

                            console.log(err);

                            return res.status(500).json({
                                message:
                                    "Unable to save payment order"
                            });
                        }


                        return res.status(200).json({

                            key:
                                process.env.RAZORPAY_KEY_ID,

                            orderId:
                                order.id,

                            amount:
                                order.amount,

                            currency:
                                order.currency,

                            months,

                            studentName:
                                students[0].full_name
                        });
                    }
                );


            } catch (error) {

                console.log(
                    "Razorpay order error:",
                    error
                );

                return res.status(500).json({
                    message:
                        "Unable to create online payment"
                });
            }
        }
    );
};


// ==========================================
// VERIFY ONLINE PAYMENT
// ==========================================

const verifyOnlinePayment = (
    req,
    res
) => {

    const studentId =
        req.student.studentId;

    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    } = req.body;


    if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
    ) {

        return res.status(400).json({
            message:
                "Payment verification details are missing"
        });
    }


    const expectedSignature =
        crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET
            )
            .update(
                `${razorpay_order_id}|${razorpay_payment_id}`
            )
            .digest("hex");


    if (
        expectedSignature !==
        razorpay_signature
    ) {

        return res.status(400).json({
            message:
                "Payment verification failed"
        });
    }


    db.getConnection(
        (err, connection) => {

            if (err) {

                return res.status(500).json({
                    message:
                        "Database connection failed"
                });
            }


            connection.beginTransaction(
                (err) => {

                    if (err) {

                        connection.release();

                        return res.status(500).json({
                            message:
                                "Unable to verify payment"
                        });
                    }


                    const paymentSql = `
                        SELECT *
                        FROM payments

                        WHERE razorpay_order_id = ?
                        AND student_id = ?

                        LIMIT 1
                    `;


                    connection.query(
                        paymentSql,
                        [
                            razorpay_order_id,
                            studentId
                        ],
                        (err, payments) => {

                            if (
                                err ||
                                payments.length === 0
                            ) {

                                return connection.rollback(
                                    () => {

                                        connection.release();

                                        return res.status(
                                            payments?.length === 0
                                                ? 404
                                                : 500
                                        ).json({
                                            message:
                                                "Payment order not found"
                                        });
                                    }
                                );
                            }


                            const payment =
                                payments[0];


                            if (
                                payment.payment_status ===
                                "PAID"
                            ) {

                                return connection.rollback(
                                    () => {

                                        connection.release();

                                        return res.status(400).json({
                                            message:
                                                "Payment already processed"
                                        });
                                    }
                                );
                            }


                            const duplicateSql = `
                                SELECT id
                                FROM payments

                                WHERE razorpay_payment_id = ?

                                LIMIT 1
                            `;


                            connection.query(
                                duplicateSql,
                                [razorpay_payment_id],
                                (
                                    err,
                                    duplicatePayments
                                ) => {

                                    if (err) {

                                        return connection.rollback(
                                            () => {

                                                connection.release();

                                                return res.status(500).json({
                                                    message:
                                                        "Unable to verify payment"
                                                });
                                            }
                                        );
                                    }


                                    if (
                                        duplicatePayments.length >
                                        0
                                    ) {

                                        return connection.rollback(
                                            () => {

                                                connection.release();

                                                return res.status(400).json({
                                                    message:
                                                        "Payment already used"
                                                });
                                            }
                                        );
                                    }


                                    applyMembershipForPayment(
                                        connection,
                                        studentId,
                                        payment.months,
                                        (
                                            err,
                                            membershipResult
                                        ) => {

                                            if (err) {

                                                console.log(err);

                                                return connection.rollback(
                                                    () => {

                                                        connection.release();

                                                        return res.status(500).json({
                                                            message:
                                                                "Membership activation failed"
                                                        });
                                                    }
                                                );
                                            }


                                            const updatePaymentSql = `
                                                UPDATE payments

                                                SET
                                                    payment_status = 'PAID',
                                                    razorpay_payment_id = ?,
                                                    paid_at = NOW()

                                                WHERE id = ?
                                            `;


                                            connection.query(
                                                updatePaymentSql,
                                                [
                                                    razorpay_payment_id,
                                                    payment.id
                                                ],
                                                (err) => {

                                                    if (err) {

                                                        return connection.rollback(
                                                            () => {

                                                                connection.release();

                                                                return res.status(500).json({
                                                                    message:
                                                                        "Unable to complete payment"
                                                                });
                                                            }
                                                        );
                                                    }


                                                    const updateStudentSql = `
                                                        UPDATE students

                                                        SET
                                                            fee_amount = ?,
                                                            payment_status = 'PAID',
                                                            payment_method = 'ONLINE'

                                                        WHERE id = ?
                                                    `;


                                                    connection.query(
                                                        updateStudentSql,
                                                        [
                                                            payment.amount,
                                                            studentId
                                                        ],
                                                        (err) => {

                                                            if (err) {

                                                                return connection.rollback(
                                                                    () => {

                                                                        connection.release();

                                                                        return res.status(500).json({
                                                                            message:
                                                                                "Unable to update student payment"
                                                                        });
                                                                    }
                                                                );
                                                            }


                                                            connection.commit(
                                                                (err) => {

                                                                    if (err) {

                                                                        return connection.rollback(
                                                                            () => {

                                                                                connection.release();

                                                                                return res.status(500).json({
                                                                                    message:
                                                                                        "Payment transaction failed"
                                                                                });
                                                                            }
                                                                        );
                                                                    }


                                                                    connection.release();


                                                                    return res.status(200).json({

                                                                        message:
                                                                            "Payment successful and membership activated",

                                                                        months:
                                                                            payment.months,

                                                                        amount:
                                                                            payment.amount,

                                                                        membership:
                                                                            membershipResult
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
                }
            );
        }
    );
};

module.exports = {
    markCashPaymentPaid,
    createOnlineOrder,
    verifyOnlinePayment
};