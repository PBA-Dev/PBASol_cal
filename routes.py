from flask import render_template, request, jsonify, redirect, url_for, flash
from models import Event, User
from app import db
from datetime import datetime, timedelta
from flask_wtf.csrf import generate_csrf
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import check_password_hash

def create_recurring_events(event):
    if not event.is_recurring or not event.recurrence_type:
        return

    end_date = event.recurrence_end_date or (event.date + timedelta(days=365))  # Default to 1 year if no end date
    current_date = event.date

    while current_date <= end_date:
        if event.recurrence_type == 'daily':
            current_date += timedelta(days=1)
        elif event.recurrence_type == 'weekly':
            current_date += timedelta(weeks=1)
        elif event.recurrence_type == 'monthly':
            current_date = current_date.replace(month=current_date.month % 12 + 1)
            if current_date.month == 1:
                current_date = current_date.replace(year=current_date.year + 1)
        elif event.recurrence_type == 'yearly':
            current_date = current_date.replace(year=current_date.year + 1)
        elif event.recurrence_type == 'custom':
            if event.custom_recurrence_dates:
                for custom_date in event.custom_recurrence_dates:
                    if custom_date > event.date:
                        new_event = Event(
                            name=event.name,
                            date=custom_date,
                            time=event.time,
                            is_recurring=False,
                            category=event.category
                        )
                        db.session.add(new_event)
            break  # Exit the loop after processing custom dates

        if current_date <= end_date and current_date != event.date:
            new_event = Event(
                name=event.name,
                date=current_date,
                time=event.time,
                is_recurring=False,
                category=event.category
            )
            db.session.add(new_event)

    db.session.commit()

def init_routes(app):
    @app.route('/')
    def index():
        view = request.args.get('view', 'month')
        return render_template('calendar.html', view=view)

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if request.method == 'POST':
            username = request.form['username']
            password = request.form['password']
            user = User.query.filter_by(username=username).first()
            if user and check_password_hash(user.password, password):
                login_user(user)
                return redirect(url_for('index'))
            else:
                flash('Invalid username or password', 'danger')
        return render_template('login.html')

    @app.route('/logout')
    @login_required
    def logout():
        logout_user()
        return redirect(url_for('index'))

    @app.route('/child_embed')
    def child_embed():
        view = request.args.get('view', 'month')
        return render_template('child_embed.html', embedded=True, view=view)

    @app.route('/embed')
    def embed():
        view = request.args.get('view', 'month')
        child_embed_url = request.url_root.rstrip('/') + url_for('child_embed')
        iframe_code = f'<iframe src="{child_embed_url}" width="100%" height="600" frameborder="0"></iframe>'
        return render_template('embed.html', view=view, iframe_code=iframe_code)

    @app.route('/add_event', methods=['GET', 'POST'])
    @login_required
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
                category = request.form.get('category', 'default')

                new_event = Event(
                    name=name,
                    date=date,
                    time=time,
                    is_recurring=is_recurring,
                    recurrence_type=recurrence_type,
                    recurrence_end_date=recurrence_end_date,
                    category=category
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

    @app.route('/manage_events')
    @login_required
    def manage_events():
        events = Event.query.all()
        return render_template('manage_events.html', events=events)

    @app.route('/events')
    def get_events():
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date or not end_date:
            return jsonify({'error': 'start_date and end_date are required'}), 400
        
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        events = Event.query.filter(Event.date.between(start_date, end_date)).all()
        events_dict = {}
        
        for event in events:
            event_date = event.date.isoformat()
            if event_date not in events_dict:
                events_dict[event_date] = []
            events_dict[event_date].append(event.to_dict())
        
        return jsonify(events_dict)

    @app.route('/bulk_delete_events', methods=['POST'])
    @login_required
    def bulk_delete_events():
        event_ids = request.form.getlist('event_ids')
        for event_id in event_ids:
            event = Event.query.get(event_id)
            if event:
                db.session.delete(event)
        db.session.commit()
        flash('Selected events have been deleted', 'success')
        return redirect(url_for('manage_events'))

    @app.route('/edit_event/<int:event_id>', methods=['GET', 'POST'])
    @login_required
    def edit_event(event_id):
        event = Event.query.get_or_404(event_id)
        if request.method == 'POST':
            event.name = request.form['name']
            event.date = datetime.strptime(request.form['date'], '%Y-%m-%d').date()
            event.time = datetime.strptime(request.form['time'], '%H:%M').time()
            event.category = request.form.get('category', 'default')
            db.session.commit()
            flash('Event updated successfully', 'success')
            return redirect(url_for('manage_events'))
        return render_template('edit_event.html', event=event)

    @app.route('/duplicate_event/<int:event_id>', methods=['POST'])
    @login_required
    def duplicate_event(event_id):
        event = Event.query.get_or_404(event_id)
        new_event = Event(
            name=f'Copy of {event.name}',
            date=event.date,
            time=event.time,
            is_recurring=event.is_recurring,
            recurrence_type=event.recurrence_type,
            recurrence_end_date=event.recurrence_end_date,
            custom_recurrence_dates=event.custom_recurrence_dates,
            category=event.category
        )
        db.session.add(new_event)
        db.session.commit()
        flash('Event duplicated successfully', 'success')
        return jsonify({'success': True}), 200

    return app