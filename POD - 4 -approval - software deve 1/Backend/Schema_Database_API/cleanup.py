import psycopg2
conn = psycopg2.connect('postgresql://quotes_db_zb2f_user:tFp9kNbdMeQ62DK95FIQi8LSsYwABLmH@dpg-d8p8hmpo3t8c73ef1cmg-a.frankfurt-postgres.render.com/quotes_db_zb2f')
cursor = conn.cursor()

cursor.execute("DELETE FROM line_items")
cursor.execute("DELETE FROM quotes")
cursor.execute("DELETE FROM customers")
conn.commit()
print("Table has been cleared..")

cursor.close()
conn.close()