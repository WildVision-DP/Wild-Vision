# WildVision UI Modernization Plan

**Created:** May 1, 2026  
**Status:** Revision planning after first UI pass feedback  
**Scope:** Web app visual system, interaction quality, review workflows, dashboards, maps, and reporting UI.

## Goal

Upgrade WildVision from a basic admin interface into a professional forest-department operations dashboard. The redesign should feel modern, dense, reliable, and field-operations focused, while keeping the application practical for repeated daily use.

This is not a marketing landing-page redesign. The first screen after login should remain the actual working dashboard.

## Revision Note: May 1, 2026

The first modernization pass improved components, alignment, page structure, charting, toasts, and theme support, but the product still does not feel like a polished professional web application. The next UI pass must redesign the application shell and main workspaces instead of only adjusting colors, cards, and spacing.

Primary correction:

- Build a proper desktop sidebar and mobile navigation drawer.
- Add a real top menu bar for page context, quick actions, search, and account/theme controls.
- Replace the generic centered main card/frame with route-aware workspace layouts.
- Improve the main dashboard, review, map, cameras, and upload views so they feel purpose-built instead of basic admin pages.
- Rework the palette after the shell redesign so light and dark themes feel intentional, not just token swaps.

## Design Direction

- Purpose-built forest operations web app, not a generic admin template.
- Professional operations-dashboard style with dense but readable workspaces.
- Proper application shell: fixed sidebar, top/menu bar, route-aware main view, and mobile drawer.
- Calm neutral base colors with conservation-focused accents that work in both light and dark themes.
- Minimal decorative visuals; use imagery only where it improves inspection, map context, or detection review.
- Better alignment, spacing, responsive behavior, and consistent workspace/table/list structure.
- Strong visual states for active, offline, pending, approved, rejected, warning, and critical items.
- Better scanability for officers reviewing many detections.
- Main content should feel like an operational workspace, not a large white card wrapped around every page.

## Current UI Issues

- Pages feel inconsistent in spacing, cards, headers, and controls.
- Review dashboard is functional but visually plain.
- Navigation and page headers need stronger hierarchy.
- Tables/lists need better density, hover states, empty states, and loading states.
- Filters are basic and not visually grouped as a professional control surface.
- Dashboard cards are visually repetitive.
- Map and analytics experiences need stronger layout polish.
- Existing UI kit is small and missing key components.
- Some screens use inline SVGs or ad hoc styles instead of reusable primitives.

## Latest UI Feedback and Correction

- The current updated UI still feels too basic and does not yet have enough product-level structure.
- The app needs a more serious navigation model with a proper sidebar and menu bar.
- The main view still needs a stronger layout system; several pages read as stacked cards instead of professional work surfaces.
- Colors need another pass after the layout is corrected, with stronger light/dark palettes and better surface contrast.
- The next implementation should prioritize the shell and route-level layout before polishing individual page details.

## Shell Redesign Requirements

### Sidebar

- Use a fixed desktop sidebar with a clear brand area, grouped navigation, active route states, and concise labels.
- Support an expanded desktop state around `260px` to `280px` wide and a collapsed state around `72px` wide.
- Group navigation by workflow: Overview, Verification, Field Network, Reports, Administration, and System.
- Include role-aware shortcuts where useful, without hiding primary routes.
- Add a lower utility area for account, theme, system status, and logout.
- Add a mobile drawer/sidebar trigger so navigation is available below desktop breakpoints.

### Top/Menu Bar

- Add a sticky top bar inside the shell for page title, breadcrumbs, search/command entry, page actions, notifications/status, theme, and account controls.
- Keep page-specific primary actions in the top bar or a nearby route toolbar, not scattered inside page cards.
- Use compact sizing so the top bar supports dense dashboard and table workflows.
- Allow pages to provide their own actions, such as export, refresh, add camera, upload, approve/reject, or filter controls.

### Main Web View

- Remove the universal centered white `main` card as the default page wrapper.
- Use route-aware workspace layouts:
  - Dashboard: full-width KPI band, analytics panels, map preview, recent activity table.
  - Review: queue table plus inspector/review panel layout.
  - Cameras: inventory table plus detail drawer or map/list workspace.
  - Map: full map canvas with side layer controls and selected item inspector.
  - Upload: upload stepper, batch queue, validation results, and review-needed grouping.
  - Analytics: chart grid, report toolbar, officer/system tables.
- Use constrained widths only where appropriate, such as forms, login, settings, and simple detail pages.
- Avoid card-inside-card nesting. Use surfaces, panels, dividers, and section bands instead.

### Visual Treatment

- Use a stronger surface hierarchy: app background, sidebar, top bar, page surface, panels, tables, and selected states.
- Prefer subtle borders and restrained shadows over heavy cards.
- Keep operational density high while preserving breathing room around major work areas.
- Use color for status and action meaning, not as broad page decoration.
- Verify both light and dark themes after the shell is rebuilt.

## Current UI Audit

This audit implements checklist task 1: review current pages and identify reusable layout/component needs before visual redesign work begins.

### Route and Page Inventory

| Route | Page | Current State | Modernization Need |
| --- | --- | --- | --- |
| `/login` | `LoginPage` | Simple authentication screen with direct redirect behavior. | Brand-aligned login card, better error handling, loading state, and form validation. |
| `/dashboard` | `DashboardPage` | Large repeated metric cards, duplicated section styling, basic filters, embedded map preview. | KPI grid, compact system health layout, polished recent detections list, shared loading/error states. |
| `/dashboard` advanced tab | `AdvancedDashboard` | Dense detection analytics inside dashboard page. | Split into reusable analytics panels, shared filters, table/gallery mode, chart primitives. |
| `/cameras` | `CamerasPage` | Very large all-in-one page with map/list tabs, filters, print/report logic, modal forms, custom alert dialogs. | Data table, camera detail drawer, toolbar, filter bar, status chips, map/detail split layout. |
| `/users` | `UsersPage` | Basic CRUD table/list with modal form and custom alert dialog. | Shared data table, role/status badge, form drawer/dialog, toast feedback. |
| `/upload` | `UploadPage` | Feature-rich upload workflow with dropzone, camera capture, offline queue, validation, and modal confirmation. | Stepper-like upload flow, better queue cards, toast feedback, shared camera selector, improved empty/error states. |
| `/admin/review` | `AdminReviewPage` | Functional review queue with audit, undo, export, and image review modal, but still visually card-heavy. | TanStack queue table, review drawer, image inspector, audit timeline, command/keyboard hints, toast feedback. |
| `/geography` | `GeographyPage` | Tabbed CRUD cards for circles/divisions/ranges/beats with repeated form/dialog logic. | Hierarchy-aware table/tree layout, shared tabs, entity drawer, reusable CRUD state components. |
| `/map` | `WildlifeMapPage` | Map plus side panel, basic loading/error states. | Operational map workspace, layer controls, marker legend, selected camera/detection detail panel. |
| `/activity-log` | `AnimalActivityLog` | Card-heavy detection browsing with inline actions and menu state. | Data table plus gallery toggle, timeline grouping, filter toolbar, shared detection cards. |
| `/analytics` | `AnalyticsPage` | Camera analytics with manual sorting/filtering and PDF export. | Recharts panels, TanStack table, report toolbar, officer/system trend cards. |
| `/map-test` | `MapTestPage` | Diagnostic utility page. | Keep utilitarian; wrap in shared diagnostic/empty-state components later. |

### Current Layout Findings

- `Layout.tsx` mixes app shell, top bar, sidebar navigation, user role badges, logout handling, system status, and content frame in one component.
- The current shell wraps every page in a large white `main` card. This makes dashboard, map, table, and review pages feel constrained and nested.
- Navigation items repeat styling and are not grouped by workflow.
- Mobile navigation is effectively absent because the sidebar is hidden on small screens without an alternate menu.
- Page headers are implemented manually per page, with inconsistent title sizes, subtitles, and action placement.

### Current Component Findings

- Existing UI primitives are useful but incomplete: button, card, input, label, badge, progress, alert, modal, confirm dialog.
- Missing primitives needed before redesign:
  - `PageHeader`
  - `AppShell`
  - `SidebarNav`
  - `MobileNav`
  - `MetricCard`
  - `StatusBadge`
  - `ConfidenceBadge`
  - `DataToolbar`
  - `FilterBar`
  - `DataTable`
  - `EmptyState`
  - `LoadingState`
  - `Skeleton`
  - `Sheet` or `Drawer`
  - `ToastProvider`
  - `ConfirmActionDialog`
  - `AuditTimeline`
  - `ImageInspector`

### Current Interaction Findings

- Several pages still use browser `alert`, direct window redirects, or custom alert state instead of a unified feedback system.
- Filter controls are duplicated and visually inconsistent across cameras, review, analytics, dashboard, and activity log.
- Tables/lists are mostly custom markup, so sorting, filtering, pagination, row selection, and column control are duplicated or incomplete.
- Review and upload workflows need non-blocking toasts and inline validation instead of blocking alerts.
- Existing keyboard support is limited to the review workflow and should be preserved during redesign.

### Reusable Component Priority

Build these before redesigning individual pages:

1. `AppShell`, `SidebarNav`, `MobileNav`, and `PageHeader`.
2. `StatusBadge`, `ConfidenceBadge`, `MetricCard`, and `KpiGrid`.
3. `DataToolbar`, `FilterBar`, `EmptyState`, `LoadingState`, and `Skeleton`.
4. `DataTable` powered by TanStack Table for review, cameras, users, analytics, and activity log.
5. `Sheet`/`Drawer`, `ConfirmActionDialog`, and `ToastProvider`.
6. `AuditTimeline` and `ImageInspector` for review-specific workflows.

### Dependency Conclusion From Audit

- No external dependency is required to complete this audit task.
- The first implementation dependency group has been installed for foundation work: shadcn-style Radix primitives, Sonner, and Framer Motion.
- TanStack Table and Recharts are installed now so data-heavy screens can be redesigned without another dependency pass.
- React Hook Form, Zod, and resolvers are installed now so form modernization can use schema-backed validation.

## Selected Dependency Set

These are the exact dependencies approved and installed for the modernization work.

### Foundation and shadcn-style primitives

- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-separator`
- `@radix-ui/react-tabs`
- `@radix-ui/react-tooltip`
- `@radix-ui/react-select`
- `@radix-ui/react-switch`
- `@radix-ui/react-scroll-area`
- `@radix-ui/react-avatar`
- `sonner`
- `framer-motion`

### Data-heavy screens

- `@tanstack/react-table`
- `recharts`

### Forms and validation

- `react-hook-form`
- `zod`
- `@hookform/resolvers`

### Package manager note

- The repo declares Bun as the package manager in the root `package.json`.
- `npm install` hit an npm Arborist workspace-resolution error on Windows.
- Dependencies were installed with `bun add` from `apps/web`, updating `apps/web/package.json` and the root `bun.lock`.

## Recommended UI Stack

Keep:

- React + Vite
- Tailwind CSS
- Radix primitives
- lucide-react icons

Approved additions:

- shadcn/ui style component set for consistent primitives.
- TanStack Table for advanced tables, sorting, filtering, column visibility, and row selection.
- Recharts for dashboard charts and verification analytics.
- Framer Motion for restrained interaction transitions.
- Sonner for toast notifications.
- React Hook Form + Zod for clean forms and validation.
- Vaul or Radix Dialog/Sheet patterns for responsive drawers and review panels.
- cmdk for command palette/search if needed.
- date-fns is already present and should be reused for date formatting.
- React Dropzone is already present and should remain the upload interaction base.

Any new dependency should be added only when it removes real complexity or improves a major workflow.

## Dependency Strategy

### Add First

- `shadcn/ui` primitives: button, card, badge, dialog, sheet, dropdown, separator, skeleton, table, tabs, tooltip, select, textarea, switch, command, scroll-area.
- `sonner`: global toast notifications for review, upload, forms, export, and error feedback.
- `framer-motion`: subtle page, drawer, row, and panel transitions.

Why first:

- These improve every page.
- They replace ad hoc styling and browser alerts.
- They establish the visual and interaction language before page-specific redesigns.

### Add For Data-Heavy Screens

- `@tanstack/react-table`: review queues, animal activity log, cameras inventory, users, reports.
- `recharts`: dashboard, analytics, verification metrics, camera health trends.

Why second:

- Tables and charts should be introduced alongside the pages that need them.
- This avoids adding heavy abstractions before the redesigned layouts exist.

### Add For Forms

- `react-hook-form`
- `zod`
- `@hookform/resolvers`

Why third:

- Forms can be modernized after the shared primitives and page layouts are stable.
- Validation schemas should align with existing API contracts.

### Optional Later

- `cmdk`: command palette, global search, quick navigation.
- `vaul`: high-quality drawer interactions if Radix Sheet is not enough.
- `react-resizable-panels`: only if the review/image inspection screen needs adjustable panes.
- `react-zoom-pan-pinch`: only if the image inspector needs richer zoom/pan beyond simple fit/fill controls.

## Interaction Principles

- Use motion sparingly: transitions should clarify state changes, not decorate the interface.
- Prefer drawers/sheets for contextual detail without leaving the current workflow.
- Prefer dialogs only for blocking confirmation or focused edit tasks.
- Use toast notifications for completed actions and non-blocking errors.
- Use skeleton loaders for data surfaces that keep layout stable.
- Keep table filters visible and grouped; avoid hiding core workflow controls behind menus.
- Preserve keyboard workflows for review operations.

## Visual System

### Layout

- App shell with fixed sidebar on desktop and collapsible navigation on smaller screens.
- Consistent page header pattern:
  - title
  - short operational subtitle
  - primary action area
  - contextual status badges
- Max-width content containers for forms and details pages.
- Full-width dense layouts for dashboards, tables, maps, and review queues.

### Colors

- Light palette: warm canopy neutrals, deep forest primary, ochre secondary, cyan information accents.
- Dark palette: night-reserve green-black base, muted moss cards, bright canopy primary, amber/cyan operational accents.
- Primary actions use forest/canopy green, not generic blue or flat gray.
- Status colors remain consistent across themes: emerald success, amber pending/maintenance, rose danger, cyan information.
- Light/dark theme selection is persisted and can follow the system setting.
- Avoid a page dominated by one green shade; use neutral surfaces and accent colors by purpose.

### Typography

- Consistent heading scale.
- Compact labels and metadata text.
- Avoid oversized hero-style typography in admin screens.
- Use tabular numbers for metrics where useful.

### Components

Create or standardize:

- `PageHeader`
- `AppShell`
- `SidebarNav`
- `MetricCard`
- `StatusBadge`
- `ConfidenceBadge`
- `DataToolbar`
- `EmptyState`
- `LoadingState`
- `ReviewDrawer`
- `ImageInspector`
- `AuditTimeline`
- `FilterBar`
- `DataTable`
- `KpiGrid`
- `AuditTimeline`
- `ReviewQueueTable`
- `ReviewInspector`
- `OfficerReportTable`
- `ToastProvider`
- `ConfirmActionDialog`

## Page-Level Redesign Plan

### 1. Global App Shell

Tasks:

- Redesign sidebar navigation with grouped modules.
- Add active route indication.
- Add compact user/account area.
- Add top utility area for search/actions if needed.
- Improve mobile navigation.
- Standardize page padding and responsive breakpoints.

Acceptance criteria:

- Every page uses the same shell.
- Navigation is readable and consistent.
- No page-level content overlaps with navigation on mobile.

### 2. Dashboard / Overview

Tasks:

- Replace repetitive cards with a KPI grid.
- Add compact camera network health section.
- Add detection summary cards with trend indicators.
- Add recent detections as a polished list/table.
- Add better empty/loading/error states.
- Keep map preview clean and operational.

Acceptance criteria:

- Officer can understand system health in under 10 seconds.
- KPI cards use consistent sizes and visual language.
- Recent detections show status, confidence, camera, location, and time clearly.

### 3. Admin Review / Verification UI

Tasks:

- Convert review list to a professional queue layout.
- Add sticky filter toolbar.
- Use status/confidence badges.
- Improve side-by-side review panel.
- Add image inspector controls: fit, fill, zoom, and metadata panel.
- Convert audit history into timeline UI.
- Replace alerts/prompts with toasts and inline form validation.
- Improve keyboard shortcut discoverability without clutter.

Acceptance criteria:

- Review queue supports fast scan, review, approve, reject, and undo.
- Audit history is readable and chronological.
- Image area remains large enough for inspection.
- Low confidence and BLIP limitations are visible without blocking review.

### 4. Animal Activity Log

Tasks:

- Convert card-heavy view into filterable activity table plus optional gallery mode.
- Add date range, animal, status, camera, and confidence filters.
- Add compact timeline grouping by date.
- Add export action.

Acceptance criteria:

- Users can quickly locate historical detections.
- Table and gallery modes share consistent filters.

### 5. Cameras

Tasks:

- Redesign camera inventory as data table with status chips.
- Add quick filters for active/offline/maintenance.
- Add camera detail drawer.
- Improve add/edit camera forms.
- Add movement/history panel where data exists.

Acceptance criteria:

- Camera inventory is usable at scale.
- Status and geography hierarchy are easy to scan.

### 6. Map Experience

Tasks:

- Improve map container and side panel layout.
- Add layer controls for cameras, detections, and regions.
- Add selected item detail panel.
- Use consistent marker legend.
- Add fallback state when Google Maps is not configured.

Acceptance criteria:

- Map feels like an operational screen, not an embedded widget.
- Users can inspect camera/detection details without losing context.

### 7. Analytics / Reports

Tasks:

- Add chart components with Recharts.
- Add verification analytics cards.
- Add officer performance table.
- Add report export UI.
- Add clear loading and no-data states.

Acceptance criteria:

- Analytics pages communicate trends, counts, rates, and exceptions clearly.
- Reports are discoverable and exportable.

### 8. Forms and Feedback

Tasks:

- Standardize form layout and validation.
- Replace browser `alert`, `confirm`, and `prompt` usage with dialogs/toasts.
- Add optimistic feedback where safe.
- Add destructive-action confirmation dialogs.

Acceptance criteria:

- Forms feel consistent across users, cameras, geography, upload, and review.
- Errors appear near the relevant field or action.

## Revised Implementation Track

These tasks supersede the assumption that the UI modernization is visually complete. They should be implemented before doing another page-by-page polish pass.

### 19. App Shell Redesign

Tasks:

- Rebuild `Layout.tsx` around a production-style sidebar, top/menu bar, and route-aware main area.
- Move sidebar navigation into reusable shell components.
- Add grouped route sections with icons, active state, hover state, and collapsed labels/tooltips.
- Add account, role, theme, status, and logout controls in predictable shell locations.

Acceptance criteria:

- The app immediately reads as a professional web application after login.
- Navigation is available and usable on desktop, tablet, and mobile.
- The shell no longer makes every route feel like content inside one large card.

### 20. Sidebar and Mobile Drawer

Tasks:

- Add desktop expanded/collapsed sidebar behavior.
- Add a mobile drawer triggered from the top bar.
- Preserve role-aware navigation behavior.
- Add accessible labels, focus states, and keyboard-friendly controls.

Acceptance criteria:

- Desktop users can work with either full labels or compact navigation.
- Mobile users can reach all routes without hidden or missing navigation.
- Active route and route groups remain clear in both expanded and collapsed states.

### 21. Top/Menu Bar and Page Action Slots

Tasks:

- Add a reusable top/menu bar with page title, breadcrumb, search/command area, and right-side utilities.
- Add route action slots for refresh, export, upload, add camera, approve/reject, and filter actions.
- Move duplicated page header actions into the shell pattern where practical.

Acceptance criteria:

- Common page actions are easier to find.
- Pages have a consistent title/action hierarchy.
- The top bar works in both light and dark themes without visual clutter.

### 22. Route-Aware Main Workspace

Tasks:

- Replace the generic page wrapper with workspace variants for dashboard, tables, map, review, upload, and forms.
- Define shared spacing, gutters, panel borders, and responsive behavior for each variant.
- Keep dense operational pages full-width while keeping form/detail pages constrained.

Acceptance criteria:

- Dashboard, review, map, cameras, upload, analytics, and activity pages each get a layout that matches their workflow.
- Main views no longer look like stacked generic cards.
- Responsive behavior is deliberate instead of accidental.

### 23. Dashboard Workspace Redesign

Tasks:

- Rework the dashboard around a KPI band, system health strip, recent activity table, and map/analytics workspace.
- Reduce repeated card styling.
- Make the first viewport show operational state clearly.

Acceptance criteria:

- The dashboard communicates system health, recent detections, and urgent review needs quickly.
- The layout feels like a command center, not a basic metrics page.

### 24. Review Workspace Redesign

Tasks:

- Rework review into a queue-plus-inspector workspace.
- Keep low-confidence batch confirmation behavior visible without blocking every upload one-by-one.
- Add clearer image/metadata/audit placement.

Acceptance criteria:

- Reviewers can scan, inspect, approve, reject, and undo without losing context.
- Low-confidence and manual-review items are grouped clearly.

### 25. Cameras, Map, Upload, and Analytics Workspace Pass

Tasks:

- Refactor cameras into table/map/detail workspace patterns.
- Refactor map into full-canvas operational layout with layer controls and inspector.
- Refactor upload into a batch workflow with grouped review-needed results.
- Refactor analytics into chart/report/table workspace sections.

Acceptance criteria:

- Each major route has a layout matching the job being done on that route.
- The app no longer feels like multiple unrelated page designs.

### 26. Palette and Theme Refinement

Tasks:

- Revisit the light and dark palettes after the new shell is in place.
- Improve sidebar, top bar, page background, panels, table rows, and selected states.
- Remove remaining hardcoded gray/white/dark colors that fight theme tokens.

Acceptance criteria:

- Light mode feels crisp, calm, and professional.
- Dark mode feels intentional and readable, not a direct inversion.
- Status colors remain consistent and accessible across themes.

### 27. Visual QA and Build Verification

Tasks:

- Run responsive QA across desktop, tablet, and mobile viewports.
- Check dashboard, review, cameras, map, upload, analytics, and activity log in both themes.
- Run production build after the shell and workspace refactors.

Acceptance criteria:

- No navigation, text, toolbar, table, or map controls overlap.
- Major routes are usable in light and dark modes.
- Production build passes.

## Implementation Phases

### Phase 1: Foundation

- Expand UI primitives.
- Install the first dependency group: shadcn/ui primitives, Sonner, Framer Motion.
- Create layout shell and shared page header.
- Add status/confidence badge components.
- Add toast system.
- Replace highest-impact ad hoc styles.

### Phase 2: Review Workflow

- Install TanStack Table if not already added in Phase 1.
- Polish Admin Review page.
- Add professional queue/table layout.
- Improve review drawer/panel.
- Add audit timeline component.
- Replace prompts with dialogs and form fields.

### Phase 3: Dashboard and Analytics

- Install Recharts.
- Redesign overview dashboard.
- Add chart components.
- Improve verification analytics.
- Add report/export controls.

### Phase 4: Cameras, Maps, Activity Log

- Modernize camera inventory.
- Improve map detail panels and controls.
- Redesign activity log table/gallery.

### Phase 5: QA and Polish

- Responsive testing for desktop, tablet, and mobile.
- Loading, empty, and error state pass.
- Accessibility pass: focus, keyboard, labels, contrast.
- Build verification.
- Remove dead styles and duplicated UI patterns.

### Phase 6: Revised Shell and Workspace Pass

- Rebuild the shell around sidebar, top/menu bar, and route-aware main layouts.
- Refactor the dashboard, review, cameras, map, upload, analytics, and activity pages into purpose-built workspaces.
- Revisit light and dark palettes once the new shell is in place.
- Run responsive visual QA again because this pass changes the core layout model.

## Task Checklist

- [x] Audit all current pages and identify reusable layout/component needs.
- [x] Choose exact UI dependency additions.
- [x] Install first dependency group: shadcn primitives, Sonner, Framer Motion.
- [x] Install data dependency group when needed: TanStack Table, Recharts.
- [x] Install form dependency group when needed: React Hook Form, Zod, resolvers.
- [x] Add or generate shadcn-style primitives.
- [x] Create app shell and page header components.
- [x] Create badge, metric, toolbar, empty-state, loading-state components.
- [x] Redesign Admin Review queue and review panel.
- [x] Add audit timeline component.
- [x] Replace prompt/confirm/alert usage in review flow.
- [x] Redesign dashboard KPI and recent activity sections.
- [x] Add Recharts-based analytics components.
- [x] Redesign camera inventory table and detail drawer.
- [x] Improve map layout, legend, and detail panel.
- [x] Redesign animal activity log.
- [x] Add toast notifications.
- [x] Add responsive QA pass.
- [ ] Run production builds after each phase.
- [x] 19. Redesign the app shell with a proper sidebar, top/menu bar, and route-aware main area.
- [x] 20. Add collapsible desktop sidebar behavior and mobile navigation drawer.
- [x] 21. Add reusable top/menu bar with page title, breadcrumb, search/command area, utilities, and page action slots.
- [x] 22. Replace the generic main card wrapper with route-aware workspace layouts.
- [x] 23. Redesign the dashboard as an operational workspace, not a stacked metrics page.
- [x] 24. Redesign the review page as a queue-plus-inspector workspace.
- [x] 25. Refactor cameras, map, upload, and analytics into purpose-built workspaces.
- [x] 26. Refine light/dark palettes after shell and workspace changes.
- [x] 27. Run visual QA and production build verification after the redesigned shell pass.

## Risks and Constraints

- Adding too many libraries can increase bundle size.
- A decorative redesign could reduce operational usability.
- Some features depend on data quality from existing API endpoints.
- Google Maps and image preview states need graceful fallbacks.
- BLIP does not provide real bounding boxes, so object inspection must avoid implying detector precision.

## Responsive QA Pass Notes

Task 18 was completed with a responsive implementation review and production build verification.

- App shell keeps desktop sidebar behavior and mobile navigation from the foundation pass.
- Map workspace collapses from map-plus-side-panel to single-column layout below `xl`.
- Activity log filter toolbar uses responsive grid tracks and supports table and gallery modes.
- Dashboard, review, analytics, and camera inventory surfaces use shared responsive cards, tables, sheets, and empty/loading states.
- Production build passes after the map, activity log, toast, and responsive updates.

## Revised Shell Workspace QA Notes

Tasks 23 through 27 were completed after the revised shell pass.

- Dashboard now uses an operational command band, a compact KPI system-health strip, and a side-by-side detections/map workspace.
- Review now uses a queue-plus-inspector layout with progress context, filter controls, and a persistent review brief beside the table.
- Cameras, map, upload, and analytics now use shared workspace panels, route headers, and route-appropriate map/table/upload/report surfaces.
- Light/dark palette refinement added shared workspace surface utilities and reduced page-level hardcoded gray/white wrapper usage in the revised routes.
- Production build passes after the revised workspace pass.

## Definition of Done

- UI feels consistent across all main pages.
- Review workflow is faster and clearer than the current version.
- Dashboard and analytics communicate operational state clearly.
- All important states are covered: loading, empty, error, pending, approved, rejected, offline.
- Mobile and desktop layouts are usable.
- Web production build passes.
