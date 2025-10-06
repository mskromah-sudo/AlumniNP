const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['reunion', 'webinar', 'workshop', 'networking', 'meetup'],
        required: true
    },
    mode: {
        type: String,
        enum: ['online', 'offline', 'hybrid'],
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    venue: {
        address: String,
        city: String,
        virtualLink: String
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    targetAudience: {
        type: String,
        enum: ['all', 'alumni', 'students', 'specific-batch', 'specific-department'],
        default: 'all'
    },
    specificBatches: [Number],
    specificDepartments: [String],
    maxAttendees: {
        type: Number
    },
    registrationDeadline: {
        type: Date
    },
    attendees: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['going', 'maybe', 'not-going'],
            default: 'going'
        },
        registeredAt: {
            type: Date,
            default: Date.now
        }
    }],
    eventImages: [String],
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    gallery: [{
        imageUrl: String,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Event', eventSchema);