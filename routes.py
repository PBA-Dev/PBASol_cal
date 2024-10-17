from flask import render_template, request, jsonify, redirect, url_for, flash
from models import Event
from app import db
from datetime import datetime, timedelta
from flask_wtf.csrf import generate_csrf

def init_routes(app):
    @app.route('/')
    def index():
        view = request.args.get('view', 'month')
        return render_template('calendar.html', view=view)

    @app.route('/child_embed')
    def child_embed():
        view = request.args.get('view', 'month')
        return render_template('child_embed.html', embedded=True, view=view)

    @app.route('/embed')
    def embed():
        view = request.args.get('view', 'month')
        iframe_code = f'<iframe src="{request.host_url}child_embed" width="100%" height="600" frameborder="0"></iframe>'
        return render_template('embed.html', view=view, iframe_code=iframe_code)

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

    # Register all routes with the app
    app.add_url_rule('/', 'index', index)
    app.add_url_rule('/child_embed', 'child_embed', child_embed)
    app.add_url_rule('/embed', 'embed', embed)
    app.add_url_rule('/add_event', 'add_event', add_event, methods=['GET', 'POST'])
    app.add_url_rule('/manage_events', 'manage_events', manage_events)
    app.add_url_rule('/events', 'get_events', get_events)
    app.add_url_rule('/bulk_delete_events', 'bulk_delete_events', bulk_delete_events, methods=['POST'])
    app.add_url_rule('/edit_event/<int:event_id>', 'edit_event', edit_event, methods=['GET', 'POST'])

    return app
