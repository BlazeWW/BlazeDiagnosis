## Personal Data Inventory

| Workflow | Data Field / Element | Data Owner | Collection Purpose | Permissions / Access Roles | Proposed Retention Rule |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication** | Passwords (hashed), emails, MFA tokens | User / Admin | Identity verification & session management | Auth Service, User | Retain while account is active; delete 30 days post-cancellation |
| **Customer** | Names, contact info, billing addresses | Customer | Account management & invoicing | Customer Support, Billing | Retain 5 years post-account closure (tax compliance) |
| **Vehicle** | VINs, registration numbers, telematics | Vehicle Owner | Service scheduling & diagnostic history | Fleet Manager, Mechanics | Retain for full operational life + 1 year |
| **Messaging** | Direct messages, notification logs | Sender / Recipient | In-app communication & audit logging | System Admin, Parties | Retain logs for 90 days; purge automatically |
## Access Roles, Retention, and Incident Handling

### Access Roles & Permissions
- **Principle of Least Privilege:** System roles (Customer Support, Fleet Manager, Billing) are isolated using Role-Based Access Control (RBAC).
- **Audit Logging:** Access to sensitive fields (e.g., authentication tokens, personal contact details) must generate an audit log entry.
## Technical Control Gaps & Legal Review Questions

### Missing Technical Controls
1. **Automated Deletion:** Lack of automated DB scripts to purge expired vehicle history data upon account closure.
2. **Encryption at Rest:** Field-level encryption is not yet implemented for customer phone numbers in the local database.
3. **Role Scoping:** Messaging endpoints currently lack granular tenant-level isolation checks.

### Questions for Legal / Privacy Review
1. Are customer invoice records required to be stored beyond 5 years under local record-keeping regulations?
2. Does storing anonymized vehicle telematics after account deletion require user re-consent?
### Deletion & Retention Responsibilities
- **Automated Purging:** Database scheduled jobs clear transient messaging logs every 90 days.
- **Manual Deletion Requests:** Account managers process user deletion requests within 30 calendar days via the admin dashboard.

### Incident Handling Requirements
- **Detection & Containment:** Any unauthorized access to stored personal data triggers an immediate containment protocol and account lockdown.
- **Reporting:** Security incidents must be reported to the data protection lead within 72 hours of detection.

