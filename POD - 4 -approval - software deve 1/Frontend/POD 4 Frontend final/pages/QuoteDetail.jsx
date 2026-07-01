import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import "./App.css";

function QuoteDetail() {
  // Grabs the ID straight from the browser URL parameter path
  const { id } = useParams();
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  // Data storage states
  const [quote, setQuote] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  
  // STEP 8: States for UI feedback (Removing all raw alert windows)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFullQuoteDetails = async () => {
      setLoading(true);
      setError("");

      try {
        // 1. Fetch the primary base quote document
        const quoteResponse = await fetch(`${API_BASE_URL}/quotes/${id}`);
        if (!quoteResponse.ok) {
          throw new Error(`Could not find a quote matching ID: ${id}`);
        }
        const quoteData = await quoteResponse.json();
        setQuote(quoteData);

        // 2. Fetch the corresponding relational line items
        const itemsResponse = await fetch(`${API_BASE_URL}/quotes/${id}/line-items`);
        if (itemsResponse.ok) {
          const itemsData = await itemsResponse.json();
          setLineItems(itemsData);
        }

      } catch (err) {
        // STEP 8: Catching errors cleanly in state instead of using alert()
        setError(err.message || "An unexpected network error occurred while gathering details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchFullQuoteDetails();
    }
  }, [id, API_BASE_URL]);

  // STEP 9: Lowercase normalization rule to handle all 4 database statuses safely
  const getBadgeClass = (status) => {
    if (!status) return "badge-draft";
    const normalized = status.toLowerCase();
    
    switch (normalized) {
      case "draft":
        return "badge-draft";
      case "pending":
        return "badge-pending";
      case "approved":
        return "badge-approved";
      case "rejected":
        return "badge-rejected";
      default:
        return "badge-secondary";
    }
  };

  // STEP 8: Visual UI Loading Spinner component
  if (loading) {
    return (
      <div className="quote-container text-center" style={{ padding: "40px 20px" }}>
        <div className="loading-spinner"></div>
        <p style={{ marginTop: "15px", color: "#6c757d", fontWeight: "600" }}>
          Fetching secure data modules from Render server...
        </p>
      </div>
    );
  }

  // STEP 8: UI Error Message displayed inside a dedicated red box block
  if (error) {
    return (
      <div className="quote-container">
        <div className="error-box" style={{ background: "#fff5f5", border: "1px solid #fc8181", color: "#c53030", padding: "20px", borderRadius: "8px", margin: "20px 0" }}>
          <h4 style={{ margin: "0 0 10px 0" }}>⚠️ System Integration Error</h4>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
        <Link to="/quotes" className="btn btn-secondary">← Back to Dashboard</Link>
      </div>
    );
  }

  // Financial summary map logic
  const subtotal = lineItems.reduce((sum, item) => sum + (Number(item.line_total) || 0), 0);
  const tax = subtotal * 0.15;
  const grandTotal = subtotal + tax;

  return (
    <div className="quote-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <Link to="/quotes" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Back to Control Panel
        </Link>
        
        {/* STEP 9: Status validation badge wrapper */}
        <span className={`badge ${getBadgeClass(quote?.status)}`} style={{ fontSize: "1rem", padding: "8px 16px" }}>
          {quote?.status ? quote.status.toUpperCase() : "DRAFT"}
        </span>
      </div>

      <div className="summary-card" style={{ marginBottom: "25px", padding: "20px" }}>
        <h3>Quote Reference: {quote?.quote_number || quote?.id}</h3>
        <hr style={{ border: "1px solid #eee", margin: "15px 0" }} />
        
        <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
          <p><strong>Customer Database ID:</strong> {quote?.customer_id || "N/A"}</p>
          <p><strong>Vehicle Serial ID:</strong> {quote?.vehicle_id || "N/A"}</p>
          <p><strong>Inspected By:</strong> {quote?.created_by || "System Operator"}</p>
        </div>
      </div>

      <h3>Service Line Item Log</h3>
      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Task Description</th>
              <th style={{ width: "120px", textAlign: "right" }}>Quantity</th>
              <th style={{ width: "150px", textAlign: "right" }}>Unit Price</th>
              <th style={{ width: "150px", textAlign: "right" }}>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length > 0 ? (
              lineItems.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{item.description}</td>
                  <td style={{ textAlign: "right" }}>{item.quantity}</td>
                  <td style={{ textAlign: "right" }}>R{Number(item.unit_price).toFixed(2)}</td>
                  <td style={{ textAlign: "right" }}><strong>R{Number(item.line_total).toFixed(2)}</strong></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", color: "#718096", padding: "20px" }}>
                  No service line item records found allocated to this document.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
        <div className="summary-card" style={{ width: "320px" }}>
          <div className="summary-row">
            <span>Subtotal:</span>
            <span>R{subtotal.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Standard VAT (15%):</span>
            <span>R{tax.toFixed(2)}</span>
          </div>
          <div className="summary-row grand-total">
            <span>Grand Total:</span>
            <span>R{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuoteDetail;