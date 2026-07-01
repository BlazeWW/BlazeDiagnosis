#*Date* 25 June 2026

# Quote Approval Workflow

1. Create a quote.
2. Apply discounts (if applicable).
3. Calculate subtotal and tax.
4. Set the quote expiry date.
5. Review all quote details.
6. Send the quote for approval using:
   PUT /api/quotes/:id/send
7. Update the quote status after approval.

# Business Rules

- Every quote must have a valid workshop.
- Discounts must be applied before tax.
- Expired quotes cannot be approved.
- Notes are optional but recommended.