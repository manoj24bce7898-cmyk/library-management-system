const mongoose = require("mongoose");
const remainders = new mongoose.Schema({
    email:{
        type: String,

        trim: true
    },
    title: {
        type: String,

        trim: true
    },
    author: {
        type: String,
    
        trim: true
    },
    year: {
        type: Number,
    },

    semester: {
        type: Number,

    },
    subject: {
        type: String,

        trim: true
    },
    regNumber: {
        type: String,

        trim: true
    },
    bookeddate: {
        type: Date,
    },
    duedate: {
        type: Date,
    }
});

module.exports = mongoose.model("remainders", remainders);
