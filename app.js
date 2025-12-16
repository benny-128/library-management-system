const express = require("express");
const session = require("express-session");
const path = require("path");
const db = require("./config/db");

const app = express();

/* =========================
   MIDDLEWARE
========================= */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: "library_secret_key",
    resave: false,
    saveUninitialized: false   // better for production
  })
);

/* =========================
   VIEW ENGINE
========================= */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* =========================
   STATIC FILES (optional)
========================= */
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   ROUTES IMPORT
========================= */
const adminRoutes = require("./routes/admin");
const studentRoutes = require("./routes/student");

/* =========================
   HOME ROUTE
========================= */
app.get("/", (req, res) => {
  res.redirect("/login");
});

/* =========================
   COMMON LOGIN ROUTES
========================= */

// Login Page
app.get("/login", (req, res) => {
  res.render("common/login", { error: null });
});

// Login Submit
app.post("/login", (req, res) => {
  const { role, username, password } = req.body;

  // ADMIN LOGIN
  if (role === "admin") {
    db.query(
      "SELECT * FROM admin WHERE username=? AND password=?",
      [username, password],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.render("common/login", { error: "Server error" });
        }

        if (result.length > 0) {
          req.session.admin = result[0];
          res.redirect("/admin/dashboard");
        } else {
          res.render("common/login", { error: "Invalid Admin Credentials" });
        }
      }
    );
  }

  // STUDENT LOGIN
  else if (role === "student") {
    db.query(
      "SELECT * FROM students WHERE roll_no=? AND password=?",
      [username, password],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.render("common/login", { error: "Server error" });
        }

        if (result.length > 0) {
          req.session.student = result[0];
          res.redirect("/student/dashboard");
        } else {
          res.render("common/login", { error: "Invalid Student Credentials" });
        }
      }
    );
  }

  else {
    res.render("common/login", { error: "Please select a role" });
  }
});

/* =========================
   STUDENT SIGNUP ROUTES
========================= */

// Signup Page
app.get("/signup", (req, res) => {
  res.render("common/signup", { error: null, success: null });
});

// Signup Submit
app.post("/signup", (req, res) => {
  const { roll_no, name, password } = req.body;

  db.query(
    "SELECT * FROM students WHERE roll_no=?",
    [roll_no],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.render("common/signup", {
          error: "Server error",
          success: null
        });
      }

      if (result.length > 0) {
        res.render("common/signup", {
          error: "Roll number already registered",
          success: null
        });
      } else {
        db.query(
          "INSERT INTO students (roll_no, name, password) VALUES (?, ?, ?)",
          [roll_no, name, password],
          (err) => {
            if (err) {
              console.log(err);
              return res.render("common/signup", {
                error: "Registration failed",
                success: null
              });
            }

            res.render("common/signup", {
              error: null,
              success: "Registration successful! Please login."
            });
          }
        );
      }
    }
  );
});

/* =========================
   ADMIN & STUDENT MODULES
========================= */
app.use("/admin", adminRoutes);
app.use("/student", studentRoutes);

/* =========================
   SERVER START (RENDER FIX)
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
