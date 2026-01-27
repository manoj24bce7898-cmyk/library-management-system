const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");
const expressLayouts = require("express-ejs-layouts");

app.use(express.urlencoded({ extended: true }));
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(expressLayouts);

app.set("layout", "main/boiler1");

const session = require("express-session");

app.use(session({
  secret: "mysecretkey",
  resave: false,
  saveUninitialized: true
}));


// ================= DATABASE =================
mongoose.connect("mongodb://127.0.0.1:27017/libraryDB")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// ================= MODELS =================
const StudentProfile = require("./models/user1");
const User = require("./models/user");
const all = require("./models/all");
const whisl_Book = require("./models/whisl");
const Admin = require('./models/adm_log');
const Remainder = require('./models/remainder');
const syllabusPdf = require('./models/syllabus');
const booked = require("./models/booked");


// ================= ROUTES =================


app.get("/library", (req, res) => {
  res.render("main2",{layout: false});
});

// HOME PAGE
app.get("/", (req, res) => {
  res.render("main",{layout: "main/boiler1"});
});

// ================= STUDENT AUTH =================

// Student main page
app.get("/student", (req, res) => {
  res.render("student/login", { layout: "main/boiler1" });
});

// Login page

// Signup page
app.get("/student/signup", (req, res) => {
  res.render("student/signup", { layout: "main/boiler1" });
});

// Signup submit (user)
app.post("/student/signup/submit1", async (req, res) => {
  const { name, email, password } = req.body;

  const newUser = new User({ name, email, password });
  await newUser.save();

  res.render("student/signup1", { layout: "main/boiler1" });
});

// Signup submit (profile)
app.post("/student/signup1/submit2", async (req, res) => {
  const { email, firstName, lastName, regNumber, course, semester, year } = req.body;

  const profile = new StudentProfile({
    email,
    firstName,
    lastName,
    regNumber,
    course,
    semester,
    year
  });

  await profile.save();
  res.redirect("/student/login");
});

// Login submit
app.post("/student/login/submit", async (req, res) => {
  const { email, password } = req.body;

  const foundUser = await User.findOne({ email, password });
  if (!foundUser) return res.send("Invalid email or password");

  const profile = await StudentProfile.findOne({ email });
  if (!profile) return res.send("Profile not found");

  const books = await all.find({ year: profile.year, subject: "English" });
  const mathBooks = await all.find({ year: profile.year, subject: "Mathematics" });

  res.render("student/stu_dash", {
    layout: "main/boiler",
    profile,
    books,
    mathBooks
  });
});

// ================= PROFILE =================

// View profile
app.get("/student/profile/:email", async (req, res) => {
  const { email } = req.params;
  const profile = await StudentProfile.findOne({ email });
  res.render("student/profile", { layout: "main/boiler", profile });
});

// Edit profile page
app.get("/student/profile/edit/:email", async (req, res) => {
  const { email } = req.params;
  const profile = await StudentProfile.findOne({ email });
  res.render("student/edit_profile", { layout: "main/boiler", profile });
});

// Edit profile submit
app.post("/student/profile/edit/:email", async (req, res) => {
  const { email } = req.params;
  const { firstName, lastName, regNumber, course, semester, year } = req.body;

  await StudentProfile.findOneAndUpdate({ email }, {
    firstName,
    lastName,
    regNumber,
    course,
    semester,
    year
  });

  res.redirect(`/student/profile/${email}`);
});

// ================= BOOKS =================

// Book details page
app.get("/books/:id/:email", async (req, res) => {
  const { id, email } = req.params;
  const book = await all.findById(id);

  if (!book) return res.send("Book not found");

  res.render("books/show", { layout: "main/boiler2", email, book });
});

// ================= WISHLIST =================

// Add to wishlist
app.post("/wishlist/add/:email/:id", async (req, res) => {
  const { email, id } = req.params;
  const book = await all.findById(id);

  if (!book) return res.send("Book not found");

  const exists = await whisl_Book.findOne({ title: book.title, author: book.author });
  if (exists) return res.send("Book already in wishlist");

  const whislBook = new whisl_Book(book);
  await whislBook.save();

  res.redirect(`/wishlist/${email}`);
});

// View wishlist
app.get("/wishlist/:email", async (req, res) => {
  const { email } = req.params;
  const books = await whisl_Book.find({});
  res.render("whish", { layout: "main/boiler2", email, books });
});

// Remove from wishlist
app.get("/wishlist/remove/:id", async (req, res) => {
  const { id } = req.params;
  await whisl_Book.findByIdAndDelete(id);
  res.redirect("/wishlist");
});

app.get("/booked/:email", async (req, res) => {
  const { email } = req.params;
  const books = await booked.find({});
  res.render("books/booked", { layout: "main/boiler2", email, books });
});

app.post("/booking/add/:email/:id", async (req, res) => {
  const { email, id } = req.params;
  const book = await all.findById(id);

  if (!book) return res.send("Book not found");
  const bookedBook = new booked({
    title: book.title,
    author: book.author,
    year: book.year,
    semester: book.semester,
    subject: book.subject,
    description: book.description,
    availableCopies: book.availableCopies,
    bookeddate: new Date(),
    duedate: new Date(new Date().setDate(new Date().getDate() + 5))
  });
  await bookedBook.save();
  res.redirect(`/booked/${email}`);
});
// ================= SEARCH =================

app.get("/search/:email", (req, res) => {
  const { email } = req.params;
  res.render("books/search", { layout: "main/boiler2", email });
});

app.post("/search/:email/submit", async (req, res) => {
  const { email } = req.params;
  const { sub, year } = req.body;

  const books = await all.find({
    subject: sub,
    year: Number(year)
  });

  res.render("books/search1", { layout: "main/boiler2", email, books });
});

// ================= DASHBOARD REDIRECT =================

const multer = require("multer");
const { mainModule } = require("process");

// ✅ define storage FIRST
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "./uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

// ✅ then define upload
const upload = multer({ storage });

app.get("/home/:email", (req, res) => {
  res.redirect(`/student/student/${req.params.email}`);
});

app.get("/student/student/:email", async (req, res) => {
  const { email } = req.params;
  const profile = await StudentProfile.findOne({ email });
  if (!profile) return res.send("Profile not found");
  const books = await all.find({ year: profile.year, subject: "English" });
  const mathBooks = await all.find({ year: profile.year, subject: "Mathematics" });
  res.render("student/stu_dash", {
    layout: "main/boiler",
    profile,
    books,
    mathBooks
  });
});

app.get("/allbooks/:email", async (req, res) => {
  const { email } = req.params;
  const profile = await StudentProfile.findOne({ email });
  if (!profile) return res.send("Profile not found");
  const books = await all.find({ subject: "English", year: profile.year });
  const mathBooks = await all.find({ subject: "Mathematics", year: profile.year });

  res.render("books/allbooks", { layout: "main/boiler2", books, mathBooks, email });
});

function adminAuth(req, res, next) {
  if (!req.session.adminEmail) {
    return res.redirect("/admin/login");
  }
  res.locals.email = req.session.adminEmail; // available in EJS
  next();
}

// Redirect admin root
app.get("/admin", (req, res) => {
  res.redirect("/admin/login");
});

// Admin Login Page
app.get("/admin/login", (req, res) => {
  res.render("admin/login", { layout: "main/boiler1" });
});

// Admin Login Submit
app.post("/admin/login/submit", async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email, password });

  if (!admin) return res.send("Invalid admin credentials");

  req.session.adminEmail = admin.email;

  // ✅ redirect with email in URL
  res.redirect(`/admin/adm_dash/${admin.email}`);
});

// Admin Signup Page
app.get("/admin/signup", (req, res) => {
  res.render("admin/signup", { layout: "main/boiler1" });
});

// Admin Signup Submit
app.post("/admin/signup/submit", async (req, res) => {
  const { name, email, password } = req.body;
  await Admin.create({ name, email, password });
  res.redirect("/admin/login");
});

// Admin Logout
app.get("/admin/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin/login");
});

// ================== DASHBOARD ==================
app.get("/admin/adm_dash/:email", adminAuth, async (req, res) => {
  try {
    const books = await all.find({ subject: "English" });
    const mathBooks = await all.find({ subject: "Mathematics" });
    const syllabi = await syllabusPdf.find({});

    res.render("admin/adm_dash", {
      layout: "main/admin_boiler",
      email: req.session.adminEmail,
      books,
      mathBooks,
      syllabi
    });
  } catch (err) {
    res.status(500).send("Dashboard Error");
  }
});

// ================== ADD BOOKS ==================
app.get("/addbooks/:email", adminAuth, (req, res) => {
  res.render("admin/addbook", {
    email: req.session.adminEmail,
    layout: "main/admin_boiler"
  });
});

app.post("/addbooks/:email/submit", adminAuth, async (req, res) => {
  try {
    const newBook = new all(req.body);
    newBook.bookImage = "https://images.unsplash.com/photo-1543004471-24598d77a030?w=400";
    await newBook.save();

    res.redirect(`/admin/adm_dash/${req.session.adminEmail}`);
  } catch (err) {
    res.status(500).send("Error adding book");
  }
});

// ================== REMAINDERS ==================
app.get("/remainders/:email", adminAuth, async (req, res) => {
  try {
    const remData = await Remainder.find({});

    res.render("admin/remainders", {
      rem: remData,
      email: req.session.adminEmail,
      layout: "main/admin_boiler"
    });
  } catch (err) {
    res.status(500).send("Error loading remainders");
  }
});

// ================== ADD SYLLABUS PDF ==================
app.get("/addsyllabus/:email", adminAuth, (req, res) => {
  res.render("admin/syllabus", { email: req.session.adminEmail });
});

app.post("/addsyllabus/:email/submit", adminAuth, upload.single("syllabusPdf"), async (req, res) => {
  try {
    const newPdf = new syllabusPdf({
      title: req.body.subjectName,
      pdf: req.file.filename
    });
    await newPdf.save();

    res.redirect(`/admin/adm_dash/${req.session.adminEmail}`);
  } catch (err) {
    res.status(500).send("Upload failed");
  }
});

// ================== SEARCH ==================
app.get("/search/:email", adminAuth, (req, res) => {
  res.render("books/search", {
    layout: "main/admin_boiler",   // ✅ correct
    email: req.session.adminEmail
  });
});

app.post("/search/:email/submit", adminAuth, async (req, res) => {
  const { sub, year } = req.body;
  const books = await all.find({ subject: sub, year: Number(year) });

  res.render("books/search2", {
    layout: "main/admin_boiler",   // ✅ correct
    books,
    email: req.session.adminEmail
  });
});


// ================== PROFILE ==================
app.get("/admin/profile/:email", adminAuth, (req, res) => {
  const { email } = req.params;
  const profile = Admin.findOne({ email });
  res.render("admin/adm_profile", {
    profile,
    email: req.session.adminEmail,
    layout: "main/admin_boiler"
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));