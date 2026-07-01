import psycopg2
from  dotenv import load_dotenv
import os

load_dotenv()

def get_connection():
    database_url = os.getenv("DATABSE_URL")
    conn = psycopg2.connect(database_url)
    
    return conn