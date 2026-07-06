# Customer Feature Data Flow
By Tiffany-Jade
On 2026/06/17

## Overview
The customer feature manages all customer information within the Blaze Diagnostics system. It allows service advisors to create, view, update, and archive customer records. Customers are linked to to vehicles which in turn connect to job cards, quotes, and invoices.

## File Structure
List the files you found and where they are located:
- Page file: frontend > src > features > customers > pages
- Component file: frondend > src > features > customers > components
- API wrapper: frontend > src > customers > api
- Types file: frontend > src > customers > types
- Schema file: frontend > src > customers > schemas

## Data Flow

customers-page.tsx
↓ renders
CustomersPanel.tsx
↓ imports and calls
customers.api.ts
↓ uses types from
customers.types.ts
↓ makes HTTP requests to
backend API endpoints

## Customer Data Structure

- id: Unique identifier for the customer
- tenantId: Identifies which workshop the customer belongs to
- fullName: The customer's full name
- mobileNumber: Primary contact number
- alternateNumber: Secondary contact number if available
- email: Customer's email address
- address: Customer's physical address
- companyName: Business name if customer is a company
- taxNumber: Tax reference number for business customers
- preferredCommunicationChannel: How the customer prefers to be contacted
- marketingConsent: Whether customer agreed to receive marketing
- isArchived: Whether the customer has been removed from active records
- createdAt: When the record was created
- updatedAt: When the record was last updated

## API Operations

- list: Gets all the customers
- getById: Gets one specific customer
- create: Adds a new customer
- update: Edits an existing customer
- archive: Removes a customer

## Notes and Observations

- What's working well
- What might be missing
- Any questions that came up while reading the code

## Questions for Ben

- Is there a backend route file we should also be looking at to complete the full data flow ficture?
- The vehicles folder doesn't have a schemas file like customers does, is that intention or does it still need to be created?