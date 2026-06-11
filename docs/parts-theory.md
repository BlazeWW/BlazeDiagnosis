# Flagging Delays in Parts Delivery

Estimated Time of Arrival (ETA) Tracking: When an order is placed, a "Required By" date is set based on the job schedule. Exception Reporting: If a carrier tracking API reports a delay, or if the ETA passes without a receipt scan, the system flags the item. Dashboard Alerts: The delayed job moves to a "Critical Attention" red flag list on the workshop manager’s dashboard to allow for proactive rescheduling.

# Notifying Relevant Parties When Parts Arrive

Automated Triggers: The "Scan to Receive" action instantly triggers automated workflows. SMS/Push Notifications: The assigned technician receives a mobile push notification: "Parts for Job #1042 have arrived in Bin B3. Customer Alerts: If configured, an automated email or text goes out to the client to schedule their service appointment.

# Linking Parts to the Correct Job Card

Digital Bin Location: Upon arrival, the system assigns the part a specific holding bin number linked to the Job ID. Cross-Referencing: The unique barcode on the part is permanently tied to the unique Job Card number in the centralized database (ERP or CMMS). Locking Mechanism: The system locks that part profile so it cannot accidentally be allocated to a different job.

# Updating Parts Delivery Status

API Integrations: The system connects directly via API to major shipping carriers (DHL, FedEx, UPS) or supplier portals. Barcode/RFID Scanning: When the delivery truck arrives, warehouse staff scan the incoming package barcode. Instant Log: The system instantly changes the status from "In Transit" to "Received" without manual data entry.

# Tracking Whether Parts Have Been Ordered

Inventory Check: The system automatically checks current stock levels for the requested parts. Automated Purchase Orders (PO): If out of stock, the system routes the request to procurement to generate a PO. Status Color-Coding: The job dashboard updates with live status indicators:
Recording Parts Needed for a Specific Job
Technician Request: Technicians look up the vehicle/asset via a Mobile App or Workshop Terminal. Digital Bill of Materials (BOM): The system pulls up the asset's specific schematics. Allocation: The technician selects the required parts, which are then digitally tagged to that specific Job ID.
