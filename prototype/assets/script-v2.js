// TaskTimeFlow v2 - 実行促進特化UI

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupSmartFilters();
    setupDragAndDrop();
    setupTaskActions();
    setupTimerFunctionality();
    setupSmartSuggestions();
    setupFloatingActions();
    setupCurrentTimeIndicator();
    startAnimations();
    
    // Initialize default filter
    document.querySelector('.smart-filter[data-filter="now"]').click();
}

// Smart Filters
function setupSmartFilters() {
    const filters = document.querySelectorAll('.smart-filter');
    
    filters.forEach(filter => {
        filter.addEventListener('click', function() {
            // Remove active class from all filters
            filters.forEach(f => f.classList.remove('active'));
            
            // Add active class to clicked filter
            this.classList.add('active');
            
            // Apply filter
            applySmartFilter(this.dataset.filter);
            
            // Visual feedback
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });
}

function applySmartFilter(filterType) {
    const taskCards = document.querySelectorAll('.task-card');
    const taskSections = document.querySelectorAll('.task-section');
    
    // Show all sections first
    taskSections.forEach(section => {
        section.style.display = 'flex';
    });
    
    switch(filterType) {
        case 'now':
            // Show only immediate tasks
            highlightSection('今すぐできる');
            break;
        case 'quick':
            // Show tasks under 15 minutes
            filterTasksByDuration(15);
            break;
        case 'focus':
            // Show tasks requiring focus
            filterTasksByContext('集中');
            break;
        case 'routine':
            // Show routine tasks
            filterTasksByType('routine');
            break;
    }
    
    showNotification(`${getFilterDisplayName(filterType)}のタスクを表示中`, 'info');
}

function getFilterDisplayName(filterType) {
    const names = {
        'now': '今すぐできる',
        'quick': '15分以内',
        'focus': '集中力必要',
        'routine': 'ルーチン'
    };
    return names[filterType] || filterType;
}

function highlightSection(sectionName) {
    const sections = document.querySelectorAll('.task-section');
    sections.forEach(section => {
        const header = section.querySelector('.section-header h3');
        if (header && header.textContent.includes(sectionName)) {
            section.style.display = 'flex';
            section.style.animation = 'highlight 0.5s ease-out';
        } else {
            section.style.opacity = '0.5';
        }
    });
}

function filterTasksByDuration(maxMinutes) {
    const taskCards = document.querySelectorAll('.task-card');
    taskCards.forEach(card => {
        const duration = card.querySelector('.duration');
        if (duration) {
            const minutes = extractMinutes(duration.textContent);
            if (minutes <= maxMinutes) {
                card.style.display = 'flex';
                card.style.animation = 'slideUp 0.3s ease-out';
            } else {
                card.style.display = 'none';
            }
        }
    });
}

function extractMinutes(text) {
    const match = text.match(/(\d+)分/);
    return match ? parseInt(match[1]) : 0;
}

// Drag and Drop
function setupDragAndDrop() {
    const taskCards = document.querySelectorAll('.task-card[draggable="true"]');
    const dropZones = document.querySelectorAll('.drop-zone');
    
    // Task card drag events
    taskCards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });
    
    // Drop zone events
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('dragenter', handleDragEnter);
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    this.classList.add('dragging');
    
    // Store task data
    const taskData = {
        title: this.querySelector('h4').textContent,
        duration: this.querySelector('.duration').textContent,
        priority: this.querySelector('.task-priority').className
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(taskData));
    
    // Visual feedback
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.style.borderColor = 'var(--primary)';
        zone.style.animation = 'pulse 1s infinite';
    });
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    // Reset drop zones
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.classList.remove('drag-over');
        zone.style.borderColor = '';
        zone.style.animation = '';
    });
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDragEnter(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    if (!this.contains(e.relatedTarget)) {
        this.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    try {
        const taskData = JSON.parse(e.dataTransfer.getData('application/json'));
        createTimelineTask(this, taskData);
        
        // Success feedback
        showNotification('タスクをスケジュールに追加しました！', 'success');
        
        // Remove from task pool
        const draggedCard = document.querySelector('.task-card.dragging');
        if (draggedCard) {
            animateTaskRemoval(draggedCard);
        }
        
    } catch (error) {
        console.error('Drop failed:', error);
        showNotification('タスクの追加に失敗しました', 'error');
    }
}

function createTimelineTask(dropZone, taskData) {
    const timeSlot = dropZone.closest('.time-slot');
    const timeLabel = timeSlot.querySelector('.time-label').textContent;
    
    // Create timeline task
    const timelineTask = document.createElement('div');
    timelineTask.className = 'timeline-task';
    timelineTask.innerHTML = `
        <h4>${taskData.title}</h4>
        <div class="task-status scheduled">予定</div>
        <div class="task-duration">${taskData.duration}</div>
        <div class="sync-status">
            <i class="fab fa-google"></i>
            Googleカレンダーに同期中...
        </div>
    `;
    
    // Replace drop zone content
    dropZone.innerHTML = '';
    dropZone.appendChild(timelineTask);
    dropZone.classList.remove('empty', 'drop-zone');
    dropZone.classList.add('scheduled');
    
    // Animate in
    timelineTask.style.opacity = '0';
    timelineTask.style.transform = 'scale(0.8)';
    setTimeout(() => {
        timelineTask.style.transition = 'all 0.3s ease-out';
        timelineTask.style.opacity = '1';
        timelineTask.style.transform = 'scale(1)';
    }, 50);
    
    // Simulate Google Calendar sync
    setTimeout(() => {
        const syncStatus = timelineTask.querySelector('.sync-status');
        if (syncStatus) {
            syncStatus.innerHTML = `
                <i class="fab fa-google"></i>
                Googleカレンダー同期済み
            `;
            syncStatus.style.color = 'var(--success)';
        }
    }, 2000);
}

function animateTaskRemoval(taskCard) {
    taskCard.style.transition = 'all 0.3s ease-out';
    taskCard.style.opacity = '0';
    taskCard.style.transform = 'translateX(-100%) scale(0.8)';
    
    setTimeout(() => {
        taskCard.remove();
        updateTaskCounts();
    }, 300);
}

function updateTaskCounts() {
    // Update filter counts
    const filters = document.querySelectorAll('.smart-filter');
    filters.forEach(filter => {
        const count = filter.querySelector('.filter-count');
        if (count) {
            let currentCount = parseInt(count.textContent);
            if (currentCount > 0) {
                count.textContent = currentCount - 1;
            }
        }
    });
    
    // Update pool stats
    const poolStats = document.querySelector('.pool-stats');
    if (poolStats) {
        const taskCount = poolStats.querySelector('.stat');
        if (taskCount) {
            const current = parseInt(taskCount.textContent.match(/\d+/)[0]);
            taskCount.innerHTML = `<i class="fas fa-tasks"></i>${current - 1}個`;
        }
    }
}

// Task Actions
function setupTaskActions() {
    // Schedule now buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.schedule-now')) {
            handleScheduleNow(e.target.closest('.task-card'));
        }
        
        if (e.target.closest('.split-task')) {
            handleSplitTask(e.target.closest('.task-card'));
        }
        
        if (e.target.closest('.split-accept')) {
            handleSplitAccept(e.target.closest('.task-card'));
        }
        
        if (e.target.closest('.expand-hint')) {
            handleExpandSection(e.target.closest('.task-list'));
        }
    });
}

function handleScheduleNow(taskCard) {
    // Find optimal time slot
    const optimalSlot = document.querySelector('.drop-zone.optimal');
    const anySlot = document.querySelector('.drop-zone');
    
    const targetSlot = optimalSlot || anySlot;
    
    if (targetSlot) {
        // Simulate drag and drop
        const taskData = extractTaskData(taskCard);
        createTimelineTask(targetSlot, taskData);
        animateTaskRemoval(taskCard);
        
        showNotification('最適な時間にタスクをスケジュールしました', 'success');
    } else {
        showNotification('利用可能な時間スロットがありません', 'warning');
    }
}

function handleSplitTask(taskCard) {
    const title = taskCard.querySelector('h4').textContent;
    
    // Create split suggestions
    const suggestions = generateSplitSuggestions(title);
    showSplitDialog(suggestions);
}

function handleSplitAccept(taskCard) {
    // Remove the complex task
    animateTaskRemoval(taskCard);
    
    // Add smaller tasks to immediate section
    addSplitTasks();
    
    showNotification('タスクを分割しました！', 'success');
}

function generateSplitSuggestions(title) {
    // AI-like task splitting simulation
    const baseName = title.replace(/[📝🏗️💻📊]/g, '').trim();
    
    return [
        `📋 ${baseName}の要件整理 (30分)`,
        `✏️ ${baseName}の初期作成 (1時間)`,
        `🔍 ${baseName}の詳細執筆 (1.5時間)`,
        `👀 ${baseName}の最終確認 (30分)`
    ];
}

function addSplitTasks() {
    const immediateSection = document.querySelector('.task-section');
    const taskList = immediateSection.querySelector('.task-list');
    
    const splitTasks = [
        '📋 企画書の要件整理',
        '✏️ 企画書の初期作成'
    ];
    
    splitTasks.forEach((taskTitle, index) => {
        setTimeout(() => {
            const newTask = createSplitTaskCard(taskTitle);
            taskList.appendChild(newTask);
            
            // Animate in
            newTask.style.opacity = '0';
            newTask.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                newTask.style.transition = 'all 0.3s ease-out';
                newTask.style.opacity = '1';
                newTask.style.transform = 'translateY(0)';
            }, 50);
        }, index * 200);
    });
}

function createSplitTaskCard(title) {
    const taskCard = document.createElement('div');
    taskCard.className = 'task-card immediate glass-card';
    taskCard.draggable = true;
    taskCard.innerHTML = `
        <div class="task-priority medium"></div>
        <div class="task-content">
            <h4>${title}</h4>
            <div class="task-meta">
                <span class="duration">
                    <i class="fas fa-clock"></i>
                    30分
                </span>
                <span class="context">
                    <i class="fas fa-laptop"></i>
                    PC必要
                </span>
                <span class="energy">
                    <i class="fas fa-battery-half"></i>
                    中エネルギー
                </span>
            </div>
            <div class="task-actions">
                <button class="action-btn schedule-now">
                    <i class="fas fa-calendar-plus"></i>
                    予定化
                </button>
            </div>
        </div>
    `;
    
    // Add drag and drop events
    taskCard.addEventListener('dragstart', handleDragStart);
    taskCard.addEventListener('dragend', handleDragEnd);
    
    return taskCard;
}

function handleExpandSection(taskList) {
    taskList.classList.remove('collapsed');
    taskList.innerHTML = `
        <div class="task-card glass-card" draggable="true">
            <div class="task-priority low"></div>
            <div class="task-content">
                <h4>📚 技術書の読書</h4>
                <div class="task-meta">
                    <span class="duration">
                        <i class="fas fa-clock"></i>
                        45分
                    </span>
                    <span class="context">
                        <i class="fas fa-book"></i>
                        どこでも
                    </span>
                </div>
            </div>
        </div>
        <div class="task-card glass-card" draggable="true">
            <div class="task-priority medium"></div>
            <div class="task-content">
                <h4>📞 顧客への電話</h4>
                <div class="task-meta">
                    <span class="duration">
                        <i class="fas fa-clock"></i>
                        20分
                    </span>
                    <span class="context">
                        <i class="fas fa-phone"></i>
                        静かな場所
                    </span>
                </div>
            </div>
        </div>
    `;
    
    // Re-setup drag and drop for new cards
    taskList.querySelectorAll('.task-card[draggable="true"]').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });
}

function extractTaskData(taskCard) {
    return {
        title: taskCard.querySelector('h4').textContent,
        duration: taskCard.querySelector('.duration').textContent,
        priority: taskCard.querySelector('.task-priority').className
    };
}

// Timer Functionality
function setupTimerFunctionality() {
    const timerBtns = document.querySelectorAll('.timer-btn');
    let isRunning = false;
    let timeLeft = 25 * 60; // 25 minutes in seconds
    let timerInterval;
    
    timerBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const icon = this.querySelector('i');
            
            if (icon.classList.contains('fa-pause')) {
                pauseTimer();
                icon.className = 'fas fa-play';
                isRunning = false;
            } else if (icon.classList.contains('fa-play')) {
                startTimer();
                icon.className = 'fas fa-pause';
                isRunning = true;
            } else if (icon.classList.contains('fa-stop')) {
                stopTimer();
                isRunning = false;
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
    
    function completeSession() {
        clearInterval(timerInterval);
        showNotification('ポモドーロセッション完了！5分休憩しましょう。', 'success');
        
        // Update progress
        updateDailyProgress();
        
        timeLeft = 5 * 60; // 5 minute break
        updateTimerDisplay();
        updateTimerProgress();
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

// Smart Suggestions
function setupSmartSuggestions() {
    const suggestionActions = document.querySelectorAll('.suggestion-action');
    
    suggestionActions.forEach(action => {
        action.addEventListener('click', function() {
            const suggestionItem = this.closest('.suggestion-item');
            const suggestionText = suggestionItem.querySelector('span').textContent;
            
            if (suggestionText.includes('空き時間')) {
                handleOptimalScheduling();
            } else if (suggestionText.includes('分割')) {
                handleAISplitAccept();
            }
            
            // Remove suggestion with animation
            suggestionItem.style.transition = 'all 0.3s ease-out';
            suggestionItem.style.opacity = '0';
            suggestionItem.style.transform = 'translateX(100%)';
            
            setTimeout(() => {
                suggestionItem.remove();
                addNewSuggestion();
            }, 300);
        });
    });
}

function handleOptimalScheduling() {
    const optimalSlot = document.querySelector('.drop-zone.optimal');
    if (optimalSlot) {
        const taskData = {
            title: '📋 企画書の要件整理',
            duration: '30分',
            priority: 'task-priority medium'
        };
        
        createTimelineTask(optimalSlot, taskData);
        showNotification('最適な時間にタスクをスケジュールしました', 'success');
    }
}

function handleAISplitAccept() {
    showNotification('タスクをAIが分割しました', 'success');
    addSplitTasks();
}

function addNewSuggestion() {
    const suggestions = [
        {
            icon: 'fas fa-clock',
            text: '17:00の時間は低エネルギータスクに最適です',
            action: '確認'
        },
        {
            icon: 'fas fa-battery-full',
            text: '午前中の集中力を活用してコーディングをしませんか？',
            action: '実行'
        },
        {
            icon: 'fas fa-sync',
            text: '似たようなタスクをまとめて処理しましょう',
            action: '適用'
        }
    ];
    
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    const suggestionsContainer = document.querySelector('.suggestions');
    
    const newSuggestion = document.createElement('div');
    newSuggestion.className = 'suggestion-item';
    newSuggestion.innerHTML = `
        <i class="${randomSuggestion.icon}"></i>
        <span>${randomSuggestion.text}</span>
        <button class="suggestion-action">${randomSuggestion.action}</button>
    `;
    
    // Add click handler
    newSuggestion.querySelector('.suggestion-action').addEventListener('click', function() {
        this.closest('.suggestion-item').remove();
        showNotification('提案を適用しました', 'success');
    });
    
    suggestionsContainer.appendChild(newSuggestion);
    
    // Animate in
    newSuggestion.style.opacity = '0';
    newSuggestion.style.transform = 'translateX(-100%)';
    setTimeout(() => {
        newSuggestion.style.transition = 'all 0.3s ease-out';
        newSuggestion.style.opacity = '1';
        newSuggestion.style.transform = 'translateX(0)';
    }, 50);
}

// Floating Actions
function setupFloatingActions() {
    const mainFab = document.querySelector('.main-fab');
    const subFabs = document.querySelectorAll('.sub-fab');
    
    subFabs.forEach(fab => {
        fab.addEventListener('click', function() {
            const title = this.getAttribute('title');
            
            if (title.includes('クイック')) {
                handleQuickTaskAdd();
            } else if (title.includes('音声')) {
                handleVoiceTaskAdd();
            } else if (title.includes('分析')) {
                handleAnalyticsOpen();
            }
        });
    });
}

function handleQuickTaskAdd() {
    showNotification('クイックタスク追加機能（開発予定）', 'info');
}

function handleVoiceTaskAdd() {
    showNotification('音声入力機能（開発予定）', 'info');
}

function handleAnalyticsOpen() {
    showNotification('分析画面を開きます', 'info');
}

// Current Time Indicator
function setupCurrentTimeIndicator() {
    updateCurrentTimePosition();
    
    // Update every minute
    setInterval(updateCurrentTimePosition, 60000);
}

function updateCurrentTimePosition() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Calculate position (assuming 8:00-18:00 timeline)
    const startHour = 8;
    const endHour = 18;
    const totalHours = endHour - startHour;
    
    if (hours >= startHour && hours <= endHour) {
        const currentDecimalHour = hours + (minutes / 60);
        const position = ((currentDecimalHour - startHour) / totalHours) * 100;
        
        const indicator = document.querySelector('.current-time-indicator');
        if (indicator) {
            indicator.style.top = `${position}%`;
            
            const badge = indicator.querySelector('.time-badge');
            if (badge) {
                badge.textContent = `現在 ${hours}:${minutes.toString().padStart(2, '0')}`;
            }
        }
    }
}

// Progress Updates
function updateDailyProgress() {
    const progressItems = document.querySelectorAll('.progress-item');
    
    progressItems.forEach(item => {
        const label = item.querySelector('.label').textContent;
        const progressBar = item.querySelector('.progress-fill');
        const value = item.querySelector('.value');
        
        if (label.includes('完了')) {
            // Increase completed tasks
            const current = parseInt(value.textContent.split('/')[0]);
            const total = parseInt(value.textContent.split('/')[1]);
            if (current < total) {
                const newCurrent = current + 1;
                value.textContent = `${newCurrent}/${total}`;
                progressBar.style.width = `${(newCurrent / total) * 100}%`;
            }
        }
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
        max-width: 300px;
    `;
    
    let icon, borderColor;
    switch(type) {
        case 'success':
            icon = 'fas fa-check-circle';
            borderColor = 'var(--success)';
            break;
        case 'warning':
            icon = 'fas fa-exclamation-triangle';
            borderColor = 'var(--warning)';
            break;
        case 'error':
            icon = 'fas fa-times-circle';
            borderColor = 'var(--danger)';
            break;
        default:
            icon = 'fas fa-info-circle';
            borderColor = 'var(--primary)';
    }
    
    notification.style.borderLeftColor = borderColor;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="${icon}" style="color: ${borderColor};"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Animation effects
function startAnimations() {
    // Animate task cards on load
    const taskCards = document.querySelectorAll('.task-card');
    taskCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Animate progress bars
    const progressBars = document.querySelectorAll('.progress-fill');
    progressBars.forEach((bar, index) => {
        const targetWidth = bar.style.width || '0%';
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            bar.style.width = targetWidth;
        }, index * 200);
    });
    
    // Animate timeline tasks
    const timelineTasks = document.querySelectorAll('.timeline-task');
    timelineTasks.forEach((task, index) => {
        task.style.opacity = '0';
        task.style.transform = 'translateY(10px)';
        setTimeout(() => {
            task.style.transition = 'all 0.4s ease-out';
            task.style.opacity = '1';
            task.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+1-4: Quick filters
    if (e.ctrlKey && e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        const filterIndex = parseInt(e.key) - 1;
        const filters = document.querySelectorAll('.smart-filter');
        if (filters[filterIndex]) {
            filters[filterIndex].click();
        }
    }
    
    // Ctrl+N: New task
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        const mainFab = document.querySelector('.main-fab');
        if (mainFab) mainFab.click();
    }
    
    // Space: Start/pause timer
    if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        const timerBtn = document.querySelector('.timer-btn .fa-pause, .timer-btn .fa-play');
        if (timerBtn) {
            timerBtn.closest('.timer-btn').click();
        }
    }
});

// Auto-save and sync simulation
setInterval(() => {
    // Simulate auto-sync with Google
    const syncStatuses = document.querySelectorAll('.sync-status');
    syncStatuses.forEach(status => {
        if (status.textContent.includes('同期中')) {
            status.innerHTML = `
                <i class="fab fa-google"></i>
                Googleカレンダー同期済み
            `;
            status.style.color = 'var(--success)';
        }
    });
}, 3000);