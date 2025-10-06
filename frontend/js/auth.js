// Authentication JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Login Form Handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Registration Form Handler
    const registrationForm = document.getElementById('registrationForm');
    if (registrationForm) {
        initializeRegistration();
    }
});

// Login Handler
async function handleLogin(e) {
    e.preventDefault();
    
    const userType = document.getElementById('userType').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
    
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock authentication
        const mockUsers = {
            'admin@university.edu': { password: 'admin123', type: 'admin' },
            'alumni@university.edu': { password: 'alumni123', type: 'alumni' },
            'student@university.edu': { password: 'student123', type: 'student' }
        };
        
        if (mockUsers[email] && mockUsers[email].password === password) {
            // Store user session
            const userData = {
                email: email,
                type: userType,
                name: 'John Doe',
                loggedIn: true
            };
            
            if (remember) {
                localStorage.setItem('userData', JSON.stringify(userData));
            } else {
                sessionStorage.setItem('userData', JSON.stringify(userData));
            }
            
            showAlert('Login successful! Redirecting...', 'success');
            
            // Redirect based on user type
            setTimeout(() => {
                if (userType === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 1500);
        } else {
            throw new Error('Invalid email or password');
        }
    } catch (error) {
        showAlert(error.message, 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Registration Multi-Step Form
function initializeRegistration() {
    let currentStep = 1;
    const totalSteps = 4;
    
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    // Generate graduation years
    const graduationYearSelect = document.getElementById('graduationYear');
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 50; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        graduationYearSelect.appendChild(option);
    }
    
    // Navigation handlers
    nextBtn.addEventListener('click', () => {
        if (validateStep(currentStep)) {
            if (currentStep < totalSteps) {
                currentStep++;
                showStep(currentStep);
            }
        }
    });
    
    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
        }
    });
    
    // Form submission
    document.getElementById('registrationForm').addEventListener('submit', handleRegistration);
    
    // OTP input handling
    const otpInputs = document.querySelectorAll('.otp-digit');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });
    
    // Handle user type change
    document.querySelectorAll('input[name="userType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const alumniFields = document.querySelectorAll('.alumni-only');
            if (e.target.value === 'student') {
                alumniFields.forEach(field => field.style.display = 'none');
            } else {
                alumniFields.forEach(field => field.style.display = 'block');
            }
        });
    });
}

function showStep(step) {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(s => {
        s.classList.remove('active');
    });
    
    // Show current step
    document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');
    
    // Update step indicators
    document.querySelectorAll('.step').forEach(s => {
        const stepNum = parseInt(s.getAttribute('data-step'));
        s.classList.remove('active', 'completed');
        
        if (stepNum === step) {
            s.classList.add('active');
        } else if (stepNum < step) {
            s.classList.add('completed');
        }
    });
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    prevBtn.style.display = step === 1 ? 'none' : 'block';
    
    if (step === 4) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'block';
        
        // Show OTP section
        document.querySelector('.otp-section').style.display = 'block';
        simulateSendOTP();
    } else {
        nextBtn.style.display = 'block';
        submitBtn.style.display = 'none';
    }
}

function validateStep(step) {
    const currentStepElement = document.querySelector(`.form-step[data-step="${step}"]`);
    const inputs = currentStepElement.querySelectorAll('input[required], select[required]');
    
    for (let input of inputs) {
        if (!input.value) {
            input.focus();
            showAlert('Please fill in all required fields', 'error');
            return false;
        }
    }
    
    // Step-specific validation
    if (step === 1) {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            showAlert('Passwords do not match', 'error');
            return false;
        }
        
        if (password.length < 8) {
            showAlert('Password must be at least 8 characters long', 'error');
            return false;
        }
    }
    
    return true;
}

async function handleRegistration(e) {
    e.preventDefault();
    
    // Collect all form data
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Get OTP value
    const otpInputs = document.querySelectorAll('.otp-digit');
    const otp = Array.from(otpInputs).map(input => input.value).join('');
    
    if (otp.length !== 6) {
        showAlert('Please enter the complete verification code', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.disabled = true;
    
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mock successful registration
        showAlert('Registration successful! Redirecting to login...', 'success');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    } catch (error) {
        showAlert('Registration failed. Please try again.', 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function simulateSendOTP() {
    // Simulate sending OTP
    setTimeout(() => {
        console.log('OTP sent: 123456');
    }, 1000);
}

// Alert Helper
function showAlert(message, type) {
    const alertBox = document.getElementById('alertBox') || createAlertBox();
    
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.style.display = 'block';
    
    setTimeout(() => {
        alertBox.style.display = 'none';
    }, 5000);
}

function createAlertBox() {
    const alertBox = document.createElement('div');
    alertBox.id = 'alertBox';
    alertBox.className = 'alert';
    document.querySelector('.auth-card').insertBefore(alertBox, document.querySelector('form'));
    return alertBox;
}

// Check if user is already logged in
function checkAuth() {
    const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    
    if (userData) {
        const user = JSON.parse(userData);
        if (user.loggedIn) {
            // Redirect to dashboard if on login/register page
            if (window.location.pathname.includes('login.html') || 
                window.location.pathname.includes('register.html')) {
                window.location.href = 'dashboard.html';
            }
        }
    }
}

// Run auth check on page load
checkAuth();