# Event Highlight Calendar

A 12-month calendar app with event highlighting and pop-up details using Flask and Vanilla JS.

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/YourUsername/EventHighlightCalendar.git
   cd EventHighlightCalendar
   ```

2. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

3. Set up the environment variables:
   - Create a `.env` file in the root directory
   - Add the following variables:
     ```
     FLASK_SECRET_KEY=your_secret_key
     DATABASE_URL=your_database_url
     ```

4. Initialize the database:
   ```
   flask db upgrade
   ```

## Running the Application

### Development

For development, you can run the application using Flask's built-in server:

```
python main.py
```

The application will be available at `http://localhost:5000`.

### Production

For production deployment, we use Gunicorn. To run the application with Gunicorn:

```
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```

This command starts Gunicorn with 4 worker processes, binding to all interfaces on port 5000.

## Features

- 12-month calendar view
- Event highlighting
- Pop-up event details
- Add, edit, and delete events
- Recurring event support
- Embeddable calendar widget

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct, and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE.md file for details.
