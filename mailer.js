const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({

  service: "gmail",

  pool: true,
  maxConnections: 5,
  maxMessages: 100,

  auth: {
    user: "m.v.sivamanoj2007@gmail.com",
    pass: "wrrnvfuvjzokydni"
  }

});

async function sendMail(email, name, title, dueDate, type) {

  let subject = "";
  let text = "";

  if(type === "booked"){
    subject = "📚 Book Booking Confirmation";
    text = `Hello ${name},

Your book "${title}" has been successfully booked.

Due Date: ${dueDate}

Please return the book before the due date.

Library Management System`;
  }

  if(type === "before"){
    subject = "⏰ Reminder: Book Due Tomorrow";
    text = `Hello ${name},

Reminder that your book "${title}" is due tomorrow.

Due Date: ${dueDate}

Please return it on time.`;
  }

  if(type === "due"){
    subject = "⚠️ Book Due Today";
    text = `Hello ${name},

Today is the due date for the book "${title}".

Please return it today to avoid fines.`;
  }

  await transporter.sendMail({
    from: "m.v.sivamanoj2007@gmail.com",
    to: email,
    subject,
    text
  });

}

module.exports = sendMail;