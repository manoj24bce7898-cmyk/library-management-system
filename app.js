const cron = require("node-cron");  // path correct ga petti
const sendMail = require("./mailer");        // your mail function
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");
const expressLayouts = require("express-ejs-layouts");

require("dotenv").config();

const multer = require("multer");   // ✅ ONLY ONCE HERE
const Razorpay = require("razorpay");
const { v4: uuidv4 } = require("uuid");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Atlas connected"))
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


// ================= RAZORPAY =================


  key_id: "rzp_test_ABC123XYZ",
  key_secret: "abc123xyz456secret"
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});


// ================= OPENAI =================


cron.schedule("0 9 * * *", async () => {

  console.log("⏰ Checking book reminders...");

  const books = await booked.find();
  const today = new Date();

  for (let book of books) {

    if (!book.duedate) continue;   // 🔥 skip if no due date

    let dueDate = new Date(book.duedate);
    if (isNaN(dueDate)) continue;  // 🔥 skip invalid date

    let oneDayBefore = new Date(dueDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);

    // 1 DAY BEFORE
    if (
      today.toDateString() === oneDayBefore.toDateString() &&
      !book.reminderBeforeSent
    ) {

      await sendMail(
        book.email,
        book.username || "Student",
        book.title,
        dueDate.toDateString(),
        "before"
      );

      book.reminderBeforeSent = true;
      await book.save();
    }

    // DUE DATE
    if (
      today.toDateString() === dueDate.toDateString() &&
      !book.reminderDueSent
    ) {

      await sendMail(
        book.email,
        book.username || "Student",
        book.title,
        dueDate.toDateString(),
        "due"
      );

      book.reminderDueSent = true;
      await book.save();
    }

  }

});
// ================= MULTER STORAGE =================

// AI chat image storage
const chatStorage = multer.diskStorage({

  destination: function(req,file,cb)
  {
    cb(null,"public/chatImages");
  },

  filename: function(req,file,cb)
  {
    cb(null,uuidv4()+path.extname(file.originalname));
  }

});

const chatUpload = multer({ storage: chatStorage });



app.get("/ai-chat/:email", async(req,res)=>{

  const profile = await StudentProfile.findOne({
    email:req.params.email
  });

  res.render("student/ai_chat",{
    layout:"main/boiler2",
    email:req.params.email,
    profile
  });

});


// ================= AI CHAT API =================

app.post("/ai-chat", chatUpload.single("image"), async(req,res)=>{

try{

const question=req.body.message.toLowerCase();

const books=await all.find({

$or:[
{title:{$regex:question,$options:"i"}},
{subject:{$regex:question,$options:"i"}},
{description:{$regex:question,$options:"i"}}
]

});

let answer="";


// Demo AI responses

if(question.includes("english"))
{
answer="English is a global language used for communication, literature, and academics. It includes grammar, vocabulary, and comprehension skills.";
}
else if(question.includes("dbms"))
{
answer="DBMS stands for Database Management System. It is software used to store, manage, and retrieve data efficiently.";
}
else if(question.includes("operating system"))
{
answer="Operating System is system software that manages computer hardware and software resources.";
}
else if(question.includes("data structure"))
{
answer="Data Structures are ways of organizing data efficiently, such as arrays, linked lists, stacks, and queues.";
}
else
{
answer="This topic is available in your library. Please check recommended books below.";
}


// Add book recommendation text

if(books.length>0)
{
answer+="\n\nRecommended books from library:";
}


res.json({

answer:answer,
books:books

});

}
catch(err){

res.json({
answer:"Demo AI working successfully",
books:[]
});

}

});
// ================= STUDENT AUTH =================

app.get("/", (req, res) => {
  res.render("main");
});
// Student main page
app.get("/student", (req, res) => {
  res.render("student/login", { layout: "main/boiler1" });
});

app.get("/fines/:email", async (req, res) => {
  const { email } = req.params;

  const books = await booked.find({ email });
  const profile = await StudentProfile.findOne({ email });


  let overdueBooks = [];      // store overdue books
     // store non-overdue books

  let today = new Date();

  for (let i = 0; i < books.length; i++) {

    let duedate = new Date(books[i].duedate);

    let rem = duedate.getTime() - today.getTime();

    if (rem < 0) {
      console.log("Book is overdue:", books[i].title);

      let overdueDays = Math.ceil(-rem / (1000 * 60 * 60 * 24)); // calculate overdue days
      let fineAmount = overdueDays * 100; // Assuming $1 fine per day

      books[i].fineAmount = fineAmount; // add fine amount to book object
      overdueBooks.push(books[i]);   // add to overdue list

    } 
  }

  res.render("books/fines", {
    layout: "main/boiler2",
    email,
    overdueBooks,
    profile
  });

});
// Login page

app.get("/payfines/:id", async (req, res) => {
  const { id } = req.params;
  const book = await booked.findByIdAndDelete(id);
  if (!book) return res.send("Book not found");
  res.redirect(`/fines/${book.email}`);
});

app.post("/create-payment/:bookId", async (req, res) => {

  const { bookId } = req.params;

  const book = await booked.findById(bookId);

  if (!book) return res.send("Book not found");

  let today = new Date();
  let duedate = new Date(book.duedate);

  let overdueDays = Math.ceil(
    (today.getTime() - duedate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (overdueDays <= 0)
    return res.send("No fine");

  let fineAmount = overdueDays * 100;

  const options = {
    amount: fineAmount * 100, // paise
    currency: "INR",
    receipt: bookId
  };

  const order = await razorpay.orders.create(options);

  res.json({
    orderId: order.id,
    amount: order.amount
  });

});

app.post("/payment-success/:bookId", async (req, res) => {

  const { bookId } = req.params;

  await booked.findByIdAndDelete(bookId);

  res.send("Fine paid successfully");

});

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
  res.redirect("/student");
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


app.get("/booked/:email", async (req, res) => {
  const { email } = req.params;

  const books = await booked.find({ email });

  let overdueBooks = [];      // store overdue books
  let validBooks = [];        // store non-overdue books

  let today = new Date();

  for (let i = 0; i < books.length; i++) {

    let duedate = new Date(books[i].duedate);

    let rem = duedate.getTime() - today.getTime();

    if (rem < 0) {
      console.log("Book is overdue:", books[i].title);

      overdueBooks.push(books[i]);   // add to overdue list

    } else {

      validBooks.push(books[i]);     // add to valid list

    }
  }

  res.render("books/booked", {
    layout: "main/boiler2",
    email,
    overdueBooks,
    validBooks
  });

});

app.get("/bookedbooks/:id/:email",async(req,res)=>{
  let {id,email}=req.params;
  console.log(id);
  const book=await booked.findById(id);
  if(!book){
    res.send("books is not available");
  }
  res.render("books/show2",
    {
    layout:"main/boiler2",
    book,
    email
    }
  )
});

app.get("/removebooked/:email/:id",async(req,res)=>{
  let {id,email}= req.params;
  await booked.findByIdAndDelete(id);
  res.redirect(`/booked/${email}`);
})

app.post("/booking/add/:email/:id", async (req, res) => {

  try {

    const { email, id } = req.params;

    const book = await all.findById(id);
    const details = await StudentProfile.findOne({ email });

    if (!book) return res.send("Book not found");
    if (!details) return res.send("Student not found");

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);

    const bookedBook = new booked({
      email: email,
      username: details.name || "Student",
      title: book.title,
      author: book.author,
      year: book.year,
      semester: book.semester,
      subject: book.subject,
      description: book.description,
      availableCopies: book.availableCopies,
      bookeddate: new Date(),
      duedate: dueDate
    });

    const remData = new Remainder({
      email: email,
      title: book.title,
      author: book.author,
      year: book.year,
      semester: book.semester,
      subject: book.subject,
      regNumber: details.regNumber,
      bookeddate: new Date(),
      duedate: dueDate
    });

    // ✅ Send mail AFTER saving (better practice)
    await bookedBook.save();
    await remData.save();

    await sendMail(
      email,
      details.name || "Student",
      book.title,
      dueDate.toDateString(),
      "booked"
    );

    res.redirect(`/booked/${email}`);

  } catch (err) {
    console.log("Booking Error:", err);
    res.send("Something went wrong");
  }

});
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
app.get("/admsearch/:email", adminAuth, (req, res) => {
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

app.get("/removebook/:email/:id", adminAuth, async (req, res) => {
  const { id } = req.params;
  await all.findByIdAndDelete(id);
  res.redirect(`/admin/adm_dash/${req.session.adminEmail}`);
});

app.get("/removesyllabus/:email/:id", adminAuth, async (req, res) => {
  const { id } = req.params;
  await syllabusPdf.findByIdAndDelete(id);
  res.redirect(`/admin/adm_dash/${req.session.adminEmail}`);
});



app.get("/remove1/:id/:email",async (req, res) => {
  const { id,email } = req.params;
  await whisl_Book.findByIdAndDelete(id);
  res.redirect(`/wishlist/${email}`);
});





const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));