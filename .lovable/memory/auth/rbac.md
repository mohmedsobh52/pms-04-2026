---
name: RBAC system
description: User role enum, useUserRoles hook, RequireRole route guard, Can UI gate
type: feature
---
# Role-Based Access Control

## Roles (app_role enum)
admin, pm, cost_engineer, qs, procurement, site_engineer, subcontractor, viewer

Stored in `user_roles` table. Checked via `has_role(uuid, app_role)` RPC.

## Client API
- `useUserRoles()` → `{ roles, has(role|roles), isAdmin, isLoading }` — react-query cached 5min
- `<RequireRole roles={["admin","pm"]}>` — route guard, redirects to `/` on deny, `/auth` if not signed in. Admin always passes.
- `<Can role="pm">` — conditional UI render. Admin always passes.

## Currently applied
- `/admin` and `/admin/versions` → admin only

## Permission map (recommended, not enforced yet)
- Admin pages → admin
- Cost Control writes → admin, pm, cost_engineer
- Procurement writes → admin, pm, procurement
- Contracts writes → admin, pm, qs
- Reads → all roles incl. viewer

Roles surfaced as Badge in UserMenu via `ROLE_LABELS`.
