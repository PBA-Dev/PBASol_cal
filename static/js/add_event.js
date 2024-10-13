document.addEventListener('DOMContentLoaded', function() {
    const addEventForm = document.getElementById('addEventForm');

    addEventForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(addEventForm);
        
        fetch('/add_event', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                window.location.href = '/';
            } else {
                throw new Error('Failed to add event');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to add event. Please try again.');
        });
    });
});
