document.addEventListener('DOMContentLoaded', () => {
    new HabitTracker();
});

class DateHelpers {
    constructor() {
        this.weekDayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    }

    getDateKey(date) {
        return date.toISOString().split('T')[0];
    }

    getTodayKey() {
        return this.getDateKey(new Date());
    }

    getToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    }

    getYearDates() {
        const dates = [];
        const today = new Date();
        const startDate = new Date(today.getFullYear(), 0, 1);
        const endDate = new Date(today.getFullYear(), 11, 31);

        for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d));
        }

        return dates;
    }

    getWeekDays() {
        const today = new Date();
        const days = [];
        const currentDay = today.getDay();
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
        
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            days.push({
                date: date,
                name: this.weekDayNames[i]
            });
        }
        
        return days;
    }
}

class HabitTracker {
    constructor() {
        this.habits = [];
        this.dateHelpers = new DateHelpers();
        this.habitToEdit = null;
        this.habitToDelete = null;
        this.habitListView = 'list'; // 'list' or 'grid'
        this.activeView = 'home'; // 'home', 'stats', 'settings'
        this.getDOMElements();
        this.setupEventListeners();
        this.loadHabits();
        this.render();
    }

    getDOMElements() {
        this.habitsContainer = document.getElementById('habitsContainer');
        this.habitsGridContainer = document.getElementById('habitsGridContainer');
        this.statsContainer = document.getElementById('statsContainer');
        this.addHabitBtn = document.getElementById('addHabitBtn');
        this.habitModal = document.getElementById('habitModal');
        this.habitForm = document.getElementById('habitForm');
        this.deleteModal = document.getElementById('deleteModal');
        this.detailModal = document.getElementById('habitDetailModal');
        this.confirmDeleteBtn = document.getElementById('confirmDelete');
        this.viewOptions = document.querySelector('.view-options');
        this.navItems = document.querySelectorAll('.nav-item');
        this.header = document.querySelector('header');
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    loadHabits() {
        try {
            const habits = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key === 'habits') {
                    const savedHabits = localStorage.getItem(key);
                    if (savedHabits) {
                        const parsedHabits = JSON.parse(savedHabits);
                        if (Array.isArray(parsedHabits)) {
                            habits.push(...parsedHabits);
                        }
                    }
                }
            }

            this.habits = habits.map(habit => {
                if (!habit || typeof habit !== 'object') return null;

                return {
                    id: String(habit.id || Date.now()),
                    name: habit.name || 'Hábito sin nombre',
                    goal: parseInt(habit.goal, 10) || 1,
                    desiredStreak: parseInt(habit.desiredStreak, 10) || 7,
                    icon: habit.icon || '⭐',
                    color: habit.color || '#4CAF50',
                    history: habit.history || {},
                    createdAt: habit.createdAt || new Date().toISOString()
                };
            }).filter(Boolean);

        } catch (error) {
            console.error('Error al cargar los hábitos:', error);
            this.habits = [];
        }
    }

    saveHabits() {
        try {
            const habitsData = JSON.stringify(this.habits);
            const temp = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                temp[key] = localStorage.getItem(key);
            }
            temp['habits'] = habitsData;
            
            localStorage.clear();
            Object.keys(temp).forEach(key => {
                localStorage.setItem(key, temp[key]);
            });
        } catch (error) {
            console.error('Error al guardar hábitos:', error);
        }
    }

    setupEventListeners() {
        this.addHabitBtn.addEventListener('click', () => this.showHabitModal());
        
        this.habitForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleHabitSubmit(e);
        });

        document.querySelectorAll('.close-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal.id === 'habitModal') {
                    const habitId = this.habitToEdit ? this.habitToEdit.id : null;
                    this.hideHabitModal();
                    if (habitId) {
                        setTimeout(() => {
                            this.showDetailModal(habitId);
                        }, 100);
                    }
                } else {
                    this.hideHabitModal();
                    this.hideDeleteModal();
                    this.hideDetailModal();
                }
            });
        });

        document.getElementById('cancelHabit').addEventListener('click', () => {
            const habitId = this.habitToEdit ? this.habitToEdit.id : null;
            this.hideHabitModal();
            if (habitId) {
                setTimeout(() => {
                    this.showDetailModal(habitId);
                }, 100);
            }
        });
        document.getElementById('cancelDelete').addEventListener('click', () => this.hideDeleteModal());
        document.getElementById('confirmDelete').addEventListener('click', () => this.deleteHabit());

        this.habitsContainer.addEventListener('click', (e) => {
            const habitCard = e.target.closest('.habit-card');
            if (!habitCard) return;

            const action = e.target.closest('[data-action]')?.dataset.action;
            const habitId = habitCard.dataset.habitId;

            if (action === 'toggle-day') {
                const button = e.target.closest('.day-status');
                if (button && !button.classList.contains('future')) {
                    const dateKey = button.dataset.date;
                    this.updateDayProgress(habitId, dateKey);
                    this.render();
                }
            } else {
                this.showDetailModal(habitId);
            }
        });

        this.habitsGridContainer.addEventListener('click', (e) => {
            const habitCard = e.target.closest('.habit-grid-card');
            if (habitCard) {
                this.showDetailModal(habitCard.dataset.habitId);
            }
        });

        this.viewOptions.addEventListener('click', (e) => {
            const button = e.target.closest('.view-button');
            if (!button) return;

            this.habitListView = button.dataset.view;
            this.render();
        });

        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                if(view === 'settings') return; // Not implemented
                
                this.activeView = view;
                this.render();
            });
        });

        const detailModal = document.getElementById('habitDetailModal');
        detailModal.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (!action) return;

            const habitId = detailModal.dataset.habitId;
            
            switch (action) {
                case 'close-detail':
                    this.hideDetailModal();
                    break;
                case 'edit':
                    this.hideDetailModal();
                    this.showHabitModal(habitId);
                    break;
                case 'delete':
                    this.hideDetailModal();
                    this.showDeleteModal(habitId);
                    break;
                case 'calendar':
                    break;
                case 'complete-today':
                    const todayKey = this.dateHelpers.getTodayKey();
                    this.updateDayProgress(habitId, todayKey);
                    this.updateDetailView(habitId);
                    this.render();
                    break;
                case 'toggle-day':
                    const button = e.target.closest('.calendar-day');
                    if (button && !button.classList.contains('future')) {
                        const dateKey = button.dataset.date;
                        this.updateDayProgress(habitId, dateKey);
                        this.updateDetailView(habitId);
                        this.render(); 
                    }
                    break;
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('calendar-day') && !e.target.classList.contains('future') && !e.target.classList.contains('empty')) {
                const modal = document.getElementById('habitDetailModal');
                if (modal.classList.contains('active')) {
                    const habitId = modal.dataset.habitId;
                    const dateKey = e.target.dataset.date;
                    if (habitId && dateKey) {
                        this.updateDayProgress(habitId, dateKey);
                        this.updateDetailView(habitId);
                        this.render();
                    }
                }
            }
            
            if (!e.target.closest('.emoji-selector') && !e.target.closest('.icon-display')) {
                const emojiSelector = document.getElementById('emojiSelector');
                if (emojiSelector) emojiSelector.classList.remove('show');
            }
            
            if (!e.target.closest('.color-selector') && !e.target.closest('.color-display')) {
                const colorSelector = document.getElementById('colorSelector');
                if (colorSelector) colorSelector.classList.remove('show');
            }
        });
    }

    showHabitModal(habitId = null) {
        this.habitToEdit = habitId ? this.habits.find(h => h.id === habitId) : null;
        
        const modal = this.habitModal;
        const form = this.habitForm;
        
        modal.classList.add('active');
        
        setTimeout(() => {
            this.clearCustomSelectors();
            this.createEmojiSelector();
            this.createColorSelector();
            
            if (this.habitToEdit) {
                form.elements.habitName.value = this.habitToEdit.name;
                form.elements.habitGoal.value = this.habitToEdit.goal;
                form.elements.habitDesiredStreak.value = this.habitToEdit.desiredStreak || 7;
                
                setTimeout(() => {
                    const iconDisplay = document.querySelector('.icon-display');
                    const colorDisplay = document.querySelector('.color-display');
                    if (iconDisplay) iconDisplay.textContent = this.habitToEdit.icon;
                    if (colorDisplay) colorDisplay.style.backgroundColor = this.habitToEdit.color;
                    
                    document.getElementById('habitIcon').value = this.habitToEdit.icon;
                    document.getElementById('habitColor').value = this.habitToEdit.color;
                    
                    this.setSelectedEmoji(this.habitToEdit.icon);
                    this.setSelectedColor(this.habitToEdit.color);
                }, 10);
                
                modal.querySelector('h2').textContent = 'Editar Hábito';
            } else {
                form.reset();
                
                setTimeout(() => {
                    const iconDisplay = document.querySelector('.icon-display');
                    const colorDisplay = document.querySelector('.color-display');
                    if (iconDisplay) iconDisplay.textContent = '⭐';
                    if (colorDisplay) colorDisplay.style.backgroundColor = '#4CAF50';
                    
                    document.getElementById('habitIcon').value = '⭐';
                    document.getElementById('habitColor').value = '#4CAF50';
                    
                    this.setSelectedEmoji('⭐');
                    this.setSelectedColor('#4CAF50');
                }, 10);
                
                modal.querySelector('h2').textContent = 'Nuevo Hábito';
            }
        }, 50);
    }

    clearCustomSelectors() {
        document.querySelectorAll('.icon-display, .color-display, .emoji-selector, .color-selector').forEach(el => el.remove());
        
        const iconInput = document.getElementById('habitIcon');
        const colorInput = document.getElementById('habitColor');
        if (iconInput) iconInput.style.display = 'block';
        if (colorInput) colorInput.style.display = 'block';
    }

    createEmojiSelector() {
        const emojiInput = document.getElementById('habitIcon');
        const inputGroup = emojiInput.parentNode;
        
        const emojis = ['⭐', '🏃', '💪', '📚', '🧘', '💧', '🥗', '😴', '🎯', '🎨', '🎵', '💻', '🏠', '🌱', '⚽', '🏊', '🚴', '🎮', '📱', '☕', '🧠', '❤️', '🔥', '✨'];
        
        const display = document.createElement('div');
        display.className = 'icon-display';
        display.textContent = emojiInput.value || '⭐';
        display.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleEmojiSelector();
        };
        
        const selector = document.createElement('div');
        selector.className = 'emoji-selector';
        selector.id = 'emojiSelector';
        
        emojis.forEach(emoji => {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'emoji-option';
            option.textContent = emoji;
            option.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.selectEmoji(emoji);
            };
            selector.appendChild(option);
        });
        
        emojiInput.style.display = 'none';
        inputGroup.appendChild(display);
        inputGroup.appendChild(selector);
    }

    createColorSelector() {
        const colorInput = document.getElementById('habitColor');
        const inputGroup = colorInput.parentNode;
        
        const colors = [
            '#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', '#607D8B',
            '#8BC34A', '#03A9F4', '#FFC107', '#E91E63', '#673AB7', '#795548',
            '#CDDC39', '#00BCD4', '#FFEB3B', '#3F51B5', '#FF5722', '#9E9E9E',
            '#689F38', '#0288D1', '#F57C00', '#C2185B', '#512DA8', '#455A64'
        ];
        
        const display = document.createElement('div');
        display.className = 'color-display';
        display.style.backgroundColor = colorInput.value || '#4CAF50';
        display.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleColorSelector();
        };
        
        const selector = document.createElement('div');
        selector.className = 'color-selector';
        selector.id = 'colorSelector';
        
        colors.forEach(color => {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'color-option';
            
            const swatch = document.createElement('span');
            swatch.className = 'color-option-swatch';
            swatch.style.backgroundColor = color;
            option.appendChild(swatch);

            option.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.selectColor(color);
            };
            selector.appendChild(option);
        });
        
        colorInput.style.display = 'none';
        inputGroup.appendChild(display);
        inputGroup.appendChild(selector);
    }

    toggleEmojiSelector() {
        const selector = document.getElementById('emojiSelector');
        const colorSelector = document.getElementById('colorSelector');
        
        if (colorSelector) {
            colorSelector.classList.remove('show');
        }
        
        if (selector) {
            selector.classList.toggle('show');
        }
    }

    toggleColorSelector() {
        const selector = document.getElementById('colorSelector');
        const emojiSelector = document.getElementById('emojiSelector');
        
        if (emojiSelector) {
            emojiSelector.classList.remove('show');
        }
        
        if (selector) {
            selector.classList.toggle('show');
        }
    }

    selectEmoji(emoji) {
        document.getElementById('habitIcon').value = emoji;
        const display = document.querySelector('.icon-display');
        if (display) display.textContent = emoji;
        
        this.setSelectedEmoji(emoji);
        
        const selector = document.getElementById('emojiSelector');
        if (selector) selector.classList.remove('show');
    }

    selectColor(color) {
        document.getElementById('habitColor').value = color;
        const display = document.querySelector('.color-display');
        if (display) display.style.backgroundColor = color;
        
        this.setSelectedColor(color);
        
        const selector = document.getElementById('colorSelector');
        if (selector) selector.classList.remove('show');
    }

    setSelectedEmoji(emoji) {
        const options = document.querySelectorAll('.emoji-option');
        options.forEach(option => {
            option.classList.toggle('selected', option.textContent === emoji);
        });
    }

    setSelectedColor(color) {
        const options = document.querySelectorAll('.color-option');
        options.forEach(option => {
            const swatch = option.querySelector('.color-option-swatch');
            if (swatch) {
                 option.classList.toggle('selected', swatch.style.backgroundColor === color);
            }
        });
    }

    hideHabitModal() {
        this.habitModal.classList.remove('active');
        this.habitToEdit = null;
        this.habitForm.reset();
    }

    showDeleteModal(habitId) {
        this.habitToDelete = habitId;
        this.deleteModal.classList.add('active');
    }

    hideDeleteModal() {
        this.deleteModal.classList.remove('active');
        this.habitToDelete = null;
    }

    hideDetailModal() {
        document.getElementById('habitDetailModal').classList.remove('active');
    }

    showDetailModal(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;

        const modal = document.getElementById('habitDetailModal');
        modal.dataset.habitId = habitId;

        const iconContainer = modal.querySelector('.habit-icon-container');
        iconContainer.style.backgroundColor = `${habit.color}20`;
        modal.querySelector('.habit-icon').textContent = habit.icon;
        modal.querySelector('.habit-detail-name').textContent = habit.name;

        this.updateDetailView(habitId);
        modal.classList.add('active');
    }

    updateDetailView(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;
    
        const modal = document.getElementById('habitDetailModal');
        const calendarGrid = modal.querySelector('.habit-calendar-grid');
        this.populateCalendarGrid(habit, calendarGrid);
        this.updateDetailControls(habit);
    }

    handleHabitSubmit(e) {
        e.preventDefault();
        const formData = new FormData(this.habitForm);
        const habitData = {
            name: formData.get('habitName'),
            goal: parseInt(formData.get('habitGoal'), 10) || 1,
            desiredStreak: parseInt(formData.get('habitDesiredStreak'), 10) || 7,
            icon: formData.get('habitIcon'),
            color: formData.get('habitColor')
        };

        let habitId;
        if (this.habitToEdit) {
            const index = this.habits.findIndex(h => h.id === this.habitToEdit.id);
            if (index !== -1) {
                this.habits[index] = { ...this.habits[index], ...habitData };
                habitId = this.habitToEdit.id;
            }
        } else {
            const newHabit = {
                ...habitData,
                id: Date.now().toString(),
                history: {},
                createdAt: new Date().toISOString()
            };
            this.habits.push(newHabit);
            habitId = newHabit.id;
        }

        this.saveHabits();
        this.render();
        this.hideHabitModal();
        
        setTimeout(() => {
            this.showDetailModal(habitId);
        }, 100);
    }

    deleteHabit() {
        if (!this.habitToDelete) return;
        this.habits = this.habits.filter(h => h.id !== this.habitToDelete);
        this.saveHabits();
        this.render();
        this.hideDeleteModal();
    }

    updateDayProgress(habitId, dateKey) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit || !dateKey) return;

        if (dateKey > this.dateHelpers.getTodayKey()) {
            return;
        }

        let currentProgress = habit.history[dateKey] || 0;
        currentProgress++;

        if (currentProgress > habit.goal) {
            currentProgress = 0;
        }

        habit.history[dateKey] = currentProgress;
        this.saveHabits();
    }

    calculateStreak(habit, endDateKey = null) {
        const today = endDateKey ? new Date(endDateKey) : new Date();
        let streak = 0;
        let currentDate = new Date(today);
    
        // If checking for today's streak and today is not complete, start from yesterday
        const todayKey = this.dateHelpers.getDateKey(today);
        if (endDateKey === null && (habit.history[todayKey] || 0) < habit.goal) {
            currentDate.setDate(currentDate.getDate() - 1);
        }
    
        while (true) {
            const dateKey = this.dateHelpers.getDateKey(currentDate);
            const progress = habit.history[dateKey] || 0;
            
            if (progress >= habit.goal) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        return streak;
    }

    calculateLongestStreak(habit) {
        if (!habit.history || Object.keys(habit.history).length === 0) return 0;
    
        const historyKeys = Object.keys(habit.history).sort();
        let longestStreak = 0;
        let currentStreak = 0;
    
        for (let i = 0; i < historyKeys.length; i++) {
            const dateKey = historyKeys[i];
            const progress = habit.history[dateKey] || 0;
    
            if (progress >= habit.goal) {
                // Check if the previous day was also completed
                if (i > 0) {
                    const prevDate = new Date(dateKey);
                    prevDate.setDate(prevDate.getDate() - 1);
                    const prevDateKey = this.dateHelpers.getDateKey(prevDate);
                    if (historyKeys[i-1] === prevDateKey) {
                        currentStreak++;
                    } else {
                        currentStreak = 1;
                    }
                } else {
                    currentStreak = 1;
                }
            } else {
                currentStreak = 0;
            }
    
            if (currentStreak > longestStreak) {
                longestStreak = currentStreak;
            }
        }
        return longestStreak;
    }

    updateDetailControls(habit) {
        const modal = document.getElementById('habitDetailModal');
        const completeButton = modal.querySelector('.complete-button');
        const completeText = modal.querySelector('.complete-text');
        const completeProgress = modal.querySelector('.complete-progress');
        const streakIcon = modal.querySelector('.streak-icon');
        const streakNumber = modal.querySelector('.streak-number');
        
        const todayKey = this.dateHelpers.getTodayKey();
        const todayProgress = habit.history[todayKey] || 0;
        const isCompleted = todayProgress >= habit.goal;
        
        completeButton.style.borderColor = habit.color;
        completeProgress.textContent = `${todayProgress}/${habit.goal}`;
        
        if (isCompleted) {
            completeButton.classList.add('completed');
            completeButton.classList.remove('partial');
            completeButton.style.backgroundColor = habit.color;
            completeText.textContent = 'Completado';
        } else if (todayProgress > 0) {
            completeButton.classList.add('partial');
            completeButton.classList.remove('completed');
            completeButton.style.backgroundColor = `${habit.color}80`;
            completeText.textContent = 'Completar';
        } else {
            completeButton.classList.remove('partial', 'completed');
            completeButton.style.backgroundColor = 'transparent';
            completeText.textContent = 'Completar';
        }
        
        const streak = this.calculateStreak(habit);
        streakNumber.textContent = streak;
        
        if (streak > 0) {
            streakIcon.classList.add('active');
            streakNumber.classList.add('active');
        } else {
            streakIcon.classList.remove('active');
            streakNumber.classList.remove('active');
        }
    }

    populateCalendarGrid(habit, container) {
        container.innerHTML = '';
        const today = new Date();
        const todayKey = this.dateHelpers.getTodayKey();
        
        const startOfWeek = new Date(today);
        const dayOfWeek = (startOfWeek.getDay() + 6) % 7;
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        startOfWeek.setDate(startOfWeek.getDate() - (29 * 7));
    
        for (let week = 0; week < 30; week++) {
            for (let day = 0; day < 7; day++) {
                const date = new Date(startOfWeek);
                date.setDate(startOfWeek.getDate() + (week * 7) + day);
                
                const dateKey = this.dateHelpers.getDateKey(date);
                const progress = habit.history[dateKey] || 0;
                const isCompleted = progress >= habit.goal;
                const isPartial = progress > 0 && !isCompleted;
                const isFuture = date > today;
                const isToday = dateKey === todayKey;
    
                const dayElement = document.createElement('div');
                
                let statusClass = 'calendar-day';
                if (isCompleted) statusClass += ' completed';
                else if (isPartial) statusClass += ' partial';
                if (isFuture) statusClass += ' future';
                if (isToday) statusClass += ' today';
                dayElement.className = statusClass;
    
                const progressOpacity = isPartial ? Math.min(progress / habit.goal, 1) : 0;
    
                dayElement.style.setProperty('--habit-color', habit.color);
                dayElement.style.setProperty('--progress-opacity', progressOpacity);
    
                const gridRow = day + 1;
                const gridColumn = week + 1;
                dayElement.style.gridRow = gridRow;
                dayElement.style.gridColumn = gridColumn;
    
                container.appendChild(dayElement);
            }
        }
    }

    renderHabitCard(habit) {
        const habitCard = document.createElement('div');
        habitCard.className = 'habit-card';
        habitCard.dataset.habitId = habit.id;

        const header = document.createElement('div');
        header.className = 'habit-header';

        header.innerHTML = `
            <div class="habit-icon-container" style="background-color: ${habit.color}20">
                <span class="habit-icon">${habit.icon}</span>
            </div>
            <div class="habit-info">
                <h3 class="habit-name">${habit.name}</h3>
            </div>
        `;

        const streak = this.calculateStreak(habit);
        const streakIndicator = document.createElement('div');
        streakIndicator.className = 'habit-streak-mini';
        streakIndicator.innerHTML = `
            <span class="material-icons streak-icon-mini ${streak > 0 ? 'active' : ''}">local_fire_department</span>
            <span class="streak-number-mini ${streak > 0 ? 'active' : ''}">${streak}</span>
        `;

        const weekTrack = this.renderWeekTrack(habit);
        
        habitCard.appendChild(header);
        habitCard.appendChild(streakIndicator);
        habitCard.appendChild(weekTrack);

        return habitCard;
    }

    renderWeekTrack(habit) {
        const weekTrack = document.createElement('div');
        weekTrack.className = 'habit-week-track';
        
        const todayKey = this.dateHelpers.getTodayKey();
        
        const days = this.getWeekDaysCenteredAroundToday();
        
        days.forEach(day => {
            const dayTrack = document.createElement('div');
            dayTrack.className = 'day-track';
            
            const progress = habit.history[day.dateKey] || 0;
            const isCompleted = progress >= habit.goal;
            const isPartial = progress > 0 && !isCompleted;
            const isFuture = day.dateKey > todayKey;
            const isToday = day.dateKey === todayKey;
            
            let statusClass = 'day-status';
            if (isCompleted) statusClass += ' completed';
            else if (isPartial) statusClass += ' partial';
            if (isFuture) statusClass += ' future';
            if (isToday) statusClass += ' today';
            
            const progressPercentage = habit.goal > 0 ? (progress / habit.goal) * 100 : 0;
            const progressAngle = Math.min(progressPercentage, 100) * 3.6;
            
            dayTrack.innerHTML = `
                <span class="day-name">${day.shortName}</span>
                <button class="${statusClass}" 
                        data-date="${day.dateKey}" 
                        data-action="toggle-day"
                        style="--progress-angle: ${progressAngle}deg; --habit-color: ${habit.color}; --progress-opacity: ${isPartial ? 1 : 0};">
                    <span></span>
                </button>
            `;
            
            weekTrack.appendChild(dayTrack);
        });
        
        return weekTrack;
    }

    getWeekDaysCenteredAroundToday() {
        const today = new Date();
        const days = [];
        const dayNames = {
            0: { long: 'Domingo', short: 'Dom' },
            1: { long: 'Lunes', short: 'Lun' },
            2: { long: 'Martes', short: 'Mar' },
            3: { long: 'Miércoles', short: 'Mié' },
            4: { long: 'Jueves', short: 'Jue' },
            5: { long: 'Viernes', short: 'Vie' },
            6: { long: 'Sábado', short: 'Sáb' }
        };

        for (let i = 3; i > 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            days.push({
                date: date,
                dateKey: this.dateHelpers.getDateKey(date),
                shortName: dayNames[date.getDay()].short,
                longName: dayNames[date.getDay()].long
            });
        }

        days.push({
            date: today,
            dateKey: this.dateHelpers.getDateKey(today),
            shortName: dayNames[today.getDay()].short,
            longName: dayNames[today.getDay()].long
        });

        for (let i = 1; i <= 3; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            days.push({
                date: date,
                dateKey: this.dateHelpers.getDateKey(date),
                shortName: dayNames[date.getDay()].short,
                longName: dayNames[date.getDay()].long
            });
        }

        return days;
    }

    renderListView() {
        this.habitsContainer.innerHTML = '';
        const filteredHabits = this.habits.filter(habit => !habit.archived);
        if (filteredHabits.length === 0) {
            this.habitsContainer.innerHTML = '<p class="no-habits-message">Aún no tienes hábitos. ¡Añade uno para empezar!</p>';
            return;
        }
        filteredHabits.forEach(habit => {
            const habitCard = this.renderHabitCard(habit);
            this.habitsContainer.appendChild(habitCard);
        });
    }

    renderGridView() {
        this.habitsGridContainer.innerHTML = '';
        const filteredHabits = this.habits.filter(habit => !habit.archived);
        if (filteredHabits.length === 0) {
            this.habitsGridContainer.innerHTML = '<p class="no-habits-message">Aún no tienes hábitos. ¡Añade uno para empezar!</p>';
            return;
        }

        filteredHabits.forEach(habit => {
            const card = document.createElement('div');
            card.className = 'habit-grid-card';
            card.dataset.habitId = habit.id;

            const streak = this.calculateStreak(habit);
            const header = document.createElement('div');
            header.className = 'habit-detail-header';
            header.innerHTML = `
                <div class="habit-detail-info">
                    <div class="habit-icon-container" style="background-color: ${habit.color}20">
                        <span class="habit-icon">${habit.icon}</span>
                    </div>
                    <h2 class="habit-detail-name">${habit.name}</h2>
                </div>
                <div class="habit-streak-mini">
                    <span class="material-icons streak-icon-mini ${streak > 0 ? 'active' : ''}">local_fire_department</span>
                    <span class="streak-number-mini ${streak > 0 ? 'active' : ''}">${streak}</span>
                </div>
            `;

            const calendarContainer = document.createElement('div');
            calendarContainer.className = 'habit-calendar-grid';

            card.appendChild(header);
            card.appendChild(calendarContainer);

            this.populateCalendarGrid(habit, calendarContainer);
            this.habitsGridContainer.appendChild(card);
        });
    }

    calculateGlobalStats() {
        let totalCompletions = 0;
        let totalTrackedDays = 0;
        let longestStreakOverall = 0;
    
        this.habits.forEach(habit => {
            const habitCompletions = Object.values(habit.history).filter(p => p >= habit.goal).length;
            totalCompletions += habitCompletions;
    
            const habitStartDate = new Date(habit.createdAt);
            const today = new Date();
            const daysDiff = Math.ceil((today - habitStartDate) / (1000 * 60 * 60 * 24));
            totalTrackedDays += daysDiff > 0 ? daysDiff : 1;
    
            const longestStreak = this.calculateLongestStreak(habit);
            if (longestStreak > longestStreakOverall) {
                longestStreakOverall = longestStreak;
            }
        });
    
        const successRate = totalTrackedDays > 0 ? (totalCompletions / totalTrackedDays * 100).toFixed(1) : 0;
    
        return {
            activeHabits: this.habits.length,
            totalCompletions,
            successRate,
            longestStreakOverall
        };
    }

    renderStatsView() {
        this.statsContainer.innerHTML = '';
        if (this.habits.length === 0) {
            this.statsContainer.innerHTML = '<p class="no-habits-message">No hay datos de estadísticas disponibles. ¡Empieza a seguir tus hábitos!</p>';
            return;
        }
    
        const globalStats = this.calculateGlobalStats();
    
        const generalSection = document.createElement('div');
        generalSection.className = 'stats-section';
        generalSection.innerHTML = `
            <h2>Visión General</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <p class="stat-card-title">Hábitos Activos</p>
                    <p class="stat-card-value">${globalStats.activeHabits}</p>
                </div>
                <div class="stat-card">
                    <p class="stat-card-title">Tasa de Éxito</p>
                    <p class="stat-card-value">${globalStats.successRate}%</p>
                </div>
                <div class="stat-card">
                    <p class="stat-card-title">Racha Máxima</p>
                    <p class="stat-card-value"><span class="material-icons">local_fire_department</span> ${globalStats.longestStreakOverall}</p>
                </div>
                <div class="stat-card">
                    <p class="stat-card-title">Días Completados</p>
                    <p class="stat-card-value">${globalStats.totalCompletions}</p>
                </div>
            </div>
        `;
    
        const habitsSection = document.createElement('div');
        habitsSection.className = 'stats-section';
        habitsSection.innerHTML = '<h2>Estadísticas por Hábito</h2>';
        const habitList = document.createElement('div');
        habitList.className = 'habit-stats-list';
    
        this.habits.forEach(habit => {
            const currentStreak = this.calculateStreak(habit);
            const longestStreak = this.calculateLongestStreak(habit);
            const totalCompletions = Object.values(habit.history).filter(p => p >= habit.goal).length;
            
            const habitStartDate = new Date(habit.createdAt);
            const today = new Date();
            const daysDiff = Math.ceil((today - habitStartDate) / (1000 * 60 * 60 * 24));
            const trackedDays = daysDiff > 0 ? daysDiff : 1;
            const successRate = (totalCompletions / trackedDays * 100).toFixed(1);

            const item = document.createElement('div');
            item.className = 'habit-stat-item';
            item.innerHTML = `
                <div class="habit-stat-identity">
                    <div class="habit-icon-container" style="background-color: ${habit.color}20">
                        <span class="habit-icon">${habit.icon}</span>
                    </div>
                    <h3 class="habit-name">${habit.name}</h3>
                </div>
                <div class="habit-stat-details">
                    <div class="habit-stat-detail">
                        <span>Éxito</span>
                        <span class="value">${successRate}%</span>
                    </div>
                    <div class="habit-stat-detail">
                        <span>Racha Actual</span>
                        <span class="value">${currentStreak}</span>
                    </div>
                    <div class="habit-stat-detail">
                        <span>Racha Máxima</span>
                        <span class="value">${longestStreak}</span>
                    </div>
                    <div class="habit-stat-detail">
                        <span>Completados</span>
                        <span class="value">${totalCompletions}</span>
                    </div>
                </div>
            `;
            habitList.appendChild(item);
        });
    
        habitsSection.appendChild(habitList);
        this.statsContainer.appendChild(generalSection);
        this.statsContainer.appendChild(habitsSection);
    }

    renderHabitsView() {
        this.viewOptions.querySelectorAll('.view-button').forEach(button => {
            button.classList.toggle('active', button.dataset.view === this.habitListView);
        });

        if (this.habitListView === 'grid') {
            this.habitsContainer.classList.add('hidden');
            this.habitsGridContainer.classList.remove('hidden');
            this.renderGridView();
        } else {
            this.habitsGridContainer.classList.add('hidden');
            this.habitsContainer.classList.remove('hidden');
            this.renderListView();
        }
    }

    render() {
        this.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === this.activeView);
        });

        const showHabitViews = this.activeView === 'home';
        this.habitsContainer.classList.toggle('hidden', !showHabitViews);
        this.habitsGridContainer.classList.toggle('hidden', !showHabitViews);
        this.statsContainer.classList.toggle('hidden', this.activeView !== 'stats');
        this.header.classList.toggle('hidden', this.activeView !== 'home');
        this.addHabitBtn.classList.toggle('hidden', this.activeView !== 'home');

        if (this.activeView === 'home') {
            this.renderHabitsView();
        } else if (this.activeView === 'stats') {
            this.renderStatsView();
        }
    }
}