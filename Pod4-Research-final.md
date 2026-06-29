Pod4 - Research Findings(Oarabetse & Lesedi)

Summary
We researched how QuickBooks and Xero handle quote approval patterns. Approvals are role based and can include multiple approvers only if they comply with the rules.

Quote Approval Patterns
-The structured processes and workflows companies use to review and authorize customer quotes before sending them to clients.

QuickBooks
- Strong for bills and purchase orders but quote approvals often require third party apps.
- After approval: The quote moves forward in the workflow and can be converted into an invoice for payment.
- After rejection: The document is marked as rejected. Depending on integrations, quotes can be edited and resubmitted, but the rejection is still recorded for compliance.

Xero
- Offers smoother built-in handling of quotes with flexible rules and better integration.
- After approval: A quote is sent to the customer, approval is tracked in the system and managers can view status in real time.
- After rejection: The quote is marked as rejected but can usually be edited and resubmitted, allowing sales to adjust pricing before approval.

Example Quote Form Fields
- Customer
- Quote Number
- Line Items
- Quantities
- Prices
- Total

Approval Rules
- Multi step manager approval workflow.
- Managers approve before quote is sent.
- Notifications are sent to approvers.

Tax Rules (South Africa VAT)
- Standard VAT rate: 15% set by SARS.
- Formula: Tax Amount = Subtotal × VAT Rate  
 Example: Subtotal = R1000, VAT Rate = 15%, Tax Amount = R150  
- Grand Total Formula: Grand Total = Subtotal + Tax Amount  
  Example: R1000 + R150 = R1150


Discount Rules
- Formula: Discount Amount = Subtotal × Discount %  
  Final Amount = Subtotal – Discount Amount  
  Example: R1000 – (R1000 × 0.10) = R900  

- Fixed Discount Formula: Final Amount = Subtotal – Fixed Discount  
  Example: R1000 – R150 = R850  

- Exact Math Formula:  
  Line total = quantity × unit price  
  Subtotal = sum(all line totals)  
  Discount amount = Subtotal × Discount rate  

Rejection Rules
QuickBooks
- Quote cannot move forward into invoicing or payment.
- Rejected quotes can be edited and resubmitted depending on the system.

Xero
- Quote does not progress to customer communication or invoicing.
- Rejected quotes can usually be edited and resubmitted after adjustment.
- Rejection is recorded for accountability.

Who Can Approve Quotes?
QuickBooks
- Approvers defined by role based permissions.
- Multiple approvers can be added if rules require.

Xero
- Approvers can be managers or project leads depending on rules.
- Compliance rules prevent unauthorized staff from approving.

Approval Hierarchy
- Standard Quotes: One manager approval if less than R10,000  
- Medium Quotes: R10,000 – R50,000, requires manager and service manager approval  
- Large Quotes: Above R50,000 requires manager and senior approval  

Quote Numbering Format
- Examples: QT-2026-0001, QT-2026-3847, QT-2026-1001  
- Recommended format: QT-YYYY-Sequence  
- Quote Revisions: QT-2026-3847-REV1, QT-2026-3847-REV2  
- Original quote number remains traceable throughout.

Currency Format
- Symbol before amount  
- Comma for thousands separator  
- Two decimal places  
- Examples: R250.00, R1,250.00, R25,000.00  

Status Workflow
- Draft → Pending Approval → Approved → Sent to Customer → Accepted/Rejected → Locked  
- Alternative simplified workflow: Draft → Pending Approval → Approved → Locked  

Line Item Types
- Each type has different fields but should calculate into the same quote total.

Customer and Vehicle Data (Pod 2)
Customer Information should include:  
- Customer ID  
- First Name  
- Last Name  
- Phone Number  
- Email Address  
- Physical Address  

Vehicle Information should include:  
- Vehicle ID  
- Registration Number  
- VIN Number  
- Model  
- Year  
- Engine Number  
