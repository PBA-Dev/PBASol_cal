from app import create_app, db

app = create_app()

with app.app_context():
    from models import Event
    from datetime import date, time

    def add_test_event():
        test_event = Event(
            name="Test Event",
            date=date.today(),
            time=time(12, 0)
        )
        db.session.add(test_event)
        db.session.commit()
        print("Test event added successfully")

if __name__ == "__main__":
    with app.app_context():
        add_test_event()
    app.run(host="0.0.0.0", port=5000)
