import os
from flask import Flask, send_from_directory
from flask_wtf.csrf import CSRFProtect
from flask_migrate import Migrate
from models import db, Event

csrf = CSRFProtect()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }

    db.init_app(app)
    csrf.init_app(app)
    migrate.init_app(app, db)

    with app.app_context():
        db.create_all()

    from routes import init_routes
    init_routes(app)

    @app.route('/node_modules/<path:filename>')
    def serve_node_modules(filename):
        node_modules_path = os.path.join(app.root_path, 'node_modules')
        return send_from_directory(node_modules_path, filename)

    # Add debug logging for environment variables
    app.logger.info(f"FLASK_SECRET_KEY is {'set' if os.environ.get('FLASK_SECRET_KEY') else 'not set'}")
    app.logger.info(f"DATABASE_URL is {'set' if os.environ.get('DATABASE_URL') else 'not set'}")
    app.logger.info(f"PGPORT is {'set' if os.environ.get('PGPORT') else 'not set'}")
    app.logger.info(f"PGUSER is {'set' if os.environ.get('PGUSER') else 'not set'}")
    app.logger.info(f"PGPASSWORD is {'set' if os.environ.get('PGPASSWORD') else 'not set'}")
    app.logger.info(f"PGDATABASE is {'set' if os.environ.get('PGDATABASE') else 'not set'}")
    app.logger.info(f"PGHOST is {'set' if os.environ.get('PGHOST') else 'not set'}")

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000)
