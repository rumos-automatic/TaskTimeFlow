// TaskTimeFlow Prototype JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the app
    initializeApp();
});

function initializeApp() {
    // Setup navigation
    setupNavigation();
    
    // Setup task card interactions
    setupTaskCards();
    
    // Setup pomodoro timer
    setupPomodoroTimer();
    
    // Setup search functionality
    setupSearch();
    
    // Setup drag and drop simulation
    setupDragDropSimulation();
    
    // Start animations
    startAnimations();
}

// Navigation between views
function setupNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const views = document.querySelectorAll('.view');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetView = this.dataset.view;
            
            // Remove active class from all tabs and views
            navTabs.forEach(t => t.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding view
            this.classList.add('active');
            document.getElementById(`${targetView}-view`).classList.add('active');
            
            // Add transition effects
            const activeView = document.querySelector('.view.active');
            activeView.style.opacity = '0';
            activeView.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                activeView.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                activeView.style.opacity = '1';
                activeView.style.transform = 'translateY(0)';
            }, 50);
        });
    });
}

// Task card interactions
function setupTaskCards() {
    const taskCards = document.querySelectorAll('.task-card');
    
    taskCards.forEach(card => {
        // Hover effects
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px) scale(1.02)';
            this.style.boxShadow = '0 12px 40px 0 rgba(31, 38, 135, 0.4)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = '0 4px 16px 0 rgba(31, 38, 135, 0.2)';
        });
        
        // Click interactions
        card.addEventListener('click', function() {
            // Simulate task selection
            taskCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            
            // Add pulse effect
            this.style.animation = 'pulse 0.3s ease-out';
            setTimeout(() => {
                this.style.animation = '';
            }, 300);
        });
    });
    
    // Add task buttons
    const addTaskBtns = document.querySelectorAll('.add-task-btn');
    addTaskBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Simulate adding a new task
            const column = this.closest('.kanban-column');
            const taskList = column.querySelector('.task-list');
            const taskCount = column.querySelector('.task-count');
            
            // Create new task card
            const newTask = createNewTaskCard();
            taskList.appendChild(newTask);
            
            // Update count
            const currentCount = parseInt(taskCount.textContent);
            taskCount.textContent = currentCount + 1;
            
            // Animate new task
            newTask.style.opacity = '0';
            newTask.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                newTask.style.transition = 'all 0.3s ease-out';
                newTask.style.opacity = '1';
                newTask.style.transform = 'translateY(0)';
            }, 50);
        });
    });
}

// Create new task card
function createNewTaskCard() {
    const taskCard = document.createElement('div');
    taskCard.className = 'task-card glass-card';
    taskCard.innerHTML = `
        <div class="task-header">
            <h4>📝 新しいタスク</h4>
            <div class="task-priority medium">🟡</div>
        </div>
        <p class="task-description">タスクの詳細を入力してください</p>
        <div class="task-meta">
            <span class="task-due">期限: 未設定</span>
            <span class="task-estimate">⏱️ 見積時間未設定</span>
        </div>
        <div class="task-labels">
            <span class="label label-dev">新規</span>
        </div>
    `;
    
    return taskCard;
}

// Pomodoro timer functionality
function setupPomodoroTimer() {
    const timerBtns = document.querySelectorAll('.timer-btn');
    let isRunning = false;
    let timeLeft = 25 * 60; // 25 minutes in seconds
    let timerInterval;
    
    timerBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const icon = this.querySelector('i');
            
            if (icon.classList.contains('fa-pause')) {
                // Pause timer
                pauseTimer();
                icon.className = 'fas fa-play';
                isRunning = false;
            } else if (icon.classList.contains('fa-play')) {
                // Start timer
                startTimer();
                icon.className = 'fas fa-pause';
                isRunning = true;
            } else if (icon.classList.contains('fa-stop')) {
                // Stop timer
                stopTimer();
                isRunning = false;
            } else if (icon.classList.contains('fa-forward')) {
                // Skip to next session
                skipSession();
            }
        });
    });
    
    function startTimer() {
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
                updateTimerProgress();
            } else {
                // Timer finished
                completeSession();
            }
        }, 1000);
    }
    
    function pauseTimer() {
        clearInterval(timerInterval);
    }
    
    function stopTimer() {
        clearInterval(timerInterval);
        timeLeft = 25 * 60;
        updateTimerDisplay();
        updateTimerProgress();
        
        const playBtn = document.querySelector('.timer-btn .fa-pause, .timer-btn .fa-play');
        if (playBtn) {
            playBtn.className = 'fas fa-play';
        }
    }
    
    function skipSession() {
        completeSession();
    }
    
    function completeSession() {
        clearInterval(timerInterval);
        
        // Simulate notification
        showNotification('ポモドーロセッション完了！', 'success');
        
        // Reset timer
        timeLeft = 5 * 60; // 5 minute break
        updateTimerDisplay();
        updateTimerProgress();
        
        // Update session count
        const sessionCount = document.querySelector('.session-count');
        if (sessionCount) {
            const current = parseInt(sessionCount.textContent.split('/')[0]);
            const total = parseInt(sessionCount.textContent.split('/')[1]);
            sessionCount.textContent = `${current + 1}/${total}セッション`;
        }
    }
    
    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const timerTime = document.querySelector('.timer-time');
        if (timerTime) {
            timerTime.textContent = display;
        }
    }
    
    function updateTimerProgress() {
        const totalTime = 25 * 60;
        const progress = ((totalTime - timeLeft) / totalTime) * 100;
        const progressRing = document.querySelector('.progress-ring');
        if (progressRing) {
            progressRing.style.setProperty('--progress', progress);
        }
    }
}

// Search functionality
function setupSearch() {
    const searchInput = document.querySelector('.search-box input');
    const taskCards = document.querySelectorAll('.task-card');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            
            taskCards.forEach(card => {
                const title = card.querySelector('.task-header h4').textContent.toLowerCase();
                const description = card.querySelector('.task-description')?.textContent.toLowerCase() || '';
                
                if (title.includes(searchTerm) || description.includes(searchTerm)) {
                    card.style.display = 'block';
                    card.style.animation = 'slideUp 0.3s ease-out';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
}

// Drag and drop simulation
function setupDragDropSimulation() {
    const taskCards = document.querySelectorAll('.task-card');
    const timeSlots = document.querySelectorAll('.time-slot .slot-content.empty');
    
    // Add drag simulation to task cards
    taskCards.forEach(card => {
        card.draggable = true;
        
        card.addEventListener('dragstart', function() {
            this.style.opacity = '0.5';
            this.style.transform = 'rotate(3deg)';
            this.classList.add('dragging');
        });
        
        card.addEventListener('dragend', function() {
            this.style.opacity = '1';
            this.style.transform = 'rotate(0deg)';
            this.classList.remove('dragging');
        });
    });
    
    // Add drop zones to timeline slots
    timeSlots.forEach(slot => {
        slot.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderColor = 'var(--primary)';
            this.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
        });
        
        slot.addEventListener('dragleave', function() {
            this.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            this.style.backgroundColor = 'transparent';
        });
        
        slot.addEventListener('drop', function(e) {
            e.preventDefault();
            
            // Simulate dropping a task
            this.innerHTML = `
                <div class="timeline-task">
                    <h4>📝 ドロップされたタスク</h4>
                    <span class="task-duration">2時間</span>
                    <div class="task-status">スケジュール済み</div>
                </div>
            `;
            
            this.classList.remove('empty');
            this.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            this.style.backgroundColor = 'transparent';
            
            showNotification('タスクをタイムラインに追加しました', 'success');
        });
    });
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 0.75rem;
        color: white;
        font-weight: 500;
        z-index: 1000;
        transform: translateX(400px);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    if (type === 'success') {
        notification.style.borderLeftColor = 'var(--accent)';
        notification.innerHTML = `<i class="fas fa-check-circle" style="color: var(--accent); margin-right: 0.5rem;"></i>${message}`;
    } else {
        notification.innerHTML = `<i class="fas fa-info-circle" style="color: var(--primary); margin-right: 0.5rem;"></i>${message}`;
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Animation effects
function startAnimations() {
    // Animate task cards on load
    const taskCards = document.querySelectorAll('.task-card');
    taskCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Animate stats on load
    const statNumbers = document.querySelectorAll('.stat-number, .stat-info h3');
    statNumbers.forEach(stat => {
        animateNumber(stat);
    });
    
    // Animate chart bars
    const chartBars = document.querySelectorAll('.bar, .time-bar');
    chartBars.forEach((bar, index) => {
        bar.style.transform = 'scaleY(0)';
        bar.style.transformOrigin = 'bottom';
        setTimeout(() => {
            bar.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            bar.style.transform = 'scaleY(1)';
        }, index * 200);
    });
}

// Animate numbers
function animateNumber(element) {
    const text = element.textContent;
    const number = parseFloat(text);
    
    if (isNaN(number)) return;
    
    const unit = text.replace(number.toString(), '');
    let current = 0;
    const increment = number / 30;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= number) {
            current = number;
            clearInterval(timer);
        }
        
        if (unit.includes('h')) {
            element.textContent = current.toFixed(1) + unit;
        } else if (unit.includes('%')) {
            element.textContent = Math.round(current) + unit;
        } else {
            element.textContent = Math.round(current) + unit;
        }
    }, 50);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+N: New task
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        const addBtn = document.querySelector('.add-task-btn');
        if (addBtn) addBtn.click();
    }
    
    // Ctrl+M: Switch between kanban and timeline
    if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        const kanbanTab = document.querySelector('[data-view="kanban"]');
        const timelineTab = document.querySelector('[data-view="timeline"]');
        const currentActive = document.querySelector('.nav-tab.active');
        
        if (currentActive === kanbanTab) {
            timelineTab.click();
        } else {
            kanbanTab.click();
        }
    }
    
    // Escape: Clear search
    if (e.key === 'Escape') {
        const searchInput = document.querySelector('.search-box input');
        if (searchInput && document.activeElement === searchInput) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            searchInput.blur();
        }
    }
});

// Filter functionality
document.addEventListener('change', function(e) {
    if (e.target.type === 'checkbox' && e.target.closest('.filter-group')) {
        applyFilters();
    }
});

function applyFilters() {
    const checkboxes = document.querySelectorAll('.filter-group input[type="checkbox"]');
    const taskCards = document.querySelectorAll('.task-card');
    
    const activeFilters = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.nextElementSibling.textContent.trim());
    
    taskCards.forEach(card => {
        const priority = card.querySelector('.task-priority');
        let priorityText = '';
        
        if (priority) {
            if (priority.textContent.includes('🔴')) priorityText = '高優先度';
            else if (priority.textContent.includes('🟡')) priorityText = '中優先度';
            else if (priority.textContent.includes('🟢')) priorityText = '低優先度';
        }
        
        if (activeFilters.length === 0 || activeFilters.includes(priorityText)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}