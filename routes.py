from flask import render_template, request, jsonify, redirect, url_for, flash, session
from models import Event, User
from app import db, csrf
from datetime import datetime, timedelta
from flask_wtf.csrf import generate_csrf
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import check_password_hash, generate_password_hash
import logging

def create_recurring_events(event):
    if not event.is_recurring or not event.recurrence_type:
        return

    end_date = event.recurrence_end_date or (event.date + timedelta(days=365))
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
            break

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
        logging.debug('Login-Route aufgerufen')
        if request.method == 'POST':
            logging.debug('Login POST-Anfrage')
            logging.debug('Formulardaten: %s', request.form)
            username = request.form['username']
            password = request.form['password']
            user = User.query.filter_by(username=username).first()
            if user and check_password_hash(user.password, password):
                login_user(user)
                logging.debug('Benutzer erfolgreich angemeldet')
                next_page = request.args.get('next')
                return redirect(next_page or url_for('index'))
            else:
                logging.debug('Ungültiger Anmeldeversuch')
                flash('Ungültiger Benutzername oder Passwort', 'danger')
        
        csrf_token = generate_csrf()
        return render_template('login.html', csrf_token=csrf_token)

    @app.route('/logout')
    @login_required
    def logout():
        logout_user()
        return redirect(url_for('index'))

    @app.route('/change_password', methods=['GET', 'POST'])
    @login_required
    def change_password():
        if request.method == 'POST':
            current_password = request.form['current_password']
            new_password = request.form['new_password']
            confirm_password = request.form['confirm_password']
            
            if not check_password_hash(current_user.password, current_password):
                flash('Aktuelles Passwort ist falsch', 'danger')
            elif new_password != confirm_password:
                flash('Neue Passwörter stimmen nicht überein', 'danger')
            else:
                current_user.password = generate_password_hash(new_password)
                db.session.commit()
                flash('Passwort erfolgreich geändert', 'success')
                return redirect(url_for('index'))
        
        return render_template('change_password.html')

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
                        raise ValueError("Zu viele benutzerdefinierte Wiederholungsdaten. Maximal 50 erlaubt.")
                    new_event.custom_recurrence_dates = [datetime.strptime(date_str, '%Y-%m-%d').date() for date_str in date_strings]

                db.session.add(new_event)
                db.session.commit()

                if is_recurring:
                    create_recurring_events(new_event)

                flash('Termin erfolgreich hinzugefügt', 'success')
                return redirect(url_for('index'))
            except ValueError as e:
                flash(f'Fehler beim Hinzufügen des Termins: {str(e)}', 'danger')
        
        return render_template('add_event.html')

    @app.route('/manage_events')
    @login_required
    def manage_events():
        events = Event.query.all()
        return render_template('manage_events.html', events=events)

    @app.route('/events')
    @csrf.exempt
    def get_events():
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date or not end_date:
            return jsonify({'error': 'start_date und end_date sind erforderlich'}), 400
        
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
        flash('Ausgewählte Termine wurden gelöscht', 'success')
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
            flash('Termin erfolgreich aktualisiert', 'success')
            return redirect(url_for('manage_events'))
        return render_template('edit_event.html', event=event)

    @app.route('/duplicate_event/<int:event_id>', methods=['POST'])
    @login_required
    def duplicate_event(event_id):
        event = Event.query.get_or_404(event_id)
        new_event = Event(
            name=f'Kopie von {event.name}',
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
        flash('Termin erfolgreich dupliziert', 'success')
        return jsonify({'success': True}), 200

    return app