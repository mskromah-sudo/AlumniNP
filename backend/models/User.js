const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['alumni', 'student', 'admin'],
        default: 'alumni'
    },
    graduationYear: {
        type: Number,
        required: function() { return this.role === 'alumni'; }
    },
    department: {
        type: String,
        required: true
    },
    course: {
        type: String,
        required: true
    },
    currentCompany: {
        type: String
    },
    designation: {
        type: String
    },
    location: {
        city: String,
        country: String
    },
    linkedinProfile: {
        type: String
    },
    bio: {
        type: String,
        maxlength: 500
    },
    skills: [{
        type: String
    }],
    profilePicture: {
        type: String
    },
    isMentor: {
        type: Boolean,
        default: false
    },
    mentorDetails: {
        expertise: [String],
        experience: Number,
        availability: String,
        maxMentees: Number
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    connections: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);