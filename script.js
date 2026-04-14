// Data Structure
let trackerData = {
    requiredHours: 0,
    usualHoursPerDay: 0,
    dateStarted: '',
    dailyEntries: [], // { date: 'YYYY-MM-DD', timeIn: 'HH:MM', timeOut: 'HH:MM', hoursWorked: number }
    holidays: [] // Array of dates (YYYY-MM-DD) that are holidays/non-working days
};

let currentUser = null; // Track current logged-in user

// Game State
let gameState = {
    power: 0,
    score: 0,
    clicks: 0,
    streak: 0,
    lastClickTime: 0,
    achievements: []
};

const ACHIEVEMENTS = [
    { id: 'first_click', name: '1st Step', emoji: '👶', requirement: () => gameState.clicks === 1 },
    { id: 'ten_clicks', name: '10 Clicks', emoji: '💪', requirement: () => gameState.clicks >= 10 },
    { id: 'fifty_clicks', name: 'Speedy', emoji: '⚡', requirement: () => gameState.clicks >= 50 },
    { id: 'hundred_clicks', name: 'Pro', emoji: '🏆', requirement: () => gameState.clicks >= 100 },
    { id: 'power_master', name: 'Power Max', emoji: '🔥', requirement: () => gameState.power >= 100 },
    { id: 'combo_5', name: 'Combo x5', emoji: '🎯', requirement: () => gameState.streak >= 5 },
    { id: 'combo_10', name: 'Combo x10', emoji: '🚀', requirement: () => gameState.streak >= 10 },
    { id: 'high_score', name: 'Star Power', emoji: '⭐', requirement: () => gameState.score >= 500 }
];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();



    // Check if user is already logged in
    currentUser = localStorage.getItem('ojt_currentUser');
    
    if (currentUser) {
        // User is logged in, load their data
        loadUserData();
        loadGameState();
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
    
    // Date picker listeners for single date mode
    document.getElementById('logDate').addEventListener('change', function() {
        loadEntryForDate(this.value);
        updateDateDisplay();
    });

    // Date range listeners
    document.getElementById('logDateFrom').addEventListener('change', autoSaveDraft);
    document.getElementById('logDateTo').addEventListener('change', autoSaveDraft);

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
    trackerData.holidays = [];

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

    // Estimated finish date - skips Sundays and holidays
    let estimatedFinishDate = '--';
    let calculatedDaysRemaining = 0;
    
    if (avgHoursPerDay > 0) {
        const daysNeeded = Math.ceil(hoursRemaining / avgHoursPerDay);
        const finishDate = calculateFinishDateSkippingWeekends(today, daysNeeded)
        estimatedFinishDate = formatDate(finishDate.toISOString().split('T')[0]);
        calculatedDaysRemaining = daysRemaining;
    }
    
    return {
        hoursRendered,
        daysWorked,
        // noWorkDays,
        daysAbsent,
        avgHoursPerDay,
        hoursRemaining,
        estimatedFinishDate,
        daysRemaining: calculatedDaysRemaining
    };
}

// Calculate finish date while skipping Sundays and holidays
function calculateFinishDateSkippingWeekends(startDate, daysToAdd) {
    let current = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < daysToAdd) {
        current.setDate(current.getDate() + 1);
        const dayOfWeek = current.getDay();
        const dateStr = current.toISOString().split('T')[0];
        const isHoliday = trackerData.holidays.includes(dateStr);

        // Only count if it's not Sunday (0) and not a holiday
        if (dayOfWeek !== 0 && !isHoliday) {
            daysAdded++;
        }
    }

    return current;
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
    let [inHour, inMinute] = timeInStr.split(':').map(Number);
    const [outHour, outMinute] = timeOutStr.split(':').map(Number);

    // Enforce 8 AM minimum start time
    if (inHour < 8 || (inHour === 8 && inMinute < 0)) {
        inHour = 8;
        inMinute = 0;
    }

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
    const isDateRangeMode = document.getElementById('dateRangeToggle').checked;

    if (!timeIn || !timeOut) {
        alert('Please enter both time in and time out');
        return;
    }

    let datesToSave = [];

    if (isDateRangeMode) {
        // Date range mode
        const dateFrom = document.getElementById('logDateFrom').value;
        const dateTo = document.getElementById('logDateTo').value;
        const dayType = document.getElementById('dayType').value;

        if (!dateFrom || !dateTo) {
            alert('Please select both from and to dates');
            return;
        }

        if (new Date(dateFrom) > new Date(dateTo)) {
            alert('From date must be before to date');
            return;
        }

        const onlyWeekdays = dayType === 'weekdays';
        datesToSave = getDatesBetween(dateFrom, dateTo, onlyWeekdays);

        if (datesToSave.length === 0) {
            alert('No dates found in the selected range');
            return;
        }
    } else {
        // Single date mode
        const selectedDate = document.getElementById('logDate').value;
        if (!selectedDate) {
            alert('Please select a date');
            return;
        }
        datesToSave = [selectedDate];
    }

    localStorage.removeItem(`ojt_draft_${currentUser}`);

    // Calculate hours with lunch break deduction
    const hoursWorked = calculateHoursWithLunchBreak(timeIn, timeOut);

    // Save entries for all selected dates
    let updatedCount = 0;
    let createdCount = 0;

    datesToSave.forEach(date => {
        const existingIndex = trackerData.dailyEntries.findIndex(
            entry => entry.date.trim() === date.trim()
        );
        
        if (existingIndex !== -1) {
            // Update existing entry
            trackerData.dailyEntries[existingIndex] = {
                date: date,
                timeIn: timeIn,
                timeOut: timeOut,
                hoursWorked: hoursWorked
            };
            updatedCount++;
        } else {
            // Add new entry
            trackerData.dailyEntries.push({
                date: date,
                timeIn: timeIn,
                timeOut: timeOut,
                hoursWorked: hoursWorked
            });
            createdCount++;
        }
    });

    saveUserData();
    clearTimeEntry();
    updateProgress();
    updateDashboard();
    displayDailyLog();

    // Show appropriate message
    if (isDateRangeMode) {
        let message = `Entries saved! `;
        if (createdCount > 0) message += `${createdCount} new, `;
        if (updatedCount > 0) message += `${updatedCount} updated, `;
        message = message.replace(/, $/, '');
        alert(message);
    } else {
        const message = updatedCount > 0 
            ? `Entry updated for ${formatDate(datesToSave[0])}!`
            : `Entry saved successfully for ${formatDate(datesToSave[0])}!`;
        alert(message);
    }
    
    // Close the modal after saving
    document.getElementById('timeEntrySection').classList.add('hidden');
}

function clearTimeEntry() {
    document.getElementById('timeIn').value = '';
    document.getElementById('timeOut').value = '';
    document.getElementById('hoursWorkedToday').value = '';
}

// Toggle between single date and date range mode
function toggleDateRangeMode() {
    const isDateRangeMode = document.getElementById('dateRangeToggle').checked;
    const singleDateGroup = document.getElementById('singleDateGroup');
    const dateRangeGroup = document.getElementById('dateRangeGroup');
    const dateRangeToGroup = document.getElementById('dateRangeToGroup');
    const dayTypeGroup = document.getElementById('dayTypeGroup');

    if (isDateRangeMode) {
        singleDateGroup.classList.add('hidden');
        dateRangeGroup.classList.remove('hidden');
        dateRangeToGroup.classList.remove('hidden');
        dayTypeGroup.classList.remove('hidden');
    } else {
        singleDateGroup.classList.remove('hidden');
        dateRangeGroup.classList.add('hidden');
        dateRangeToGroup.classList.add('hidden');
        dayTypeGroup.classList.add('hidden');
    }
}

// Get all dates between two dates, optionally filtering for weekdays only
function getDatesBetween(startDate, endDate, onlyWeekdays = false) {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
        // Check if we should include this date
        const dayOfWeek = current.getDay();
        const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6; // 0 = Sunday, 6 = Saturday

        if (!onlyWeekdays || isWeekday) {
            // Format date as YYYY-MM-DD
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            const day = String(current.getDate()).padStart(2, '0');
            dates.push(`${year}-${month}-${day}`);
        }

        // Move to next day
        current.setDate(current.getDate() + 1);
    }

    return dates;
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

// ==================== HOLIDAYS MANAGEMENT ====================
function toggleAddHolidayForm() {
    const form = document.getElementById('addHolidayForm');
    form.classList.toggle('hidden');
    
    if (!form.classList.contains('hidden')) {
        // Set today as default date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('holidayDate').value = today;
        document.getElementById('holidayReason').value = '';
    }
}

function addHoliday() {
    const dateInput = document.getElementById('holidayDate').value;
    const reason = document.getElementById('holidayReason').value;

    if (!dateInput) {
        alert('Please select a date');
        return;
    }

    // Check if holiday already exists
    if (trackerData.holidays.includes(dateInput)) {
        alert('This date is already marked as a holiday');
        return;
    }

    // Store holiday with optional reason
    const holiday = {
        date: dateInput,
        reason: reason || 'Holiday'
    };

    trackerData.holidays.push(dateInput);
    saveUserData();
    displayHolidaysList();
    toggleAddHolidayForm();
    updateProgress();
    updateDashboard();
    alert(`Holiday added for ${formatDate(dateInput)}`);
}

function deleteHoliday(date) {
    if (confirm(`Remove this day off on ${formatDate(date)}?`)) {
        trackerData.holidays = trackerData.holidays.filter(h => h !== date);
        saveUserData();
        displayHolidaysList();
        updateProgress();
        updateDashboard();
    }
}

function displayHolidaysList() {
    const holidaysList = document.getElementById('holidaysList');
    
    if (trackerData.holidays.length === 0) {
        holidaysList.innerHTML = '<p class="empty-message">No holidays set yet</p>';
        return;
    }

    // Sort holidays by date
    const sortedHolidays = [...trackerData.holidays].sort();

    holidaysList.innerHTML = sortedHolidays.map(date => `
        <div class="holiday-item">
            <div>
                <div class="holiday-date">${formatDate(date)}</div>
            </div>
            <button class="holiday-delete" onclick="deleteHoliday('${date}')">Remove</button>
        </div>
    `).join('');
}

//==Between Working Days (excluding Sundays)==
function getWorkingDaysBetween(startDate, endDate) {
    let count = 0;
    let current = new Date(startDate);

    while (current <= endDate) {
        const day = current.getDay(); // 0 = Sunday, 6 = Saturday
        const dateStr = current.toISOString().split('T')[0];
        const isHoliday = trackerData.holidays.includes(dateStr);

        if (day !== 0 && !isHoliday) { // exclude Sunday and holidays
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
    displayHolidaysList();
    loadGameState();
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
    const dateRangeToggle = document.getElementById("dateRangeToggle");

    // Toggle visibility
    timeEntrySection.classList.toggle("hidden");

    if (!timeEntrySection.classList.contains("hidden")) {
        // When opening the modal, set default date and times
        const today = new Date().toISOString().split("T")[0];
        logDate.value = today;
        document.getElementById("logDateFrom").value = today;
        document.getElementById("logDateTo").value = today;

        // Reset date range toggle to single date mode
        dateRangeToggle.checked = false;
        toggleDateRangeMode();

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
            // Ensure holidays array exists for older saved data
            if (!trackerData.holidays) {
                trackerData.holidays = [];
            }
        } else {
            trackerData = {
                requiredHours: 0,
                usualHoursPerDay: 0,
                dateStarted: '',
                dailyEntries: [],
                holidays: []
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
            dailyEntries: [],
            holidays: []
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

// ==================== BULK IMPORT FUNCTION ====================
function createRayAccount() {
    // Create RAY user if doesn't exist
    const users = getAllUsers();
    const rayExists = users.some(u => u.username === 'RAY');
    
    if (!rayExists) {
        users.push({
            username: 'RAY',
            email: '',
            createdDate: new Date().toISOString()
        });
        saveUsers(users);
    }
    
    // RAY's tracker data with all entries from the spreadsheet
    const rayData = {
        requiredHours: 486,
        usualHoursPerDay: 8,
        dateStarted: '2026-02-18',
        dailyEntries: [
            [
            { "date": "2026-02-18", "timeIn": "08:00", "timeOut": "17:05", "hoursWorked": 8.08 },
            { "date": "2026-02-19", "timeIn": "08:00", "timeOut": "17:05", "hoursWorked": 8.08 },
            { "date": "2026-02-20", "timeIn": "08:00", "timeOut": "17:06", "hoursWorked": 8.10 },
            { "date": "2026-02-21", "timeIn": "08:02", "timeOut": "17:02", "hoursWorked": 8.00 },
            { "date": "2026-02-23", "timeIn": "08:00", "timeOut": "17:03", "hoursWorked": 8.05 },
            { "date": "2026-02-24", "timeIn": "08:00", "timeOut": "17:30", "hoursWorked": 8.50 },
            { "date": "2026-02-25", "timeIn": "08:06", "timeOut": "17:07", "hoursWorked": 8.02 },
            { "date": "2026-02-26", "timeIn": "08:00", "timeOut": "17:16", "hoursWorked": 8.27 },
            { "date": "2026-02-27", "timeIn": "08:00", "timeOut": "17:40", "hoursWorked": 8.67 },
            { "date": "2026-02-28", "timeIn": "08:30", "timeOut": "19:00", "hoursWorked": 9.50 },
            { "date": "2026-03-02", "timeIn": "09:00", "timeOut": "17:21", "hoursWorked": 8.35 },
            { "date": "2026-03-03", "timeIn": "08:00", "timeOut": "17:00", "hoursWorked": 8.00 },
            { "date": "2026-03-04", "timeIn": "08:00", "timeOut": "17:10", "hoursWorked": 8.17 },
            { "date": "2026-03-05", "timeIn": "08:25", "timeOut": "17:02", "hoursWorked": 7.62 },
            { "date": "2026-03-06", "timeIn": "13:00", "timeOut": "17:30", "hoursWorked": 4.50 },
            { "date": "2026-03-10", "timeIn": "08:00", "timeOut": "17:10", "hoursWorked": 8.17 },
            { "date": "2026-03-11", "timeIn": "08:00", "timeOut": "17:13", "hoursWorked": 8.22 },
            { "date": "2026-03-12", "timeIn": "08:00", "timeOut": "19:00", "hoursWorked": 10.00 },
            { "date": "2026-03-13", "timeIn": "08:20", "timeOut": "17:10", "hoursWorked": 7.83 },
            { "date": "2026-03-14", "timeIn": "08:00", "timeOut": "17:10", "hoursWorked": 8.17 },
            { "date": "2026-03-16", "timeIn": "08:00", "timeOut": "17:06", "hoursWorked": 8.10 },
            { "date": "2026-03-17", "timeIn": "08:25", "timeOut": "17:10", "hoursWorked": 7.75 },
            { "date": "2026-03-18", "timeIn": "08:00", "timeOut": "17:10", "hoursWorked": 8.17 },
            { "date": "2026-03-19", "timeIn": "08:04", "timeOut": "12:00", "hoursWorked": 3.93 },
            { "date": "2026-03-23", "timeIn": "08:00", "timeOut": "17:12", "hoursWorked": 8.20 },
            { "date": "2026-03-24", "timeIn": "08:00", "timeOut": "17:20", "hoursWorked": 8.33 },
            { "date": "2026-03-25", "timeIn": "08:00", "timeOut": "17:25", "hoursWorked": 8.42 },
            { "date": "2026-03-26", "timeIn": "08:00", "timeOut": "18:00", "hoursWorked": 9.00 },
            { "date": "2026-03-27", "timeIn": "08:00", "timeOut": "17:15", "hoursWorked": 8.25 },
            { "date": "2026-03-28", "timeIn": "08:45", "timeOut": "17:15", "hoursWorked": 7.50 },
            { "date": "2026-03-30", "timeIn": "08:45", "timeOut": "17:30", "hoursWorked": 7.75 },
            { "date": "2026-03-31", "timeIn": "08:00", "timeOut": "17:15", "hoursWorked": 8.25 },
            { "date": "2026-04-06", "timeIn": "08:00", "timeOut": "17:05", "hoursWorked": 8.08 },
            { "date": "2026-04-07", "timeIn": "08:00", "timeOut": "17:05", "hoursWorked": 8.08 },
            { "date": "2026-04-08", "timeIn": "08:00", "timeOut": "17:05", "hoursWorked": 8.08 },
            { "date": "2026-04-10", "timeIn": "13:00", "timeOut": "17:00", "hoursWorked": 4.00 },
            { "date": "2026-04-11", "timeIn": "08:00", "timeOut": "17:00", "hoursWorked": 8.00 },
            { "date": "2026-04-13", "timeIn": "08:00", "timeOut": "17:10", "hoursWorked": 8.17 },
            { "date": "2026-04-14", "timeIn": "08:10", "timeOut": "17:08", "hoursWorked": 7.97 }
]
        ],
        holidays: [
            '2026-03-01', // Sunday Mar 1 (might already be weekend)
            '2026-03-09', // Monday Mar 9 - NO WORK
            '2026-03-20', // Friday Mar 20 - NO WORK
            '2026-04-01', // Wednesday Apr 1 - NO WORK
            '2026-04-02', // Thursday Apr 2 - NO WORK
            '2026-04-03', // Friday Apr 3 - NO WORK
            '2026-04-04', // Saturday Apr 4 - NO WORK
            '2026-04-08',  // Wednesday Apr 8 - NO WORK
            '2026-04-09'  // Thursday Apr 9 - NO WORK
        ]
    };
    
    // Save RAY's data
    const userDataKey = `ojt_tracker_data_RAY`;
    localStorage.setItem(userDataKey, JSON.stringify(rayData));
    
    console.log('RAY account created successfully with 36 time entries and 8 holidays!');
    return true;
}

// Auto-create RAY account on page load if it doesn't exist
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const users = getAllUsers();
        if (!users.some(u => u.username === 'RAY')) {
            createRayAccount();
        }
    }, 500);
});

// ==================== MINI GAME LOGIC ====================
function clickPowerButton() {
    // Increase power and score
    const powerGain = 10 + Math.floor(gameState.streak / 2); // Bonus for streaks
    gameState.power = Math.min(gameState.power + powerGain, 100);
    gameState.clicks++;
    gameState.score += (powerGain + gameState.streak);
    gameState.streak++;
    
    // Update power meter
    updatePowerMeter();
    
    // Trigger animations
    triggerButtonAnimation();
    
    // Show motivational messages based on progress
    showMotivation();
    
    // Check for achievements
    checkAchievements();
    
    // Save game state
    saveGameState();
    
    // Power regeneration reset
    gameState.lastClickTime = Date.now();
}

function updatePowerMeter() {
    const powerPercent = (gameState.power / 100) * 100;
    const powerFill = document.getElementById('powerFill');
    const gamePower = document.getElementById('gamePower');
    
    if (powerFill) {
        powerFill.style.width = powerPercent + '%';
    }
    if (gamePower) {
        gamePower.textContent = gameState.power;
    }
    
    // Update stats
    const gameScore = document.getElementById('gameScore');
    const gameClicks = document.getElementById('gameClicks');
    const gameStreak = document.getElementById('gameStreak');
    
    if (gameScore) gameScore.textContent = gameState.score;
    if (gameClicks) gameClicks.textContent = gameState.clicks;
    if (gameStreak) gameStreak.textContent = gameState.streak;
}

function triggerButtonAnimation() {
    const button = document.getElementById('gameButton');
    if (button) {
        button.style.animation = 'none';
        setTimeout(() => {
            button.style.animation = '';
        }, 10);
    }
    
    // Create floating text
    createFloatingText();
}

function createFloatingText() {
    const floatingTexts = [
        '+10 Power!',
        'Great!',
        'Keep Going! 🔥',
        '+Combo',
        'Awesome!',
        'on Fire! 🚀'
    ];
    
    const text = floatingTexts[Math.floor(Math.random() * floatingTexts.length)];
    const gameButton = document.getElementById('gameButton');
    
    if (!gameButton) return;
    
    const floatDiv = document.createElement('div');
    floatDiv.textContent = text;
    floatDiv.style.position = 'fixed';
    floatDiv.style.left = (gameButton.getBoundingClientRect().left + gameButton.offsetWidth / 2) + 'px';
    floatDiv.style.top = (gameButton.getBoundingClientRect().top) + 'px';
    floatDiv.style.pointer = 'none';
    floatDiv.style.fontSize = '1.2em';
    floatDiv.style.fontWeight = '700';
    floatDiv.style.color = '#ff0245';
    floatDiv.style.zIndex = '999';
    floatDiv.style.animation = 'floatUp 1s ease-out forwards';
    
    document.body.appendChild(floatDiv);
    
    setTimeout(() => floatDiv.remove(), 1000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes floatUp {
        0% { 
            opacity: 1;
            transform: translateY(0);
        }
        100% { 
            opacity: 0;
            transform: translateY(-60px);
        }
    }
`;
document.head.appendChild(style);

function showMotivation() {
    const motivations = [
        { emoji: '💪', text: 'You got this!', sub: 'Keep the momentum!' },
        { emoji: '🔥', text: 'On Fire!', sub: 'Amazing energy!' },
        { emoji: '⚡', text: 'Supercharged!', sub: 'Keep clicking!' },
        { emoji: '🎯', text: 'Focus!', sub: 'Stay productive!' },
        { emoji: '🚀', text: 'Blast Off!', sub: 'Highest power!' },
        { emoji: '⭐', text: 'Shining Star!', sub: 'You are awesome!' },
        { emoji: '🏆', text: 'Champion!', sub: 'Keep it up!' }
    ];
    
    if (gameState.clicks % 10 === 0) {
        const motivation = motivations[Math.floor(Math.random() * motivations.length)];
        showPopup(motivation.emoji, motivation.text, motivation.sub);
    }
}

function showPopup(emoji, text, subtext) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.style.display = 'block';
    
    // Create popup
    const popup = document.createElement('div');
    popup.className = 'motivation-popup';
    popup.innerHTML = `
        <div class="motivation-emoji">${emoji}</div>
        <div class="motivation-text">${text}</div>
        <div class="motivation-subtext">${subtext}</div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    
    // Auto-close after 2 seconds
    setTimeout(() => {
        popup.style.animation = 'fadeOut 0.4s ease forwards';
        overlay.style.animation = 'fadeOut 0.4s ease forwards';
        setTimeout(() => {
            popup.remove();
            overlay.remove();
        }, 400);
    }, 2000);
}

function checkAchievements() {
    ACHIEVEMENTS.forEach(achievement => {
        if (!gameState.achievements.includes(achievement.id) && achievement.requirement()) {
            gameState.achievements.push(achievement.id);
            showPopup(achievement.emoji, achievement.name, 'Achievement Unlocked!');
            displayAchievements();
        }
    });
}

function displayAchievements() {
    const achievementsList = document.getElementById('achievementsList');
    
    if (!achievementsList) return;
    
    if (gameState.achievements.length === 0) {
        achievementsList.innerHTML = '<p class="empty-message">Click to earn achievements!</p>';
        return;
    }
    
    const unlockedAchievements = ACHIEVEMENTS.filter(a => gameState.achievements.includes(a.id));
    
    achievementsList.innerHTML = unlockedAchievements.map(achievement => `
        <div class="achievement-badge" title="${achievement.name}">
            <div class="achievement-emoji">${achievement.emoji}</div>
            <div class="achievement-name">${achievement.name}</div>
        </div>
    `).join('');
}

function resetGame() {
    if (confirm('Reset game progress? (Score will be saved in game history)')) {
        gameState = {
            power: 0,
            score: 0,
            clicks: 0,
            streak: 0,
            lastClickTime: 0,
            achievements: []
        };
        updatePowerMeter();
        displayAchievements();
        saveGameState();
    }
}

function saveGameState() {
    if (currentUser) {
        localStorage.setItem(`ojt_game_${currentUser}`, JSON.stringify(gameState));
    }
}

function loadGameState() {
    if (currentUser) {
        const saved = localStorage.getItem(`ojt_game_${currentUser}`);
        if (saved) {
            gameState = JSON.parse(saved);
        }
    }
    updatePowerMeter();
    displayAchievements();
}

// Add fade out animation
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: scale(1);
        }
        to {
            opacity: 0;
            transform: scale(0.9);
        }
    }
`, styleSheet.cssRules.length);
