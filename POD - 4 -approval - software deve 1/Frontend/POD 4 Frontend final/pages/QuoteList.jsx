import { useState, useEffect } from "react";
import "./App.css";

function QuoteList() {
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- ITEM 3 FILTER STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/quotes`);
        if (!response.ok) throw new Error("Failed to retrieve live quotes from the server.");
        
        const data = await response.json();
        setQuotes(data);
      } catch (err) {
        setError(err.message || "A network error occurred while loading the quotes control panel.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, [API_BASE_URL]);

  // --- ITEM 3 FILTERING LOGIC ---
  const filteredQuotes = quotes.filter((quote) => {
    // 1. Search by Quote Number / ID
    const quoteIdStr = (quote.quote_number || quote.id || quote.quote_id || "").toString().toLowerCase();
    const matchesSearch = quoteIdStr.includes(searchQuery.toLowerCase());

    // 2. Filter by Status Dropdown
    const quoteStatus = (quote.status || "draft").toLowerCase();
    const matchesStatus = statusFilter === "" || quoteStatus === statusFilter.toLowerCase();

    // 3. Filter by Date Range
    // Uses created_at or falls back to a generic date field if present
    const quoteDateStr = quote.created_at || quote.date;
    let matchesDate = true;
    
    if (quoteDateStr) {
      const qDate = new Date(quoteDateStr);
      if (startDate) {
        const sDate = new Date(startDate);
        if (qDate < sDate) matchesDate = false;
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999); // Include the entire end day
        if (qDate > eDate) matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

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

  if (loading) return <div className="quote-container"><h3>Loading system control dashboard...</h3></div>;
  if (error) return <div className="quote-container"><div className="alert alert-error">{error}</div></div>;

  return (
    <div className="quote-container">
      <h2>Quotes Control Panel</h2>
      
      {/* --- ITEM 3: FILTER CONTROLS INTERFACE --- */}
      <div className="filter-panel" style={{ display: "flex", gap: "15px", flexWrap: "wrap", marginBottom: "20px", background: "#f8f9fa", padding: "15px", borderRadius: "8px" }}>
        <div className="form-group" style={{ flex: "1", minWidth: "200px", margin: 0 }}>
          <label><strong>Search Quote Number</strong></label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. QTE-001..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ flex: "1", minWidth: "150px", margin: 0 }}>
          <label><strong>Status</strong></label>
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="form-group" style={{ flex: "1", minWidth: "150px", margin: 0 }}>
          <label><strong>Start Date</strong></label>
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ flex: "1", minWidth: "150px", margin: 0 }}>
          <label><strong>End Date</strong></label>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* --- LIVE QUOTES TABLE --- */}
      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Quote ID</th>
              <th>Customer ID</th>
              <th>Vehicle ID</th>
              <th>Created By</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.length > 0 ? (
              filteredQuotes.map((quote) => (
                <tr key={quote.id || quote.quote_id}>
                  <td>
                    <strong>{quote.quote_number || quote.id || quote.quote_id}</strong>
                  </td>
                  <td>{quote.customer_id}</td>
                  <td>{quote.vehicle_id}</td>
                  <td>{quote.created_by || "System"}</td>
                  <td>
                    <span className={`badge ${getBadgeClass(quote.status)}`}>
                      {quote.status 
                        ? quote.status.charAt(0).toUpperCase() + quote.status.slice(1).toLowerCase() 
                        : "Draft"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "#6c757d" }}>
                  No quotes found matching the selected filter parameters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default QuoteList;