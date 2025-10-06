const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Job = require('../models/Job');
const Event = require('../models/Event');
const Mentorship = require('../models/Mentorship');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Admin dashboard stats
router.get('/stats', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.countDocuments(),
            totalAlumni: await User.countDocuments({ role: 'alumni' }),
            totalStudents: await User.countDocuments({ role: 'student' }),
            verifiedAlumni: await User.countDocuments({ role: 'alumni', isVerified: true }),
            totalJobs: await Job.countDocuments(),
            activeJobs: await Job.countDocuments({ status: 'active' }),
            totalEvents: await Event.countDocuments(),
            upcomingEvents: await Event.countDocuments({ status: 'upcoming' }),
            totalMentors: await User.countDocuments({ isMentor: true }),
            activeMentorships: await Mentorship.countDocuments({ status: 'accepted' })
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all users (with pagination)
router.get('/users', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const { role, isVerified, page = 1, limit = 20 } = req.query;
        
        let query = {};
        if (role) query.role = role;
        if (isVerified !== undefined) query.isVerified = isVerified === 'true';

        const users = await User.find(query)
            .select('-password')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const count = await User.countDocuments(query);

        res.json({
            users,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Verify user
router.put('/users/:id/verify', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isVerified: true },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User verified successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Suspend/Unsuspend user
router.put('/users/:id/suspend', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const { suspend } = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isSuspended: suspend },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ 
            message: suspend ? 'User suspended successfully' : 'User unsuspended successfully',
            user 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get pending job approvals
router.get('/jobs/pending', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const jobs = await Job.find({ status: 'pending' })
            .populate('postedBy', 'firstName lastName email')
            .sort({ createdAt: -1 });

        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Approve/Reject job
router.put('/jobs/:id/approve', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const { approve } = req.body;
        
        const job = await Job.findByIdAndUpdate(
            req.params.id,
            { status: approve ? 'active' : 'rejected' },
            { new: true }
        );

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        res.json({ 
            message: approve ? 'Job approved successfully' : 'Job rejected',
            job 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get pending event approvals
router.get('/events/pending', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const events = await Event.find({ isApproved: false })
            .populate('organizer', 'firstName lastName email')
            .sort({ createdAt: -1 });

        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Approve/Reject event
router.put('/events/:id/approve', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const { approve } = req.body;
        
        const event = await Event.findByIdAndUpdate(
            req.params.id,
            { isApproved: approve },
            { new: true }
        );

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.json({ 
            message: approve ? 'Event approved successfully' : 'Event rejected',
            event 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Generate reports
router.get('/reports/:type', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const { type } = req.params;
        const { startDate, endDate } = req.query;

        let report = {};

        switch(type) {
            case 'user-growth':
                // User growth over time
                report = await User.aggregate([
                    {
                        $match: {
                            createdAt: {
                                $gte: new Date(startDate),
                                $lte: new Date(endDate)
                            }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1 } }
                ]);
                break;

            case 'alumni-distribution':
                // Alumni distribution by various factors
                report = {
                    byBatch: await User.aggregate([
                        { $match: { role: 'alumni' } },
                        { $group: { _id: '$graduationYear', count: { $sum: 1 } } },
                        { $sort: { _id: -1 } }
                    ]),
                    byDepartment: await User.aggregate([
                        { $match: { role: 'alumni' } },
                        { $group: { _id: '$department', count: { $sum: 1 } } }
                    ]),
                    byCompany: await User.aggregate([
                        { $match: { role: 'alumni', currentCompany: { $ne: null } } },
                        { $group: { _id: '$currentCompany', count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 20 }
                    ])
                };
                break;

            case 'job-analytics':
                // Job posting analytics
                report = {
                    totalJobs: await Job.countDocuments(),
                    jobsByType: await Job.aggregate([
                        { $group: { _id: '$type', count: { $sum: 1 } } }
                    ]),
                    averageApplications: await Job.aggregate([
                        { $project: { applicationCount: { $size: '$applications' } } },
                        { $group: { _id: null, avg: { $avg: '$applicationCount' } } }
                    ])
                };
                break;

            case 'event-participation':
                // Event participation analytics
                report = {
                    totalEvents: await Event.countDocuments(),
                    eventsByType: await Event.aggregate([
                        { $group: { _id: '$type', count: { $sum: 1 } } }
                    ]),
                    averageAttendance: await Event.aggregate([
                        { $project: { attendeeCount: { $size: '$attendees' } } },
                        { $group: { _id: null, avg: { $avg: '$attendeeCount' } } }
                    ])
                };
                break;

            default:
                return res.status(400).json({ message: 'Invalid report type' });
        }

        res.json(report);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;