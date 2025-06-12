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
        this.getDOMElements();
        this.setupEventListeners();
        this.loadHabits();
        this.render();
    }

    getDOMElements() {
        this.habitsContainer = document.getElementById('habitsContainer');
        this.addHabitBtn = document.getElementById('addHabitBtn');
        this.habitModal = document.getElementById('habitModal');
        this.habitForm = document.getElementById('habitForm');
        this.deleteModal = document.getElementById('deleteModal');
        this.detailModal = document.getElementById('habitDetailModal');
        this.confirmDeleteBtn = document.getElementById('confirmDelete');
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
            const savedHabits = localStorage.getItem('habits');
            if (!savedHabits) {
                this.habits = [];
                return;
            }

            const parsedHabits = JSON.parse(savedHabits);
            if (!Array.isArray(parsedHabits)) {
                this.habits = [];
                return;
            }

            this.habits = parsedHabits.map(habit => {
                if (!habit || typeof habit !== 'object') return null;

                return {
                    id: String(habit.id || Date.now()),
                    name: habit.name || 'Hábito sin nombre',
                    goal: parseInt(habit.goal, 10) || 1,
                    icon: habit.icon || '⭐',
                    color: habit.color || '#4CAF50',
                    history: habit.history || {},
                };
            }).filter(Boolean);

        } catch (error) {
            console.error('Error al cargar los hábitos:', error);
            this.habits = [];
        }
    }

    saveHabits() {
        localStorage.setItem('habits', JSON.stringify(this.habits));
        this.render();
    }

    setupEventListeners() {
        this.addHabitBtn.addEventListener('click', () => this.showHabitModal());
        
        this.habitForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleHabitSubmit(e);
        });

        document.querySelectorAll('.close-button').forEach(button => {
            button.addEventListener('click', () => {
                this.hideHabitModal();
                this.hideDeleteModal();
                this.hideDetailModal();
            });
        });

        document.getElementById('cancelHabit').addEventListener('click', () => this.hideHabitModal());
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

        // Eventos para el modal de detalle
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
                    // Implementar calendario
                    break;
                case 'toggle-day':
                    const button = e.target.closest('.calendar-day');
                    if (button && !button.classList.contains('disabled')) {
                        const dateKey = button.dataset.date;
                        this.updateDayProgress(habitId, dateKey);
                        this.updateDetailView(habitId);
                    }
                    break;
            }
        });
    }

    showHabitModal(habitId = null) {
        this.habitToEdit = habitId ? this.habits.find(h => h.id === habitId) : null;
        if (this.habitToEdit) {
            this.habitForm.elements.habitName.value = this.habitToEdit.name;
            this.habitForm.elements.habitGoal.value = this.habitToEdit.goal;
            this.habitForm.elements.habitIcon.value = this.habitToEdit.icon;
            this.habitForm.elements.habitColor.value = this.habitToEdit.color;
            this.habitModal.querySelector('h2').textContent = 'Editar Hábito';
        } else {
            this.habitForm.reset();
            this.habitModal.querySelector('h2').textContent = 'Nuevo Hábito';
        }
        this.habitModal.classList.add('active');
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

        // Actualizar encabezado
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
        calendarGrid.innerHTML = '';
        calendarGrid.style.color = habit.color;

        // Generar cuadrícula más pequeña de 30x7
        const totalDays = 30 * 7;
        const today = new Date();
        const dates = [];

        // Generar fechas desde hoy hacia atrás
        for (let i = 0; i < totalDays; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            dates.push(date);
        }

        // Ordenar fechas de más antigua a más reciente
        dates.sort((a, b) => a - b);

        // Crear la cuadrícula
        dates.forEach(date => {
            const dateKey = this.dateHelpers.getDateKey(date);
            const isCompleted = habit.history[dateKey] > 0;

            const dayElement = document.createElement('div');
            dayElement.className = `calendar-day${isCompleted ? ' completed' : ''}`;
            calendarGrid.appendChild(dayElement);
        });

        // Actualizar estadísticas
        const completedDays = Object.values(habit.history).filter(v => v > 0).length;
        modal.querySelector('.completion-text').textContent = `Completado ${completedDays} días`;
    }

    handleHabitSubmit(e) {
        e.preventDefault();
        const formData = new FormData(this.habitForm);
        const habitData = {
            name: formData.get('habitName'),
            goal: parseInt(formData.get('habitGoal'), 10) || 1,
            icon: formData.get('habitIcon'),
            color: formData.get('habitColor')
        };

        if (this.habitToEdit) {
            const index = this.habits.findIndex(h => h.id === this.habitToEdit.id);
            if (index !== -1) {
                this.habits[index] = { ...this.habits[index], ...habitData };
            }
        } else {
            const newHabit = {
                ...habitData,
                id: Date.now().toString(),
                history: {}
            };
            this.habits.push(newHabit);
        }

        this.saveHabits();
        this.hideHabitModal();
    }

    confirmDelete() {
        if (!this.habitToDelete) return;
        this.habits = this.habits.filter(h => h.id !== this.habitToDelete);
        this.saveHabits();
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
        this.render();
    }

    updateDetailStatusButton(habit) {
        const statusBtn = this.detailModal.querySelector('#detailStatusBtn');
        const todayKey = this.dateHelpers.getTodayKey();
        const progress = habit.history[todayKey] || 0;
        const isCompleted = progress >= habit.goal;
        
        if (isCompleted) {
            statusBtn.innerHTML = `<span class="material-icons">check_circle</span> Completado`;
            statusBtn.style.backgroundColor = habit.color;
            statusBtn.style.borderColor = habit.color;
            statusBtn.classList.add('completed');
        } else {
            statusBtn.innerHTML = `<span class="material-icons">radio_button_unchecked</span> No completado ${progress}/${habit.goal}`;
            statusBtn.style.backgroundColor = 'transparent';
            statusBtn.style.borderColor = 'var(--border-color)';
            statusBtn.classList.remove('completed');
        }
    }

    updateDetailStreakChip(habit) {
        const streakChip = this.detailModal.querySelector('#detailStreakChip');
        const streakCountEl = this.detailModal.querySelector('#detailStreakCount');
        const streak = this.calculateStreak(habit);
        
        if (streak > 0) {
            streakCountEl.textContent = streak;
            streakChip.classList.add('active');
        } else {
            streakCountEl.textContent = '0';
            streakChip.classList.remove('active');
        }
    }

    renderYearGrid(habit) {
        const grid = this.detailModal.querySelector('#yearGrid');
        grid.innerHTML = '';
        const yearDates = this.dateHelpers.getYearDates();
        
        const firstDay = yearDates[0].getDay();
        const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
        
        grid.style.gridTemplateColumns = `repeat(${Math.ceil((yearDates.length + adjustedFirstDay) / 7)}, 1fr)`;

        for (let i = 0; i < adjustedFirstDay; i++) {
            grid.appendChild(document.createElement('div'));
        }

        yearDates.forEach(date => {
            const dayElement = document.createElement('div');
            const dateKey = this.dateHelpers.getDateKey(date);
            const progress = habit.history[dateKey] || 0;
            const opacity = habit.goal > 0 ? progress / habit.goal : 0;
            
            dayElement.className = 'year-grid-day';
            if (opacity > 0) {
                dayElement.style.backgroundColor = habit.color;
                dayElement.style.opacity = opacity;
            }
            grid.appendChild(dayElement);
        });
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

        const weekTrack = this.renderWeekTrack(habit);
        
        habitCard.appendChild(header);
        habitCard.appendChild(weekTrack);

        return habitCard;
    }

    renderWeekTrack(habit) {
        const weekTrack = document.createElement('div');
        weekTrack.className = 'habit-week-track';
        
        const today = new Date();
        const todayKey = this.dateHelpers.getTodayKey();
        
        // Obtener los días centrados alrededor de hoy
        const days = this.getWeekDaysCenteredAroundToday();
        
        days.forEach(day => {
            const dayTrack = document.createElement('div');
            dayTrack.className = 'day-track';
            
            const isCompleted = habit.history[day.dateKey] > 0;
            const isFuture = day.dateKey > todayKey;
            const isToday = day.dateKey === todayKey;
            
            let statusClass = 'day-status';
            if (isCompleted) statusClass += ' completed';
            if (isFuture) statusClass += ' future';
            if (isToday) statusClass += ' today';
            
            dayTrack.innerHTML = `
                <span class="day-name">${day.shortName}</span>
                <button class="${statusClass}" data-date="${day.dateKey}" data-action="toggle-day">
                    ${isCompleted ? '✓' : ''}
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

        // Agregar 3 días antes
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

        // Agregar el día actual
        days.push({
            date: today,
            dateKey: this.dateHelpers.getDateKey(today),
            shortName: dayNames[today.getDay()].short,
            longName: dayNames[today.getDay()].long
        });

        // Agregar 3 días después
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

    render() {
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
}