// Data Structure
let trackerData = {
    requiredHours: 0,
    usualHoursPerDay: 0,
    dateStarted: '',
    dailyEntries: [] // { date: 'YYYY-MM-DD', timeIn: 'HH:MM', timeOut: 'HH:MM', hoursWorked: number }
};

let currentUser = null; // Track current logged-in user

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();



    // Check if user is already logged in
    currentUser = localStorage.getItem('ojt_currentUser');
    
    if (currentUser) {
        // User is logged in, load their data
        loadUserData();
        if (trackerData.requiredHours > 0) {
            showTrackerSection();
        } else {
            showSetupSection();
        }
    } else {
        // Show login page
        showAuthSection();
    }
});

// Setup event listeners
function setupEventListeners() {
    // Setup form submission
    document.getElementById('setupForm').addEventListener('submit', function(e) {
        e.preventDefault();
        setupTracker();
    });

    // Time in/out change listeners
    document.getElementById('timeIn').addEventListener('change', calculateHoursWorkedToday);
    document.getElementById('timeOut').addEventListener('change', calculateHoursWorkedToday);
    
    // Date picker listener
    document.getElementById('logDate').addEventListener('change', function() {
        loadEntryForDate(this.value);
        updateDateDisplay();
    });
    // ✅ NEW (auto-save)
    document.getElementById('timeIn').addEventListener('change', autoSaveDraft);
    document.getElementById('timeOut').addEventListener('change', autoSaveDraft);
    document.getElementById('logDate').addEventListener('change', autoSaveDraft);
}

function autoSaveDraft() {
    if (!currentUser) return;

    const draft = {
        date: document.getElementById('logDate').value,
        timeIn: document.getElementById('timeIn').value,
        timeOut: document.getElementById('timeOut').value
    };

    localStorage.setItem(`ojt_draft_${currentUser}`, JSON.stringify(draft));
}

function loadDraft() {
    if (!currentUser) return;

    const draft = localStorage.getItem(`ojt_draft_${currentUser}`);
    if (!draft) return;

    const data = JSON.parse(draft);

    document.getElementById('logDate').value = data.date || '';
    document.getElementById('timeIn').value = data.timeIn || '';
    document.getElementById('timeOut').value = data.timeOut || '';

    calculateHoursWorkedToday();
}

// ==================== AUTHENTICATION SECTION ====================
function toggleAuthForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    loginForm.classList.toggle('active');
    registerForm.classList.toggle('active');
}

function getAllUsers() {
    const usersData = localStorage.getItem('ojt_users');
    return usersData ? JSON.parse(usersData) : [];
}

function saveUsers(users) {
    localStorage.setItem('ojt_users', JSON.stringify(users));
}

function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    
    if (!username) {
        alert('Username is required');
        return;
    }
    
    if (username.length < 3) {
        alert('Username must be at least 3 characters long');
        return;
    }
    
    // Check if username already exists
    const users = getAllUsers();
    if (users.some(u => u.username === username)) {
        alert('Username already exists. Please choose another.');
        return;
    }
    
    // Create new user
    const newUser = {
        username: username,
        email: email,
        createdDate: new Date().toISOString()
    };
    
    users.push(newUser);
    saveUsers(users);
    
    // Auto-login after registration
    currentUser = username;
    localStorage.setItem('ojt_currentUser', username);
    
    // Initialize empty tracker data for new user
    trackerData = {
        requiredHours: 0,
        usualHoursPerDay: 0,
        dateStarted: '',
        dailyEntries: []
    };
    saveUserData();
    
    // Clear form
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerEmail').value = '';
    
    // Show setup section
    showSetupSection();
}

function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    
    if (!username) {
        alert('Please enter your username');
        return;
    }
    
    // Check if user exists
    const users = getAllUsers();
    const userExists = users.some(u => u.username === username);
    
    if (!userExists) {
        alert('Username not found. Please create an account first.');
        return;
    }
    
    // Login user
    currentUser = username;
    localStorage.setItem('ojt_currentUser', username);
    
    // Load user data
    loadUserData();
    
    // Clear form
    document.getElementById('loginUsername').value = '';
    
    // Show appropriate section
    if (trackerData.requiredHours > 0) {
        showTrackerSection();
    } else {
        showSetupSection();
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        localStorage.removeItem('ojt_currentUser');
        trackerData = {
            requiredHours: 0,
            usualHoursPerDay: 0,
            dateStarted: '',
            dailyEntries: []
        };
        showAuthSection();
    }
}

// ==================== SETUP SECTION ====================
function setupTracker() {
    const requiredHours = parseFloat(document.getElementById('requiredHours').value);
    const usualHoursPerDay = parseFloat(document.getElementById('usualHoursPerDay').value);
    const dateStarted = document.getElementById('dateStarted').value;

    if (!requiredHours || !usualHoursPerDay || !dateStarted) {
        alert('Please fill in all fields');
        return;
    }

    trackerData.requiredHours = requiredHours;
    trackerData.usualHoursPerDay = usualHoursPerDay;
    trackerData.dateStarted = dateStarted;
    trackerData.dailyEntries = [];

    saveUserData();
    displayTrackerData();
    showTrackerSection();
}

// ==================== TRACKER SECTION ====================

function updateTimeDate() {
    const now = new Date();

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const day = days[now.getDay()];

    const date = now.toLocaleDateString(); // e.g., 3/24/2026

    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // Convert to 12-hour format

    const time = `${hours}:${minutes}:${seconds} ${ampm}`;

    document.getElementById("timeDateDisplay").innerText = `${day}, ${date} | ${time}`;
}

// Update every second
setInterval(updateTimeDate, 1000);
updateTimeDate(); // Initial call

function displayTrackerData() {
    // Display header information
    document.getElementById('displayDateStarted').textContent = formatDate(trackerData.dateStarted);
    document.getElementById('displayRequiredHours').textContent = trackerData.requiredHours + ' hrs';
    document.getElementById('displayDailyHours').textContent = trackerData.usualHoursPerDay + ' hrs';
    document.getElementById('totalRequired').textContent = trackerData.requiredHours;

    // Initialize date picker to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('logDate').value = today;
    document.getElementById('logDate').max = today; // Prevent selecting future dates
    
    // Load today's entry if it exists
    loadEntryForDate(today);
    updateDateDisplay();

    updateProgress();
    updateDashboard();
    displayDailyLog();
    loadDraft();
}

function updateProgress() {
    const totalHours = calculateTotalHoursWorked();
    const percentage = Math.min((totalHours / trackerData.requiredHours) * 100, 100);

    document.getElementById('progressFill').style.width = percentage + '%';
    document.getElementById('progressPercentage').textContent = Math.round(percentage) + '%';
    document.getElementById('hoursCompleted').textContent = totalHours.toFixed(2);
}

function calculateTotalHoursWorked() {
    return trackerData.dailyEntries.reduce((total, entry) => total + entry.hoursWorked, 0);
}

// ==================== DASHBOARD SECTION ====================
function updateDashboard() {
    const stats = calculateDashboardStats();
    
    document.getElementById('hoursRendered').textContent = stats.hoursRendered.toFixed(2) + ' hrs';
    document.getElementById('daysWorked').textContent = stats.daysWorked;

    document.getElementById('daysAbsent').textContent = stats.daysAbsent;
    document.getElementById('avgHoursPerDay').textContent = stats.avgHoursPerDay.toFixed(2) + ' hrs';
    document.getElementById('hoursRemaining').textContent = stats.hoursRemaining.toFixed(2) + ' hrs';
    document.getElementById('estimatedFinishDate').textContent = stats.estimatedFinishDate;
    document.getElementById('daysRemaining').textContent = stats.daysRemaining > 0 ? stats.daysRemaining + ' days' : '--'
}

function calculateDashboardStats() {
    const hoursRendered = calculateTotalHoursWorked();
    const startDate = new Date(trackerData.dateStarted + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalWorkingDays = getWorkingDaysBetween(startDate, today);
    // Days worked (entries with hours > 0)
    const daysWorked = trackerData.dailyEntries.filter(entry => entry.hoursWorked > 0).length;
    
    // No work days (entries with 0 hours)
    // const noWorkDays = trackerData.dailyEntries.filter(entry => entry.hoursWorked === 0).length;
    
    // Days absent (no entry at all)
    const daysAbsent = totalWorkingDays - trackerData.dailyEntries.length;
    
    // Average hours per day (based on days worked)
    const avgHoursPerDay = daysWorked > 0 ? hoursRendered / daysWorked : 0;
    
    // Hours remaining
    const hoursRemaining = Math.max(trackerData.requiredHours - hoursRendered, 0);
    //==days remaining (based on average hours per day)
    const daysRemaining = avgHoursPerDay > 0 
    ? Math.ceil(hoursRemaining / avgHoursPerDay) 
    : 0;

    // Estimated finish date
    let estimatedFinishDate = '--';
    if (avgHoursPerDay > 0) {
        const daysRemaining = Math.ceil(hoursRemaining / avgHoursPerDay);
        const finishDate = new Date(today);
        finishDate.setDate(finishDate.getDate() + daysRemaining);
        estimatedFinishDate = formatDate(finishDate.toISOString().split('T')[0]);
    }
    
    return {
        hoursRendered,
        daysWorked,
        // noWorkDays,
        daysAbsent,
        avgHoursPerDay,
        hoursRemaining,
        estimatedFinishDate,
        daysRemaining
    };
}

// ==================== DATE MANAGEMENT ====================
function loadEntryForDate(date) {
    const entry = trackerData.dailyEntries.find(e => e.date === date);
    
    if (entry) {
        // Load existing entry
        document.getElementById('timeIn').value = entry.timeIn;
        document.getElementById('timeOut').value = entry.timeOut;
        calculateHoursWorkedToday();
    } else {
        // Clear for new entry
        clearTimeEntry();
    }
}

function updateDateDisplay() {
    const selectedDate = document.getElementById('logDate').value;
    const today = new Date().toISOString().split('T')[0];
    
    if (selectedDate === today) {
        document.getElementById('selectedDateDisplay').textContent = 'Today';
    } else {
        document.getElementById('selectedDateDisplay').textContent = formatDate(selectedDate);
    }
}

// ==================== TIME IN/OUT SECTION ====================
function calculateHoursWithLunchBreak(timeInStr, timeOutStr) {
    const [inHour, inMinute] = timeInStr.split(':').map(Number);
    const [outHour, outMinute] = timeOutStr.split(':').map(Number);

    const inMinutes = inHour * 60 + inMinute;
    const outMinutes = outHour * 60 + outMinute;

    const lunchStartMinutes = 12 * 60; // 12:00 PM = 720 minutes
    const lunchEndMinutes = 13 * 60;   // 1:00 PM = 780 minutes

    let hoursWorked;
    
    if (outMinutes >= inMinutes) {
        // Same day calculation
        hoursWorked = (outMinutes - inMinutes) / 60;
        
        // Deduct lunch break if it falls within working hours
        if (inMinutes < lunchStartMinutes && outMinutes > lunchEndMinutes) {
            // Lunch break is entirely within working hours
            hoursWorked -= 1;
        } else if (inMinutes < lunchEndMinutes && outMinutes > lunchStartMinutes) {
            // Partial overlap with lunch break
            const overlapStart = Math.max(inMinutes, lunchStartMinutes);
            const overlapEnd = Math.min(outMinutes, lunchEndMinutes);
            hoursWorked -= (overlapEnd - overlapStart) / 60;
        }
    } else {
        // Next day case (e.g., time in at 10 PM, time out at 2 AM)
        hoursWorked = ((24 * 60 - inMinutes) + outMinutes) / 60;
        // Lunch break doesn't apply across days
    }

    return hoursWorked;
}

function setCurrentTime(fieldId) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById(fieldId).value = `${hours}:${minutes}`;
    calculateHoursWorkedToday();
}

function calculateHoursWorkedToday() {
    const timeIn = document.getElementById('timeIn').value;
    const timeOut = document.getElementById('timeOut').value;

    if (!timeIn || !timeOut) {
        document.getElementById('hoursWorkedToday').value = '';
        return;
    }

    const hoursWorked = calculateHoursWithLunchBreak(timeIn, timeOut);
    document.getElementById('hoursWorkedToday').value = hoursWorked.toFixed(2) + ' hrs';
}

function saveTimeEntry() {
    const timeIn = document.getElementById('timeIn').value;
    const timeOut = document.getElementById('timeOut').value;
    const selectedDate = document.getElementById('logDate').value;

    if (!timeIn || !timeOut) {
        alert('Please enter both time in and time out');
        return;
    }

    if (!selectedDate) {
        alert('Please select a date');
        return;
    }
    localStorage.removeItem(`ojt_draft_${currentUser}`);

    // Calculate hours with lunch break deduction
    const hoursWorked = calculateHoursWithLunchBreak(timeIn, timeOut);

    // Check if entry for selected date already exists
    const existingIndex = trackerData.dailyEntries.findIndex(
    entry => entry.date.trim() === selectedDate.trim()
);
    
    if (existingIndex !== -1) {
        // Update existing entry
        trackerData.dailyEntries[existingIndex] = {
            date: selectedDate,
            timeIn: timeIn,
            timeOut: timeOut,
            hoursWorked: hoursWorked
        };
        alert('Entry updated for ' + formatDate(selectedDate) + '!');
    } else {
        // Add new entry
        trackerData.dailyEntries.push({
            date: selectedDate,
            timeIn: timeIn,
            timeOut: timeOut,
            hoursWorked: hoursWorked
        });
        alert('Entry saved successfully for ' + formatDate(selectedDate) + '!');
    }

    saveUserData();
    clearTimeEntry();
    updateProgress();
    updateDashboard();
    displayDailyLog();
    
    // Close the modal after saving
    document.getElementById('timeEntrySection').classList.add('hidden');
}

function clearTimeEntry() {
    document.getElementById('timeIn').value = '';
    document.getElementById('timeOut').value = '';
    document.getElementById('hoursWorkedToday').value = '';
}

// ==================== DAILY LOG ====================
function displayDailyLog() {
    const logContainer = document.getElementById('dailyLog');
    
    if (trackerData.dailyEntries.length === 0) {
        logContainer.innerHTML = '<p class="empty-message">No entries yet</p>';
        return;
    }

    // Sort entries by date (newest first)
    const sortedEntries = [...trackerData.dailyEntries].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );

    logContainer.innerHTML = sortedEntries.map(entry => `
        <div class="log-entry">
            <div class="entry-details">
                <div class="entry-date">${formatDate(entry.date)}</div>
                <div class="entry-time">${entry.timeIn} - ${entry.timeOut}</div>
            </div>
            <div class="entry-hours">${entry.hoursWorked.toFixed(2)} hrs</div>
            <button class="entry-delete" onclick="deleteEntry('${entry.date}')">Delete</button>
        </div>
    `).join('');
}

function deleteEntry(date) {
    if (confirm('Are you sure you want to delete this entry?')) {
        trackerData.dailyEntries = trackerData.dailyEntries.filter(entry => entry.date !== date);
        saveUserData();
        updateProgress();
        updateDashboard();
        displayDailyLog();
    }
}
//==Between Working Days (excluding Sundays)==
function getWorkingDaysBetween(startDate, endDate) {
    let count = 0;
    let current = new Date(startDate);

    while (current <= endDate) {
        const day = current.getDay(); // 0 = Sunday, 6 = Saturday

        if (day !== 0) { // exclude Sunday
            count++;
        }

        current.setDate(current.getDate() + 1);
    }

    return count;
}

// ==================== VISIBILITY TOGGLE ====================
function showSetupSection() {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('setupSection').classList.remove('hidden');
    document.getElementById('trackerSection').classList.add('hidden');
}

function showTrackerSection() {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('setupSection').classList.add('hidden');
    document.getElementById('trackerSection').classList.remove('hidden');
    document.getElementById('currentUsername').textContent = currentUser;
}

function showAuthSection() {
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('setupSection').classList.add('hidden');
    document.getElementById('trackerSection').classList.add('hidden');
}

// Update toggleTimeEntrySection function to set default times
function toggleTimeEntrySection() {
    const timeEntrySection = document.getElementById("timeEntrySection");
    const timeIn = document.getElementById("timeIn");
    const timeOut = document.getElementById("timeOut");
    const logDate = document.getElementById("logDate");

    // Toggle visibility
    timeEntrySection.classList.toggle("hidden");

    if (!timeEntrySection.classList.contains("hidden")) {
        // When opening the modal, set default date and times
        const today = new Date().toISOString().split("T")[0];
        logDate.value = today;

        // Default Time In = 8:00 AM, Time Out = 5:00 PM
        timeIn.value = "08:00";
        timeOut.value = "17:00";

        // Reset hours worked
        document.getElementById("hoursWorkedToday").value = "";
    }
}

function closeModalOnBackdropClick(event) {
    const timeEntrySection = document.getElementById('timeEntrySection');
    const closeButton = document.querySelector('.close-button');
    
    // Only close if clicking on the backdrop (outside the modal content)
    if (event.target === timeEntrySection || (event.target.classList && event.target.classList.contains('time-entry-section'))) {
        // Check if we're not clicking inside the modal
        const modalContent = timeEntrySection.querySelector('.time-entry-header');
        if (!modalContent || !modalContent.contains(event.target)) {
            timeEntrySection.classList.add('hidden');
            document.removeEventListener('click', closeModalOnBackdropClick);
        }
    }
}

// ==================== DATA PERSISTENCE ====================
function saveData() {
    saveUserData();
}

function saveUserData() {
    if (currentUser) {
        const userDataKey = `ojt_tracker_data_${currentUser}`;
        localStorage.setItem(userDataKey, JSON.stringify(trackerData));
    }
}

function loadData() {
    loadUserData();
}

function loadUserData() {
    if (currentUser) {
        const userDataKey = `ojt_tracker_data_${currentUser}`;
        const savedData = localStorage.getItem(userDataKey);

        if (savedData) {
            trackerData = JSON.parse(savedData);
        } else {
            trackerData = {
                requiredHours: 0,
                usualHoursPerDay: 0,
                dateStarted: '',
                dailyEntries: []
            };
        }

        if (trackerData.requiredHours > 0) {
            displayTrackerData();
        }
    }
}
// ==================== RESET ====================
function resetTracker() {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
        trackerData = {
            requiredHours: 0,
            usualHoursPerDay: 0,
            dateStarted: '',
            dailyEntries: []
        };
        saveUserData();
        
        // Clear form
        document.getElementById('setupForm').reset();
        clearTimeEntry();
        
        showSetupSection();
    }
}

// ==================== UTILITY FUNCTIONS ====================
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', options);
}
