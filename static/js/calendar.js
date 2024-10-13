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
    
    // Function to create a month element
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
        
        // Add empty cells for days before the 1st of the month
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
        
        // Add remaining empty cells
        while (weekRow.children.length < 7) {
            weekRow.appendChild(document.createElement('td'));
        }
        tbody.appendChild(weekRow);
        
        return monthEl;
    }
    
    // Function to update the calendar
    function updateCalendar() {
        calendarEl.innerHTML = '';
        calendarEl.appendChild(createMonthElement(currentDate));
        fetchAndDisplayEvents();
    }
    
    // Create pagination controls
    const paginationControls = document.createElement('div');
    paginationControls.classList.add('d-flex', 'justify-content-between', 'mb-3');
    paginationControls.innerHTML = `
        <button id="prevMonth" class="btn btn-secondary">&lt; Vorheriger Monat</button>
        <button id="nextMonth" class="btn btn-secondary">Nächster Monat &gt;</button>
    `;
    calendarEl.parentNode.insertBefore(paginationControls, calendarEl);
    
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate = dateFns.subMonths(currentDate, 1);
        updateCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate = dateFns.addMonths(currentDate, 1);
        updateCalendar();
    });
    
    // Fetch and display events
    function fetchAndDisplayEvents() {
        console.log('Fetching events');
        fetch('/events')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(fetchedEvents => {
                console.log(`Received events for ${Object.keys(fetchedEvents).length} dates`);
                events = fetchedEvents;
                Object.keys(events).forEach(date => {
                    const cell = document.querySelector(`td[data-date="${date}"]`);
                    if (cell) {
                        cell.classList.add('bg-primary', 'text-white');
                        cell.style.cursor = 'pointer';
                        if (events[date].length > 1) {
                            cell.classList.add('multiple-events');
                        }
                        if (events[date].some(event => event.is_recurring)) {
                            cell.classList.add('recurring-event');
                        }
                        cell.addEventListener('click', () => showEventDetails(date));
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching events:', error);
                calendarEl.innerHTML += '<p class="text-danger">Error: Unable to load events. Please try refreshing the page.</p>';
            });
    }
    
    function showEventDetails(date) {
        const dateEvents = events[date] || [];
        const formattedDate = dateFns.format(new Date(date), 'dd.MM.yyyy', { locale: dateFns.de });
        let eventsList = dateEvents.map(event => `
            <div class="event-item">
                <h5>${event.name} ${event.is_recurring ? '<span class="badge bg-info">Recurring</span>' : ''}</h5>
                <p><strong>Zeit:</strong> ${event.time}</p>
                ${event.is_recurring ? `<p><strong>Recurrence:</strong> ${event.recurrence_type}</p>` : ''}
            </div>
        `).join('');
        
        eventModalBody.innerHTML = `
            <h4>${formattedDate}</h4>
            ${eventsList || '<p>Keine Ereignisse für diesen Tag.</p>'}
        `;
        eventModal.show();
    }
    
    // Initialize the calendar
    updateCalendar();
});
