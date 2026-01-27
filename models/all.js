const mongoose = require("mongoose");

const all = new mongoose.Schema({
    bookImage: {
        type: String,
        default: "https://www.shutterstock.com/image-vector/default-ui-image-placeholder-wireframes-600nw-1037719192.jpg",
        set: v => v === "" || v == null ? "https://www.shutterstock.com/image-vector/default-ui-image-placeholder-wireframes-600nw-1037719192.jpg" : v
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

    description: {
        type: String,
        
        trim: true
    },


    availableCopies: {
        type: Number,
        min: 0
    },
    bookBeforeCover: {
        type: [String],   // image URL or path

    },

    bookAfterCover: {
        type: [String],   // image URL or path
    }
});

module.exports = mongoose.model("all", all);
