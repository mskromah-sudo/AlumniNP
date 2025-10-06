const mongoose = require('mongoose');

const mentorshipSchema = new mongoose.Schema({
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    mentee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },
    domain: {
        type: String,
        required: true
    },
    goals: {
        type: String,
        required: true
    },
    preferredMode: {
        type: String,
        enum: ['online', 'in-person', 'both'],
        default: 'online'
    },
    sessions: [{
        date: Date,
        duration: Number, // in minutes
        mode: String,
        notes: String,
        feedback: {
            rating: Number,
            comment: String
        }
    }],
    requestMessage: {
        type: String
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Mentorship', mentorshipSchema);