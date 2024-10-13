document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired');
    
    if (typeof dateFns === 'undefined') {
        console.error('date-fns library is not loaded. Please check your network connection and try refreshing the page.');
        document.getElementById('calendar').innerHTML = '<p class="text-danger">Error: Unable to load the calendar. Please check your network connection and try refreshing the page. If the problem persists, please contact support.</p>';
        return;
    }
    
    console.log('date-fns library loaded successfully');
    
    const calendarEl = document.getElementById('calendar');
    const eventModal = new bootstrap.Modal(document.getElementById('eventModal'));
    const eventModalBody = document.getElementById('eventModalBody');
    let currentDate = new Date();
    let events = {};
    let currentView = calendarEl.dataset.view || 'month';
    
    const isEmbedded = document.body.classList.contains('embedded');
    
    function createMonthElement(date) {
        console.log(`Creating month element for ${dateFns.format(date, 'MMMM yyyy', { locale: dateFns.de })}`);
        const monthEl = document.createElement('div');
        monthEl.classList.add('col-12', 'mb-4');
        
        const monthName = dateFns.format(date, 'MMMM yyyy', { locale: dateFns.de });
        monthEl.innerHTML = `
            <h3>${monthName}</h3>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>So</th><th>Mo</th><th>Di</th><th>Mi</th><th>Do</th><th>Fr</th><th>Sa</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        `;
        
        const tbody = monthEl.querySelector('tbody');
        let currentDay = dateFns.startOfMonth(date);
        let weekRow = document.createElement('tr');
        
        for (let i = 0; i < dateFns.getDay(currentDay); i++) {
            weekRow.appendChild(document.createElement('td'));
        }
        
        while (dateFns.getMonth(currentDay) === dateFns.getMonth(date)) {
            const dayCell = document.createElement('td');
            dayCell.textContent = dateFns.format(currentDay, 'dd');
            dayCell.dataset.date = dateFns.format(currentDay, 'yyyy-MM-dd');
            weekRow.appendChild(dayCell);
            
            if (dateFns.getDay(currentDay) === 6) {
                tbody.appendChild(weekRow);
                weekRow = document.createElement('tr');
            }
            
            currentDay = dateFns.addDays(currentDay, 1);
        }
        
        while (weekRow.children.length < 7) {
            weekRow.appendChild(document.createElement('td'));
        }
        tbody.appendChild(weekRow);
        
        return monthEl;
    }
    
    function createWeekElement(date) {
        console.log(`Creating week element for ${dateFns.format(date, 'MMMM yyyy', { locale: dateFns.de })}`);
        const weekEl = document.createElement('div');
        weekEl.classList.add('col-12', 'mb-4');
        
        const weekStart = dateFns.startOfWeek(date, { weekStartsOn: 1 });
        const weekEnd = dateFns.endOfWeek(date, { weekStartsOn: 1 });
        const weekName = `${dateFns.format(weekStart, 'dd.MM.yyyy')} - ${dateFns.format(weekEnd, 'dd.MM.yyyy')}`;
        
        weekEl.innerHTML = `
            <h3>${weekName}</h3>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Mo</th><th>Di</th><th>Mi</th><th>Do</th><th>Fr</th><th>Sa</th><th>So</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        `;
        
        const tbody = weekEl.querySelector('tbody');
        for (let hour = 0; hour < 24; hour++) {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${hour.toString().padStart(2, '0')}:00</td>`;
            
            for (let day = 0; day < 7; day++) {
                const cell = document.createElement('td');
                const cellDate = dateFns.addDays(weekStart, day);
                cell.dataset.date = dateFns.format(cellDate, 'yyyy-MM-dd');
                cell.dataset.time = `${hour.toString().padStart(2, '0')}:00`;
                row.appendChild(cell);
            }
            
            tbody.appendChild(row);
        }
        
        return weekEl;
    }
    
    function createDayElement(date) {
        console.log(`Creating day element for ${dateFns.format(date, 'MMMM dd, yyyy', { locale: dateFns.de })}`);
        const dayEl = document.createElement('div');
        dayEl.classList.add('col-12', 'mb-4');
        
        const dayName = dateFns.format(date, 'EEEE, MMMM dd, yyyy', { locale: dateFns.de });
        
        dayEl.innerHTML = `
            <h3>${dayName}</h3>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Events</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        `;
        
        const tbody = dayEl.querySelector('tbody');
        for (let hour = 0; hour < 24; hour++) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${hour.toString().padStart(2, '0')}:00</td>
                <td data-date="${dateFns.format(date, 'yyyy-MM-dd')}" data-time="${hour.toString().padStart(2, '0')}:00"></td>
            `;
            tbody.appendChild(row);
        }
        
        return dayEl;
    }
    
    function updateCalendar() {
        calendarEl.innerHTML = '';
        let startDate, endDate;
        
        switch (currentView) {
            case 'month':
                calendarEl.appendChild(createMonthElement(currentDate));
                startDate = dateFns.startOfMonth(currentDate);
                endDate = dateFns.endOfMonth(currentDate);
                break;
            case 'week':
                calendarEl.appendChild(createWeekElement(currentDate));
                startDate = dateFns.startOfWeek(currentDate, { weekStartsOn: 1 });
                endDate = dateFns.endOfWeek(currentDate, { weekStartsOn: 1 });
                break;
            case 'day':
                calendarEl.appendChild(createDayElement(currentDate));
                startDate = dateFns.startOfDay(currentDate);
                endDate = dateFns.endOfDay(currentDate);
                break;
        }
        
        if (isEmbedded && window.preloadedEvents) {
            events = JSON.parse(window.preloadedEvents);
            displayEvents();
        } else {
            fetchAndDisplayEvents(startDate, endDate);
        }
    }
    
    if (!isEmbedded) {
        const viewControls = document.createElement('div');
        viewControls.classList.add('d-flex', 'justify-content-between', 'mb-3');
        viewControls.innerHTML = `
            <div class="btn-group" role="group" aria-label="Calendar views">
                <button id="monthView" class="btn btn-secondary">Month</button>
                <button id="weekView" class="btn btn-secondary">Week</button>
                <button id="dayView" class="btn btn-secondary">Day</button>
            </div>
        `;
        calendarEl.parentNode.insertBefore(viewControls, calendarEl);
        
        document.getElementById('monthView').addEventListener('click', () => {
            currentView = 'month';
            updateCalendar();
        });
        
        document.getElementById('weekView').addEventListener('click', () => {
            currentView = 'week';
            updateCalendar();
        });
        
        document.getElementById('dayView').addEventListener('click', () => {
            currentView = 'day';
            updateCalendar();
        });

        const paginationControls = document.createElement('div');
        paginationControls.classList.add('d-flex', 'justify-content-between', 'mb-3');
        paginationControls.innerHTML = `
            <button id="prevPeriod" class="btn btn-secondary">&lt; Previous</button>
            <button id="nextPeriod" class="btn btn-secondary">Next &gt;</button>
        `;
        calendarEl.parentNode.insertBefore(paginationControls, calendarEl);
        
        document.getElementById('prevPeriod').addEventListener('click', () => {
            switch (currentView) {
                case 'month':
                    currentDate = dateFns.subMonths(currentDate, 1);
                    break;
                case 'week':
                    currentDate = dateFns.subWeeks(currentDate, 1);
                    break;
                case 'day':
                    currentDate = dateFns.subDays(currentDate, 1);
                    break;
            }
            updateCalendar();
        });
        
        document.getElementById('nextPeriod').addEventListener('click', () => {
            switch (currentView) {
                case 'month':
                    currentDate = dateFns.addMonths(currentDate, 1);
                    break;
                case 'week':
                    currentDate = dateFns.addWeeks(currentDate, 1);
                    break;
                case 'day':
                    currentDate = dateFns.addDays(currentDate, 1);
                    break;
            }
            updateCalendar();
        });
    }
    
    function fetchAndDisplayEvents(startDate, endDate) {
        console.log('Fetching events');
        
        fetch(`/events?start_date=${dateFns.format(startDate, 'yyyy-MM-dd')}&end_date=${dateFns.format(endDate, 'yyyy-MM-dd')}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(fetchedEvents => {
                console.log(`Received events for ${Object.keys(fetchedEvents).length} dates`);
                events = fetchedEvents;
                displayEvents();
            })
            .catch(error => {
                console.error('Error fetching events:', error);
                calendarEl.innerHTML += '<p class="text-danger">Error: Unable to load events. Please try refreshing the page.</p>';
            });
    }
    
    function displayEvents() {
        Object.keys(events).forEach(date => {
            const cells = document.querySelectorAll(`td[data-date="${date}"]`);
            cells.forEach(cell => {
                const cellTime = cell.dataset.time;
                const dateEvents = events[date].filter(event => event.time === cellTime);
                
                if (dateEvents.length > 0) {
                    cell.classList.add('event-category-' + (dateEvents[0].category || 'default'));
                    cell.style.cursor = 'pointer';
                    if (dateEvents.length > 1) {
                        cell.classList.add('multiple-events');
                    }
                    if (dateEvents.some(event => event.is_recurring)) {
                        cell.classList.add('recurring-event');
                    }
                    cell.addEventListener('click', () => showEventDetails(date, cellTime));
                }
            });
        });
    }
    
    function showEventDetails(date, time) {
        const dateEvents = events[date] || [];
        const timeEvents = time ? dateEvents.filter(event => event.time === time) : dateEvents;
        const formattedDate = dateFns.format(new Date(date), 'dd.MM.yyyy', { locale: dateFns.de });
        let eventsList = timeEvents.map(event => `
            <div class="event-item">
                <h5>${event.name} ${event.is_recurring ? '<span class="badge bg-info">Recurring</span>' : ''}</h5>
                <p><strong>Zeit:</strong> ${event.time}</p>
                <p><strong>Category:</strong> ${event.category || 'Default'}</p>
                ${event.is_recurring ? `<p><strong>Recurrence:</strong> ${getRecurrenceTypeText(event.recurrence_type)}</p>` : ''}
            </div>
        `).join('');
        
        eventModalBody.innerHTML = `
            <h4>${formattedDate}${time ? ` ${time}` : ''}</h4>
            ${eventsList || '<p>Keine Ereignisse für diesen Zeitpunkt.</p>'}
        `;
        eventModal.show();
    }
    
    function getRecurrenceTypeText(recurrenceType) {
        switch (recurrenceType) {
            case 'daily':
                return 'Daily';
            case 'weekly':
                return 'Weekly';
            case 'monthly':
                return 'Monthly';
            case 'yearly':
                return 'Yearly';
            case 'custom':
                return 'Custom';
            default:
                return 'Unknown';
        }
    }
    
    updateCalendar();
});