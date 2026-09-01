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


        // Membership warning
        let membershipAlert = "";


        if (
            student.membership_status ===
            "EXPIRED"
        ) {

            membershipAlert = `
                <div class="membership-alert expired">
                    Membership expired.
                    Please contact the library administrator
                    for renewal.
                </div>
            `;

        } else if (
            student.days_remaining === 0
        ) {

            membershipAlert = `
                <div class="membership-alert warning">
                    Your membership expires today.
                </div>
            `;

        } else if (
            student.days_remaining === 1
        ) {

            membershipAlert = `
                <div class="membership-alert warning">
                    Only 1 day of membership validity is left.
                </div>
            `;

        } else if (
            student.days_remaining !== null &&
            student.days_remaining !== undefined &&
            student.days_remaining <= 3
        ) {

            membershipAlert = `
                <div class="membership-alert warning">
                    Only ${escapeHtml(
                        student.days_remaining
                    )}
                    days of membership validity are left.
                </div>
            `;
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
                        Membership Plan:
                    </strong>

                    ${escapeHtml(
                        student.plan ||
                        "Not Activated"
                    )}
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
        `;


    } catch (error) {

        console.log(error);

        details.innerHTML =
            "<p>Unable to load dashboard.</p>";
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