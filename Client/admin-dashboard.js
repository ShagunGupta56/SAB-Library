const token =
    localStorage.getItem("adminToken");


if (!token) {

    window.location.href =
        "admin-login.html";
}


// ==========================================
// SETTINGS
// ==========================================

const RENEWAL_GRACE_DAYS = 2;


// Escape values inserted into HTML.
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

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
        await loadRenewalReminders();


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
// MEMBERSHIP RENEWAL REMINDERS
// ==========================================

function getDateOnly(value) {
    if (!value) return null;

    const parts = String(value)
        .slice(0, 10)
        .split("-")
        .map(Number);

    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return null;
    }

    return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getDaysUntilExpiry(validTill) {
    const expiry = getDateOnly(validTill);
    if (!expiry) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Math.round(
        (expiry.getTime() - today.getTime()) /
        (24 * 60 * 60 * 1000)
    );
}

function createWhatsAppReminder(student, daysUntilExpiry) {
    const rawPhone = String(student.phone || "")
        .replace(/\D/g, "");

    let phone = rawPhone;

    // Indian phone number: add country code if missing.
    if (phone.length === 10) {
        phone = "91" + phone;
    } else if (phone.length === 12 && phone.startsWith("91")) {
        // Already includes India's country code.
    } else {
        return "";
    }

    const studentName = student.full_name || "Student";
    const parsedExpiry = getDateOnly(student.valid_till);
    const expiryDate = parsedExpiry
        ? parsedExpiry.toLocaleDateString("en-IN")
        : "the listed expiry date";

    let message;

if (daysUntilExpiry > 0) {
  message = `🙏 Hello ${studentName}!

This is a friendly reminder from SAB Library.

Your membership expires on ${expiryDate}.

💳 Renewal Fee: ₹600

Please renew your membership on time to continue enjoying our library facilities.

🔐 Student Portal Login:
https://sab-library-production.up.railway.app/student-portal.html

Thank you for being a part of SAB Library!

— Team SAB Library`;
} else {
  const overdueDays = Math.abs(daysUntilExpiry);

  message = `🙏 Hello ${studentName}!

This is a friendly reminder from SAB Library.

Your membership expired on ${expiryDate} and is now overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}.

💳 Renewal Fee: ₹600

Please renew your membership as soon as possible to avoid possible seat cancellation.

🔐 Student Portal Login:
https://sab-library-production.up.railway.app/student-portal.html

Thank you for being a part of SAB Library!

— Team SAB Library`;
}

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

async function loadRenewalReminders() {
    const container = document.getElementById("renewalRemindersList");
    if (!container) return;

    try {
        const response = await fetch("/api/students", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (handleAuthFailure(response)) return;
            throw new Error("Unable to load students");
        }

        const students = await response.json();

        if (!Array.isArray(students)) {
            container.textContent = "Unable to load renewal reminders.";
            return;
        }

        const reminders = students
            .map(student => ({
                ...student,
                daysUntilExpiry: getDaysUntilExpiry(student.valid_till)
            }))
            .filter(student =>
                student.status === "ACTIVE" &&
                student.daysUntilExpiry !== null &&
                student.daysUntilExpiry <= 2
            )
            .sort((a, b) =>
                a.daysUntilExpiry - b.daysUntilExpiry
            );

        if (reminders.length === 0) {
            container.innerHTML =
                "<p>No memberships need renewal reminders right now.</p>";
            return;
        }

        container.innerHTML = reminders.map(student => {
            const days = student.daysUntilExpiry;
            const expiryText = days > 0
                ? `Expires in ${days} day${days === 1 ? "" : "s"}`
                : days === 0
                    ? "Expires today"
                    : `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;

            const whatsappLink =
                createWhatsAppReminder(student, days);

            return `
                <article class="student-info-card" style="margin-bottom:12px">
                    <div>
                        <h3>${escapeHtml(student.full_name || "Student")}</h3>
                        <p>Phone: ${escapeHtml(student.phone || "Not available")}</p>
                        <p>Seat: ${escapeHtml(student.seat_number || "Not assigned")}</p>
                        <p>Expiry: ${escapeHtml(
                            student.valid_till
                                ? (getDateOnly(student.valid_till)
                                    ? getDateOnly(student.valid_till).toLocaleDateString("en-IN")
                                    : "Not available")
                                : "Not available"
                        )}</p>
                        <strong>${escapeHtml(expiryText)}</strong>
                        ${
                            whatsappLink
                                ? `<p><a class="admin-primary-action"
                                    href="${escapeHtml(whatsappLink)}"
                                    target="_blank"
                                    rel="noopener noreferrer">
                                    Open WhatsApp Reminder
                                   </a></p>`
                                : `<p>Check the student's phone number before sending a reminder.</p>`
                        }
                    </div>
                </article>
            `;
        }).join("");

    } catch (error) {
        console.error("Renewal reminder error:", error);
        container.textContent = "Unable to load renewal reminders.";
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