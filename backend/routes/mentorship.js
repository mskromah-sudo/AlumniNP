const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Mentorship = require('../models/Mentorship');
const { authMiddleware } = require('../middleware/auth');

// Get all mentors
router.get('/mentors', authMiddleware, async (req, res) => {
    try {
        const { expertise, page = 1, limit = 10 } = req.query;
        
        let query = { isMentor: true, isVerified: true };
        
        if (expertise) {
            query['mentorDetails.expertise'] = expertise;
        }

        const mentors = await User.find(query)
            .select('-password')
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await User.countDocuments(query);

        res.json({
            mentors,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Register as mentor
router.post('/register', authMiddleware, async (req, res) => {
    try {
        if (req.user.role === 'student') {
            return res.status(403).json({ message: 'Students cannot register as mentors' });
        }

        const { expertise, experience, availability, maxMentees } = req.body;

        await User.findByIdAndUpdate(req.user._id, {
            isMentor: true,
            mentorDetails: {
                expertise,
                experience,
                availability,
                maxMentees
            }
        });

        res.json({ message: 'Successfully registered as mentor' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Request mentorship
router.post('/request', authMiddleware, async (req, res) => {
    try {
        const { mentorId, domain, goals, preferredMode, requestMessage } = req.body;

        // Check if mentor exists and is available
        const mentor = await User.findById(mentorId);
        if (!mentor || !mentor.isMentor) {
            return res.status(404).json({ message: 'Mentor not found or not available' });
        }

        // Check existing mentorship requests
        const existingRequest = await Mentorship.findOne({
            mentor: mentorId,
            mentee: req.user._id,
            status: { $in: ['pending', 'accepted'] }
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'You already have an active request with this mentor' });
        }

        // Check mentor's capacity
        const activeMentorships = await Mentorship.countDocuments({
            mentor: mentorId,
            status: 'accepted'
        });

        if (mentor.mentorDetails.maxMentees && activeMentorships >= mentor.mentorDetails.maxMentees) {
            return res.status(400).json({ message: 'Mentor has reached maximum capacity' });
        }

        const mentorship = new Mentorship({
            mentor: mentorId,
            mentee: req.user._id,
            domain,
            goals,
            preferredMode,
            requestMessage
        });

        await mentorship.save();
        res.status(201).json({ message: 'Mentorship request sent successfully', mentorship });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get my mentorship requests (as mentor)
router.get('/requests', authMiddleware, async (req, res) => {
    try {
        const requests = await Mentorship.find({ 
            mentor: req.user._id,
            status: 'pending'
        }).populate('mentee', 'firstName lastName email profilePicture department');

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get my mentorships (as mentee or mentor)
router.get('/my-mentorships', authMiddleware, async (req, res) => {
    try {
        const mentorships = await Mentorship.find({
            $or: [
                { mentor: req.user._id },
                { mentee: req.user._id }
            ],
            status: { $in: ['accepted', 'ongoing'] }
        })
        .populate('mentor', 'firstName lastName email profilePicture')
        .populate('mentee', 'firstName lastName email profilePicture');

        res.json(mentorships);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Accept/Reject mentorship request
router.put('/request/:id', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body; // 'accepted' or 'rejected'
        
        const mentorship = await Mentorship.findById(req.params.id);
        
        if (!mentorship) {
            return res.status(404).json({ message: 'Mentorship request not found' });
        }

        // Check if user is the mentor
        if (mentorship.mentor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this request' });
        }

        mentorship.status = status;
        if (status === 'accepted') {
            mentorship.startDate = new Date();
        }

        await mentorship.save();
        res.json({ message: `Mentorship request ${status}`, mentorship });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Schedule mentorship session
router.post('/session/:mentorshipId', authMiddleware, async (req, res) => {
    try {
        const { date, duration, mode, notes } = req.body;
        
        const mentorship = await Mentorship.findById(req.params.mentorshipId);
        
        if (!mentorship) {
            return res.status(404).json({ message: 'Mentorship not found' });
        }

        // Check if user is part of this mentorship
        if (mentorship.mentor.toString() !== req.user._id.toString() && 
            mentorship.mentee.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        mentorship.sessions.push({
            date,
            duration,
            mode,
            notes
        });

        await mentorship.save();
        res.json({ message: 'Session scheduled successfully', mentorship });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add feedback for session
router.post('/session/:mentorshipId/feedback', authMiddleware, async (req, res) => {
    try {
        const { sessionId, rating, comment } = req.body;
        
        const mentorship = await Mentorship.findById(req.params.mentorshipId);
        
        if (!mentorship) {
            return res.status(404).json({ message: 'Mentorship not found' });
        }

        // Check if user is the mentee
        if (mentorship.mentee.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only mentees can provide feedback' });
        }

        const session = mentorship.sessions.id(sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        session.feedback = { rating, comment };
        await mentorship.save();

        res.json({ message: 'Feedback added successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;