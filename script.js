// Mihabitro - Daily Reminder App
const STORAGE_KEY = 'mihabitro_reminders';

let reminders = [];
let editingId = null;
let deleteId = null;
let notificationCheckInterval = null;

// Initialize App
function init() {
    loadReminders();
    renderReminders();
    checkNotificationPermission();
    startNotificationChecker();
    attachEventListeners();
}

// Event Listeners
function attachEventListeners() {
    const addReminderBtn = document.getElementById('addReminderBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const reminderForm = document.getElementById('reminderForm');
    const enableNotificationsBtn = document.getElementById('enableNotificationsBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const reminderModal = document.getElementById('reminderModal');
    const deleteModal = document.getElementById('deleteModal');
    
    if (addReminderBtn) {
        addReminderBtn.addEventListener('click', openAddModal);
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    if (reminderForm) {
        reminderForm.addEventListener('submit', handleFormSubmit);
    }
    
    if (enableNotificationsBtn) {
        enableNotificationsBtn.addEventListener('click', requestNotificationPermission);
    }
    
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    }
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDelete);
    }
    
    // Add reminder trigger in empty state
    document.querySelectorAll('.add-reminder-trigger').forEach(btn => {
        btn.addEventListener('click', openAddModal);
    });
    
    // Recurrence type change
    document.querySelectorAll('input[name="recurrence"]').forEach(radio => {
        radio.addEventListener('change', handleRecurrenceChange);
    });
    
    // Close modal on backdrop click
    if (reminderModal) {
        reminderModal.addEventListener('click', (e) => {
            if (e.target === reminderModal) closeModal();
        });
    }
    
    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) closeDeleteModal();
        });
    }
    
    // Event delegation for edit and delete buttons
    document.addEventListener('click', (e) => {
        // Check if edit button or its children were clicked
        const editBtn = e.target.closest('[data-action="edit"]');
        if (editBtn) {
            e.preventDefault();
            e.stopPropagation();
            const id = editBtn.getAttribute('data-id');
            openEditModal(id);
            return;
        }
        
        // Check if delete button or its children were clicked
        const deleteBtn = e.target.closest('[data-action="delete"]');
        if (deleteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const id = deleteBtn.getAttribute('data-id');
            openDeleteModal(id);
            return;
        }
    });
}

// Handle recurrence type change
function handleRecurrenceChange(e) {
    const isWeekly = e.target.value === 'weekly';
    const weeklyDaysContainer = document.getElementById('weeklyDaysContainer');
    if (weeklyDaysContainer) {
        if (isWeekly) {
            weeklyDaysContainer.classList.remove('hidden');
        } else {
            weeklyDaysContainer.classList.add('hidden');
        }
    }
}

// Local Storage Functions
function loadReminders() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            reminders = JSON.parse(stored);
        } catch (error) {
            reminders = [];
        }
    }
}

function saveReminders() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

// Notification Functions
function checkNotificationPermission() {
    if (!('Notification' in window)) {
        return;
    }
    
    const notificationBanner = document.getElementById('notificationBanner');
    const enableNotificationsBtn = document.getElementById('enableNotificationsBtn');
    
    if (Notification.permission === 'default') {
        if (notificationBanner) notificationBanner.classList.remove('hidden');
    } else if (Notification.permission === 'denied') {
        if (notificationBanner) notificationBanner.classList.remove('hidden');
        if (enableNotificationsBtn) {
            enableNotificationsBtn.textContent = 'Blocked';
            enableNotificationsBtn.disabled = true;
            enableNotificationsBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
}

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        alert('This browser does not support notifications');
        return;
    }
    
    try {
        const permission = await Notification.requestPermission();
        const notificationBanner = document.getElementById('notificationBanner');
        
        if (permission === 'granted') {
            if (notificationBanner) notificationBanner.classList.add('hidden');
            new Notification('Mihabitro', {
                body: 'Notifications enabled! You will receive reminder alerts.',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm1-13h-2v6h6v-2h-4V7z"/></svg>'
            });
        }
    } catch (error) {
        // Handle error silently
    }
}

function showNotification(reminder) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
        const notification = new Notification(reminder.title, {
            body: `Reminder at ${formatTime(reminder.time)}`,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/></svg>',
            tag: reminder.id,
            requireInteraction: true
        });
        
        notification.onclick = function() {
            window.focus();
            notification.close();
        };
    }
}

// Check for reminders that need to trigger
function checkReminders() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDay = now.getDay();
    
    reminders.forEach(reminder => {
        if (reminder.time === currentTime) {
            if (reminder.recurrence === 'daily') {
                if (!reminder.lastNotified || now - new Date(reminder.lastNotified) > 60000) {
                    showNotification(reminder);
                    reminder.lastNotified = now.toISOString();
                    saveReminders();
                }
            } else if (reminder.recurrence === 'weekly') {
                if (reminder.days.includes(currentDay)) {
                    if (!reminder.lastNotified || now - new Date(reminder.lastNotified) > 60000) {
                        showNotification(reminder);
                        reminder.lastNotified = now.toISOString();
                        saveReminders();
                    }
                }
            }
        }
    });
}

function startNotificationChecker() {
    notificationCheckInterval = setInterval(checkReminders, 30000);
    checkReminders();
}

// Modal Functions
function openAddModal() {
    editingId = null;
    const modalTitle = document.getElementById('modalTitle');
    const reminderForm = document.getElementById('reminderForm');
    const reminderModal = document.getElementById('reminderModal');
    const weeklyDaysContainer = document.getElementById('weeklyDaysContainer');
    
    if (modalTitle) modalTitle.textContent = 'Add Reminder';
    if (reminderForm) reminderForm.reset();
    if (weeklyDaysContainer) weeklyDaysContainer.classList.add('hidden');
    if (reminderModal) {
        reminderModal.classList.remove('hidden');
        reminderModal.classList.add('flex');
    }
}

function openEditModal(id) {
    editingId = id;
    const modalTitle = document.getElementById('modalTitle');
    const reminderModal = document.getElementById('reminderModal');
    
    const reminder = reminders.find(r => r.id === id);
    
    if (!reminder) {
        return;
    }
    
    if (modalTitle) modalTitle.textContent = 'Edit Reminder';
    
    const titleInput = document.getElementById('reminderTitle');
    const timeInput = document.getElementById('reminderTime');
    
    if (titleInput) titleInput.value = reminder.title;
    if (timeInput) timeInput.value = reminder.time;
    
    // Reset all checkboxes first
    document.querySelectorAll('input[name="days"]').forEach(cb => {
        cb.checked = false;
    });
    
    const recurrenceRadio = document.querySelector(`input[name="recurrence"][value="${reminder.recurrence}"]`);
    if (recurrenceRadio) {
        recurrenceRadio.checked = true;
        handleRecurrenceChange({ target: recurrenceRadio });
    }
    
    if (reminder.recurrence === 'weekly' && reminder.days) {
        reminder.days.forEach(day => {
            const checkbox = document.querySelector(`input[name="days"][value="${day}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    if (reminderModal) {
        reminderModal.classList.remove('hidden');
        reminderModal.classList.add('flex');
    }
}

function closeModal() {
    const reminderModal = document.getElementById('reminderModal');
    const reminderForm = document.getElementById('reminderForm');
    const weeklyDaysContainer = document.getElementById('weeklyDaysContainer');
    
    if (reminderModal) {
        reminderModal.classList.add('hidden');
        reminderModal.classList.remove('flex');
    }
    
    setTimeout(() => {
        if (reminderForm) reminderForm.reset();
        editingId = null;
        if (weeklyDaysContainer) weeklyDaysContainer.classList.add('hidden');
    }, 200);
}

function openDeleteModal(id) {
    deleteId = id;
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) {
        deleteModal.classList.remove('hidden');
        deleteModal.classList.add('flex');
    }
}

function closeDeleteModal() {
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) {
        deleteModal.classList.add('hidden');
        deleteModal.classList.remove('flex');
    }
    deleteId = null;
}

function confirmDelete() {
    if (deleteId) {
        deleteReminder(deleteId);
        closeDeleteModal();
    }
}

// Form Handling
function handleFormSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('reminderTitle').value.trim();
    const time = document.getElementById('reminderTime').value;
    const recurrence = document.querySelector('input[name="recurrence"]:checked').value;
    
    let days = [];
    if (recurrence === 'weekly') {
        const checkedDays = document.querySelectorAll('input[name="days"]:checked');
        days = Array.from(checkedDays).map(cb => parseInt(cb.value));
        
        if (days.length === 0) {
            alert('Please select at least one day for weekly reminders');
            return;
        }
    }
    
    const reminderData = {
        title,
        time,
        recurrence,
        days: recurrence === 'weekly' ? days : []
    };
    
    if (editingId) {
        updateReminder(editingId, reminderData);
    } else {
        addReminder(reminderData);
    }
    
    closeModal();
}

// CRUD Operations
function addReminder(data) {
    const reminder = {
        id: Date.now().toString(),
        ...data,
        createdAt: new Date().toISOString(),
        lastNotified: null
    };
    
    reminders.push(reminder);
    saveReminders();
    renderReminders();
}

function updateReminder(id, data) {
    const index = reminders.findIndex(r => r.id === id);
    if (index !== -1) {
        reminders[index] = {
            ...reminders[index],
            ...data
        };
        saveReminders();
        renderReminders();
    }
}

function deleteReminder(id) {
    reminders = reminders.filter(r => r.id !== id);
    saveReminders();
    renderReminders();
}

// Rendering
function renderReminders() {
    const emptyState = document.getElementById('emptyState');
    const remindersContainer = document.getElementById('remindersContainer');
    const remindersList = document.getElementById('remindersList');
    
    if (reminders.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (remindersContainer) remindersContainer.classList.add('hidden');
    } else {
        if (emptyState) emptyState.classList.add('hidden');
        if (remindersContainer) remindersContainer.classList.remove('hidden');
        if (remindersList) {
            remindersList.innerHTML = reminders.map(renderReminderCard).join('');
        }
    }
}

function renderReminderCard(reminder) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysText = reminder.recurrence === 'weekly' 
        ? reminder.days.map(d => dayNames[d]).join(', ')
        : 'Every day';
    
    const badgeClass = reminder.recurrence === 'daily' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800';
    
    return `
        <div class="reminder-card relative bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
            <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                    <h3 class="text-lg font-bold text-gray-800 mb-2">${escapeHtml(reminder.title)}</h3>
                    <div class="flex items-center space-x-2 text-gray-600">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span class="text-xl font-semibold">${formatTime(reminder.time)}</span>
                    </div>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}">
                    ${reminder.recurrence}
                </span>
            </div>
            
            <div class="mb-4">
                <div class="flex items-center space-x-2 text-sm text-gray-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span>${daysText}</span>
                </div>
            </div>
            
            <div class="flex space-x-2 pt-4 border-t border-gray-100">
                <button data-action="edit" data-id="${reminder.id}" class="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    <span>Edit</span>
                </button>
                <button data-action="delete" data-id="${reminder.id}" class="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    <span>Delete</span>
                </button>
            </div>
        </div>
    `;
}

// Utility Functions
function formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Clean up interval when page unloads
window.addEventListener('beforeunload', () => {
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
    }
});