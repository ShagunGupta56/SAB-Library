const db = require("../config/db");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const {
    applyMembershipForPayment
} = require("../services/membershipService");

const MONTHLY_FEE = 600;

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Convert callback-based MySQL queries to Promises.
const query = (connection, sql, params = []) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

// Safely obtain a database connection.
const getConnection = () => {
    return new Promise((resolve, reject) => {
        db.getConnection((err, connection) => {
            if (err) return reject(err);
            resolve(connection);
        });
    });
};

// Wrap the existing membership service.
const applyMembership = (connection, studentId, months) => {
    return new Promise((resolve, reject) => {
        applyMembershipForPayment(
            connection,
            studentId,
            months,
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

// Validate the selected membership duration.
const isValidMonths = (months) => {
    return [1, 2, 3].includes(months);
};

// Roll back a transaction and release its connection.
const rollbackAndRelease = (connection) => {
    return new Promise((resolve) => {
        connection.rollback(() => {
            connection.release();
            resolve();
        });
    });
};

// Commit a transaction and release its connection.
const commitAndRelease = (connection) => {
    return new Promise((resolve, reject) => {
        connection.commit((err) => {
            if (err) {
                return connection.rollback(() => {
                    connection.release();
                    reject(err);
                });
            }

            connection.release();
            resolve();
        });
    });
};

// ==========================================
// CONFIRM CASH PAYMENT
// Admin-only route
// ==========================================

const markCashPaymentPaid = async (req, res) => {
    const studentId = Number(req.params.studentId);
    const months = Number(req.body.months);

    if (!Number.isSafeInteger(studentId) || studentId <= 0) {
        return res.status(400).json({
            message: "Invalid student ID"
        });
    }

    if (!isValidMonths(months)) {
        return res.status(400).json({
            message: "Please select 1, 2 or 3 months"
        });
    }

    const amount = MONTHLY_FEE * months;
    let connection;

    try {
        connection = await getConnection();

        await new Promise((resolve, reject) => {
            connection.beginTransaction((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // Lock the student row during payment processing.
        const students = await query(
            connection,
            `SELECT id, full_name, status
             FROM students
             WHERE id = ?
             FOR UPDATE`,
            [studentId]
        );

        if (students.length === 0) {
            await rollbackAndRelease(connection);
            connection = null;

            return res.status(404).json({
                message: "Student not found"
            });
        }

        if (students[0].status !== "ACTIVE") {
            await rollbackAndRelease(connection);
            connection = null;

            return res.status(400).json({
                message: "Approve student before payment"
            });
        }

        // Record the cash payment.
        const paymentResult = await query(
            connection,
            `INSERT INTO payments
                (student_id, months, amount, payment_method,
                 payment_status, paid_at)
             VALUES (?, ?, ?, 'CASH', 'PAID', NOW())`,
            [studentId, months, amount]
        );

        // Create or extend membership.
        const membershipResult = await applyMembership(
            connection,
            studentId,
            months
        );

        // Update the student's payment details.
        await query(
            connection,
            `UPDATE students
             SET fee_amount = ?,
                 payment_status = 'PAID',
                 payment_method = 'CASH'
             WHERE id = ?`,
            [amount, studentId]
        );

        await commitAndRelease(connection);
        connection = null;

        return res.status(200).json({
            message: "Cash payment recorded and membership activated",
            paymentId: paymentResult.insertId,
            months,
            amount,
            membership: membershipResult
        });

    } catch (error) {
        console.error("Cash payment error:", error.message);

        if (connection) {
            await rollbackAndRelease(connection);
        }

        return res.status(500).json({
            message: "Unable to process cash payment"
        });
    }
};

// ==========================================
// CREATE ONLINE PAYMENT ORDER
// Student-only route
// ==========================================

const createOnlineOrder = async (req, res) => {
    const studentId = Number(req.student.studentId);
    const months = Number(req.body.months);

    if (!Number.isSafeInteger(studentId) || studentId <= 0) {
        return res.status(401).json({
            message: "Invalid student session"
        });
    }

    if (!isValidMonths(months)) {
        return res.status(400).json({
            message: "Please select 1, 2 or 3 months"
        });
    }

    const amount = MONTHLY_FEE * months;

    try {
        const students = await new Promise((resolve, reject) => {
            db.query(
                `SELECT id, full_name, status
                 FROM students
                 WHERE id = ?`,
                [studentId],
                (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                }
            );
        });

        if (students.length === 0) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        if (students[0].status !== "ACTIVE") {
            return res.status(400).json({
                message: "Student account must be active"
            });
        }

        // Amount is calculated on the server, not taken from the frontend.
        const order = await razorpay.orders.create({
            amount: amount * 100,
            currency: "INR",
            receipt: `sab_${studentId}_${Date.now()}`,
            notes: {
                studentId: String(studentId),
                months: String(months)
            }
        });

        await new Promise((resolve, reject) => {
            db.query(
                `INSERT INTO payments
                    (student_id, months, amount, payment_method,
                     payment_status, razorpay_order_id)
                 VALUES (?, ?, ?, 'ONLINE', 'PENDING', ?)`,
                [studentId, months, amount, order.id],
                (err) => {
                    if (err) return reject(err);
                    resolve();
                }
            );
        });

        return res.status(200).json({
            key: process.env.RAZORPAY_KEY_ID,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            months,
            studentName: students[0].full_name
        });

    } catch (error) {
        console.error("Create order error:", error.message);

        return res.status(500).json({
            message: "Unable to create online payment"
        });
    }
};

// ==========================================
// VERIFY ONLINE PAYMENT
// Student-only route
// ==========================================

const verifyOnlinePayment = async (req, res) => {
    const studentId = Number(req.student.studentId);

    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    } = req.body;

    if (
        !Number.isSafeInteger(studentId) ||
        studentId <= 0 ||
        typeof razorpay_order_id !== "string" ||
        typeof razorpay_payment_id !== "string" ||
        typeof razorpay_signature !== "string" ||
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
    ) {
        return res.status(400).json({
            message: "Invalid payment verification details"
        });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
        console.error("Razorpay secret is not configured");

        return res.status(500).json({
            message: "Payment service is not configured"
        });
    }

    // Step 1: Verify the Razorpay checkout signature.
    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest();

    let suppliedSignature;

    try {
        suppliedSignature = Buffer.from(razorpay_signature, "hex");
    } catch {
        return res.status(400).json({
            message: "Payment signature is invalid"
        });
    }

    if (
        !/^[a-f0-9]{64}$/i.test(razorpay_signature) ||
        suppliedSignature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(expectedSignature, suppliedSignature)
    ) {
        return res.status(400).json({
            message: "Payment signature verification failed"
        });
    }

    // Step 2: Ask Razorpay for the actual payment details.
    let gatewayPayment;

    try {
        gatewayPayment = await razorpay.payments.fetch(
            razorpay_payment_id
        );
    } catch (error) {
        console.error("Razorpay payment fetch error:", error.message);

        return res.status(502).json({
            message: "Unable to confirm payment with the payment provider"
        });
    }

    if (
        gatewayPayment.id !== razorpay_payment_id ||
        gatewayPayment.order_id !== razorpay_order_id ||
        gatewayPayment.currency !== "INR" ||
        gatewayPayment.status !== "captured"
    ) {
        return res.status(400).json({
            message: "Payment is not confirmed as captured"
        });
    }

    let connection;

    try {
        connection = await getConnection();

        await new Promise((resolve, reject) => {
            connection.beginTransaction((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // Lock the order's payment row to reduce duplicate processing.
        const payments = await query(
            connection,
            `SELECT *
             FROM payments
             WHERE razorpay_order_id = ?
               AND student_id = ?
               AND payment_method = 'ONLINE'
             LIMIT 1
             FOR UPDATE`,
            [razorpay_order_id, studentId]
        );

        if (payments.length === 0) {
            await rollbackAndRelease(connection);
            connection = null;

            return res.status(404).json({
                message: "Payment order not found"
            });
        }

        const payment = payments[0];

        if (payment.payment_status === "PAID") {
            await rollbackAndRelease(connection);
            connection = null;

            return res.status(409).json({
                message: "This payment has already been processed"
            });
        }

        if (payment.payment_status !== "PENDING") {
            await rollbackAndRelease(connection);
            connection = null;

            return res.status(400).json({
                message: "Payment order is not pending"
            });
        }

        // Verify the amount against the amount saved in our database.
        const expectedAmountPaise = Number(payment.amount) * 100;

        if (
            !Number.isFinite(expectedAmountPaise) ||
            gatewayPayment.amount !== expectedAmountPaise ||
            gatewayPayment.amount !== MONTHLY_FEE * Number(payment.months) * 100
        ) {
            await rollbackAndRelease(connection);
            connection = null;

            return res.status(400).json({
                message: "Payment amount does not match the order"
            });
        }

        // Prevent reusing a payment ID for another order.
        const duplicates = await query(
            connection,
            `SELECT id
             FROM payments
             WHERE razorpay_payment_id = ?
             LIMIT 1`,
            [razorpay_payment_id]
        );

        if (duplicates.length > 0) {
            await rollbackAndRelease(connection);
            connection = null;

            return res.status(409).json({
                message: "This payment has already been used"
            });
        }

        // Confirm that the student is still active.
        const students = await query(
            connection,
            `SELECT id, status
             FROM students
             WHERE id = ?
             FOR UPDATE`,
            [studentId]
        );

        if (students.length === 0 || students[0].status !== "ACTIVE") {
            await rollbackAndRelease(connection);
            connection = null;

            return res.status(400).json({
                message: "Student account is not active"
            });
        }

        // Create or extend membership inside the same transaction.
        const membershipResult = await applyMembership(
            connection,
            studentId,
            Number(payment.months)
        );

        await query(
            connection,
            `UPDATE payments
             SET payment_status = 'PAID',
                 razorpay_payment_id = ?,
                 paid_at = NOW()
             WHERE id = ?
               AND payment_status = 'PENDING'`,
            [razorpay_payment_id, payment.id]
        );

        await query(
            connection,
            `UPDATE students
             SET fee_amount = ?,
                 payment_status = 'PAID',
                 payment_method = 'ONLINE'
             WHERE id = ?`,
            [Number(payment.amount), studentId]
        );

        await commitAndRelease(connection);
        connection = null;

        return res.status(200).json({
            message: "Payment verified and membership activated",
            months: Number(payment.months),
            amount: Number(payment.amount),
            membership: membershipResult
        });

    } catch (error) {
        console.error("Online payment verification error:", error.message);

        if (connection) {
            await rollbackAndRelease(connection);
        }

        return res.status(500).json({
            message: "Unable to complete payment verification"
        });
    }
};

module.exports = {
    markCashPaymentPaid,
    createOnlineOrder,
    verifyOnlinePayment
};