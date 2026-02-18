# AI-Assisted Data Quality Insights

## Overview

The insights system provides automated data quality checks to identify potential issues in site data.

## Endpoints

All endpoints require the `insights:read` permission.

### Duplicate Detection
`GET /api/projects/:pid/insights/duplicates`

Groups sites by normalized (lowercase, trimmed) address + city + state. Returns groups with more than one matching site.

Returns up to 50 duplicate groups with full site details for review.

### Missing Fields
`GET /api/projects/:pid/insights/missing-fields`

Checks key optional fields that should ideally be populated:
- `county`, `cmaId`, `cmaName`, `siteType`, `ge`, `siteAltId`
- `structureHeight` equal to 0

Returns per-field counts and up to 5 sample sites for each.

### Outlier Detection
`GET /api/projects/:pid/insights/outliers`

**Structure Height Outliers:**
- Computes average and standard deviation of structure heights
- Flags sites where height > avg + 2 * stdDev
- Flags sites with height = 0

**Coordinate Outliers:**
- Flags sites with coordinates outside continental US bounds (lat 24-50, lon -125 to -66)

Returns height statistics (avg, stdDev, threshold) and lists of flagged sites.

## Frontend

`/projects/:pid/insights` - Tabbed interface:
1. **Duplicates** - Grouped duplicate site pairs with edit links
2. **Missing Fields** - Table of fields with missing counts and samples
3. **Outliers** - Height statistics, height outliers, zero-height sites, coordinate outliers
