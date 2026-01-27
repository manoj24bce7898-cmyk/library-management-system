const mongoose = require("mongoose");

const studentProfileSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },

    lastName: {
        type: String,
        required: true,
        trim: true
    },

    regNumber: {
        type: String,
        required: true,
        unique: true
    },

    course: {
        type: String,
        required: true
    },

    semester: {
        type: Number,
        required: true
    },

    year: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model("StudentProfile", studentProfileSchema);
