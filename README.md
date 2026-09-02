# 📚 SAB Library Management System

A full-stack Library Management System built for the real-world management of **SAB Library**.

The platform allows students to register online, receive a unique Library ID and secure portal PIN after approval, view their membership details, and check their allotted seat.

Administrators can manage registrations, memberships, seat allocation, student status, and library capacity through a dedicated admin dashboard.

## 🌐 Live Website

👉 **[Visit SAB Library](https://sab-library-production.up.railway.app)**

---

## 🎯 Problem Statement

Managing student registrations, seat allocation, membership validity, and records manually can become difficult as a library grows.

SAB Library Management System digitizes this process by providing a centralized platform for both students and administrators.

---

## ✨ Features

### 👨‍🎓 Student Features

- Online student registration
- Unique Library ID generation
- Secure 6-digit student portal PIN
- Student login portal
- Personal dashboard
- View allotted seat
- View membership plan
- View membership validity dates
- View remaining membership days
- Membership expiry warnings
- Mobile-friendly interface

### 👨‍💼 Admin Features

- Secure admin authentication
- Dashboard with library statistics
- View pending registrations
- Approve student registrations
- Automatic Library ID generation
- Secure student PIN generation
- Seat allocation and management
- Membership activation
- Membership expiry tracking
- Renewal grace-period monitoring
- Student search and filtering
- Student deactivation
- Automatic seat release after deactivation
- View available and occupied seats

---

## 🔄 System Workflow

```text
Student Registration
        ↓
Pending Application
        ↓
Admin Approval
        ↓
Library ID + Secure PIN
        ↓
Seat Allocation
        ↓
Membership Activation
        ↓
Student Portal Login
        ↓
Student Dashboard
```

---

## 🛠️ Tech Stack

### Frontend

- HTML5
- CSS3
- JavaScript

### Backend

- Node.js
- Express.js

### Database

- MySQL
- mysql2

### Authentication & Security

- JSON Web Token (JWT)
- bcryptjs
- Secure PIN generation using Node.js Crypto
- Login rate limiting
- Protected admin routes
- Protected student routes
- XSS-safe dynamic dashboard rendering

### Deployment

- Railway
- Railway MySQL
- GitHub

---

## 🪑 Seat Management

The system currently supports **40 library seats**:

```text
A01 - A10
B01 - B10
C01 - C10
D01 - D10
```

The admin can assign available seats to active students and released seats become available again when a student is deactivated.

---

## 🔐 Security

The application includes several security measures:

- Passwords are never stored in plain text
- Student PINs are hashed using bcrypt
- Secure random PIN generation
- JWT-based authentication
- Login rate limiting
- Protected API routes
- XSS-safe rendering of dynamic student data
- Database credentials stored using environment variables
- Production database accessed through Railway's private network

---

## 📸 Screenshots

### Homepage



### Student Registration

<!-- Add registration screenshot here -->

### Admin Dashboard

<!-- Add admin dashboard screenshot here -->

### Student Management

<!-- Add student management screenshot here -->

### Student Dashboard

<!-- Add student dashboard screenshot here -->

---

## 📁 Project Structure

```text
SAB-Library/
│
├── Client/
│   ├── index.html
│   ├── home.css
│   ├── register.html
│   ├── student-portal.html
│   ├── student-dashboard.html
│   ├── admin-login.html
│   ├── admin-dashboard.html
│   ├── admin-students.html
│   └── JavaScript files
│
├── Server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── server.js
│   └── package.json
│
├── package.json
└── README.md
```

---

## ⚙️ Environment Variables

The backend requires the following environment variables:

```env
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
```

> Never commit real database passwords or JWT secrets to GitHub.

---

## 🚀 Running Locally

Clone the repository:

```bash
git clone https://github.com/ShagunGupta56/SAB-Library.git
```

Open the project:

```bash
cd SAB-Library
```

Install backend dependencies:

```bash
cd Server
npm install
```

Configure the required environment variables in a `.env` file.

Start the server:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

---

## 🔮 Future Enhancements

- Student attendance system
- Online fee payments
- Automated renewal reminders
- Notifications
- Improved seat-allocation concurrency handling
- Payment history
- Attendance analytics
- Custom domain
- Additional administrative reports

---

## 💡 Project Purpose

This project was developed to solve a **real-world library management requirement**, rather than being only a demonstration project.

It combines frontend development, REST APIs, authentication, database management, security practices, deployment, and real-world business logic into a complete full-stack application.

---

## 👩‍💻 Developer

**Shagun Gupta**

B.Tech — Computer Science & Engineering

GitHub: **[@ShagunGupta56](https://github.com/ShagunGupta56)**

---

⭐ If you find this project useful, consider giving the repository a star.
