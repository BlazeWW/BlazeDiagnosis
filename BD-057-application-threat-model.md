# BD-057 — Application Threat Model

**Document ID:** `BD-057-ATM-2026-11`  
**GitHub Issue:** [#149](https://github.com/BlazeWW/BlazeDiagnosis/issues/149)  
**Squad:** Squad 9: Cybersecurity Assurance  
**Target Release:** BlazeDiagnosis Core SaaS (P0)  
**Assessment Date:** 2026-11-17  
**Author:** Cybersecurity Assurance Intern (attributable to Issue #149)  
**Classification:** Confidential — Internal Security Assessment  

---

## 1. Executive Summary & Purpose

This document provides the formal application threat model for **BlazeDiagnosis**, a multi-tenant automotive diagnostic and workshop management SaaS platform. 

In accordance with **BD-057**, this assessment:
1. Defines explicit **trust boundaries** across Customer, Station/Workshop, Supplier, and Platform contexts.
2. Identifies and categorizes **threat actors, entry points, and primary assets**.
3. Evaluates practical abuse cases across the **five mandatory risk domains**:
   - Session & Authentication Lifecycle
   - Multi-tenant Isolation & Authorization Boundaries
   - File Uploads & Diagnostic Evidence Exposure
   - Financial Mutation & Workflow Integrity (Quotes, Approvals, Invoices)
   - Cloud Secrets & Infrastructure Configuration
4. Establishes a prioritized **STRIDE Risk Register** with concrete technical reproductions, mitigations, and assigned remediation owners.
5. Provides a formal **Review Sign-off Record** for Engineering and Cloud leadership.

---

## 2. Architecture & Trust Boundary Model

BlazeDiagnosis operates a multi-tenant Next.js application backed by Auth0 identity management, Drizzle ORM, and PostgreSQL.

### 2.1 Trust Contexts & Actors

| Trust Zone | Actors / Roles | Trust Level | Description / Boundaries |
|:---|:---|:---|:---|
| **Zone 0: Public & Untrusted** | Anonymous visitors, unauthenticated clients, web scrapers | Zero Trust | Public landing pages, Auth0 login redirect endpoints, public assets. |
| **Zone 1: Customer Context** | Registered vehicle owners (`customer` role) | Restricted | Customer portal (`/portal/customer`), quote approvals, service history views, repair progress tracking. |
| **Zone 2: Station / Workshop Context** | Mechanics, Technicians, Service Advisors, Workshop Admins | Tenant-Scoped Internal | Workshop operations (`/station/*`), job cards, diagnostics, labour logs, parts requisitions. |
| **Zone 3: Supplier Context** | Parts suppliers, OEM vendor reps | External Partner | Quote requests, part availability updates, purchase order acknowledgments. |
| **Zone 4: Platform & Cloud Context** | Platform Superadmins, CI/CD runners, Cloud DB, Auth0 Admin | Privileged Core | Tenant lifecycle management, global feature flags, database migrations, cloud secrets, audit logs. |

### 2.2 Threat Model Data Flow Diagram (DFD)

```text
       +-----------------------------------------------------------------------------------+
       |                               PUBLIC NETWORK (UNTRUSTED)                          |
       +-----------------------------------------------------------------------------------+
              | (Zone 1: HTTPS)                     | (Zone 2: HTTPS)              | (Zone 3)
              v                                     v                              v
    +--------------------+               +--------------------+          +--------------------+
    |  Customer Portal   |               | Workshop Station   |          | Supplier Interface |
    | (Mobile / Browser) |               | (Mechanic / Admin) |          | (Parts Management) |
    +--------------------+               +--------------------+          +--------------------+
              |                                     |                              |
==============|=====================================|==============================|========
[ TRUST BOUNDARY: Client / Browser Edge  ]          |                              |
==============|=====================================|==============================|========
              \------------------------+------------/------------------------------/
                                       |
                                       v
                     +-----------------------------------+
                     |   Reverse Proxy / Ingress (WAF)   |
                     |  Host Header Routing & TLS Term   |
                     +-----------------------------------+
                                       |
=======================================|====================================================
[ TRUST BOUNDARY: Network Edge / Ingress to Application Server ]
============================================================================================
                                       v
                     +-----------------------------------+
                     | Next.js App Router (apps/web)     |
                     | - Middleware / Route Guards       |
                     | - session.ts (Auth0 JWT verify)   |
                     | - tenantContext.ts (Server-side)  |
                     +-----------------------------------+
                               |               |
             +-----------------+               +-----------------+
             | (Auth Callback)                                   | (Tenant DB Queries)
             v                                                   v
  +-----------------------+                            +-----------------------+
  | External Identity     |                            | PostgreSQL (Drizzle)  |
  | Provider (Auth0 OIDC) |                            | - Tenant Schemas      |
  | - Tokens & Claims     |                            | - Audit Trail Tables  |
  +-----------------------+                            +-----------------------+
             ^                                                   ^
=============|===================================================|==========================
[ TRUST BOUNDARY: Cloud Infrastructure & Storage ]               |
=================================================================|==========================
             |                                                   v
  +-----------------------+                            +-----------------------+
  | Cloud Object Storage  | <--- Pre-signed Uploads -- | S3  / MinIO Adapter    |
  | (Diagnostic Images &  |                            | (Evidence Files &     |
  |  Customer Quote PDFs) | -------------------------> |  Attachment Store)    |
  +-----------------------+                            +-----------------------+


