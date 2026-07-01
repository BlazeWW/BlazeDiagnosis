from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from database import get_connection
from models import Quote, LineItem
from datetime import datetime
from email_utils import send_email
from fastapi.middleware.cors import CORSMiddleware

def check_quote_lock(quote_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM quotes WHERE id = %s", (quote_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Quote not found")
    status = row[0]
    if status == "approved":
        return False
    return True

app = FastAPI(title="Quotes API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
def create_quote(quote: Quote):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO quotes (quote_id, quote_number, customer_id, vehicle_id, description_q, created_by) VALUES (%s, %s, %s, %s, %s, %s)",
            (quote.Quote_id, quote.Quote_number, quote.Customer_Id, quote.Vehicle_id, quote.description_Q, quote.created_by)
        )
        conn.commit()
        return {"message": "Quote created successfully"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.put("/quotes/{id}")
def update_quote(id: int, quote: Quote):
    try:
        if not check_quote_lock(id):
            raise HTTPException(status_code=403, detail="Quote is locked and cannot be modified")
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

@app.delete("/quotes/{id}")
def delete_quote(id: int):
    try:
        if not check_quote_lock(id):
            raise HTTPException(status_code=403, detail="Quote is locked and cannot be modified.")
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM quotes WHERE id = %s", (id,))
        conn.commit()
        return {"message": "Quote deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/quotes/{id}/line-items")
def get_line_items(id: int):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM line_items WHERE quote_id = %s", (id,))
        rows = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

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
        return {"message": "Line item has been created"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/quotes/{id}/approve")
def approve_quote(id: int, user_id: int):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM quotes WHERE id = %s", (id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Quote not found")
        columns = [col[0] for col in cursor.description]
        quote = dict(zip(columns, row))
        if quote["status"] == "approved":
            raise HTTPException(status_code=400, detail="Quote already approved")
        if quote["status"] == "rejected":
            raise HTTPException(status_code=400, detail="Rejected quotes must be resubmitted")
        cursor.execute(
            "UPDATE quotes SET status = 'approved', approved_by = %s, approved_at = %s WHERE id = %s",
            (user_id, datetime.now(), id)
        )
        conn.commit()
        cursor.execute("SELECT * FROM quotes WHERE id = %s", (id,))
        row = cursor.fetchone()
        columns = [col[0] for col in cursor.description]
        return dict(zip(columns, row))
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/quotes/{id}/reject")
def reject_quote(id: int, body: dict):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM quotes WHERE id = %s", (id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Quote not found")
        columns = [col[0] for col in cursor.description]
        quote = dict(zip(columns, row))
        if quote["status"] == "approved":
            raise HTTPException(status_code=400, detail="Quote already approved")
        if quote["status"] == "rejected":
            raise HTTPException(status_code=400, detail="Rejected quotes must be resubmitted")
        rejection_reason = body.get("rejection_reason")
        if not rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason required")
        cursor.execute(
            "UPDATE quotes SET status = 'rejected', rejection_reason = %s WHERE id = %s",
            (rejection_reason, id)
        )
        conn.commit()
        cursor.execute("SELECT * FROM quotes WHERE id = %s", (id,))
        row = cursor.fetchone()
        columns = [col[0] for col in cursor.description]
        return dict(zip(columns, row))
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/quotes/{id}/resubmit")
def resubmit_quote(id: int):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM quotes WHERE id = %s", (id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Quote not found")
        columns = [col[0] for col in cursor.description]
        quote = dict(zip(columns, row))
        if quote.get("status") != "rejected":
            raise HTTPException(status_code=400, detail="Only rejected quotes can be resubmitted")
        cursor.execute(
            "UPDATE quotes SET status = 'pending', rejection_reason = NULL WHERE id = %s",
            (id,)
        )
        conn.commit()
        cursor.execute("SELECT * FROM quotes WHERE id = %s", (id,))
        row = cursor.fetchone()
        columns = [col[0] for col in cursor.description]
        return dict(zip(columns, row))
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
