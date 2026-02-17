# Import template and validations

## Template

- **Download:** `GET /api/import/template` (requires `import:template:download`). Filename: `REIT_Site_Import_Template.xlsx`.
- **Format:** One sheet named **Sites** with a header row and data rows. A hidden **Lists** sheet holds dropdown sources.

## Header order (exact)

Headers must appear in this order and match exactly (case-sensitive):

1. SITE ID  
2. SITE NAME  
3. AREA NAME  
4. DISTRICT NAME  
5. PROVIDER  
6. PROVIDER RESIDENT  
7. ADDRESS  
8. CITY  
9. COUNTY  
10. STATE  
11. ZIP CODE  
12. CMA ID  
13. CMA NAME  
14. STRUCTURE TYPE  
15. SITE TYPE  
16. GE  
17. STRUCTURE HEIGHT  
18. LATITUDE  
19. LONGITUDE  
20. SITE ALT ID  

If the header row does not match, the upload is rejected with a “Header mismatch” error.

## Validations

- **Required:** SITE ID, SITE NAME, PROVIDER, ADDRESS, CITY, STATE, ZIP CODE, STRUCTURE TYPE.
- **Numeric:** STRUCTURE HEIGHT ≥ 0; LATITUDE in [-90, 90]; LONGITUDE in [-180, 180].
- **Dropdowns (optional in template):** STRUCTURE TYPE, PROVIDER RESIDENT, STATE – the template includes a hidden “Lists” sheet and Excel data validations for these columns. Users can still type values; server accepts any non-empty string for these.

## Flow

1. User downloads the template, fills it, and uploads via **Import** page.
2. **POST /api/import/xlsx** – file parsed (xlsx), headers checked, rows validated. Response includes batch ID, valid row count, error count, error details (bounded), and a small preview.
3. User reviews preview and errors, then clicks **Import valid rows**.
4. **POST /api/import/commit** with `{ batchId }` – server uses stored valid rows for that batch and bulk-inserts sites. NAD83 coordinates are set from WGS84 (current approximation). Duplicate SITE IDs are skipped.

## Limits

- File size: 10 MB.
- Error details returned and stored per batch are bounded (e.g. first 500 rows with errors).
- Valid rows stored per batch are bounded (e.g. 10,000) for commit.
