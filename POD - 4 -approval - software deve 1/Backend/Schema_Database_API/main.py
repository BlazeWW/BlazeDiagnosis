from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from database import get_connection
from models import Quote, QuoteCreate, LineItem
from datetime import datetime
from email_utils import send_email
from fastapi.middleware.cors import CORSMiddleware

def check_quote_lock(quote_id: int):
    """
    Checks if a quote is locked.
    Returns False (locked) if status is 'approved'.
    Returns True (editable) otherwise..
    """
    # conn = get_connection() -> This simply creates a database connection, without this, python cannot talk to the database
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM quotes WHERE id = %s", (quote_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Quote not found")
    status = row[0]
    if status == "approved":
        return  False
    return True
    

app = FastAPI(title="Quotes API")

# I added a CORS block for allowing Neil[Frontend] to access the data in the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins (I will change this after production)
    allow_credentials=True, # Allow cookies/auth headers
    allow_methods=["*"], # Allow all methods 
    allow_headers=["*"], # Allow all headers
)

@app.get("/")
def root():
    return {"message": "Quotes API is running!"}

@app.get("/quotes")
def get_quotes():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM quotes")
        rows = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/quotes/{id}")
def get_quote(id: int):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM quotes WHERE id = %s", (id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Quote not found")
        columns = [col[0] for col in cursor.description]
        return dict(zip(columns, row))
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/quotes", status_code=201)
def create_quote(quote: QuoteCreate):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        if not quote.Quote_id:
            cursor.execute("SELECT COUNT(*) FROM quotes")
            n = cursor.fetchone()[0] + 1
            new_id = cursor.fetchone()[0]
            quote.Quote_id= f"Q{n:03d}"
            quote.Quote_number = f"QN-{n:03d}"
        cursor.execute(
            "INSERT INTO quotes (quote_id, quote_number, customer_id, vehicle_id, description_q, created_by) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
            (quote.quote_id, quote.quote_number, quote.customer_id, quote.vehicle_id, quote.description_q, quote.created_by))
        new_id = cursor.fetchnone()[0]    
        for item in quote.line_items:
            total = int(item.quantity) * float(item.unit_price)
            cursor.execute(
                "INSERT INTO line_items(quote_id, description, quantity, unit_price, total) VALUES (%s, %s, %s, %s, %s)",
                (new_id, item.description, item.quantity, float(item.unit_price), float(total))
            )
        conn.commit()
        
        return {"message": "Quote created successfully"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.put("/quotes/{id}")
def update_quote(id: int, quote: Quote):
    try:
        if not check_quote_lock(id):
            raise HTTPException(status_code=403, detail="Quote is locked and cannot be modified ")
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE quotes SET description_q = %s, created_by = %s WHERE id = %s",
            (quote.description_Q, quote.created_by, id)
        )
        conn.commit()
        return {"message": "Quote updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE quotes SET description_q = %s, created_by = %s WHERE id = %s",
            (quote.description_Q, quote.created_by, id)
        )
        conn.commit()
        return {"message": "Quote updated successfully"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.delete("/quotes/{id}")
def delete_quote(id: int):
    try:
        @app.delete("/quotes/{id}")
        def delete_code(id: int):
            try:
                if not check_quote_lock(id):
                    raise HTTPException(status_code=403, detail="Quote is locked and cannto be modified. ")
                conn = get_connection()
                cursor = conn.cursor()
                cursor.execute("DELETE FROM WHERE id = %s", (id))
                conn.commit()
                return{"message": "Quote is deleted successfully, Quote e hlakotswe ka katleho."}
            except HTTPException:
                raise 
            except Exception:
                raise
            except Exception as e:
                return JSONResponse(status_code=500, content={"error": str(e)})
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM quotes WHERE id = %s", (id,))
        conn.commit()
        return {"message": "Quote deleted successfully"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    

    
# Steps in creating a line-item

# 1st: Initialize the client instance

# 2nd: Manage DB connection lifecycle

# 3rd: Create Pydantic validation schemas

# 4th: Implement route handlers

# Prisma queries fully asynchronous

# 5th Run the application : uvicorn main:app --reload

# app.get("/") registers a GET request endpoint
# ("/api/quotes/{id}/line-items")-> It is the URL path. {id}-> is a variable for the quote ID
@app.get("/api/quotes/{id}/line-items")
def get_line_items(id: int):
    try:
        # conn stores the database connection
        # get_connection()-> calls my function from database.py to connect to Render
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM line_items WHERE quote_id = %s", (id,))
        rows = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    except Exception as e:
        return JSONResponse(status_code = 500, content={"error": str(e)})

# POST - Add a line item to a quote 
@app.post("/api/quotes/{id}/line-items", status_code=201)        
def create_line_item(id: int, item: LineItem):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        total = int(item.quantity) * float(item.unit_price)
        cursor.execute(
            "INSERT INTO line_items(quote_id, description, quantity, unit_price, total) VALUES (%s, %s, %s, %s, %s)",
            (id, item.description, item.quantity, float(item.unit_price), float(total))
            
        ) 
        conn.commit()
        return {"message":"Line item has been created"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
      
@app.post("/api/quotes/{id}/approve")
def approve_quote(id: int):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # 1. Check if the quote exists
        cursor.execute("SELECT * FROM quotes WHERE id = %s", (id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        columns = [col[0] for col in cursor.description]
        quote = dict(zip(columns, row))
        
        # 2. Check for the current status 
        if quote["status"] == "approved":
            raise HTTPException(status_code=400, detail="Quote already approved")
        if quote["status"] == "rejected":
            raise HTTPException(status_code=400, detail="Rejected quotes must be resubmitted")
        # 4. Update status, approved_by, approved_at
        approved_by = 1
        cursor.execute(
            """
            UPDATE quotes
            SET status = 'approved', approved_by = %s, approved_at = %s
            WHERE id = %s
            """,
            (approved_by, datetime.now(), id)
        )
        conn.commit()

        # 5. Return the updated quote
        cursor.execute("SELECT * FROM quotes WHERE id = %s", (id,))
        row = cursor.fetchone()
        columns = [col[0] for col in cursor.description]
        return dict(zip(columns, row))

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})



# REJECT a quote

@app.post("/api/quotes/{id}/reject")
def reject_quote(id: int, body: dict):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Check if the quote exists
        cursor.execute("SELECT * FROM quotes WHERE id = %s", (id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Quote not found")

        columns = [col[0] for col in cursor.description]
        quote = dict(zip(columns, row))

        # 2. Check current status
        if quote["status"] == "approved":
            raise HTTPException(status_code=400, detail="Quote already approved")
        if quote["status"] == "rejected":
            raise HTTPException(status_code=400, detail="rejected quotes must be resubmitted")
        
        
        # 3 Get rejection_reason from 
        rejection_reason = body.get("rejection_reason")
        if not rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason required")
        
        #4. Update status and rejection_reason
        cursor.execute("""
                       
            UPDATE quotes 
            SET status = 'rejected', rejection_reason = %s
            WHERE id = %s 
            
            """,
            (rejection_reason, id)
        )
        conn.commit()
        
        #5 Return the updated quote
        cursor.execute("SELECT * FROM quotes WHERE id = %s", (id,))
        row = cursor.fetchone()
        columns = [col[0] for col in cursor.description]
        return dict(zip(columns, row))
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
        
           


@app.post("/api/quotes/{id}/send")
def send_quotes(id: int):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # 1st Check if the quote exists
        cursor.execute("SELECT * FROM quotes WHERE id = %s", (id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Quote not found")
        columns = [col[0] for col in cursor.description]
        quote = dict(zip(columns, row))
        
        #2. Get the customer linked to this quoute
        cursor.execute(
            "SELECT name, email, can_email FROM customers WHERE customer_id = %s",
            (quote["customer_id"],)
            
        )
        customer_row = cursor.fetchone()
        if not customer_row:
            raise HTTPException(status_code=404, detail="No customer records found, please contact Blaze Diagnostic for more information, hahona se re se bonang hotswa hlakoreng la rona , letsetsa laze Diagnsostic for tsebo engwe")
        
        customer_name, customer_email, can_email = customer_row
        
        # 3 Do not send if the customer has opted out
        if not can_email:
            raise HTTPException(status_code=400, detail="Customer has opted out of email..")
        
        # 4 If hahona email etswang ho customer
        if not customer_email:
            raise HTTPException(status_code=400, detail="No email on file for this customer")
        
        # 5 Building the Email content
        subject = f"Your Quote {quote['quote_number']} from Blaze Diagnostics"
        body = (
            f"Hi {customer_name},\n\n"
            f"Please find your quote details below.\n\n"
            f"Quote Number: {quote['quote_number']}\n"
            f"Please let us know if you would like to proceed.\n\n"
            f"Regards, \nBlaze Diagnostics"
        )
        
        # 6 send email not real for now
        send_email(to=customer_email, subject=subject, body=body)
        
        #7 Record that the quote has been sent
        cursor.execute(
            "UPDATE quotes SET sent_to_customer_at = %s WHERE id= %s",
            (datetime.now(), id)   
        )
        conn.commit()
        
        # 8 return the updated quote , with an explicit 'sent' flag
        cursor.execute("SELECT * FROM quotes WHERE id = %s", (id,))
        row = cursor.fetchone()
        columns = [col[0] for col in cursor.description]
        updated_quote = dict(zip(columns, row))
        updated_quote["sent"] = updated_quote["sent_to_customer_at"] is not None
        
        return updated_quote
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
@app.post("/api/quotes/{id}/resubmit")
def resbmit_quote(id: int):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # 1. Check if quote exists
        cursor.execute("SELECT * FROM quotes WHERE id = %s", (id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        columns = [col[0] for col in cursor.description]
        quote = dict(zip(columns, row))
        
        # 2ND Step, check if the quote is rejected 
        if quote.get("status") != "rejected":
            raise HTTPException(status_code=400, detail="Only rejected quotes can be submitted")
        
        # 3RD Step, Updtate status back to pending and clear rejection reason
        cursor.execute(
            """
            UPDATE quotes
            SET status = 'pending', rejection_reason = NULL
            WHERE id = %s
            """,
            (id,)
        )
        conn.commit()
        
        # 4 . Return the updated Quote
        cursor.execute("SELECT * FROM quotes WHERE id = %s",(id,))
        row = cursor.fetchnone()
        columns = [col[0] for col in cursor.description]
        return dict(zip(columns, row))
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(status_code=500, content={"error":str(e)})