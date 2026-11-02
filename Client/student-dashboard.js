const studentToken =
    localStorage.getItem("studentToken");


// If student is not logged in
if (!studentToken) {

    window.location.href =
        "student-portal.html";
}


// Escape dynamic data before putting it inside innerHTML
// This protects the dashboard from XSS attacks.
function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getPaymentSection(student) {

    return `
        <div class="student-payment-card">

            <h3>
                Membership Payment
            </h3>

            <p>
                Choose your membership duration.
            </p>


            <select id="onlineMonths">

                <option value="1">
                    1 Month — ₹600
                </option>

                <option value="2">
                    2 Months — ₹1200
                </option>

                <option value="3">
                    3 Months — ₹1800
                </option>

            </select>


            <div
                id="onlineAmount"
                class="online-payment-amount"
            >
                ₹600
            </div>


            <button
    class="online-pay-btn"
    disabled
>
    Online Payment Activating Soon
</button>

<p class="payment-helper">
    Online payment is being activated.
    Please contact the library administrator for fee submission.
</p>


            <p class="payment-helper">
                Membership will activate automatically
                after successful payment.
            </p>

        </div>
    `;
}

async function loadStudentDashboard() {

    const details =
        document.getElementById("studentDetails");

    try {

        const response = await fetch(
            "/api/students/me/dashboard",
            {
                headers: {
                    Authorization:
                        `Bearer ${studentToken}`
                }
            }
        );


        const student =
            await response.json();


        // Handle failed API response
        if (!response.ok) {

            // Invalid / expired login token
            if (
                response.status === 401 ||
                response.status === 403
            ) {

                localStorage.removeItem(
                    "studentToken"
                );

                window.location.href =
                    "student-portal.html";

                return;
            }


            details.innerHTML =
                `<p>${escapeHtml(
                    student.message ||
                    "Unable to load dashboard."
                )}</p>`;

            return;
        }


        // Format membership dates
        const validFrom =
            student.valid_from
                ? new Date(
                    student.valid_from
                ).toLocaleDateString()
                : "Not Available";


        const validTill =
            student.valid_till
                ? new Date(
                    student.valid_till
                ).toLocaleDateString()
                : "Not Available";


        // Membership renewal reminder (date-only comparison avoids timezone shifts)
        function parseLocalDate(value) {
            if (!value) return null;
            const parts = String(value).slice(0, 10).split("-").map(Number);
            if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
            return new Date(parts[0], parts[1] - 1, parts[2]);
        }

        function daysUntilMembershipExpiry(value) {
            const expiry = parseLocalDate(value);
            if (!expiry) return null;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return Math.round((expiry.getTime() - today.getTime()) / 86400000);
        }

        const daysUntilExpiry = daysUntilMembershipExpiry(student.valid_till);
        let membershipAlert = "";

        if (student.valid_till && daysUntilExpiry !== null) {
            if (daysUntilExpiry === 2) {
                membershipAlert = `
                    <div class="membership-alert warning">
                        <strong>Membership renewal reminder</strong>
                        <p>Your membership expires in 2 days. Please renew your ₹600 monthly fee on time.</p>
                    </div>`;
            } else if (daysUntilExpiry === 1) {
                membershipAlert = `
                    <div class="membership-alert warning">
                        <strong>Membership expires tomorrow!</strong>
                        <p>Please renew your membership to continue using your reserved seat.</p>
                    </div>`;
            } else if (daysUntilExpiry === 0) {
                membershipAlert = `
                    <div class="membership-alert warning">
                        <strong>Membership expires today!</strong>
                        <p>Please renew your membership today.</p>
                    </div>`;
            } else if (daysUntilExpiry < 0) {
                const overdueDays = Math.abs(daysUntilExpiry);
                membershipAlert = `
                    <div class="membership-alert expired">
                        <strong>Membership renewal overdue</strong>
                        <p>Your membership expired ${overdueDays} day${overdueDays === 1 ? "" : "s"} ago.
                        Please renew as soon as possible to avoid possible seat cancellation.</p>
                    </div>`;
            } else if (daysUntilExpiry <= 3) {
                membershipAlert = `
                    <div class="membership-alert warning">
                        Your membership expires in ${daysUntilExpiry} days. Please renew on time.
                    </div>`;
            }
        }

        // Render student dashboard
        details.innerHTML = `

            ${membershipAlert}

            <div class="student-card">

                <h3>
                    Welcome,
                    ${escapeHtml(
                        student.full_name
                    )}
                </h3>

                <p>
                    <strong>
                        Library ID:
                    </strong>

                    ${escapeHtml(
                        student.library_id ||
                        "Not Available"
                    )}
                </p>


                <p>
                    <strong>
                        Class:
                    </strong>

                    ${escapeHtml(
                        student.student_class ||
                        "Not Provided"
                    )}
                </p>


                <p>
                    <strong>
                        School / College:
                    </strong>

                    ${escapeHtml(
                        student.school_college ||
                        "Not Provided"
                    )}
                </p>


                <p>
                    <strong>
                        Seat Number:
                    </strong>

                    ${escapeHtml(
                        student.seat_number ||
                        "Not Assigned"
                    )}
                </p>


                <p>
                    <strong>
                        Membership:
                    </strong>

                    ${student.valid_till
                       ? "Active Membership"
                        : "Not Activated"
                    }
                </p>


                <p>
                    <strong>
                        Valid From:
                    </strong>

                    ${escapeHtml(
                        validFrom
                    )}
                </p>


                <p>
                    <strong>
                        Valid Till:
                    </strong>

                    ${escapeHtml(
                        validTill
                    )}
                </p>


                <p>
                    <strong>
                        Membership Status:
                    </strong>

                    ${escapeHtml(
                        student.membership_status ||
                        "Not Active"
                    )}
                </p>


                <p>
                    <strong>
                        Days Remaining:
                    </strong>

                    ${escapeHtml(
                        student.days_remaining ??
                        "Not Available"
                    )}
                </p>

            </div>
            ${getPaymentSection(student)}
        `;


    } catch (error) {

        console.log(error);

        details.innerHTML =
            "<p>Unable to load dashboard.</p>";
    }
}

document.addEventListener(
    "change",
    (event) => {

        if (
            event.target.id !==
            "onlineMonths"
        ) {
            return;
        }


        const months =
            Number(
                event.target.value
            );


        const amount =
            months * 600;


        const amountElement =
            document.getElementById(
                "onlineAmount"
            );


        if (amountElement) {

            amountElement.textContent =
                `₹${amount}`;
        }
    }
);

async function payOnline() {

    const monthsSelect =
        document.getElementById(
            "onlineMonths"
        );


    if (!monthsSelect) {

        alert(
            "Please select membership duration."
        );

        return;
    }


    const months =
        Number(monthsSelect.value);


    try {

        // ==================================
        // CREATE ORDER
        // ==================================

        const orderResponse =
            await fetch(
                "/api/payments/online/order",
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${studentToken}`
                    },


                    body:
                        JSON.stringify({
                            months
                        })
                }
            );


        const orderData =
            await orderResponse.json();


        if (!orderResponse.ok) {

            alert(
                orderData.message ||
                "Unable to start payment."
            );

            return;
        }


        // ==================================
        // OPEN RAZORPAY CHECKOUT
        // ==================================

        const options = {

            key:
                orderData.key,

            amount:
                orderData.amount,

            currency:
                orderData.currency,

            name:
                "SAB Library",

            description:
                `${months} Month Membership`,

            order_id:
                orderData.orderId,


            handler:
                async function (
                    response
                ) {

                    try {

                        const verifyResponse =
                            await fetch(
                                "/api/payments/online/verify",
                                {
                                    method:
                                        "POST",

                                    headers: {

                                        "Content-Type":
                                            "application/json",

                                        Authorization:
                                            `Bearer ${studentToken}`
                                    },


                                    body:
                                        JSON.stringify({

                                            razorpay_order_id:
                                                response.razorpay_order_id,

                                            razorpay_payment_id:
                                                response.razorpay_payment_id,

                                            razorpay_signature:
                                                response.razorpay_signature
                                        })
                                }
                            );


                        const verifyData =
                            await verifyResponse.json();


                        if (
                            verifyResponse.ok
                        ) {

                            alert(
                                `Payment successful!\n\n` +
                                `${verifyData.months} month membership activated.`
                            );


                            await loadStudentDashboard();


                        } else {

                            alert(
                                verifyData.message ||
                                "Payment verification failed."
                            );
                        }


                    } catch (error) {

                        console.log(error);

                        alert(
                            "Payment verification failed."
                        );
                    }
                },


            theme: {
                color:
                    "#0c2740"
            }
        };


        const razorpay =
            new Razorpay(options);


        razorpay.on(
            "payment.failed",
            function (response) {

                alert(
                    response.error?.description ||
                    "Payment failed. Please try again."
                );
            }
        );


        razorpay.open();


    } catch (error) {

        console.log(error);

        alert(
            "Unable to start online payment."
        );
    }
}

function studentLogout() {

    localStorage.removeItem(
        "studentToken"
    );

    window.location.href =
        "student-portal.html";
}


// Load dashboard when page opens
loadStudentDashboard();