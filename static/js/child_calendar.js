document.addEventListener('DOMContentLoaded', function() {
    console.log('Child Calendar: DOMContentLoaded event fired');

    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const calendarContainer = document.getElementById('calendar-container');
    const calendarEl = document.getElementById('calendar');
    
    if (typeof dateFns === 'undefined') {
        console.error('date-fns library is not loaded. Please check your network connection and try refreshing the page.');
        showError('Unable to load the calendar. Please check your network connection and try refreshing the page.');
        return;
    }
    
    console.log('Child Calendar: date-fns library loaded successfully');

    let currentDate = new Date();
    let events = {};
    let currentView = calendarContainer ? calendarContainer.dataset.view || 'month' : 'month';
    
    const germanDays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    
    function createMonthElement(date) {
        console.log(`Child Calendar: Creating month element for ${dateFns.format(date, 'MMMM yyyy')}`);
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
                        ${germanDays.map(day => `<th>${day}</th>`).join('')}
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
        
        return monthEl;
    }
    
    function updateCalendar() {
        console.log('Child Calendar: Updating calendar');
        showLoading();
        calendarEl.innerHTML = '';
        
        try {
            const monthElement = createMonthElement(currentDate);
            calendarEl.appendChild(monthElement);
            const startDate = dateFns.startOfMonth(currentDate);
            const endDate = dateFns.endOfMonth(currentDate);
            
            console.log('Child Calendar: Fetching events for:', startDate, 'to', endDate);
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
            console.error('Child Calendar: Error in updateCalendar:', error);
            showError(`Unable to update the calendar. Details: ${error.message}`);
        }
    }
    
    function fetchAndDisplayEvents(startDate, endDate) {
        console.log('Child Calendar: Fetching events');
        
        fetch(`/events?start_date=${dateFns.format(startDate, 'yyyy-MM-dd')}&end_date=${dateFns.format(endDate, 'yyyy-MM-dd')}`)
            .then(response => {
                console.log('Child Calendar: Fetch response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(fetchedEvents => {
                console.log(`Child Calendar: Received events for ${Object.keys(fetchedEvents).length} dates`);
                events = fetchedEvents;
                displayEvents();
                hideLoading();
            })
            .catch(error => {
                console.error('Child Calendar: Error fetching events:', error);
                showError('Unable to load events. Please try refreshing the page.');
            });
    }
    
    function displayEvents() {
        console.log('Child Calendar: Displaying events');
        Object.keys(events).forEach(date => {
            const cells = document.querySelectorAll(`td[data-date="${date}"]`);
            console.log(`Child Calendar: Found ${cells.length} cells for date ${date}`);
            cells.forEach(cell => {
                const dateEvents = events[date];
                
                if (dateEvents.length > 0) {
                    cell.classList.add('event-category-' + (dateEvents[0].category || 'default'));
                    if (dateEvents.length > 1) {
                        cell.classList.add('multiple-events');
                    }
                    if (dateEvents.some(event => event.is_recurring)) {
                        cell.classList.add('recurring-event');
                    }
                    cell.title = dateEvents.map(event => `${event.name} (${event.time})`).join('\n');
                    cell.style.cursor = 'pointer';
                    cell.addEventListener('click', () => showEventDetails(date, dateEvents));
                }
            });
        });
        console.log('Child Calendar: Events displayed');
    }
    
    function showEventDetails(date, events) {
        console.log('Child Calendar: Showing event details for', date);
        const modalTitle = document.getElementById('eventModalLabel');
        const modalBody = document.getElementById('eventModalBody');
        
        if (!modalTitle || !modalBody) {
            console.error('Child Calendar: Modal elements not found');
            return;
        }
        
        modalTitle.textContent = `Termine für ${dateFns.format(new Date(date), 'dd. MMMM yyyy')}`;
        
        let eventList = '<ul class="list-group">';
        events.forEach(event => {
            eventList += `
                <li class="list-group-item">
                    <h5 class="mb-1">${event.name}</h5>
                    <p class="mb-1">Zeit: ${event.time}</p>
                    <p class="mb-1">Kategorie: ${event.category}</p>
                    ${event.is_recurring ? '<p class="mb-1"><em>Wiederkehrender Termin</em></p>' : ''}
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
    
    console.log('Child Calendar: Initializing calendar');
    try {
        updateCalendar();
    } catch (error) {
        console.error('Child Calendar: Error initializing calendar:', error);
        showError(`Unable to initialize the calendar. Details: ${error.message}`);
    }
    console.log('Child Calendar: Initialization complete');
});
