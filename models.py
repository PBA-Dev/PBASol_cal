from app import db
from datetime import datetime

class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.Time, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_type = db.Column(db.String(20))  # 'daily', 'weekly', 'monthly', 'yearly'
    recurrence_end_date = db.Column(db.Date)

    def __repr__(self):
        return f'<Event {self.name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'date': self.date.isoformat(),
            'time': self.time.isoformat(),
            'is_recurring': self.is_recurring,
            'recurrence_type': self.recurrence_type,
            'recurrence_end_date': self.recurrence_end_date.isoformat() if self.recurrence_end_date else None
        }
