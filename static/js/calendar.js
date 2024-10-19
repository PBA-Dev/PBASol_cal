document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded-Ereignis ausgelöst');
    
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const calendarContainer = document.getElementById('calendar-container') || document.getElementById('calendar');
    const calendarEl = document.getElementById('calendar');
    
    console.log('Überprüfe date-fns Bibliothek');
    if (typeof dateFns === 'undefined') {
        console.error('date-fns Bibliothek ist nicht geladen. Bitte überprüfen Sie Ihre Netzwerkverbindung und versuchen Sie, die Seite neu zu laden.');
        showError('Der Kalender konnte nicht geladen werden. Bitte überprüfen Sie Ihre Netzwerkverbindung und versuchen Sie, die Seite neu zu laden. Wenn das Problem weiterhin besteht, kontaktieren Sie bitte den Support.');
        return;
    }
    
    console.log('date-fns Bibliothek erfolgreich geladen');
    
    console.log('Kalenderelement:', calendarEl);

    console.log('Initialisiere Variablen');
    let currentDate = new Date();
    let events = {};
    let currentView = calendarContainer ? calendarContainer.dataset.view || 'month' : 'month';
    
    const isEmbedded = document.body.classList.contains('embedded');
    console.log('Ist eingebettet:', isEmbedded);
    
    const germanMonths = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const germanDays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    
    function createMonthElement(date) {
        console.log(`Erstelle Monatselement für ${germanMonths[dateFns.getMonth(date)]} ${dateFns.getYear(date)}`);
        const monthEl = document.createElement('div');
        monthEl.classList.add('col-12', 'mb-4', 'position-relative');
        
        const monthName = `${germanMonths[dateFns.getMonth(date)]} ${dateFns.getYear(date)}`;
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
        
        console.log('Monatselement erstellt:', monthEl);
        return monthEl;
    }
    
    function updateCalendar() {
        console.log('Aktualisiere Kalender');
        showLoading();
        calendarEl.innerHTML = '';
        let startDate, endDate;
        
        console.log('Aktuelle Ansicht:', currentView);
        console.log('Ist eingebettet:', isEmbedded);
        
        try {
            const monthElement = createMonthElement(currentDate);
            console.log('Monatselement erstellt:', monthElement);
            calendarEl.appendChild(monthElement);
            startDate = dateFns.startOfMonth(currentDate);
            endDate = dateFns.endOfMonth(currentDate);
            
            console.log('Hole Termine für:', startDate, 'bis', endDate);
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
            console.error('Fehler in updateCalendar:', error);
            showError(`Kalender konnte nicht aktualisiert werden. Details: ${error.message}`);
        }
    }
    
    function fetchAndDisplayEvents(startDate, endDate) {
        console.log('Hole Termine');
        
        fetch(`/events?start_date=${dateFns.format(startDate, 'yyyy-MM-dd')}&end_date=${dateFns.format(endDate, 'yyyy-MM-dd')}`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            }
        })
            .then(response => {
                console.log('Antwortstatus:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP-Fehler! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(fetchedEvents => {
                console.log(`Termine für ${Object.keys(fetchedEvents).length} Daten erhalten`);
                events = fetchedEvents;
                displayEvents();
                hideLoading();
            })
            .catch(error => {
                console.error('Fehler beim Abrufen der Termine:', error);
                showError('Termine konnten nicht geladen werden. Bitte versuchen Sie, die Seite neu zu laden.');
            });
    }
    
    function displayEvents() {
        console.log('Zeige Termine');
        Object.keys(events).forEach(date => {
            const cells = document.querySelectorAll(`td[data-date="${date}"]`);
            console.log(`${cells.length} Zellen für Datum ${date} gefunden`);
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
        console.log('Termine angezeigt');
    }
    
    function showEventDetails(date, events) {
        console.log('Zeige Termindetails für', date);
        const modalTitle = document.getElementById('eventModalLabel');
        const modalBody = document.getElementById('eventModalBody');
        
        modalTitle.textContent = `Termine für ${dateFns.format(new Date(date), 'd. MMMM yyyy')}`;
        
        let eventList = '<ul class="list-group">';
        events.forEach(event => {
            eventList += `
                <li class="list-group-item">
                    <h5 class="mb-1">${event.name}</h5>
                    <p class="mb-1">Zeit: ${event.time}</p>
                    <p class="mb-1">Kategorie: ${event.category}</p>
                    ${event.is_recurring ? '<p class="mb-1"><em>Wiederholender Termin</em></p>' : ''}
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
    
    console.log('Initialisiere Kalender');
    try {
        updateCalendar();
    } catch (error) {
        console.error('Fehler bei der Initialisierung des Kalenders:', error);
        showError(`Kalender konnte nicht initialisiert werden. Details: ${error.message}`);
    }
    console.log('Kalenderinitialisierung abgeschlossen');
});
