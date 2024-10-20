import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Event, Base

# Get database connection details from environment variables
db_url = os.environ.get('DATABASE_URL')

if not db_url:
    raise ValueError("DATABASE_URL environment variable is not set")

# Create engine and session
engine = create_engine(db_url)
Session = sessionmaker(bind=engine)
session = Session()

# Query recurring events
recurring_events = session.query(Event).filter_by(is_recurring=True).all()

print(f"Number of recurring events: {len(recurring_events)}")
for event in recurring_events[:5]:  # Print details of up to 5 recurring events
    print(f"Event: {event.name}, Date: {event.date}, Recurrence Type: {event.recurrence_type}")

# Close the session
session.close()
