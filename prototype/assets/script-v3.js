// TaskTimeFlow v3 - Ultimate UI

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Global state
let appState = {
    columns: [
        { id: 'todo', name: 'ToDo', icon: '📝' },
        { id: 'in-progress', name: '進行中', icon: '🚀' },
        { id: 'review', name: 'レビュー', icon: '👀' },
        { id: 'completed', name: '完了', icon: '✅' }
    ],
    taskAreaRatio: 50, // percentage
    isLayoutSwapped: false,
    isAssistantCollapsed: true
};

function initializeApp() {
    setupSmartFilters();
    setupPanelResizer();
    setupAssistantToggle();
    setupLayoutControls();
    setupDragAndDrop();
    setupTimelineTaskActions();
    setupColumnEditor();
    setupTaskActions();
    setupTimerFunctionality();
    setupCurrentTimeIndicator();
    startAnimations();
    
    // Load saved state
    loadAppState();
}

// Smart Filters
function setupSmartFilters() {
    const filters = document.querySelectorAll('.smart-filter');
    
    filters.forEach(filter => {
        filter.addEventListener('click', function() {
            filters.forEach(f => f.classList.remove('active'));
            this.classList.add('active');
            
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
    
    // Reset all cards
    taskCards.forEach(card => {
        card.style.display = 'block';
        card.style.opacity = '1';
    });
    
    if (filterType === 'all') {
        showNotification('すべてのタスクを表示中', 'info');
        return;
    }
    
    taskCards.forEach(card => {
        let shouldShow = false;
        
        switch(filterType) {
            case 'now':
                shouldShow = isImmediateTask(card);
                break;
            case 'quick':
                shouldShow = isQuickTask(card);
                break;
            case 'focus':
                shouldShow = isFocusTask(card);
                break;
        }
        
        if (!shouldShow) {
            card.style.opacity = '0.3';
        }
    });
    
    showNotification(`${getFilterDisplayName(filterType)}のタスクを強調表示中`, 'info');
}

function isImmediateTask(card) {
    const duration = card.querySelector('.duration');
    if (duration && duration.textContent.includes('15分')) return true;
    
    const context = card.querySelector('.context');
    if (context && context.textContent.includes('どこでも')) return true;
    
    return false;
}

function isQuickTask(card) {
    const duration = card.querySelector('.duration');
    if (!duration) return false;
    
    const minutes = extractMinutes(duration.textContent);
    return minutes <= 15;
}

function isFocusTask(card) {
    const title = card.querySelector('h4').textContent;
    return title.includes('設計') || title.includes('企画') || title.includes('作成');
}

function getFilterDisplayName(filterType) {
    const names = {
        'now': '今すぐできる',
        'quick': '15分以内',
        'focus': '集中力必要'
    };
    return names[filterType] || filterType;
}

function extractMinutes(text) {
    const match = text.match(/(\d+)分/);
    return match ? parseInt(match[1]) : 0;
}

// Panel Resizer
function setupPanelResizer() {
    const resizer = document.getElementById('resizer');
    const workspace = document.getElementById('mainWorkspace');
    const taskArea = document.getElementById('taskArea');
    const timelineArea = document.getElementById('timelineArea');
    
    let isResizing = false;
    
    resizer.addEventListener('mousedown', function(e) {
        isResizing = true;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
    });
    
    function handleResize(e) {
        if (!isResizing) return;
        
        const workspaceRect = workspace.getBoundingClientRect();
        const offsetX = e.clientX - workspaceRect.left;
        const percentage = (offsetX / workspaceRect.width) * 100;
        
        // Limit between 20% and 80%
        const clampedPercentage = Math.max(20, Math.min(80, percentage));
        
        taskArea.style.flex = `0 0 ${clampedPercentage}%`;
        timelineArea.style.flex = `0 0 ${100 - clampedPercentage}%`;
        
        appState.taskAreaRatio = clampedPercentage;
        saveAppState();
    }
    
    function stopResize() {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    }
}

// Assistant Toggle
function setupAssistantToggle() {
    const toggleBtn = document.getElementById('toggleAssistant');
    const panelToggle = document.getElementById('panelToggle');
    const assistantPanel = document.getElementById('assistantPanel');
    
    [toggleBtn, panelToggle].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', function() {
                appState.isAssistantCollapsed = !appState.isAssistantCollapsed;
                
                if (appState.isAssistantCollapsed) {
                    assistantPanel.classList.add('collapsed');
                } else {
                    assistantPanel.classList.remove('collapsed');
                }
                
                // Update button state
                if (toggleBtn) {
                    toggleBtn.classList.toggle('active', !appState.isAssistantCollapsed);
                }
                
                saveAppState();
            });
        }
    });
}

// Layout Controls
function setupLayoutControls() {
    const swapBtn = document.getElementById('swapLayout');
    const workspace = document.getElementById('mainWorkspace');
    
    swapBtn.addEventListener('click', function() {
        appState.isLayoutSwapped = !appState.isLayoutSwapped;
        
        if (appState.isLayoutSwapped) {
            workspace.classList.add('swapped');
            swapBtn.classList.add('active');
            showNotification('レイアウトを入れ替えました', 'success');
        } else {
            workspace.classList.remove('swapped');
            swapBtn.classList.remove('active');
            showNotification('レイアウトを元に戻しました', 'success');
        }
        
        saveAppState();
    });
}

// Drag and Drop
function setupDragAndDrop() {
    setupTaskCardDragAndDrop();
    setupTimelineDropZones();
    setupKanbanDropZones();
}

function setupTaskCardDragAndDrop() {
    const taskCards = document.querySelectorAll('.task-card[draggable="true"]');
    
    taskCards.forEach(card => {
        card.addEventListener('dragstart', handleTaskDragStart);
        card.addEventListener('dragend', handleTaskDragEnd);
    });
}

function handleTaskDragStart(e) {
    this.classList.add('dragging');
    
    const taskData = {
        id: this.dataset.taskId,
        title: this.querySelector('h4').textContent,
        duration: this.querySelector('.duration')?.textContent || '30分',
        priority: this.querySelector('.task-priority')?.className || '',
        sourceColumn: this.closest('.kanban-column')?.dataset.column
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(taskData));
    
    // Visual feedback for drop zones
    document.querySelectorAll('.drop-zone, .task-list').forEach(zone => {
        zone.classList.add('drag-active');
    });
}

function handleTaskDragEnd(e) {
    this.classList.remove('dragging');
    
    // Reset drop zones
    document.querySelectorAll('.drop-zone, .task-list, .kanban-column').forEach(zone => {
        zone.classList.remove('drag-active', 'drag-over');
    });
}

function setupTimelineDropZones() {
    const dropZones = document.querySelectorAll('.drop-zone');
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('dragenter', handleDragEnter);
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', handleTimelineDrop);
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

function handleTimelineDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    try {
        const taskData = JSON.parse(e.dataTransfer.getData('application/json'));
        const timeSlot = this.closest('.time-slot');
        const timeLabel = timeSlot?.querySelector('.time-label')?.textContent || '未定';
        
        createTimelineTask(this, taskData, timeLabel);
        removeTaskFromKanban(taskData.id);
        
        showNotification(`${timeLabel}にタスクをスケジュールしました`, 'success');
        
    } catch (error) {
        console.error('Timeline drop failed:', error);
        showNotification('タスクの追加に失敗しました', 'error');
    }
}

function createTimelineTask(dropZone, taskData, timeLabel) {
    const timelineTask = document.createElement('div');
    timelineTask.className = 'timeline-task';
    timelineTask.dataset.taskId = taskData.id;
    timelineTask.innerHTML = `
        <div class="task-header">
            <h4>${taskData.title}</h4>
            <div class="task-actions">
                <button class="complete-btn" title="完了にする">
                    <i class="fas fa-check"></i>
                </button>
                <button class="pause-btn" title="一時停止">
                    <i class="fas fa-pause"></i>
                </button>
            </div>
        </div>
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
    
    // Setup task actions
    setupTimelineTaskActionsForElement(timelineTask);
    
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

function setupKanbanDropZones() {
    const taskLists = document.querySelectorAll('.task-list');
    
    taskLists.forEach(list => {
        list.addEventListener('dragover', handleDragOver);
        list.addEventListener('dragenter', function(e) {
            e.preventDefault();
            this.closest('.kanban-column').classList.add('drag-over');
        });
        list.addEventListener('dragleave', function(e) {
            if (!this.closest('.kanban-column').contains(e.relatedTarget)) {
                this.closest('.kanban-column').classList.remove('drag-over');
            }
        });
        list.addEventListener('drop', handleKanbanDrop);
    });
}

function handleKanbanDrop(e) {
    e.preventDefault();
    this.closest('.kanban-column').classList.remove('drag-over');
    
    try {
        const taskData = JSON.parse(e.dataTransfer.getData('application/json'));
        const targetStatus = this.dataset.status;
        const sourceColumn = taskData.sourceColumn;
        
        if (sourceColumn !== targetStatus) {
            moveTaskBetweenColumns(taskData.id, sourceColumn, targetStatus);
            showNotification(`タスクを${getColumnDisplayName(targetStatus)}に移動しました`, 'success');
        }
        
    } catch (error) {
        console.error('Kanban drop failed:', error);
        showNotification('タスクの移動に失敗しました', 'error');
    }
}

function getColumnDisplayName(columnId) {
    const column = appState.columns.find(col => col.id === columnId);
    return column ? column.name : columnId;
}

function moveTaskBetweenColumns(taskId, sourceColumnId, targetColumnId) {
    const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
    const targetList = document.querySelector(`[data-status="${targetColumnId}"]`);
    
    if (taskCard && targetList) {
        // Update task appearance based on target column
        updateTaskAppearance(taskCard, targetColumnId);
        
        // Move the element
        targetList.appendChild(taskCard);
        
        // Update counters
        updateColumnCounts();
        
        // Animate the move
        taskCard.style.animation = 'slideUp 0.3s ease-out';
    }
}

function updateTaskAppearance(taskCard, status) {
    // Remove existing status classes
    taskCard.classList.remove('in-progress', 'completed');
    
    // Add new status class
    if (status === 'in-progress') {
        taskCard.classList.add('in-progress');
    } else if (status === 'completed') {
        taskCard.classList.add('completed');
        
        // Add completion time if not exists
        if (!taskCard.querySelector('.completed-time')) {
            const taskMeta = taskCard.querySelector('.task-meta');
            const completedTime = document.createElement('span');
            completedTime.className = 'completed-time';
            completedTime.innerHTML = `
                <i class="fas fa-check"></i>
                完了: ${new Date().toLocaleTimeString('ja-JP', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })}
            `;
            taskMeta.appendChild(completedTime);
        }
    }
}

function removeTaskFromKanban(taskId) {
    const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskCard && taskCard.closest('.kanban-column')) {
        taskCard.style.transition = 'all 0.3s ease-out';
        taskCard.style.opacity = '0';
        taskCard.style.transform = 'translateX(-100%) scale(0.8)';
        
        setTimeout(() => {
            taskCard.remove();
            updateColumnCounts();
        }, 300);
    }
}

function updateColumnCounts() {
    const columns = document.querySelectorAll('.kanban-column');
    
    columns.forEach(column => {
        const taskList = column.querySelector('.task-list');
        const countElement = column.querySelector('.task-count');
        const taskCount = taskList.querySelectorAll('.task-card').length;
        
        if (countElement) {
            countElement.textContent = taskCount;
        }
    });
}

// Timeline Task Actions
function setupTimelineTaskActions() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.complete-btn')) {
            handleTimelineTaskComplete(e.target.closest('.timeline-task'));
        }
        
        if (e.target.closest('.pause-btn')) {
            handleTimelineTaskPause(e.target.closest('.timeline-task'));
        }
    });
}

function setupTimelineTaskActionsForElement(taskElement) {
    const completeBtn = taskElement.querySelector('.complete-btn');
    const pauseBtn = taskElement.querySelector('.pause-btn');
    
    if (completeBtn) {
        completeBtn.addEventListener('click', function() {
            handleTimelineTaskComplete(taskElement);
        });
    }
    
    if (pauseBtn) {
        pauseBtn.addEventListener('click', function() {
            handleTimelineTaskPause(taskElement);
        });
    }
}

function handleTimelineTaskComplete(timelineTask) {
    const taskId = timelineTask.dataset.taskId;
    const title = timelineTask.querySelector('h4').textContent;
    
    // Update timeline task appearance
    timelineTask.classList.add('completed');
    const status = timelineTask.querySelector('.task-status');
    if (status) {
        status.textContent = '完了';
        status.className = 'task-status completed';
    }
    
    // Update complete button
    const completeBtn = timelineTask.querySelector('.complete-btn');
    if (completeBtn) {
        completeBtn.classList.add('completed');
        completeBtn.title = '完了済み';
    }
    
    // Move corresponding kanban task to completed column
    const kanbanTask = document.querySelector(`.kanban-column [data-task-id="${taskId}"]`);
    if (kanbanTask) {
        moveTaskBetweenColumns(taskId, kanbanTask.closest('.kanban-column').dataset.column, 'completed');
    } else {
        // Create new completed task in kanban
        createCompletedKanbanTask(taskId, title);
    }
    
    showNotification(`「${title}」を完了しました！`, 'success');
    
    // Update progress
    updateDailyProgress();
}

function handleTimelineTaskPause(timelineTask) {
    const title = timelineTask.querySelector('h4').textContent;
    
    // Update status
    const status = timelineTask.querySelector('.task-status');
    if (status) {
        status.textContent = '一時停止';
        status.className = 'task-status paused';
    }
    
    showNotification(`「${title}」を一時停止しました`, 'info');
}

function createCompletedKanbanTask(taskId, title) {
    const completedList = document.querySelector('[data-status="completed"]');
    if (!completedList) return;
    
    const taskCard = document.createElement('div');
    taskCard.className = 'task-card completed';
    taskCard.dataset.taskId = taskId;
    taskCard.innerHTML = `
        <div class="task-header">
            <h4>✅ ${title}</h4>
        </div>
        <div class="task-meta">
            <span class="completed-time">
                <i class="fas fa-check"></i>
                完了: ${new Date().toLocaleTimeString('ja-JP', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })}
            </span>
        </div>
    `;
    
    completedList.appendChild(taskCard);
    updateColumnCounts();
    
    // Animate in
    taskCard.style.opacity = '0';
    taskCard.style.transform = 'translateY(-20px)';
    setTimeout(() => {
        taskCard.style.transition = 'all 0.3s ease-out';
        taskCard.style.opacity = '1';
        taskCard.style.transform = 'translateY(0)';
    }, 50);
}

// Column Editor
function setupColumnEditor() {
    const editBtn = document.getElementById('editColumns');
    const addBtn = document.getElementById('addColumn');
    const modal = document.getElementById('columnEditModal');
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = document.getElementById('cancelEdit');
    const saveBtn = document.getElementById('saveColumns');
    
    editBtn.addEventListener('click', openColumnEditor);
    addBtn.addEventListener('click', openColumnEditor);
    closeBtn.addEventListener('click', closeColumnEditor);
    cancelBtn.addEventListener('click', closeColumnEditor);
    saveBtn.addEventListener('click', saveColumnChanges);
    
    // Close modal on overlay click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeColumnEditor();
        }
    });
}

function openColumnEditor() {
    const modal = document.getElementById('columnEditModal');
    const columnList = document.getElementById('columnList');
    
    // Clear existing content
    columnList.innerHTML = '';
    
    // Populate with current columns
    appState.columns.forEach((column, index) => {
        const columnItem = document.createElement('div');
        columnItem.className = 'column-item';
        columnItem.dataset.columnId = column.id;
        columnItem.innerHTML = `
            <i class="fas fa-grip-vertical drag-handle"></i>
            <span>${column.icon}</span>
            <input type="text" value="${column.name}" class="column-name-input">
            <i class="fas fa-trash remove-btn" title="削除"></i>
        `;
        
        columnList.appendChild(columnItem);
        
        // Setup remove button
        const removeBtn = columnItem.querySelector('.remove-btn');
        removeBtn.addEventListener('click', function() {
            if (appState.columns.length > 2) {
                columnItem.remove();
            } else {
                showNotification('最低2つのカラムが必要です', 'warning');
            }
        });
    });
    
    // Setup add new column button
    const addNewColumnBtn = document.getElementById('addNewColumn');
    addNewColumnBtn.addEventListener('click', function() {
        const newColumn = document.createElement('div');
        newColumn.className = 'column-item';
        newColumn.dataset.columnId = `custom-${Date.now()}`;
        newColumn.innerHTML = `
            <i class="fas fa-grip-vertical drag-handle"></i>
            <span>📋</span>
            <input type="text" value="新しいカラム" class="column-name-input">
            <i class="fas fa-trash remove-btn" title="削除"></i>
        `;
        
        columnList.appendChild(newColumn);
        
        // Setup remove button
        const removeBtn = newColumn.querySelector('.remove-btn');
        removeBtn.addEventListener('click', function() {
            newColumn.remove();
        });
        
        // Focus on the input
        newColumn.querySelector('.column-name-input').focus();
        newColumn.querySelector('.column-name-input').select();
    });
    
    // Setup drag and drop for reordering
    setupColumnDragAndDrop(columnList);
    
    modal.classList.add('active');
}

function closeColumnEditor() {
    const modal = document.getElementById('columnEditModal');
    modal.classList.remove('active');
}

function saveColumnChanges() {
    const columnItems = document.querySelectorAll('.column-item');
    const newColumns = [];
    
    columnItems.forEach((item, index) => {
        const id = item.dataset.columnId;
        const name = item.querySelector('.column-name-input').value.trim();
        const icon = item.querySelector('span').textContent;
        
        if (name) {
            newColumns.push({ id, name, icon });
        }
    });
    
    if (newColumns.length < 2) {
        showNotification('最低2つのカラムが必要です', 'warning');
        return;
    }
    
    // Update app state
    appState.columns = newColumns;
    
    // Rebuild kanban board
    rebuildKanbanBoard();
    
    // Save state
    saveAppState();
    
    closeColumnEditor();
    showNotification('カラムの変更を保存しました', 'success');
}

function setupColumnDragAndDrop(container) {
    let draggedElement = null;
    
    container.addEventListener('dragstart', function(e) {
        if (e.target.closest('.drag-handle')) {
            draggedElement = e.target.closest('.column-item');
            draggedElement.classList.add('dragging');
        }
    });
    
    container.addEventListener('dragover', function(e) {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) {
            container.appendChild(draggedElement);
        } else {
            container.insertBefore(draggedElement, afterElement);
        }
    });
    
    container.addEventListener('dragend', function(e) {
        if (draggedElement) {
            draggedElement.classList.remove('dragging');
            draggedElement = null;
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.column-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function rebuildKanbanBoard() {
    const kanbanBoard = document.getElementById('kanbanBoard');
    const existingTasks = new Map();
    
    // Store existing tasks
    const existingColumns = kanbanBoard.querySelectorAll('.kanban-column');
    existingColumns.forEach(column => {
        const columnId = column.dataset.column;
        const tasks = [...column.querySelectorAll('.task-card')];
        existingTasks.set(columnId, tasks);
    });
    
    // Clear kanban board
    kanbanBoard.innerHTML = '';
    
    // Rebuild with new columns
    appState.columns.forEach(column => {
        const columnElement = createKanbanColumn(column);
        kanbanBoard.appendChild(columnElement);
        
        // Restore tasks
        const tasks = existingTasks.get(column.id) || [];
        const taskList = columnElement.querySelector('.task-list');
        tasks.forEach(task => {
            taskList.appendChild(task);
        });
    });
    
    // Update counts
    updateColumnCounts();
    
    // Re-setup drag and drop
    setupTaskCardDragAndDrop();
}

function createKanbanColumn(column) {
    const columnElement = document.createElement('div');
    columnElement.className = 'kanban-column';
    columnElement.dataset.column = column.id;
    columnElement.innerHTML = `
        <div class="column-header">
            <div class="column-title">
                <span class="column-icon">${column.icon}</span>
                <span class="column-name" contenteditable="false">${column.name}</span>
                <span class="task-count">0</span>
            </div>
            <div class="column-actions">
                <button class="column-action" title="タスク追加">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="column-action column-menu" title="メニュー">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
        </div>
        <div class="task-list" data-status="${column.id}">
            <!-- Tasks will be added here -->
        </div>
    `;
    
    return columnElement;
}

// Task Actions
function setupTaskActions() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.split-btn')) {
            handleTaskSplit(e.target.closest('.task-card'));
        }
        
        if (e.target.closest('.column-action')) {
            const column = e.target.closest('.kanban-column');
            if (e.target.closest('.column-action').querySelector('.fa-plus')) {
                handleAddTask(column);
            }
        }
    });
}

function handleTaskSplit(taskCard) {
    const title = taskCard.querySelector('h4').textContent;
    const taskList = taskCard.closest('.task-list');
    
    // Remove original task with animation
    taskCard.style.transition = 'all 0.3s ease-out';
    taskCard.style.opacity = '0';
    taskCard.style.transform = 'scale(0.8)';
    
    setTimeout(() => {
        taskCard.remove();
        
        // Add split tasks
        const splitTasks = generateSplitTasks(title);
        splitTasks.forEach((taskTitle, index) => {
            setTimeout(() => {
                const newTask = createSplitTask(taskTitle, index);
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
        
        updateColumnCounts();
    }, 300);
    
    showNotification('タスクを分割しました！', 'success');
}

function generateSplitTasks(originalTitle) {
    const baseName = originalTitle.replace(/[📝🏗️💻📊]/g, '').trim();
    
    return [
        `📋 ${baseName}の要件整理`,
        `✏️ ${baseName}の初期作成`,
        `🔍 ${baseName}の詳細作業`
    ];
}

function createSplitTask(title, index) {
    const taskCard = document.createElement('div');
    taskCard.className = 'task-card';
    taskCard.draggable = true;
    taskCard.dataset.taskId = `split-${Date.now()}-${index}`;
    taskCard.innerHTML = `
        <div class="task-header">
            <h4>${title}</h4>
            <div class="task-priority medium"></div>
        </div>
        <div class="task-meta">
            <span class="duration">
                <i class="fas fa-clock"></i>
                30分
            </span>
            <span class="context">
                <i class="fas fa-laptop"></i>
                PC必要
            </span>
        </div>
    `;
    
    // Setup drag and drop
    taskCard.addEventListener('dragstart', handleTaskDragStart);
    taskCard.addEventListener('dragend', handleTaskDragEnd);
    
    return taskCard;
}

function handleAddTask(column) {
    const columnName = column.querySelector('.column-name').textContent;
    const taskList = column.querySelector('.task-list');
    
    const newTask = document.createElement('div');
    newTask.className = 'task-card';
    newTask.draggable = true;
    newTask.dataset.taskId = `new-${Date.now()}`;
    newTask.innerHTML = `
        <div class="task-header">
            <h4>📝 新しいタスク</h4>
            <div class="task-priority medium"></div>
        </div>
        <div class="task-meta">
            <span class="duration">
                <i class="fas fa-clock"></i>
                未設定
            </span>
        </div>
    `;
    
    taskList.appendChild(newTask);
    updateColumnCounts();
    
    // Setup drag and drop
    newTask.addEventListener('dragstart', handleTaskDragStart);
    newTask.addEventListener('dragend', handleTaskDragEnd);
    
    // Animate in
    newTask.style.opacity = '0';
    newTask.style.transform = 'translateY(-20px)';
    setTimeout(() => {
        newTask.style.transition = 'all 0.3s ease-out';
        newTask.style.opacity = '1';
        newTask.style.transform = 'translateY(0)';
    }, 50);
    
    showNotification(`${columnName}にタスクを追加しました`, 'success');
}

// Timer Functionality
function setupTimerFunctionality() {
    const timerBtns = document.querySelectorAll('.timer-btn');
    let isRunning = false;
    let timeLeft = 25 * 60;
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
        showNotification('ポモドーロセッション完了！', 'success');
        updateDailyProgress();
        
        timeLeft = 5 * 60;
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

// Current Time Indicator
function setupCurrentTimeIndicator() {
    updateCurrentTimePosition();
    setInterval(updateCurrentTimePosition, 60000);
}

function updateCurrentTimePosition() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Calculate position in 24-hour timeline
    const currentDecimalHour = hours + (minutes / 60);
    const position = (currentDecimalHour / 24) * 100;
    
    const indicator = document.querySelector('.current-time-indicator');
    if (indicator) {
        indicator.style.top = `${position}%`;
        
        const badge = indicator.querySelector('.time-badge');
        if (badge) {
            badge.textContent = `現在 ${hours}:${minutes.toString().padStart(2, '0')}`;
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

// State Management
function saveAppState() {
    localStorage.setItem('TaskTimeFlow_v3_state', JSON.stringify(appState));
}

function loadAppState() {
    const saved = localStorage.getItem('TaskTimeFlow_v3_state');
    if (saved) {
        const savedState = JSON.parse(saved);
        appState = { ...appState, ...savedState };
        
        // Apply saved state
        applyLoadedState();
    }
}

function applyLoadedState() {
    const workspace = document.getElementById('mainWorkspace');
    const taskArea = document.getElementById('taskArea');
    const timelineArea = document.getElementById('timelineArea');
    const assistantPanel = document.getElementById('assistantPanel');
    const swapBtn = document.getElementById('swapLayout');
    const toggleBtn = document.getElementById('toggleAssistant');
    
    // Apply panel ratio
    if (appState.taskAreaRatio !== 50) {
        taskArea.style.flex = `0 0 ${appState.taskAreaRatio}%`;
        timelineArea.style.flex = `0 0 ${100 - appState.taskAreaRatio}%`;
    }
    
    // Apply layout swap
    if (appState.isLayoutSwapped) {
        workspace.classList.add('swapped');
        swapBtn.classList.add('active');
    }
    
    // Apply assistant state
    if (appState.isAssistantCollapsed) {
        assistantPanel.classList.add('collapsed');
    } else {
        assistantPanel.classList.remove('collapsed');
        toggleBtn.classList.add('active');
    }
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
    const taskCards = document.querySelectorAll('.task-card');
    taskCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
    
    const progressBars = document.querySelectorAll('.progress-fill');
    progressBars.forEach((bar, index) => {
        const targetWidth = bar.style.width || '0%';
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            bar.style.width = targetWidth;
        }, index * 200);
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        const filterIndex = parseInt(e.key) - 1;
        const filters = document.querySelectorAll('.smart-filter');
        if (filters[filterIndex]) {
            filters[filterIndex].click();
        }
    }
    
    if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        document.getElementById('editColumns').click();
    }
    
    if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        document.getElementById('toggleAssistant').click();
    }
    
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        document.getElementById('swapLayout').click();
    }
    
    if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        const timerBtn = document.querySelector('.timer-btn .fa-pause, .timer-btn .fa-play');
        if (timerBtn) {
            timerBtn.closest('.timer-btn').click();
        }
    }
});

// Auto-save
setInterval(saveAppState, 10000); // Save every 10 seconds