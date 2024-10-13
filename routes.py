from flask import render_template, request, jsonify, redirect, url_for
from app import app, db
from models import Event
from datetime import datetime

@app.route('/')
def index():
    return render_template('calendar.html')

@app.route('/add_event', methods=['GET', 'POST'])
def add_event():
    if request.method == 'POST':
        name = request.form['name']
        date = datetime.strptime(request.form['date'], '%Y-%m-%d').date()
        time = datetime.strptime(request.form['time'], '%H:%M').time()
        
        new_event = Event(name=name, date=date, time=time)
        db.session.add(new_event)
        db.session.commit()
        
        return redirect(url_for('index'))
    
    return render_template('add_event.html')

@app.route('/events')
def get_events():
    events = Event.query.order_by(Event.date, Event.time).all()
    events_by_date = {}
    for event in events:
        date_str = event.date.strftime('%Y-%m-%d')
        if date_str not in events_by_date:
            events_by_date[date_str] = []
        events_by_date[date_str].append({
            'id': event.id,
            'name': event.name,
            'time': event.time.strftime('%H:%M')
        })
    return jsonify(events_by_date)

@app.route('/embed')
def embed():
    return render_template('embed.html')
