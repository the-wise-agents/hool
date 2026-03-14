# API Contracts Index

<!-- Master list of all API contracts, grouped by domain. -->
<!-- Each domain has its own file with full endpoint specifications. -->

## Domains
| Domain | File | Endpoints |
|--------|------|-----------|

## Conventions
- **Base URL**: `/api/v1/`
- **Auth**: Bearer token in Authorization header
- **Error format**: `{ "error": "ERROR_CODE", "message": "Human readable", "details": [...] }`
- **Pagination**: `?page=1&limit=20` → `{ "data": [...], "meta": { "page": 1, "limit": 20, "total": 100 } }`
- **Timestamps**: ISO 8601 format

## Agreement
- **BE Lead (POC)**: [agreed / pending]
- **FE Lead (Rebuttal)**: [agreed / pending]
- **Date**: [YYYY-MM-DD]
