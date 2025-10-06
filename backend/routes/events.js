const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { authMiddleware } = require('../middleware/auth');

// Get all events
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { type, mode, status = 'upcoming', page = 1, limit = 10 } = req.query;
        
        let query = { isApproved: true };
        
        if (type) query.type = type;
        if (mode) query.mode = mode;
        if (status) query.status = status;

        const events = await Event.find(query)
            .populate('organizer', 'firstName lastName profilePicture')
            .populate('attendees.user', 'firstName lastName')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ startDate: 1 });

        const count = await Event.countDocuments(query);

        res.json({
            events,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get single event
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizer', 'firstName lastName email profilePicture')
            .populate('attendees.user', 'firstName lastName profilePicture');
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.json(event);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create event
router.post('/', authMiddleware, async (req, res) => {
    try {
        const eventData = {
            ...req.body,
            organizer: req.user._id,
            isApproved: req.user.role === 'admin' ? true : false
        };

        const event = new Event(eventData);
        await event.save();

        res.status(201).json({ 
            message: req.user.role === 'admin' 
                ? 'Event created successfully' 
                : 'Event created and pending approval',
            event 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// RSVP to event
router.post('/:id/rsvp', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body; // 'going', 'maybe', 'not-going'
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if already registered
        const existingRSVP = event.attendees.findIndex(
            att => att.user.toString() === req.user._id.toString()
        );

        if (existingRSVP > -1) {
            // Update existing RSVP
            event.attendees[existingRSVP].status = status;
        } else {
            // Check capacity
            if (event.maxAttendees && event.attendees.filter(a => a.status === 'going').length >= event.maxAttendees) {
                return res.status(400).json({ message: 'Event is full' });
            }

            // Add new RSVP
            event.attendees.push({
                user: req.user._id,
                status: status
            });
        }

        await event.save();
        res.json({ message: 'RSVP recorded successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Cancel RSVP
router.delete('/:id/rsvp', authMiddleware, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        event.attendees = event.attendees.filter(
            att => att.user.toString() !== req.user._id.toString()
        );

        await event.save();
        res.json({ message: 'RSVP cancelled successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update event
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if user is the organizer or admin
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this event' });
        }

        const updates = req.body;
        delete updates.organizer; // Don't allow changing the organizer

        Object.keys(updates).forEach(key => {
            event[key] = updates[key];
        });

        await event.save();
        res.json({ message: 'Event updated successfully', event });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete event
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if user is the organizer or admin
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this event' });
        }

        await event.deleteOne();
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;