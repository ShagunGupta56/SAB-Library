const studentToken =
    localStorage.getItem("studentToken");

if (!studentToken) {
    window.location.href =
        "student-portal.html";
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


        if (!response.ok) {

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
                `<p>${student.message}</p>`;

            return;
        }


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
            student.membership_status === "EXPIRED"
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
            student.days_remaining <= 3
        ) {

            membershipAlert = `
                <div class="membership-alert warning">
                    Only ${student.days_remaining}
                    days of membership validity are left.
                </div>
            `;
        }


        details.innerHTML = `

            ${membershipAlert}

            <div class="student-card">

                <h3>
                    Welcome, ${student.full_name}
                </h3>

                <p>
                    <strong>Library ID:</strong>
                    ${student.library_id}
                </p>

                <p>
                    <strong>Class:</strong>
                    ${student.student_class}
                </p>

                <p>
                    <strong>School / College:</strong>
                    ${student.school_college || "Not Provided"}
                </p>

                <p>
                    <strong>Seat Number:</strong>
                    ${student.seat_number || "Not Assigned"}
                </p>

                <p>
                    <strong>Membership Plan:</strong>
                    ${student.plan || "Not Activated"}
                </p>

                <p>
                    <strong>Valid From:</strong>
                    ${validFrom}
                </p>

                <p>
                    <strong>Valid Till:</strong>
                    ${validTill}
                </p>

                <p>
                    <strong>Membership Status:</strong>
                    ${student.membership_status || "Not Active"}
                </p>

                <p>
                    <strong>Days Remaining:</strong>
                    ${student.days_remaining ?? "Not Available"}
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


loadStudentDashboard();