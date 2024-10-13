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
    
    // Function to create a month element
    function createMonthElement(year, month) {
        console.log(`Creating month element for ${year}-${month+1}`);
        const monthEl = document.createElement('div');
        monthEl.classList.add('col-md-4', 'mb-4');
        
        const monthName = dateFns.format(new Date(year, month), 'MMMM yyyy');
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
        let date = new Date(year, month, 1);
        let weekRow = document.createElement('tr');
        
        // Add empty cells for days before the 1st of the month
        for (let i = 0; i < dateFns.getDay(date); i++) {
            weekRow.appendChild(document.createElement('td'));
        }
        
        while (dateFns.getMonth(date) === month) {
            const dayCell = document.createElement('td');
            dayCell.textContent = dateFns.getDate(date);
            dayCell.dataset.date = dateFns.format(date, 'yyyy-MM-dd');
            weekRow.appendChild(dayCell);
            
            if (dateFns.getDay(date) === 6) {
                tbody.appendChild(weekRow);
                weekRow = document.createElement('tr');
            }
            
            date = dateFns.addDays(date, 1);
        }
        
        // Add remaining empty cells
        while (weekRow.children.length < 7) {
            weekRow.appendChild(document.createElement('td'));
        }
        tbody.appendChild(weekRow);
        
        return monthEl;
    }
    
    // Create calendar for current year
    const currentYear = new Date().getFullYear();
    console.log(`Creating calendar for year ${currentYear}`);
    for (let month = 0; month < 12; month++) {
        calendarEl.appendChild(createMonthElement(currentYear, month));
    }
    
    // Fetch and display events
    console.log('Fetching events');
    fetch('/events')
        .then(response => {
            if (!response.status === 200) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(events => {
            console.log(`Received ${events.length} events`);
            events.forEach(event => {
                const cell = document.querySelector(`td[data-date="${event.date}"]`);
                if (cell) {
                    cell.classList.add('bg-primary', 'text-white');
                    cell.style.cursor = 'pointer';
                    cell.addEventListener('click', () => showEventDetails(event));
                }
            });
        })
        .catch(error => {
            console.error('Error fetching events:', error);
            calendarEl.innerHTML += '<p class="text-danger">Error: Unable to load events. Please try refreshing the page.</p>';
        });
    
    function showEventDetails(event) {
        eventModalBody.innerHTML = `
            <p><strong>Event:</strong> ${event.name}</p>
            <p><strong>Date:</strong> ${event.date}</p>
            <p><strong>Time:</strong> ${event.time}</p>
        `;
        eventModal.show();
    }
});
