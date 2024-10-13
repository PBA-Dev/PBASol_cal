document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired');
    
    console.log('Checking for date-fns library');
    if (typeof dateFns === 'undefined') {
        console.error('date-fns library is not loaded. Please check your network connection and try refreshing the page.');
        document.getElementById('calendar').innerHTML = '<p class="text-danger">Error: Unable to load the calendar. Please check your network connection and try refreshing the page. If the problem persists, please contact support.</p>';
        return;
    }
    
    console.log('date-fns library loaded successfully');
    
    const calendarEl = document.getElementById('calendar');
    console.log('Calendar element:', calendarEl);

    console.log('Initializing variables');
    const eventModal = new bootstrap.Modal(document.getElementById('eventModal'));
    const eventModalBody = document.getElementById('eventModalBody');
    let currentDate = new Date();
    let events = {};
    let currentView = calendarEl.dataset.view || 'month';
    
    const isEmbedded = document.body.classList.contains('embedded');
    console.log('Is embedded:', isEmbedded);
    
    function createMonthElement(date) {
        console.log(`Creating month element for ${dateFns.format(date, 'MMMM yyyy')}`);
        const monthEl = document.createElement('div');
        monthEl.classList.add('col-12', 'mb-4');
        
        const monthName = dateFns.format(date, 'MMMM yyyy');
        monthEl.innerHTML = `
            <h3>${monthName}</h3>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th>
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
            dayCell.textContent = dateFns.format(currentDay, 'd');
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
        
        console.log('Month element created:', monthEl);
        return monthEl;
    }
    
    function updateCalendar() {
        console.log('Updating calendar');
        calendarEl.innerHTML = '';
        let startDate, endDate;
        
        console.log('Current view:', currentView);
        console.log('Is embedded:', isEmbedded);
        
        try {
            const monthElement = createMonthElement(currentDate);
            console.log('Month element created:', monthElement);
            calendarEl.appendChild(monthElement);
            startDate = dateFns.startOfMonth(currentDate);
            endDate = dateFns.endOfMonth(currentDate);
            
            console.log('Fetching events for:', startDate, 'to', endDate);
            fetchAndDisplayEvents(startDate, endDate);
        } catch (error) {
            console.error('Error in updateCalendar:', error);
            calendarEl.innerHTML = `<p class="text-danger">Error: Unable to update the calendar. Details: ${error.message}</p>`;
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
                console.log('Response status:', response.status);
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
        console.log('Displaying events');
        Object.keys(events).forEach(date => {
            const cells = document.querySelectorAll(`td[data-date="${date}"]`);
            console.log(`Found ${cells.length} cells for date ${date}`);
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
        console.log('Events displayed');
    }
    
    function showEventDetails(date) {
        if (isEmbedded) return;
        
        const dateEvents = events[date] || [];
        const formattedDate = dateFns.format(new Date(date), 'dd.MM.yyyy');
        let eventsList = dateEvents.map(event => `
            <div class="event-item">
                <h5>${event.name} ${event.is_recurring ? '<span class="badge bg-info">Recurring</span>' : ''}</h5>
                <p><strong>Time:</strong> ${event.time}</p>
                <p><strong>Category:</strong> ${event.category || 'Default'}</p>
                ${event.is_recurring ? `<p><strong>Recurrence:</strong> ${getRecurrenceTypeText(event.recurrence_type)}</p>` : ''}
            </div>
        `).join('');
        
        eventModalBody.innerHTML = `
            <h4>${formattedDate}</h4>
            ${eventsList || '<p>No events for this date.</p>'}
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
    
    console.log('Before initializing calendar');
    try {
        console.log('Initializing calendar');
        updateCalendar();
    } catch (error) {
        console.error('Error initializing calendar:', error);
        calendarEl.innerHTML = `<p class="text-danger">Error: Unable to initialize the calendar. Details: ${error.message}</p>`;
    }
    console.log('After initializing calendar');
});
