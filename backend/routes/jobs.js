const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const { authMiddleware } = require('../middleware/auth');

// Get all jobs
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { type, location, company, page = 1, limit = 10 } = req.query;
        
        let query = { status: 'active' };
        
        if (type) query.type = type;
        if (location) query.location = new RegExp(location, 'i');
        if (company) query.company = new RegExp(company, 'i');

        const jobs = await Job.find(query)
            .populate('postedBy', 'firstName lastName profilePicture')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const count = await Job.countDocuments(query);

        res.json({
            jobs,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get single job
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id)
            .populate('postedBy', 'firstName lastName email profilePicture designation currentCompany');
        
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Increment views
        job.views += 1;
        await job.save();

        res.json(job);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Post a job (Alumni only)
router.post('/', authMiddleware, async (req, res) => {
    try {
        if (req.user.role === 'student') {
            return res.status(403).json({ message: 'Students cannot post jobs' });
        }

        const jobData = {
            ...req.body,
            postedBy: req.user._id,
            status: req.user.role === 'admin' ? 'active' : 'pending'
        };

        const job = new Job(jobData);
        await job.save();

        res.status(201).json({ message: 'Job posted successfully', job });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update job
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check if user is the owner or admin
        if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this job' });
        }

        const updates = req.body;
        delete updates.postedBy; // Don't allow changing the owner

        Object.keys(updates).forEach(key => {
            job[key] = updates[key];
        });

        job.updatedAt = new Date();
        await job.save();

        res.json({ message: 'Job updated successfully', job });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete job
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check if user is the owner or admin
        if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this job' });
        }

        await job.deleteOne();
        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Apply for job
router.post('/:id/apply', authMiddleware, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check if already applied
        const alreadyApplied = job.applications.some(
            app => app.applicant.toString() === req.user._id.toString()
        );

        if (alreadyApplied) {
            return res.status(400).json({ message: 'Already applied to this job' });
        }

        job.applications.push({
            applicant: req.user._id,
            appliedAt: new Date()
        });

        await job.save();
        res.json({ message: 'Application submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;