import pandas as pd
import mysql.connector
from mysql.connector import Error
import os

# STEP 1: Import required libraries (pandas, mysql.connector, os)
# Note: mysql.connector and Error are already imported above

# Get the absolute path to the project root (parent directory of 'scripts')
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dataset_path = os.path.join(base_dir, 'dataset', 'clean_covid_data.csv')

def main():
    # STEP 2: Load the dataset
    print(f"Loading dataset from: {dataset_path}")
    try:
        df = pd.read_csv(dataset_path)
    except FileNotFoundError:
        print(f"Error: Could not find '{dataset_path}'. Please run prepare_dataset.py first.")
        return

    # STEP 3: Clean the dataframe before insertion
    # Remove null rows
    df = df.dropna(subset=['country', 'date', 'confirmed_cases', 'deaths', 'recovered'])

    # Ensure numeric columns are integers
    df['confirmed_cases'] = df['confirmed_cases'].astype(int)
    df['deaths'] = df['deaths'].astype(int)
    df['recovered'] = df['recovered'].astype(int)

    # Convert date column to proper datetime format
    df['date'] = pd.to_datetime(df['date']).dt.date

    # STEP 4: Connect to MySQL using mysql.connector
    try:
        print("Connecting to MySQL...")
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password='',
            database='covid19'
        )

        if connection.is_connected():
            print("Successfully connected to MySQL database")
            cursor = connection.cursor()

            # STEP 7: Prevent duplicate records by identifying existing data in MySQL
            # Fetch existing records to check against duplicates
            print("Fetching existing records...")
            cursor.execute("SELECT country, date FROM covid_data")
            # We create a set of (country, date) tuples for fast lookup. 
            # Note: the date fetched from MySQL is typically a datetime.date object
            existing_records = set((row[0], row[1]) for row in cursor.fetchall())
            
            # Prepare data for batch insertion
            records_to_insert = []
            rows_processed = 0
            rows_skipped = 0
            
            print("Preparing rows for insertion...")
            # Iterate over rows in the dataframe
            for _, row in df.iterrows():
                rows_processed += 1
                
                # Check if the record already exists based on country and date
                record_key = (row['country'], row['date'])
                if record_key in existing_records:
                    rows_skipped += 1
                    continue
                    
                # STEP 5: Insert data into the table `covid_data`.
                # We do NOT insert mortality_rate, recovery_rate, or month.
                records_to_insert.append((
                    row['country'], 
                    row['date'], 
                    row['confirmed_cases'], 
                    row['deaths'], 
                    row['recovered']
                ))

            # STEP 6: Use batch insertion (executemany) to improve performance
            if records_to_insert:
                print(f"Inserting {len(records_to_insert)} new records...")
                insert_query = """
                INSERT INTO covid_data 
                (country, date, confirmed_cases, deaths, recovered)
                VALUES (%s, %s, %s, %s, %s)
                """
                
                # Insert records in chunks to avoid memory issues and speed up the query
                batch_size = 5000
                total_inserted = 0
                for i in range(0, len(records_to_insert), batch_size):
                    batch = records_to_insert[i:i + batch_size]
                    cursor.executemany(insert_query, batch)
                    connection.commit()
                    total_inserted += len(batch)
                    # STEP 8: Print progress information during execution
                    print(f"Progress: Inserted {total_inserted} / {len(records_to_insert)} records")
                    
                rows_inserted = total_inserted
            else:
                rows_inserted = 0

            # STEP 8 & 9: Print summary of rows processed, skipped, and inserted
            print("-" * 40)
            print("Execution Summary:")
            print(f"Rows processed: {rows_processed}")
            print(f"Rows skipped: {rows_skipped}")
            print(f"Total rows inserted into MySQL: {rows_inserted}") # STEP 9
            print("-" * 40)

    except Error as e:
        # STEP 11: Include proper error handling for database connection failures
        print(f"Error while connecting to MySQL: {e}")
    finally:
        # Close the connection safely
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
            print("MySQL connection is closed.")

# STEP 10: Ensure the script can be executed directly
if __name__ == "__main__":
    main()
