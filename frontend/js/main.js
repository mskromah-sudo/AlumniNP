// Main JavaScript file for Alumni Portal

// API Base URL
const API_URL = 'http://localhost:5000/api';

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initializeEventListeners();
    loadDashboardData();
});

// Authentication Check
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
        return;
    }
    
    if (token) {
        updateNavbar(user);
    }
}

// Update Navbar based on login status
function updateNavbar(user) {
    const navbarRight = document.querySelector('.navbar-right');
    if (navbarRight && user.name) {
        navbarRight.innerHTML = `
            <div class="user-menu">
                <img src="${user.profilePic || 'assets/default-avatar.png'}" alt="Profile" class="profile-pic-small">
                <span>Welcome, ${user.name}</span>
                <div class="dropdown-menu">
                    <a href="profile.html">My Profile</a>
                    <a href="settings.html">Settings</a>
                    <a href="#" onclick="logout()">Logout</a>
                </div>
            </div>
        `;
    }
}

// Logout Function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Initialize Event Listeners
function initializeEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // Form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
    
    // Tab switching
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', handleTabSwitch);
    });
}

// Load Dashboard Data
async function loadDashboardData() {
    if (!window.location.pathname.includes('dashboard.html')) return;
    
    try {
        const token = localStorage.getItem('token');
        
        // Load statistics
        const statsResponse = await fetch(`${API_URL}/users/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const stats = await statsResponse.json();
        updateDashboardStats(stats);
        
        // Load recent activities
        const activitiesResponse = await fetch(`${API_URL}/users/activities`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const activities = await activitiesResponse.json();
        updateRecentActivities(activities);
        
        // Load upcoming events
        const eventsResponse = await fetch(`${API_URL}/events/upcoming`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const events = await eventsResponse.json();
        updateUpcomingEvents(events);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Update Dashboard Statistics
function updateDashboardStats(stats) {
    document.getElementById('totalAlumni').textContent = stats.totalAlumni || 0;
    document.getElementById('totalJobs').textContent = stats.totalJobs || 0;
    document.getElementById('totalEvents').textContent = stats.totalEvents || 0;
    document.getElementById('totalMentors').textContent = stats.totalMentors || 0;
}

// Update Recent Activities
function updateRecentActivities(activities) {
    const container = document.getElementById('recentActivities');
    if (!container) return;
    
    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas ${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <p>${activity.description}</p>
                <span class="activity-time">${formatTimeAgo(activity.createdAt)}</span>
            </div>
        </div>
    `).join('');
}

// Update Upcoming Events
function updateUpcomingEvents(events) {
    const container = document.getElementById('upcomingEvents');
    if (!container) return;
    
    container.innerHTML = events.map(event => `
        <div class="event-card">
            <div class="event-date">
                <span class="day">${new Date(event.date).getDate()}</span>
                <span class="month">${new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
            </div>
            <div class="event-details">
                <h4>${event.title}</h4>
                <p><i class="fas fa-map-marker-alt"></i> ${event.location}</p>
                <button class="btn btn-sm btn-primary" onclick="viewEvent('${event._id}')">View Details</button>
            </div>
        </div>
    `).join('');
}

// Handle Form Submissions
async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    try {
        const endpoint = form.getAttribute('data-endpoint');
        const method = form.getAttribute('data-method') || 'POST';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Success', result.message || 'Operation completed successfully', 'success');
            if (form.getAttribute('data-redirect')) {
                setTimeout(() => {
                    window.location.href = form.getAttribute('data-redirect');
                }, 1500);
            }
        } else {
            showNotification('Error', result.message || 'Something went wrong', 'error');
        }
    } catch (error) {
        console.error('Form submission error:', error);
        showNotification('Error', 'Network error. Please try again.', 'error');
    }
}

// Handle Search
async function handleSearch(e) {
    const query = e.target.value;
    const searchType = document.getElementById('searchType')?.value || 'all';
    
    if (query.length < 3) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/search?q=${query}&type=${searchType}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const results = await response.json();
        displaySearchResults(results);
    } catch (error) {
        console.error('Search error:', error);
    }
}

// Display Search Results
function displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    if (!container) return;
    
    container.innerHTML = results.map(result => `
        <div class="search-result-item">
            <img src="${result.image || 'assets/default-avatar.png'}" alt="${result.name}">
            <div class="result-info">
                <h4>${result.name || result.title}</h4>
                <p>${result.description || result.company || ''}</p>
            </div>
            <button class="btn btn-sm btn-outline" onclick="viewDetails('${result._id}', '${result.type}')">
                View
            </button>
        </div>
    `).join('');
}

// Handle Tab Switching
function handleTabSwitch(e) {
    const tab = e.target;
    const targetId = tab.getAttribute('data-target');
    
    // Remove active class from all tabs and contents
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding content
    tab.classList.add('active');
    document.getElementById(targetId)?.classList.add('active');
}

// Show Notification
function showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }
    return 'Just now';
}

function getActivityIcon(type) {
    const icons = {
        'job_posted': 'fa-briefcase',
        'event_created': 'fa-calendar',
        'mentor_joined': 'fa-user-graduate',
        'story_shared': 'fa-book',
        'forum_post': 'fa-comments',
        'donation_made': 'fa-donate'
    };
    return icons[type] || 'fa-bell';
}

// View Details Functions
function viewEvent(eventId) {
    window.location.href = `events.html?id=${eventId}`;
}

function viewDetails(id, type) {
    const pages = {
        'alumni': 'alumni-directory.html',
        'job': 'job-board.html',
        'event': 'events.html',
        'mentor': 'mentorship.html'
    };
    window.location.href = `${pages[type]}?id=${id}`;
}

// Export functions for use in other scripts
window.alumniPortal = {
    API_URL,
    logout,
    showNotification,
    formatTimeAgo,
    handleFormSubmit
};