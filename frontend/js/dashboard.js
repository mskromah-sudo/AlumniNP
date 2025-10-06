// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkUserAuth();
    
    // Initialize dashboard components
    initializeSidebar();
    initializeNotifications();
    initializeSearch();
    initializeUserMenu();
    loadDashboardData();
});

// Check if user is authenticated
function checkUserAuth() {
    const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }
    
    const user = JSON.parse(userData);

}