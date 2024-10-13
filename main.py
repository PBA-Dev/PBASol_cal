from app import app, db
from models import Event
from datetime import datetime, date, time

def add_test_event():
    with app.app_context():
        test_event = Event(
            name="Test Event",
            date=date.today(),
            time=time(12, 0)
        )
        db.session.add(test_event)
        db.session.commit()
        print("Test event added successfully")

if __name__ == "__main__":
    add_test_event()
    app.run(host="0.0.0.0", port=5000)
