document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired');
    
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const calendarContainer = document.getElementById('calendar-container') || document.getElementById('calendar');
    const calendarEl = document.getElementById('calendar');
    
    console.log('Checking for date-fns library');
    if (typeof dateFns === 'undefined') {
        console.error('date-fns library is not loaded. Please check your network connection and try refreshing the page.');
        showError('Unable to load the calendar. Please check your network connection and try refreshing the page. If the problem persists, please contact support.');
        return;
    }
    
    console.log('date-fns library loaded successfully');
    
    console.log('Calendar element:', calendarEl);

    console.log('Initializing variables');
    let currentDate = new Date();
    let events = {};
    let currentView = calendarContainer ? calendarContainer.dataset.view || 'month' : 'month';
    
    const isEmbedded = document.body.classList.contains('embedded');
    console.log('Is embedded:', isEmbedded);
    
    function createMonthElement(date) {
        console.log(`Creating month element for ${dateFns.format(date, 'MMMM yyyy')}`);
        const monthEl = document.createElement('div');
        monthEl.classList.add('col-12', 'mb-4', 'position-relative');
        
        const monthName = dateFns.format(date, 'MMMM yyyy');
        monthEl.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <button id="prevPeriod" class="btn btn-sm btn-outline-secondary">&lt;</button>
                <h3>${monthName}</h3>
                <button id="nextPeriod" class="btn btn-sm btn-outline-secondary">&gt;</button>
            </div>
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
        showLoading();
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

            document.getElementById('prevPeriod').addEventListener('click', () => {
                currentDate = dateFns.subMonths(currentDate, 1);
                updateCalendar();
            });
            
            document.getElementById('nextPeriod').addEventListener('click', () => {
                currentDate = dateFns.addMonths(currentDate, 1);
                updateCalendar();
            });
        } catch (error) {
            console.error('Error in updateCalendar:', error);
            showError(`Unable to update the calendar. Details: ${error.message}`);
        }
    }
    
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
                hideLoading();
            })
            .catch(error => {
                console.error('Error fetching events:', error);
                showError('Unable to load events. Please try refreshing the page.');
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
                    cell.title = dateEvents.map(event => `${event.name} (${event.time})`).join('\n');
                    cell.addEventListener('click', () => showEventDetails(date, dateEvents));
                }
            });
        });
        console.log('Events displayed');
    }
    
    function showEventDetails(date, events) {
        console.log('Showing event details for', date);
        const modalTitle = document.getElementById('eventModalLabel');
        const modalBody = document.getElementById('eventModalBody');
        
        modalTitle.textContent = `Events for ${dateFns.format(new Date(date), 'MMMM d, yyyy')}`;
        
        let eventList = '<ul class="list-group">';
        events.forEach(event => {
            eventList += `
                <li class="list-group-item">
                    <h5 class="mb-1">${event.name}</h5>
                    <p class="mb-1">Time: ${event.time}</p>
                    <p class="mb-1">Category: ${event.category}</p>
                    ${event.is_recurring ? '<p class="mb-1"><em>Recurring event</em></p>' : ''}
                </li>
            `;
        });
        eventList += '</ul>';
        
        modalBody.innerHTML = eventList;
        
        const eventModal = new bootstrap.Modal(document.getElementById('eventModal'));
        eventModal.show();
    }
    
    function showLoading() {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
        if (calendarEl) {
            calendarEl.style.display = 'none';
        }
    }
    
    function hideLoading() {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        if (calendarEl) {
            calendarEl.style.display = 'block';
        }
    }
    
    function showError(message) {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        if (errorMessage) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = message;
        }
        if (calendarEl) {
            calendarEl.style.display = 'none';
        }
    }
    
    console.log('Initializing calendar');
    try {
        updateCalendar();
    } catch (error) {
        console.error('Error initializing calendar:', error);
        showError(`Unable to initialize the calendar. Details: ${error.message}`);
    }
    console.log('Calendar initialization complete');
});
