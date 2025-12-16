const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Student login page
router.get("/login", (req, res) => {
  res.render("student/login", { error: null });
});

// Student login check
router.post("/login", (req, res) => {
  const { roll_no, password } = req.body;

  db.query(
    "SELECT * FROM students WHERE roll_no=? AND password=?",
    [roll_no, password],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.send("DB Error");
      }

      if (result.length > 0) {
        req.session.student = result[0];
        res.redirect("/student/dashboard");
      } else {
        res.render("student/login", { error: "Invalid credentials" });
      }
    }
  );
});

// Student dashboard
router.get("/dashboard", (req, res) => {
  if (!req.session.student) {
    return res.redirect("/student/login");
  }

  const studentId = req.session.student.id;

  const sql = `
    SELECT issued_books.*, books.book_name
    FROM issued_books
    JOIN books ON issued_books.book_id = books.id
    WHERE issued_books.student_id = ?
  `;

  db.query(sql, [studentId], (err, records) => {
    if (err) {
      console.log(err);
      return res.send("Error loading dashboard");
    }

    // fine calculation
    const today = new Date();
    records.forEach(r => {
      const due = new Date(r.due_date);
      if (today > due && r.status === "Issued") {
        const diffDays = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
        r.fine = diffDays * 5;
      } else {
        r.fine = 0;
      }
    });

    res.render("student/dashboard", { student: req.session.student, records });
  });
});

// Change password page
router.get("/change-password", (req, res) => {
  if (!req.session.student) {
    return res.redirect("/login");
  }

  res.render("student/changePassword", {
    error: null,
    success: null
  });
});

// Change password submit
router.post("/change-password", (req, res) => {
  if (!req.session.student) {
    return res.redirect("/login");
  }

  const { oldPassword, newPassword } = req.body;
  const studentId = req.session.student.id;

  db.query(
    "SELECT * FROM students WHERE id=? AND password=?",
    [studentId, oldPassword],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.render("student/changePassword", {
          error: "Server error",
          success: null
        });
      }

      if (result.length === 0) {
        return res.render("student/changePassword", {
          error: "Old password is incorrect",
          success: null
        });
      }

      db.query(
        "UPDATE students SET password=? WHERE id=?",
        [newPassword, studentId],
        (err) => {
          if (err) {
            console.log(err);
            return res.render("student/changePassword", {
              error: "Update failed",
              success: null
            });
          }

          res.render("student/changePassword", {
            error: null,
            success: "Password updated successfully"
          });
        }
      );
    }
  );
});


// Logout
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/student/login");
});

module.exports = router;
