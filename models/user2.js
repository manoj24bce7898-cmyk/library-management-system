const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
    bookImage: {
        type: String,
        default: "https://www.shutterstock.com/image-vector/default-ui-image-placeholder-wireframes-600nw-1037719192.jpg",
        set: v => v === "" || v == null ? "https://www.shutterstock.com/image-vector/default-ui-image-placeholder-wireframes-600nw-1037719192.jpg" : v
    },
    title: {
        type: String,
        required: true,
        trim: true
    },

    author: {
        type: String,
        required: true,
        trim: true
    },

    year: {
        type: Number,
        required: true
    },

    semester: {
        type: Number,
        required: true
    },

    bookBeforeCover: {
        type: String,   // image URL or path
        required: true
    },

    bookAfterCover: {
        type: String,   // image URL or path
        required: true
    },

    description: {
        type: String,
        required: true,
        trim: true
    },

    subject: {
        type: String,
        required: true,
        trim: true
    },

    availableCopies: {
        type: Number,
        required: true,
        min: 0
    }
});

module.exports = mongoose.model("Book", bookSchema);
