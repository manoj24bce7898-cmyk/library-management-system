const nodemailer = require("nodemailer");

// ✅ Create transporter FIRST
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "m.v.sivamanoj2007@gmail.com",
    pass: "wrrnvfuvjzokydni"  // no spaces
  }
});

// ✅ Main function only
async function sendMail(to, name, bookName, dueDate, type) {

  let message = "";

  if (type === "booked") {
    message = `
      Hi ${name},<br><br>
      Your book <b>${bookName}</b> has been successfully booked.<br>
      Due Date: <b>${dueDate}</b><br><br>
      Happy Reading 📚
    `;
  }

  if (type === "before") {
    message = `
      Hi ${name},<br><br>
      Reminder: Your book <b>${bookName}</b> is due tomorrow.<br>
      Due Date: <b>${dueDate}</b><br><br>
      Please return on time.
    `;
  }

  if (type === "due") {
    message = `
      Hi ${name},<br><br>
      Today is the last day to return <b>${bookName}</b>.<br>
      Due Date: <b>${dueDate}</b>
    `;
  }

  await transporter.sendMail({
    from: '"My Digital Library" <m.v.sivamanoj2007@gmail.com>',
    to: to,
    subject: "Library Notification",
    html: message
  });

  console.log("Mail Sent Successfully");
}

// ✅ Export properly
module.exports = sendMail;