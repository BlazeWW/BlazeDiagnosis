# POPIA Compliance Controls: Retention, Access, and Deletion

* **Owner:** Gerrit & Ruvan
* **Task ID:** BD-063 
* **Status:** Compliance Controls

## 1. Overview
This document defines the technical and administrative controls implemented within **BlazeDiagnosis** to satisfy the requirements of South Africa's **Protection of Personal Information Act (POPIA)**. It outlines how personal and diagnostic data is authorized, retained, and securely destroyed throughout its operational lifecycle.

## 2. Scope & Applicable Data Types
The following data categories handled by the system fall under this compliance boundary:
* **User Identifiers:** Email addresses, user account metadata, and access tokens.
* **Diagnostic Logs:** Error traces, device telemetry, and system execution logs.
* **Audit Logs:** Security events, authentication logs, and administrative action records.

## 3. Control Specifications

### 3.1 Access Controls (Authorization & Isolation)
To enforce the principle of least privilege and protect data confidentiality:
* **Role-Based Access Control (RBAC):** Access to user diagnostic reports and system logs is restricted strictly to authorized support and security personnel.
* **Tenant Isolation:** Multi-tenant boundaries are strictly enforced at the data layer to prevent cross-tenant data exposure.
* **Encryption Standards:** 
  * **In-Transit:** All client-server communication uses TLS 1.3 encryption.
  * **At-Rest:** Stored diagnostic databases and log repositories are encrypted using AES-256.

### 3.2 Data Retention Controls
Data is retained only as long as necessary to fulfill legitimate operational, support, or legal obligations:

| Data Type | Purpose | Retention Period | Storage Location |
| :--- | :--- | :--- | :--- |
| **User Account Data** | Identity & Access Management | Duration of active account + 30 days | Main Database |
| **Diagnostic Logs** | System troubleshooting | 90 days | Log Repository |
| **Audit Trails** | Security compliance & monitoring | 365 days | Encrypted Audit Store |

*Log rotation policies automatically flag and archive telemetry exceeding these retention windows.*

### 3.3 Deletion & Disposal Controls
Once retention periods expire or a Data Subject Access Request (DSAR) for erasure is approved:
* **Automated Purging:** Background cleanup processes run on a scheduled interval to permanently purge expired diagnostic records and logs.
* **Hard Deletion for Accounts:** User profile deletions trigger cascading hard deletes across active tables, ensuring no residual personal identifiers remain.
* **Cryptographic Erasure:** Any backup snapshots containing deleted data adhere to write-once-read-many (WORM) expiration policies or key-rotation destruction mechanisms.

## 4. Verification & Audit Procedures
To verify these controls independently:
1. **Access Control Check:** Attempt accessing a tenant's diagnostic payload using a non-authorized role token; confirm a `403 Forbidden` response.
2. **Retention Check:** Run log audit scripts (`npm run audit:logs` or equivalent) to confirm no diagnostic records older than 90 days exist in active storage.
3. **Deletion Verification:** Execute account deletion API workflows and verify the user payload returns `null` across all linked collections.
