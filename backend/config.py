import mysql.connector
from mysql.connector import Error

def get_db_connection():
    """
    Establish and return a connection to the MySQL database.
    This function can be reused across different routes in the application
    to securely connect to the 'covid19' database.
    """
    try:
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password='',
            database='covid19'
        )
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"Error while connecting to MySQL: {e}")
        return None
