const token =
    localStorage.getItem("adminToken");


if (!token) {

    window.location.href =
        "admin-login.html";
}


// ==========================================
// SETTINGS
// ==========================================

const RENEWAL_GRACE_DAYS = 5;


// ==========================================
// AUTH FAILURE
// ==========================================

function handleAuthFailure(response) {

    if (
        response.status === 401 ||
        response.status === 403
    ) {

        localStorage.removeItem(
            "adminToken"
        );

        window.location.href =
            "admin-login.html";

        return true;
    }

    return false;
}


// ==========================================
// LOAD DASHBOARD DATA
// ==========================================

async function loadDashboard() {

    try {

        const response = await fetch(
            "/api/admin/dashboard",
            {
                headers: {

                    Authorization:
                        `Bearer ${token}`
                }
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            if (
                handleAuthFailure(response)
            ) {
                return;
            }


            console.log(
                data.message
            );

            return;
        }


        // ==================================
        // UPDATE DASHBOARD CARDS
        // ==================================

        document.getElementById(
            "totalStudents"
        ).innerText =
            data.total_students ?? 0;


        document.getElementById(
            "pendingStudents"
        ).innerText =
            data.pending_students ?? 0;


        document.getElementById(
            "activeStudents"
        ).innerText =
            data.active_students ?? 0;


        document.getElementById(
            "availableSeats"
        ).innerText =
            data.available_seats ?? 0;


        document.getElementById(
            "occupiedSeats"
        ).innerText =
            data.occupied_seats ?? 0;


        document.getElementById(
            "activeMemberships"
        ).innerText =
            data.active_memberships ?? 0;


        document.getElementById(
            "expiredMemberships"
        ).innerText =
            data.expired_memberships ?? 0;


        // Now load attention section
        await loadAttentionData();


    } catch (error) {

        console.log(
            "Dashboard Error:",
            error
        );
    }
}


// ==========================================
// DAYS SINCE EXPIRY
// ==========================================

function getDaysExpired(validTill) {

    if (!validTill) {
        return 0;
    }


    const expiryDate =
        new Date(validTill);


    const today =
        new Date();


    expiryDate.setHours(
        0, 0, 0, 0
    );


    today.setHours(
        0, 0, 0, 0
    );


    const difference =
        today - expiryDate;


    if (difference <= 0) {
        return 0;
    }


    return Math.floor(
        difference /
        (1000 * 60 * 60 * 24)
    );
}


// ==========================================
// LOAD NEEDS ATTENTION
// ==========================================

async function loadAttentionData() {

    try {

        const response = await fetch(
            "/api/students",
            {
                headers: {

                    Authorization:
                        `Bearer ${token}`
                }
            }
        );


        const students =
            await response.json();


        if (!response.ok) {

            if (
                handleAuthFailure(response)
            ) {
                return;
            }

            return;
        }


        if (!Array.isArray(students)) {
            return;
        }


        let pendingCount = 0;
        let expiredCount = 0;
        let overdueCount = 0;


        students.forEach(
            student => {


                // --------------------------
                // PENDING
                // --------------------------

                if (
                    student.status ===
                    "PENDING"
                ) {

                    pendingCount++;
                }


                // --------------------------
                // EXPIRED MEMBERSHIP
                // --------------------------

                if (
                    student.status === "ACTIVE" &&
                    student.membership_status === "EXPIRED"
                ) {

                    expiredCount++;


                    const daysExpired =
                        getDaysExpired(
                            student.valid_till
                        );


                    if (
                        daysExpired >=
                        RENEWAL_GRACE_DAYS
                    ) {

                        overdueCount++;
                    }
                }

            }
        );


        updateAttentionUI(
            pendingCount,
            expiredCount,
            overdueCount
        );


    } catch (error) {

        console.log(
            "Attention Data Error:",
            error
        );
    }
}


// ==========================================
// UPDATE ATTENTION UI
// ==========================================

function updateAttentionUI(
    pending,
    expired,
    overdue
) {

    const pendingElement =
        document.getElementById(
            "attentionPending"
        );


    const expiredElement =
        document.getElementById(
            "attentionExpired"
        );


    const overdueElement =
        document.getElementById(
            "attentionOverdue"
        );


    const attentionMessage =
        document.getElementById(
            "attentionMessage"
        );


    if (pendingElement) {

        pendingElement.innerText =
            pending;
    }


    if (expiredElement) {

        expiredElement.innerText =
            expired;
    }


    if (overdueElement) {

        overdueElement.innerText =
            overdue;
    }


    if (!attentionMessage) {
        return;
    }


    // Everything fine
    if (
        pending === 0 &&
        expired === 0 &&
        overdue === 0
    ) {

        attentionMessage.innerText =
            "Everything looks good. No urgent action is required.";

        attentionMessage.classList.add(
            "attention-all-good"
        );

        return;
    }


    // Overdue students exist
    if (overdue > 0) {

        attentionMessage.innerText =
            `${overdue} student${overdue === 1 ? "" : "s"} crossed the ${RENEWAL_GRACE_DAYS}-day renewal period. Check before releasing their seats.`;

        return;
    }


    // Other pending tasks
    attentionMessage.innerText =
        "Some student records need your attention. Open Student Management to review them.";
}


// ==========================================
// OPEN ATTENTION FILTER
// ==========================================

function openAttention(
    filter = "ALL"
) {

    localStorage.setItem(
        "studentManagementFilter",
        filter
    );

    window.location.href =
        "admin-students.html";
}


// ==========================================
// MANAGE STUDENTS
// ==========================================

function manageStudents() {

    localStorage.removeItem(
        "studentManagementFilter"
    );

    window.location.href =
        "admin-students.html";
}


// ==========================================
// LOGOUT
// ==========================================

function adminLogout() {

    localStorage.removeItem(
        "adminToken"
    );

    window.location.href =
        "admin-login.html";
}


// ==========================================
// LOAD PAGE
// ==========================================

loadDashboard();