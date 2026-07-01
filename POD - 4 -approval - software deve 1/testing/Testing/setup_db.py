import psycopg2
conn = psycopg2.connect('postgresql://quotes_db_zb2f_user:tFp9kNbdMeQ62DK95FIQi8LSsYwABLmH@dpg-d8p8hmpo3t8c73ef1cmg-a.frankfurt-postgres.render.com/quotes_db_zb2f')
cursor = conn.cursor()

import psycopg2

conn = psycopg2.connect('postgresql://quotes_db_zb2f_user:tFp9kNbdMeQ62DK95FIQi8LSsYwABLmH@dpg-d8p8hmpo3t8c73ef1cmg-a.frankfurt-postgres.render.com/quotes_db_zb2f')
cursor = conn.cursor()

# Create table
cursor.execute('''
    CREATE TABLE IF NOT EXISTS QUOTES (
        Id SERIAL PRIMARY KEY,
        Quote_id VARCHAR(50),
        Quote_number VARCHAR(50),
        Customer_Id VARCHAR(50),
        Vehicle_id VARCHAR(50),
        description_Q VARCHAR(255),
        created_by VARCHAR(100)
    )
''')
conn.commit()
print('Table created!')

try:
    cursor.execute('''
    ALTER TABLE quotes
    ADD CONSTRAINT quotes_quote_id_unique UNIQUE (Quote_id)
    ''')
    conn.commit()
    print("Quote_id uniqueness constraint added.")
except psycopg2.errors.DuplicateTable:
    conn.rollback()
    print("Quote_id uniqueness constraint already exists, skipping..")





# Creating line items table
cursor.execute('''
    CREATE TABLE IF NOT EXISTS line_items (
        id SERIAL PRIMARY KEY,
        quote_id INTEGER REFERENCES quotes(id),
        description VARCHAR(255),
        quantity INTEGER,
        unit_price DECIMAL(10,2),
        total DECIMAL(10,2)
    )
''')
conn.commit()
print('Line item table created')

cursor.execute('''
    ALTER TABLE quotes
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS approved_by INTEGER,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT           
               ''')
conn.commit()
print('Status columns added!')

cursor.execute('''
              CREATE TABLE IF NOT EXISTS customers(
                  Id SERIAL  PRIMARY KEY,
                  Customer_Id VARCHAR(50) UNIQUE NOT NULL,
                  name  VARCHAR(100),
                  email VARCHAR(255),
                  phone VARCHAR(20),
                  can_email BOOLEAN DEFAULT TRUE
                  
                  )
            ''')
conn.commit()
print('The Customers table has been created successfully!')
cursor.execute('''
    ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS can_email BOOLEAN DEFAULT TRUE
''')
conn.commit()
print("can_email column added.")


cursor.execute('''
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'customers'
''')
for row in cursor.fetchall():
    print(row)


cursor.execute('''
    ALTER TABLE quotes
    ADD COLUMN IF NOT EXISTS sent_to_customer_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS customer_approved_at TIMESTAMP
''')
conn.commit()
print("Quote Tracking columns have been added.")


cursor.execute('''
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'quotes' 
''')
for row in cursor.fetchall():
    print(row)

cursor.execute('''
    SELECT q.id, q.quote_id, c.name, c.email, c.can_email
    FROM quotes q
    LEFT JOIN customers c ON q.customer_id = c.customer_id
''')
for row in cursor.fetchall():
    print(row)
