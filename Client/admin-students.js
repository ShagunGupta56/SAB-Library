// ==========================================
// ADMIN AUTH CHECK
// ==========================================

const token = localStorage.getItem("adminToken");

if (!token) {
    window.location.href = "admin-login.html";
}


// ==========================================
// GLOBAL VARIABLES
// ==========================================

let availableSeats = [];
let allStudents = [];

const RENEWAL_GRACE_DAYS = 5;

const studentsTable =
    document.getElementById("studentsTable");

const studentSearch =
    document.getElementById("studentSearch");

const studentFilter =
    document.getElementById("studentFilter");


// ==========================================
// HTML ESCAPE
// Protects admin page from malicious input
// ==========================================

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ==========================================
// HANDLE AUTH FAILURE
// ==========================================

function handleAuthFailure(response) {

    if (
        response.status === 401 ||
        response.status === 403
    ) {

        localStorage.removeItem("adminToken");

        window.location.href =
            "admin-login.html";

        return true;
    }

    return false;
}


// ==========================================
// DATE HELPERS
// ==========================================

function normalizeDate(dateValue) {

    if (!dateValue) {
        return null;
    }

    const date =
        new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    date.setHours(0, 0, 0, 0);

    return date;
}


function formatDate(dateValue) {

    if (!dateValue) {
        return "Not available";
    }

    const date =
        new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


// ==========================================
// MEMBERSHIP INFORMATION
// ==========================================

function getMembershipInfo(student) {

    if (!student.valid_till) {

        return {
            type: "NONE",
            daysRemaining: null,
            daysExpired: null,
            label: "No Membership",
            overdue: false
        };
    }


    const expiryDate =
        normalizeDate(student.valid_till);

    const today =
        new Date();

    today.setHours(0, 0, 0, 0);


    if (!expiryDate) {

        return {
            type: "NONE",
            daysRemaining: null,
            daysExpired: null,
            label: "No Membership",
            overdue: false
        };
    }


    const oneDay =
        1000 * 60 * 60 * 24;


    const difference =
        Math.round(
            (expiryDate - today) /
            oneDay
        );


    // Valid through the expiry date
    if (
        difference >= 0 &&
        student.membership_status !== "EXPIRED"
    ) {

        if (difference === 0) {

            return {
                type: "ACTIVE",
                daysRemaining: 0,
                daysExpired: null,
                label: "Expires Today",
                overdue: false
            };
        }


        return {
            type: "ACTIVE",
            daysRemaining: difference,
            daysExpired: null,
            label:
                `${difference} day${difference === 1 ? "" : "s"} left`,
            overdue: false
        };
    }


    const daysExpired =
        Math.max(
            1,
            Math.abs(difference)
        );


    return {
        type: "EXPIRED",
        daysRemaining: null,
        daysExpired,
        label:
            `Expired ${daysExpired} day${daysExpired === 1 ? "" : "s"} ago`,
        overdue:
            daysExpired >= RENEWAL_GRACE_DAYS
    };
}


// ==========================================
// TABLE MESSAGE
// ==========================================

function showTableMessage(message) {

    studentsTable.innerHTML = "";

    const row =
        document.createElement("tr");

    const cell =
        document.createElement("td");

    cell.colSpan = 7;

    cell.className =
        "students-empty-message";

    cell.textContent =
        message;

    row.appendChild(cell);

    studentsTable.appendChild(row);
}


// ==========================================
// LOAD AVAILABLE SEATS
// ==========================================

async function loadSeats() {

    try {

        const response = await fetch(
            "/api/seats",
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );


        const seats =
            await response.json();


        if (!response.ok) {

            if (
                handleAuthFailure(response)
            ) {
                return;
            }

            console.log(
                seats.message
            );

            return;
        }


        availableSeats =
            seats.filter(
                seat =>
                    seat.status ===
                    "AVAILABLE"
            );


    } catch (error) {

        console.log(
            "Unable to load seats:",
            error
        );
    }
}


// ==========================================
// LOAD STUDENTS
// ==========================================

async function loadStudents() {

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


            showTableMessage(
                students.message ||
                "Unable to load students."
            );

            return;
        }


        allStudents =
            Array.isArray(students)
                ? students
                : [];


        renderStudents();


    } catch (error) {

        console.log(error);

        showTableMessage(
            "Unable to load students."
        );
    }
}


// ==========================================
// FILTER STUDENTS
// ==========================================

function getFilteredStudents() {

    const searchValue =
        studentSearch
            ? studentSearch
                .value
                .trim()
                .toLowerCase()
            : "";


    const filterValue =
        studentFilter
            ? studentFilter.value
            : "ALL";


    return allStudents.filter(
        student => {

            const membership =
                getMembershipInfo(student);


            const searchableText = [
                student.full_name,
                student.phone,
                student.library_id,
                student.student_class
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


            const matchesSearch =
                searchableText.includes(
                    searchValue
                );


            let matchesFilter =
                true;


            if (
                filterValue === "PENDING"
            ) {

                matchesFilter =
                    student.status ===
                    "PENDING";
            }


            else if (
                filterValue === "ACTIVE"
            ) {

                matchesFilter =
                    student.status ===
                    "ACTIVE" &&
                    membership.type !==
                    "EXPIRED";
            }


            else if (
                filterValue === "EXPIRED"
            ) {

                matchesFilter =
                    student.status ===
                    "ACTIVE" &&
                    membership.type ===
                    "EXPIRED";
            }


            else if (
                filterValue === "OVERDUE"
            ) {

                matchesFilter =
                    student.status ===
                    "ACTIVE" &&
                    membership.overdue;
            }


            else if (
                filterValue === "INACTIVE"
            ) {

                matchesFilter =
                    student.status ===
                    "INACTIVE";
            }


            return (
                matchesSearch &&
                matchesFilter
            );
        }
    );
}


// ==========================================
// STATUS BADGE
// ==========================================

function getStudentStatusHtml(student) {

    if (
        student.status === "ACTIVE"
    ) {

        return `
            <span class="student-status-badge status-active">
                ACTIVE
            </span>
        `;
    }


    if (
        student.status === "PENDING"
    ) {

        return `
            <span class="student-status-badge status-pending">
                PENDING
            </span>
        `;
    }


    return `
        <span class="student-status-badge status-inactive">
            INACTIVE
        </span>
    `;
}


// ==========================================
// MEMBERSHIP HTML
// ==========================================

function getMembershipHtml(student) {

    if (
        student.status === "PENDING"
    ) {

        return `
            <span class="membership-helper-text">
                Approve student first
            </span>
        `;
    }


    if (
        student.status === "INACTIVE"
    ) {

        return `
            <span class="membership-helper-text">
                Student inactive
            </span>
        `;
    }


    const membership =
        getMembershipInfo(student);


    // --------------------------------------
    // ACTIVE MEMBERSHIP
    // --------------------------------------

    if (
        membership.type === "ACTIVE"
    ) {

        return `
            <div class="membership-display">

                <strong>
                    ${escapeHtml(student.plan || "Membership")}
                </strong>

                <span class="membership-badge membership-active">
                    ACTIVE
                </span>

                <small>
                    Valid till:
                    ${escapeHtml(
                        formatDate(
                            student.valid_till
                        )
                    )}
                </small>

                <small class="${
                    membership.daysRemaining === 0
                        ? "membership-expiring-today"
                        : ""
                }">
                    ${escapeHtml(
                        membership.label
                    )}
                </small>

            </div>
        `;
    }


    // --------------------------------------
    // EXPIRED / NO MEMBERSHIP
    // --------------------------------------

    let expiredMessage = "";


    if (
        membership.type === "EXPIRED"
    ) {

        expiredMessage = `

            <div class="expired-membership-info">

                <span class="membership-badge membership-expired">
                    EXPIRED
                </span>

                <small>
                    ${escapeHtml(
                        membership.label
                    )}
                </small>

                ${
                    membership.overdue

                        ? `
                            <div class="renewal-overdue-warning">

                                Renewal overdue —
                                seat may now be released.

                            </div>
                        `

                        : `
                            <div class="renewal-grace-message">

                                Allow a short renewal period
                                before releasing the seat.

                            </div>
                        `
                }

            </div>
        `;
    }


    return `

        <div class="membership-display">

            ${
                student.plan

                    ? `
                        <strong>
                            ${escapeHtml(
                                student.plan
                            )}
                        </strong>
                    `

                    : `
                        <strong>
                            No Membership
                        </strong>
                    `
            }


            ${expiredMessage}


            <select
                id="membership-${Number(student.id)}"
                aria-label="Select membership plan"
            >

                <option value="">
                    Select Plan
                </option>

                <option value="1">
                    1 Month
                </option>

                <option value="2">
                    2 Months
                </option>

                <option value="3">
                    3 Months
                </option>

            </select>


            <button
                onclick="createMembership(${Number(student.id)})"
            >

                ${
                    student.plan
                        ? "Renew Membership"
                        : "Activate Membership"
                }

            </button>

        </div>
    `;
}


// ==========================================
// ACTION / SEAT HTML
// ==========================================

function getActionHtml(student) {

    const studentId =
        Number(student.id);


    if (
        student.status === "PENDING"
    ) {

        return `
            <div class="student-actions">

                <button
                    class="action-approve"
                    onclick="approveStudent(${studentId})"
                >
                    Approve Student
                </button>

            </div>
        `;
    }


    if (
        student.status === "INACTIVE"
    ) {

        return `
            <span class="student-status-badge status-inactive">
                Student Inactive
            </span>
        `;
    }


    if (
        student.seat_number
    ) {

        return `
            <div class="student-actions">

                <div class="seat-assigned-display">

                    <span>
                        Assigned Seat
                    </span>

                    <strong>
                        ${escapeHtml(
                            student.seat_number
                        )}
                    </strong>

                </div>


                <button
                    class="action-deactivate"
                    onclick="deactivateStudent(${studentId})"
                >
                    Deactivate & Release Seat
                </button>

            </div>
        `;
    }


    const seatOptions =
        availableSeats
            .map(
                seat => `

                    <option
                        value="${Number(seat.id)}"
                    >
                        ${escapeHtml(
                            seat.seat_number
                        )}
                    </option>

                `
            )
            .join("");


    return `
        <div class="student-actions">

            <span class="no-seat-label">
                No seat assigned
            </span>


            <select
                id="seat-${studentId}"
                aria-label="Select seat"
            >

                <option value="">
                    Select Seat
                </option>

                ${seatOptions}

            </select>


            <button
                class="action-seat"
                onclick="allocateSeat(${studentId})"
            >
                Allot Seat
            </button>


            <button
                class="action-deactivate"
                onclick="deactivateStudent(${studentId})"
            >
                Deactivate Student
            </button>

        </div>
    `;
}


// ==========================================
// RENDER STUDENTS
// ==========================================

function renderStudents() {

    const students =
        getFilteredStudents();


    studentsTable.innerHTML = "";


    if (
        students.length === 0
    ) {

        showTableMessage(
            "No students found for the selected search or filter."
        );

        return;
    }


    students.forEach(
        student => {

            const row =
                document.createElement("tr");


            const membership =
                getMembershipInfo(student);


            if (
                membership.overdue &&
                student.status === "ACTIVE"
            ) {

                row.classList.add(
                    "renewal-overdue-row"
                );
            }


            row.innerHTML = `

                <!-- NAME -->

                <td>

                    <div class="student-name-cell">

                        <strong>
                            ${escapeHtml(
                                student.full_name
                            )}
                        </strong>

                        ${
                            membership.overdue &&
                            student.status === "ACTIVE"

                                ? `
                                    <small class="attention-label">
                                        Needs Attention
                                    </small>
                                `

                                : ""
                        }

                    </div>

                </td>


                <!-- CLASS -->

                <td>

                    ${escapeHtml(
                        student.student_class ||
                        "-"
                    )}

                </td>


                <!-- PHONE -->

                <td>

                    ${escapeHtml(
                        student.phone ||
                        "-"
                    )}

                </td>


                <!-- LIBRARY ID -->

                <td>

                    ${
                        student.library_id

                            ? `
                                <span class="library-id-chip">
                                    ${escapeHtml(
                                        student.library_id
                                    )}
                                </span>
                            `

                            : `
                                <span class="not-assigned-text">
                                    Not Assigned
                                </span>
                            `
                    }

                </td>


                <!-- STATUS -->

                <td>

                    ${getStudentStatusHtml(
                        student
                    )}

                </td>


                <!-- MEMBERSHIP -->

                <td>

                    ${getMembershipHtml(
                        student
                    )}

                </td>


                <!-- ACTION -->

                <td>

                    ${getActionHtml(
                        student
                    )}

                </td>
            `;


            studentsTable.appendChild(
                row
            );
        }
    );
}


// ==========================================
// APPROVE STUDENT
// ==========================================

async function approveStudent(id) {

    const student =
        allStudents.find(
            student =>
                Number(student.id) ===
                Number(id)
        );


    const studentName =
        student?.full_name ||
        "this student";


    const confirmation =
        confirm(
            `Approve ${studentName}?\n\n` +
            "A Library ID and Portal PIN will be generated."
        );


    if (!confirmation) {
        return;
    }


    try {

        const response = await fetch(
            `/api/students/${id}/approve`,
            {
                method: "PATCH",

                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );


        const data =
            await response.json();


        if (
            handleAuthFailure(response)
        ) {
            return;
        }


        if (response.ok) {

            alert(
`Student Approved Successfully!

Student: ${studentName}

Library ID: ${data.libraryId}
Portal PIN: ${data.portalPin}

Please give these credentials to the student.
The PIN may not be shown again.`
            );


            await loadStudents();


        } else {

            alert(
                data.message ||
                "Unable to approve student."
            );
        }


    } catch (error) {

        console.log(error);

        alert(
            "Unable to approve student."
        );
    }
}


// ==========================================
// ALLOCATE SEAT
// ==========================================

async function allocateSeat(studentId) {

    const select =
        document.getElementById(
            `seat-${studentId}`
        );


    if (!select) {

        alert(
            "Seat selection is not available."
        );

        return;
    }


    const seatId =
        select.value;


    if (!seatId) {

        alert(
            "Please select a seat first."
        );

        return;
    }


    const selectedOption =
        select.options[
            select.selectedIndex
        ];


    const seatNumber =
        selectedOption.textContent.trim();


    const student =
        allStudents.find(
            item =>
                Number(item.id) ===
                Number(studentId)
        );


    const studentName =
        student?.full_name ||
        "this student";


    const confirmation =
        confirm(
            `Allot Seat ${seatNumber} to ${studentName}?`
        );


    if (!confirmation) {
        return;
    }


    try {

        const response = await fetch(
            "/api/seats/allocate",
            {
                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${token}`
                },


                body: JSON.stringify({

                    student_id:
                        studentId,

                    seat_id:
                        Number(seatId)
                })
            }
        );


        const data =
            await response.json();


        if (
            handleAuthFailure(response)
        ) {
            return;
        }


        if (response.ok) {

            alert(
                `Seat ${data.seatNumber} allocated successfully to ${studentName}.`
            );


            await loadSeats();

            await loadStudents();


        } else {

            alert(
                data.message ||
                "Unable to allocate seat."
            );
        }


    } catch (error) {

        console.log(error);

        alert(
            "Unable to allocate seat."
        );
    }
}


// ==========================================
// CREATE / RENEW MEMBERSHIP
// ==========================================

async function createMembership(
    studentId
) {

    const select =
        document.getElementById(
            `membership-${studentId}`
        );


    if (!select) {

        alert(
            "Membership selection is not available."
        );

        return;
    }


    const months =
        select.value;


    if (!months) {

        alert(
            "Please select a membership plan."
        );

        return;
    }


    const student =
        allStudents.find(
            item =>
                Number(item.id) ===
                Number(studentId)
        );


    const studentName =
        student?.full_name ||
        "this student";


    const action =
        student?.plan
            ? "Renew"
            : "Activate";


    const confirmation =
        confirm(
            `${action} ${months}-month membership for ${studentName}?`
        );


    if (!confirmation) {
        return;
    }


    try {

        const response = await fetch(
            "/api/memberships",
            {
                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${token}`
                },


                body: JSON.stringify({

                    student_id:
                        studentId,

                    months:
                        Number(months)
                })
            }
        );


        const data =
            await response.json();


        if (
            handleAuthFailure(response)
        ) {
            return;
        }


        if (response.ok) {

            alert(
                `${action} membership completed successfully for ${studentName}.`
            );


            await loadStudents();


        } else {

            alert(
                data.message ||
                "Unable to activate / renew membership."
            );
        }


    } catch (error) {

        console.log(error);

        alert(
            "Unable to activate / renew membership."
        );
    }
}


// ==========================================
// DEACTIVATE STUDENT
// ==========================================

async function deactivateStudent(
    studentId
) {

    const student =
        allStudents.find(
            item =>
                Number(item.id) ===
                Number(studentId)
        );


    const studentName =
        student?.full_name ||
        "this student";


    const seatNumber =
        student?.seat_number;


    let message =
        `Deactivate ${studentName}?`;


    if (seatNumber) {

        message +=
            `\n\nSeat ${seatNumber} will immediately become AVAILABLE for another student.`;

    } else {

        message +=
            "\n\nThis student currently has no allocated seat.";
    }


    message +=
        "\n\nOnly continue if the student has left the library or will not renew.";


    const confirmDeactivate =
        confirm(message);


    if (!confirmDeactivate) {
        return;
    }


    try {

        const response = await fetch(
            `/api/students/${studentId}/deactivate`,
            {
                method: "PATCH",

                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );


        const data =
            await response.json();


        if (
            handleAuthFailure(response)
        ) {
            return;
        }


        if (response.ok) {

            alert(
                data.message ||
                `${studentName} has been deactivated successfully.`
            );


            // Released seat becomes available again
            await loadSeats();

            await loadStudents();


        } else {

            alert(
                data.message ||
                "Unable to deactivate student."
            );
        }


    } catch (error) {

        console.log(error);

        alert(
            "Unable to deactivate student."
        );
    }
}


// ==========================================
// SEARCH / FILTER EVENTS
// ==========================================

if (studentSearch) {

    studentSearch.addEventListener(
        "input",
        renderStudents
    );
}


if (studentFilter) {

    studentFilter.addEventListener(
        "change",
        renderStudents
    );
}


// ==========================================
// INITIALIZE PAGE
// ==========================================

async function initializePage() {

    await loadSeats();

    await loadStudents();


    const savedFilter =
        localStorage.getItem(
            "studentManagementFilter"
        );


    if (
        savedFilter &&
        studentFilter
    ) {

        studentFilter.value =
            savedFilter;

        localStorage.removeItem(
            "studentManagementFilter"
        );

        renderStudents();
    }
}


initializePage();