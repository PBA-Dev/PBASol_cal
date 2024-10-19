import os
from flask import Flask, send_from_directory, request
from flask_wtf.csrf import CSRFProtect
from flask_migrate import Migrate
from flask_login import LoginManager
from models import db, Event, User
from werkzeug.security import generate_password_hash
import logging

csrf = CSRFProtect()
migrate = Migrate()
login_manager = LoginManager()

logging.basicConfig(level=logging.DEBUG)

def create_app():
    app = Flask(__name__)
    app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
    app.config['WTF_CSRF_TIME_LIMIT'] = 3600  # Set CSRF token expiration to 1 hour

    db.init_app(app)
    csrf.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = 'login'

    @app.before_request
    def log_request_info():
        logging.debug('Headers: %s', request.headers)
        logging.debug('Body: %s', request.get_data())

    @app.after_request
    def log_response_info(response):
        logging.debug('Response Status: %s', response.status)
        logging.debug('Response Headers: %s', response.headers)
        return response

    with app.app_context():
        db.create_all()
        if not User.query.filter_by(username='admin').first():
            admin_user = User(username='admin', password=generate_password_hash('admin'))
            db.session.add(admin_user)
            db.session.commit()

    from routes import init_routes
    init_routes(app)

    @app.route('/node_modules/<path:filename>')
    def serve_node_modules(filename):
        node_modules_path = os.path.join(app.root_path, 'node_modules')
        return send_from_directory(node_modules_path, filename)

    app.logger.info(f"FLASK_SECRET_KEY is {'set' if os.environ.get('FLASK_SECRET_KEY') else 'not set'}")
    app.logger.info(f"DATABASE_URL is {'set' if os.environ.get('DATABASE_URL') else 'not set'}")
    app.logger.info(f"PGPORT is {'set' if os.environ.get('PGPORT') else 'not set'}")
    app.logger.info(f"PGUSER is {'set' if os.environ.get('PGUSER') else 'not set'}")
    app.logger.info(f"PGPASSWORD is {'set' if os.environ.get('PGPASSWORD') else 'not set'}")
    app.logger.info(f"PGDATABASE is {'set' if os.environ.get('PGDATABASE') else 'not set'}")
    app.logger.info(f"PGHOST is {'set' if os.environ.get('PGHOST') else 'not set'}")

    return app

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000)
