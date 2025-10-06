const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    company: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['full-time', 'part-time', 'internship', 'remote', 'contract'],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    requirements: [{
        type: String
    }],
    salary: {
        min: Number,
        max: Number,
        currency: {
            type: String,
            default: 'USD'
        }
    },
    experience: {
        type: String,
        enum: ['fresher', '0-2 years', '2-5 years', '5-10 years', '10+ years']
    },
    applicationDeadline: {
        type: Date
    },
    applicationLink: {
        type: String
    },
    contactEmail: {
        type: String
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'closed', 'pending'],
        default: 'pending'
    },
    views: {
        type: Number,
        default: 0
    },
    applications: [{
        applicant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        appliedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['applied', 'shortlisted', 'rejected', 'hired'],
            default: 'applied'
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Job', jobSchema);