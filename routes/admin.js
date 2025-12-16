const express = require("express");
const router = express.Router();
const db = require("../config/db");

/* =========================
   ADMIN LOGIN
========================= */

// Login page
router.get("/login", (req, res) => {
  res.render("admin/login", { error: null });
});

// Login check
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM admin WHERE username=? AND password=?",
    [username, password],
    (err, result) => {
      if (err) {
  console.log(err);
  return res.send("Something went wrong. Check server console.");
}


      if (result.length > 0) {
        req.session.admin = username;
        res.redirect("/admin/dashboard");
      } else {
        res.render("admin/login", { error: "Invalid username or password" });
      }
    }
  );
});

/* =========================
   AUTH MIDDLEWARE
========================= */
function checkAdmin(req, res, next) {
  if (req.session.admin) {
    next();
  } else {
    res.redirect("/admin/login");
  }
}

/* =========================
   DASHBOARD
========================= */
router.get("/dashboard", checkAdmin, (req, res) => {
  res.render("admin/dashboard");
});

/* =========================
   ADD BOOK
========================= */
router.get("/add-book", checkAdmin, (req, res) => {
  res.render("admin/addBook");
});

router.post("/add-book", checkAdmin, (req, res) => {
  const { book_name, author, quantity } = req.body;

  const sql = "INSERT INTO books (book_name, author, quantity) VALUES (?, ?, ?)";

  db.query(sql, [book_name, author, quantity], (err) => {
    if (err) {
  console.log(err);
  return res.send("Something went wrong. Check server console.");
}

    res.redirect("/admin/books");
  });
});



/* =========================
   LOGOUT
========================= */
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin/login");
});
// Add Student Page
router.get("/add-student", checkAdmin, (req, res) => {
  res.render("admin/addStudent");
});
// Add Student Page
router.get("/add-student", checkAdmin, (req, res) => {
  res.render("admin/addStudent");
});
// Save Student
router.post("/add-student", checkAdmin, (req, res) => {
  const { roll_no, name, password } = req.body;

  const sql =
    "INSERT INTO students (roll_no, name, password) VALUES (?, ?, ?)";

  db.query(sql, [roll_no, name, password], (err) => {
    if (err) {
  console.log(err);
  return res.send("Something went wrong. Check server console.");
}

    res.redirect("/admin/students");
  });
});
// View Students
router.get("/students", checkAdmin, (req, res) => {
  db.query("SELECT * FROM students", (err, results) => {
    if (err) {
  console.log(err);
  return res.send("Something went wrong. Check server console.");
}

    res.render("admin/viewStudents", { students: results });
  });
});
// Delete Student
router.get("/delete-student/:id", checkAdmin, (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM students WHERE id=?", [id], (err) => {
    if (err) {
  console.log(err);
  return res.send("Something went wrong. Check server console.");
}

    res.redirect("/admin/students");
  });
});
/* =========================
   VIEW BOOKS
========================= */
router.get("/books", checkAdmin, (req, res) => {
  db.query("SELECT * FROM books", (err, results) => {
    if (err) {
  console.log(err);
  return res.send("Something went wrong. Check server console.");
}

    res.render("admin/viewBooks", { books: results });
  });
});
// Issue Book Page
router.get("/issue-book", checkAdmin, (req, res) => {
  db.query("SELECT * FROM students", (err, students) => {
    if (err) {
  console.log(err);
  return res.send("Something went wrong. Check server console.");
}


    db.query("SELECT * FROM books WHERE quantity > 0", (err, books) => {
     if (err) {
  console.log(err);
  return res.send("Something went wrong. Check server console.");
}


      res.render("admin/issueBook", { students, books });
    });
  });
});
// Save Issued Book
router.post("/issue-book", checkAdmin, (req, res) => {
  const { student_id, book_id } = req.body;

  const issueDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(issueDate.getDate() + 14);

  const sql =
    "INSERT INTO issued_books (student_id, book_id, issue_date, due_date, status) VALUES (?, ?, ?, ?, ?)";

  db.query(
    sql,
    [
      student_id,
      book_id,
      issueDate,
      dueDate,
      "Issued"
    ],
    (err) => {
      if (err) {
  console.log(err);
  return res.send("Something went wrong. Check server console.");
}


      // decrease book quantity
      db.query(
        "UPDATE books SET quantity = quantity - 1 WHERE id = ?",
        [book_id],
        (err) => {
          if (err) {
  console.log(err);
  return res.send("Something went wrong. Check server console.");
}

          res.redirect("/admin/issued-books");
        }
      );
    }
  );
});
// View Issued Books
router.get("/issued-books", checkAdmin, (req, res) => {
  const sql = `
    SELECT issued_books.*, students.roll_no, students.name,
           books.book_name
    FROM issued_books
    JOIN students ON issued_books.student_id = students.id
    JOIN books ON issued_books.book_id = books.id
    WHERE issued_books.status = 'Issued'
  `;

  db.query(sql, (err, results) => {
    if (err) {
  console.log(err);
  return res.send("Something went wrong. Check server console.");
}

    res.render("admin/issuedBooks", { records: results });
  });
});
// Return Book
router.get("/return-book/:id", checkAdmin, (req, res) => {
  const issueId = req.params.id;

  // get issued record
  db.query(
    "SELECT * FROM issued_books WHERE id=?",
    [issueId],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.send("Error fetching record");
      }

      const record = result[0];
      const today = new Date();
      const dueDate = new Date(record.due_date);

      let fine = 0;
      if (today > dueDate) {
        const diffTime = today - dueDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        fine = diffDays * 5;
      }

      // update issued_books
      db.query(
        "UPDATE issued_books SET status='Returned' WHERE id=?",
        [issueId],
        (err) => {
          if (err) {
            console.log(err);
            return res.send("Error updating status");
          }

          // increase book quantity
          db.query(
            "UPDATE books SET quantity = quantity + 1 WHERE id=?",
            [record.book_id],
            (err) => {
              if (err) {
                console.log(err);
                return res.send("Error updating quantity");
              }

              res.send(`Book Returned Successfully. Fine: ₹${fine}`);
            }
          );
        }
      );
    }
  );
});


module.exports = router;
