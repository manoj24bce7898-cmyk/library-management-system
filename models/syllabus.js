const mongoose = require("mongoose");

const adminPdfSchema = new mongoose.Schema({
  title: String,
  pdf: String
});

module.exports = mongoose.model("AdminPdf", adminPdfSchema);
