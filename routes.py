from flask import render_template, request, jsonify, redirect, url_for, flash
from app import app, db
from models import Event
from datetime import datetime, timedelta
from flask_wtf.csrf import generate_csrf

@app.route('/')
def index():
    view = request.args.get('view', 'month')
    return render_template('calendar.html', view=view)

@app.route('/add_event', methods=['GET', 'POST'])
def add_event():
    if request.method == 'POST':
        try:
            name = request.form['name']
            date = datetime.strptime(request.form['date'], '%Y-%m-%d').date()
            time = datetime.strptime(request.form['time'], '%H:%M').time()
            is_recurring = 'is_recurring' in request.form
            recurrence_type = request.form.get('recurrence_type')
            recurrence_end_date = datetime.strptime(request.form.get('recurrence_end_date', ''), '%Y-%m-%d').date() if request.form.get('recurrence_end_date') else None
            custom_recurrence_dates = request.form.get('custom_recurrence_dates')

            new_event = Event(
                name=name,
                date=date,
                time=time,
                is_recurring=is_recurring,
                recurrence_type=recurrence_type,
                recurrence_end_date=recurrence_end_date
            )

            if custom_recurrence_dates:
                date_strings = [date_str.strip() for date_str in custom_recurrence_dates.split(',')]
                if len(date_strings) > 50:
                    raise ValueError("Too many custom recurrence dates. Maximum allowed is 50.")
                new_event.custom_recurrence_dates = [datetime.strptime(date_str, '%Y-%m-%d').date() for date_str in date_strings]

            db.session.add(new_event)
            db.session.commit()

            if is_recurring:
                create_recurring_events(new_event)

            flash('Event added successfully', 'success')
            return redirect(url_for('index'))
        except ValueError as e:
            flash(f'Error adding event: {str(e)}', 'danger')
    
    return render_template('add_event.html')

def create_recurring_events(event):
    if not event.is_recurring or not event.recurrence_type:
        return

    if event.recurrence_type == 'custom':
        for custom_date in event.custom_recurrence_dates:
            if custom_date != event.date:
                recurring_event = Event(
                    name=event.name,
                    date=custom_date,
                    time=event.time,
                    is_recurring=True,
                    recurrence_type='custom'
                )
                db.session.add(recurring_event)
    else:
        current_date = event.date
        while current_date <= event.recurrence_end_date:
            if current_date != event.date:
                recurring_event = Event(
                    name=event.name,
                    date=current_date,
                    time=event.time,
                    is_recurring=True,
                    recurrence_type=event.recurrence_type,
                    recurrence_end_date=event.recurrence_end_date
                )
                db.session.add(recurring_event)

            if event.recurrence_type == 'daily':
                current_date += timedelta(days=1)
            elif event.recurrence_type == 'weekly':
                current_date += timedelta(weeks=1)
            elif event.recurrence_type == 'monthly':
                next_month = current_date.replace(day=1) + timedelta(days=32)
                current_date = next_month.replace(day=min(current_date.day, (next_month.replace(day=1) - timedelta(days=1)).day))
            elif event.recurrence_type == 'yearly':
                try:
                    current_date = current_date.replace(year=current_date.year + 1)
                except ValueError:  # Handle leap year
                    current_date = current_date.replace(year=current_date.year + 1, day=28)

    db.session.commit()

@app.route('/events')
def get_events():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if start_date and end_date:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    else:
        start_date = datetime.now().date()
        end_date = start_date + timedelta(days=30)

    events = Event.query.filter(
        ((Event.date >= start_date) & (Event.date <= end_date)) |
        (Event.is_recurring == True)
    ).order_by(Event.date, Event.time).all()

    events_by_date = {}
    for event in events:
        if event.is_recurring and event.recurrence_type != 'custom':
            event_dates = generate_recurring_dates(event, start_date, end_date)
        elif event.is_recurring and event.recurrence_type == 'custom':
            event_dates = [date for date in event.custom_recurrence_dates if date and start_date <= date <= end_date]
        else:
            event_dates = [event.date]

        for date in event_dates:
            date_str = date.strftime('%Y-%m-%d')
            if date_str not in events_by_date:
                events_by_date[date_str] = []
            events_by_date[date_str].append({
                'id': event.id,
                'name': event.name,
                'time': event.time.strftime('%H:%M'),
                'is_recurring': event.is_recurring,
                'recurrence_type': event.recurrence_type
            })

    return jsonify(events_by_date)

def generate_recurring_dates(event, start_date, end_date):
    if not event.date or not start_date or not end_date:
        return []

    dates = []
    current_date = max(event.date, start_date)
    end_date = min(event.recurrence_end_date or end_date, end_date)

    while current_date <= end_date:
        dates.append(current_date)
        if event.recurrence_type == 'daily':
            current_date += timedelta(days=1)
        elif event.recurrence_type == 'weekly':
            current_date += timedelta(weeks=1)
        elif event.recurrence_type == 'monthly':
            next_month = current_date.replace(day=1) + timedelta(days=32)
            current_date = next_month.replace(day=min(current_date.day, (next_month.replace(day=1) - timedelta(days=1)).day))
        elif event.recurrence_type == 'yearly':
            try:
                current_date = current_date.replace(year=current_date.year + 1)
            except ValueError:  # Handle leap year
                current_date = current_date.replace(year=current_date.year + 1, day=28)

    return dates

@app.route('/embed')
def embed():
    view = request.args.get('view', 'month')
    return render_template('embed.html', embedded=True, view=view)

@app.route('/manage_events')
def manage_events():
    events = Event.query.order_by(Event.date, Event.time).all()
    return render_template('manage_events.html', events=events)

@app.route('/edit_event/<int:event_id>', methods=['GET', 'POST'])
def edit_event(event_id):
    event = Event.query.get_or_404(event_id)
    if request.method == 'POST':
        try:
            event.name = request.form['name']
            event.date = datetime.strptime(request.form['date'], '%Y-%m-%d').date()
            event.time = datetime.strptime(request.form['time'], '%H:%M').time()
            event.is_recurring = 'is_recurring' in request.form
            event.recurrence_type = request.form.get('recurrence_type')
            event.recurrence_end_date = datetime.strptime(request.form.get('recurrence_end_date', ''), '%Y-%m-%d').date() if request.form.get('recurrence_end_date') else None
            custom_recurrence_dates = request.form.get('custom_recurrence_dates')
            
            if custom_recurrence_dates:
                date_strings = [date_str.strip() for date_str in custom_recurrence_dates.split(',')]
                if len(date_strings) > 50:
                    raise ValueError("Too many custom recurrence dates. Maximum allowed is 50.")
                event.custom_recurrence_dates = [datetime.strptime(date_str, '%Y-%m-%d').date() for date_str in date_strings]
            else:
                event.custom_recurrence_dates = None

            db.session.commit()
            flash('Event updated successfully', 'success')
            return redirect(url_for('manage_events'))
        except ValueError as e:
            flash(f'Error updating event: {str(e)}', 'danger')
    return render_template('edit_event.html', event=event)

@app.route('/delete_event/<int:event_id>', methods=['POST'])
def delete_event(event_id):
    event = Event.query.get_or_404(event_id)
    db.session.delete(event)
    db.session.commit()
    return redirect(url_for('manage_events'))

@app.route('/bulk_delete_events', methods=['POST'])
def bulk_delete_events():
    event_ids = request.form.getlist('event_ids')
    if not event_ids:
        flash('No events selected for deletion.', 'warning')
        return redirect(url_for('manage_events'))

    try:
        Event.query.filter(Event.id.in_(event_ids)).delete(synchronize_session=False)
        db.session.commit()
        flash(f'Successfully deleted {len(event_ids)} event(s).', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'An error occurred while deleting events: {str(e)}', 'danger')

    return redirect(url_for('manage_events'))

@app.route('/duplicate_event/<int:event_id>', methods=['POST'])
def duplicate_event(event_id):
    original_event = Event.query.get_or_404(event_id)
    new_event = Event(
        name=f'Copy of {original_event.name}',
        date=original_event.date,
        time=original_event.time,
        is_recurring=original_event.is_recurring,
        recurrence_type=original_event.recurrence_type,
        recurrence_end_date=original_event.recurrence_end_date,
        custom_recurrence_dates=original_event.custom_recurrence_dates
    )
    db.session.add(new_event)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Event duplicated successfully'}), 200
