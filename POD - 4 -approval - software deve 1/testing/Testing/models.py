from pydantic import BaseModel
from typing import Optional,List
from datetime import date

class Quote(BaseModel):
    Quote_id: str
    Quote_number: str
    Customer_Id: str
    Vehicle_id: str
    description_Q: Optional[str] = None
    created_by: Optional[str] = None
    
class LineItem(BaseModel):
    description: str
    quantity :int
    unit_price: float
    
# BaseModel defines the exact shape of data going into or out of an endpoint - It validates incoming JSON, Rejects requests that do not match. It also auto-generates the request/response schema shown in Swagger.  
# Every field without `Optional[...] = None ` is required and FASTAPI returns a 422 error if it is missing from the request body.
# Optional[str] = None -> means the field can be left out of the JSON, or explicitly set to null

class QuoteCreate(Quote):
    Quote_id: Optional[str] = None
    Quote_number: Optional[str] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None
    discount_value: Optional[float] = 0
    tax_percent: Optional[float] = 15
    line_items: List[LineItem] = []