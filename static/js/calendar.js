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
    
    function updateCalendar() {
        calendarEl.innerHTML = '';
        let startDate, endDate;
        
        calendarEl.appendChild(createMonthElement(currentDate));
        startDate = dateFns.startOfMonth(currentDate);
        endDate = dateFns.endOfMonth(currentDate);
        
        fetchAndDisplayEvents(startDate, endDate);
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
    }

    const paginationControls = document.createElement('div');
    paginationControls.classList.add('d-flex', 'justify-content-between', 'mb-3');
    paginationControls.innerHTML = `
        <button id="prevPeriod" class="btn btn-sm ${isEmbedded ? 'btn-outline-secondary' : 'btn-secondary'}">&lt;</button>
        <button id="nextPeriod" class="btn btn-sm ${isEmbedded ? 'btn-outline-secondary' : 'btn-secondary'}">&gt;</button>
    `;
    calendarEl.parentNode.insertBefore(paginationControls, calendarEl);
    
    document.getElementById('prevPeriod').addEventListener('click', () => {
        currentDate = dateFns.subMonths(currentDate, 1);
        updateCalendar();
    });
    
    document.getElementById('nextPeriod').addEventListener('click', () => {
        currentDate = dateFns.addMonths(currentDate, 1);
        updateCalendar();
    });
    
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
                const dateEvents = events[date];
                
                if (dateEvents.length > 0) {
                    cell.classList.add('event-category-' + (dateEvents[0].category || 'default'));
                    cell.style.cursor = 'pointer';
                    if (dateEvents.length > 1) {
                        cell.classList.add('multiple-events');
                    }
                    if (dateEvents.some(event => event.is_recurring)) {
                        cell.classList.add('recurring-event');
                    }
                    if (!isEmbedded) {
                        cell.addEventListener('click', () => showEventDetails(date));
                    } else {
                        cell.title = dateEvents.map(event => `${event.name} (${event.time})`).join('\n');
                    }
                }
            });
        });
    }
    
    function showEventDetails(date) {
        if (isEmbedded) return;
        
        const dateEvents = events[date] || [];
        const formattedDate = dateFns.format(new Date(date), 'dd.MM.yyyy', { locale: dateFns.de });
        let eventsList = dateEvents.map(event => `
            <div class="event-item">
                <h5>${event.name} ${event.is_recurring ? '<span class="badge bg-info">Recurring</span>' : ''}</h5>
                <p><strong>Zeit:</strong> ${event.time}</p>
                <p><strong>Category:</strong> ${event.category || 'Default'}</p>
                ${event.is_recurring ? `<p><strong>Recurrence:</strong> ${getRecurrenceTypeText(event.recurrence_type)}</p>` : ''}
            </div>
        `).join('');
        
        eventModalBody.innerHTML = `
            <h4>${formattedDate}</h4>
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
