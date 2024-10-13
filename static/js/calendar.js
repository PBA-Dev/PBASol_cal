document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const eventModal = new bootstrap.Modal(document.getElementById('eventModal'));
    const eventModalBody = document.getElementById('eventModalBody');
    
    // Function to create a month element
    function createMonthElement(year, month) {
        const monthEl = document.createElement('div');
        monthEl.classList.add('col-md-4', 'mb-4');
        
        const monthName = date_fns.format(new Date(year, month), 'MMMM yyyy');
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
        for (let i = 0; i < date.getDay(); i++) {
            weekRow.appendChild(document.createElement('td'));
        }
        
        while (date.getMonth() === month) {
            const dayCell = document.createElement('td');
            dayCell.textContent = date.getDate();
            dayCell.dataset.date = date_fns.format(date, 'yyyy-MM-dd');
            weekRow.appendChild(dayCell);
            
            if (date.getDay() === 6) {
                tbody.appendChild(weekRow);
                weekRow = document.createElement('tr');
            }
            
            date = date_fns.addDays(date, 1);
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
    for (let month = 0; month < 12; month++) {
        calendarEl.appendChild(createMonthElement(currentYear, month));
    }
    
    // Fetch and display events
    fetch('/events')
        .then(response => response.json())
        .then(events => {
            events.forEach(event => {
                const cell = document.querySelector(`td[data-date="${event.date}"]`);
                if (cell) {
                    cell.classList.add('bg-primary', 'text-white');
                    cell.style.cursor = 'pointer';
                    cell.addEventListener('click', () => showEventDetails(event));
                }
            });
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
