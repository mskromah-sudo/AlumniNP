const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('connections', 'firstName lastName profilePicture');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const updates = req.body;
        delete updates.password; // Don't allow password update through this route
        delete updates.role; // Don't allow role change

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get alumni directory
router.get('/alumni', authMiddleware, async (req, res) => {
    try {
        const { department, batch, location, company, page = 1, limit = 20 } = req.query;
        
        let query = { role: 'alumni', isVerified: true };
        
        if (department) query.department = department;
        if (batch) query.graduationYear = batch;
        if (location) query['location.city'] = new RegExp(location, 'i');
        if (company) query.currentCompany = new RegExp(company, 'i');

        const alumni = await User.find(query)
            .select('-password')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ graduationYear: -1 });

        const count = await User.countDocuments(query);

        res.json({
            alumni,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Send connection request
router.post('/connect/:userId', authMiddleware, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        
        if (targetUserId === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot connect with yourself' });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Add connection (simplified - in production, you'd want a connection request system)
        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { connections: targetUserId }
        });

        await User.findByIdAndUpdate(targetUserId, {
            $addToSet: { connections: req.user._id }
        });

        res.json({ message: 'Connection added successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Search alumni
router.get('/search', authMiddleware, async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({ message: 'Search query required' });
        }

        const users = await User.find({
            $or: [
                { firstName: new RegExp(q, 'i') },
                { lastName: new RegExp(q, 'i') },
                { currentCompany: new RegExp(q, 'i') },
                { designation: new RegExp(q, 'i') }
            ],
            isVerified: true
        }).select('-password').limit(20);

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;