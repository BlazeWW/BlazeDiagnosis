import psycopg2
conn = psycopg2.connect('postgresql://quotes_db_zb2f_user:tFp9kNbdMeQ62DK95FIQi8LSsYwABLmH@dpg-d8p8hmpo3t8c73ef1cmg-a.frankfurt-postgres.render.com/quotes_db_zb2f')
cursor = conn.cursor()

cursor.execute('''
    INSERT INTO customers (Customer_Id, name, email, phone, can_email)
    VALUES
    (%s, %s, %s, %s, %s),
    (%s, %s, %s, %s, %s),
    (%s, %s, %s, %s, %s)
    ON CONFLICT (Customer_id) DO NOTHING
    ''', (
        'CUST-01', 'Rorisang Madikgetla', 'rorisangmadikgetla767@gmail.com', '0721426286', True,
        'CUST-08', 'John Smith', 'madixxwtf@gmail.com', '0662303453', True,
        'CUST-02', 'Naledi Sello', 'katlehomadikgetla65@gmail.com', '0736736373', True
        
))
conn.commit()
print('Customers seeded (or already existed).')

cursor.execute('''
    INSERT INTO QUOTES (Quote_id, Quote_number, Customer_Id, Vehicle_id, description_Q, created_by)
    VALUES
    (%s, %s, %s, %s, %s, %s),
    (%s, %s, %s, %s, %s, %s),
    (%s, %s, %s, %s, %s, %s)
    
''', (
    'Q001', 'QN-001', 'CUST-01', 'BENZ001', None, None,
    'Q002', 'QN-002', 'CUST-02', 'BENZ002', 'Brake problems', 'Rorisang',
    'Q003', 'QN-003', 'CUST-04', 'BENZ003', 'Brake problems', 'Rorisang'
))
conn.commit()
print('Quote has been seeded successfully..')

cursor.close()
conn.close()
    
