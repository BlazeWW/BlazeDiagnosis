import { useState } from "react";
import "../App.css";

function CreateQuote() {
  // Maps user-friendly names to the real IDs Rorisang's database uses
  const customers = [
    { id: "CUST-01", name: "John Smith" },
    { id: "CUST-02", name: "Sarah Jones" },
    { id: "CUST-04", name: "Mike Brown" }
  ];

  const vehicles = [
    { id: "BENZ001", name: "Toyota Corolla ABC123" },
    { id: "BENZ002", name: "Ford Ranger XYZ789" },
    { id: "BENZ003", name: "BMW 320 DEF456" }
  ];

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [lineItems, setLineItems] = useState([{ description: "", quantity: 0, unitPrice: 0 }]);
  
  // UI states for new layout tasks
  const [expiryDate, setExpiryDate] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [discountType, setDiscountType] = useState("none"); 
  const [discountValue, setDiscountValue] = useState(0);

  const [status, setStatus] = useState("idle"); 
  const [message, setMessage] = useState("");

  const handleChange = (index, field, value) => {
    const updatedItems = [...lineItems];
    updatedItems[index][field] = field === "description" ? value : Number(value);
    setLineItems(updatedItems);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 0, unitPrice: 0 }]);
  };

  const deleteLineItem = (index) => {
    const updatedItems = lineItems.filter((_, i) => i !== index);
    setLineItems(updatedItems.length ? updatedItems : [{ description: "", quantity: 0, unitPrice: 0 }]);
  };

  // --- CALCULATIONS ---
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  
  let discountAmount = 0;
  if (discountType === "fixed") {
    discountAmount = Number(discountValue);
  } else if (discountType === "percentage") {
    discountAmount = subtotal * (Number(discountValue) / 100);
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount); 
  const tax = discountedSubtotal * 0.15;
  const grandTotal = discountedSubtotal + tax;

  const saveQuote = async () => {
    if (!selectedCustomer || !selectedVehicle) {
      setStatus("error");
      setMessage("Please select a customer and a vehicle before saving.");
      return;
    }
    if (lineItems.length === 0 || !lineItems[0].description) {
      setStatus("error");
      setMessage("Please add at least one valid line item.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    // --- FIX: Strictly match Rorisang's backend expected schema columns ---
    const quotePayload = {
      customer_id: selectedCustomer,
      vehicle_id: selectedVehicle,
      description_q: lineItems[0].description, // Map first line item to description_q column
      created_by: "Neil"                       // Changed from 1 to a text string name 
    };

    try {
      // 1. Create Main Quote document
      const quoteResponse = await fetch("https://quotes-api-1-flpl.onrender.com/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quotePayload)
      });

      if (!quoteResponse.ok) throw new Error("Failed to create the base quote document.");
      const quoteData = await quoteResponse.json();
      
      const newQuoteId = quoteData.id || quoteData.quote_id; 
      const newQuoteNumber = quoteData.quote_number || newQuoteId;

      // 2. Loop and save each individual line item
      for (const item of lineItems) {
        if (!item.description) continue; 

        const lineItemPayload = {
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unitPrice),
          line_total: Number(item.quantity) * Number(item.unitPrice)
        };

        const lineItemResponse = await fetch(`https://quotes-api-1-flpl.onrender.com/quotes/${newQuoteId}/line-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lineItemPayload)
        });

        if (!lineItemResponse.ok) throw new Error(`Failed to save line item: ${item.description}`);
      }

      setStatus("success");
      setMessage(`Quote created successfully: ${newQuoteNumber}`);

    } catch (error) {
      setStatus("error");
      setMessage(error.message || "A network error occurred.");
    }
  };

  return (
    <div className="quote-container">
      <h1>Create New Quote</h1>

      {status === "success" && <div className="alert alert-success">{message}</div>}
      {status === "error" && <div className="alert alert-error">{message}</div>}

      <div className="top-selections">
        <div className="form-group">
          <label><strong>Customer</strong></label>
          <select
            className="form-control"
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            disabled={status === "submitting"}
          >
            <option value="">Select Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label><strong>Vehicle</strong></label>
          <select
            className="form-control"
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            disabled={status === "submitting"}
          >
            <option value="">Select Vehicle</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label><strong>Expiry Date</strong></label>
          <input
            type="date"
            className="form-control"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            disabled={status === "submitting"}
          />
        </div>
      </div>

      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ width: "100px" }}>Quantity</th>
              <th style={{ width: "120px" }}>Unit Price</th>
              <th style={{ width: "120px" }}>Line Total</th>
              <th style={{ width: "80px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, index) => (
              <tr key={index}>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={item.description}
                    onChange={(e) => handleChange(index, "description", e.target.value)}
                    disabled={status === "submitting"}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => handleChange(index, "quantity", e.target.value)}
                    disabled={status === "submitting"}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => handleChange(index, "unitPrice", e.target.value)}
                    disabled={status === "submitting"}
                  />
                </td>
                <td>
                  <strong>R{(item.quantity * item.unitPrice).toFixed(2)}</strong>
                </td>
                <td>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => deleteLineItem(index)}
                    disabled={status === "submitting"}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button 
        className="btn btn-secondary" 
        onClick={addLineItem}
        disabled={status === "submitting"}
      >
        + Add Line Item
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", marginTop: "20px" }}>
        <div className="form-group" style={{ flex: 1, minWidth: "250px", marginRight: "20px" }}>
          <label><strong>Notes (Internal Only)</strong></label>
          <textarea
            className="form-control"
            rows="4"
            placeholder="Add internal notes here..."
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            disabled={status === "submitting"}
          ></textarea>
        </div>

        <div className="summary-wrapper" style={{ flex: 1, minWidth: "250px", marginTop: 0 }}>
          <div className="summary-card" style={{ width: "100%" }}>
            <div className="summary-row" style={{ alignItems: "center", marginBottom: "15px" }}>
              <select 
                className="form-control" 
                style={{ width: "auto", margin: 0 }} 
                value={discountType} 
                onChange={(e) => setDiscountType(e.target.value)}
                disabled={status === "submitting"}
              >
                <option value="none">No Discount</option>
                <option value="fixed">Fixed Amount (R)</option>
                <option value="percentage">Percentage (%)</option>
              </select>

              {discountType !== "none" && (
                <input 
                  type="number" 
                  className="form-control" 
                  style={{ width: "80px", margin: 0, marginLeft: "10px" }} 
                  min="0"
                  value={discountValue} 
                  onChange={(e) => setDiscountValue(e.target.value)}
                  disabled={status === "submitting"}
                />
              )}
            </div>

            <hr style={{ border: "1px solid #eee", marginBottom: "10px" }}/>

            <div className="summary-row">
              <span>Subtotal:</span>
              <span>R{subtotal.toFixed(2)}</span>
            </div>

            {discountType !== "none" && (
              <div className="summary-row" style={{ color: "#28a745" }}>
                <span>Discount:</span>
                <span>- R{discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="summary-row">
              <span>Tax (15%):</span>
              <span>R{tax.toFixed(2)}</span>
            </div>
            <div className="summary-row grand-total">
              <span>Grand Total:</span>
              <span>R{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-secondary" disabled={status === "submitting"}>
          Cancel
        </button>
        <button 
          className="btn btn-primary" 
          onClick={saveQuote}
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Saving..." : "Save Quote"}
        </button>
      </div>
    </div>
  );
}

export default CreateQuote;