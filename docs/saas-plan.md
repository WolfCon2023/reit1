# SaaS Readiness Plan

## Current State

The REIT platform currently operates as a single-tenant application. This document outlines the plan for evolving toward a multi-tenant SaaS offering.

## Feature Flags (Implemented)

A lightweight feature flag system is in place to toggle features on/off:

### Backend
- `apps/api/src/lib/featureFlags.ts` - Configuration-driven flags from env vars
- Flags: `FEATURE_MAP`, `FEATURE_LEASES`, `FEATURE_DOCUMENTS`, `FEATURE_INSIGHTS`, `FEATURE_VIEWS`
- All default to `true` (enabled). Set to `"false"` to disable.
- `requireFeature(name)` middleware returns 404 if feature disabled
- `GET /api/features` - Public endpoint returning enabled flags

### Frontend
- `apps/web/src/store/features.ts` - Zustand store for feature flags
- Loaded on app mount via `AuthLoader`
- UI components can check `useFeaturesStore.isEnabled("featureName")`

## Multi-Tenancy Plan (Future)

### Phase A: Organization Model
1. Create `Organization` model (name, slug, plan, settings)
2. Add `organizationId` to `User`, `Project`, and all data models
3. Implement organization-scoped data isolation via middleware
4. Auto-filter all queries by `organizationId`

### Phase B: Invitation & Onboarding
1. Organization creation flow during sign-up
2. Invite users by email to an organization
3. Organization settings page (name, billing, members)

### Phase C: Plan-Based Feature Gating
1. Define plans (Free, Pro, Enterprise) with feature/limit matrices
2. Extend feature flags to check organization plan
3. Rate limiting and storage quotas per plan

### Phase D: Billing Integration
1. Integrate Stripe for subscription management
2. Webhook handlers for subscription lifecycle events
3. Usage metering for storage and API calls
4. Self-service plan upgrades/downgrades

### Phase E: Data Isolation & Security
1. Row-level security via `organizationId` on all collections
2. Consider separate databases per tenant for enterprise tier
3. API key authentication for integrations
4. SOC 2 compliance preparation

## Migration Strategy

1. Create a "Default Organization" for existing data
2. Assign all current users, projects, and data to it
3. Run migration similar to the existing `migrateProjects.ts` pattern
4. No data loss; backward compatible

## Timeline Estimate

- Phase A: 2-3 weeks
- Phase B: 1-2 weeks
- Phase C: 1-2 weeks
- Phase D: 2-3 weeks
- Phase E: 2-4 weeks (ongoing)
