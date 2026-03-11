import os
import sys
import time

def print_step(message):
    print(f"[+] {message}")

def print_error(message):
    print(f"[!] ERROR: {message}")

def print_success(message):
    print(f"[OK] {message}")

def validate_structure():
    print_step("Checking project folder structure...")
    
    required_dirs = ['dataset', 'scripts', 'backend', 'templates', 'static', 'graphs']
    missing_dirs = []
    
    for d in required_dirs:
        if not os.path.exists(d):
            missing_dirs.append(d)
            
    if missing_dirs:
        for d in missing_dirs:
            print_step(f"Creating missing directory: {d}")
            os.makedirs(d)
    
    print_success("Project structure validated.")

def check_dataset():
    print_step("Checking dataset...")
    dataset_path = os.path.join('dataset', 'clean_covid_data.csv')
    
    if os.path.exists(dataset_path):
        print_success("Dataset found: clean_covid_data.csv")
        return True
    else:
        print_error("Dataset not found at dataset/clean_covid_data.csv")
        print_error("Please run the dataset preparation script first:")
        print("    python scripts/prepare_dataset.py")
        return False

def check_database():
    print_step("Checking database connection...")
    
    # Add backend directory to path so we can import config
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
    
    try:
        from config import get_db_connection
        connection = get_db_connection()
        
        if connection and connection.is_connected():
            print_success("Database connection successful!")
            connection.close()
            return True
        else:
            print_error("Could not connect to the 'covid19' database.")
            print_error("Ensure XAMPP MySQL is running and the database exists.")
            return False
            
    except ImportError:
        print_error("Could not import config.py from backend folder.")
        return False

def start_server():
    print_step("Launching Flask application...")
    time.sleep(1) # Small pause for readability
    
    print("-" * 50)
    print("COVID-19 DATA ANALYTICS DASHBOARD")
    print("Dashboard will be available at: http://127.0.0.1:5000")
    print("-" * 50)
    
    # Import the Flask app from the backend module
    try:
        from backend.app import app
        # Run the server
        app.run(debug=True, use_reloader=False) # disabled reloader so it doesn't run checks twice
    except Exception as e:
        print_error(f"Failed to start Flask server: {e}")

if __name__ == "__main__":
    print("\n=== COVID-19 Dashboard Startup Sequence ===\n")
    
    validate_structure()
    
    if not check_dataset():
        sys.exit(1)
        
    if not check_database():
        sys.exit(1)
        
    start_server()
