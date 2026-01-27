# Page Design Spec (Desktop-first)

## Global Styles (All Pages)
- Layout system: Flexbox for app shell + panels; CSS Grid for dense tables/lists.
- Breakpoints: desktop-first (>=1024px main), collapse left nav to icon rail at <900px; stack panels at <640px.
- Tokens:
  - Background: `#0B1220` (app), Surface: `#111B2E`, Border: `#22304A`
  - Text: primary `#E6EDF7`, secondary `#A9B6CC`, danger `#FF5A6A`, success `#41D18D`, accent `#6AA9FF`
  - Typography: 12/14/16/20/24 scale; mono for IDs/logs.
  - Buttons: primary filled accent, secondary outline; hover = +8% brightness; disabled = 40% opacity.
- Interaction: toasts for sync events; inline validation for destructive actions; confirm modal for delete/restore/switch-during-sync.

## 1) Desktop Dashboard
### Meta Information
- Title: “SyncMark — Dashboard”
- Description: “Connection, workspace status, and sync overview.”

### Page Structure
- App shell: left nav + main content.
- Main content: 2-column grid (Status column / Activity column).

### Sections & Components
1. Header bar
   - Left: page title
   - Right: Active workspace pill (name + dropdown), connection dot + text (“Connected / Reconnecting / Offline”).
2. Status cards (left column)
   - “Connection”: WebSocket port, browser identity, fallback hint.
   - “Active Workspace”: name, last sync, items count.
   - “Conflicts”: count + CTA “Open Conflict Center”.
3. Activity feed (right column)
   - List recent events (created/updated/removed) with timestamps and source.
4. Quick actions row
   - Buttons: “Sync now”, “Back up now”, “Go to workspaces”.

## 2) Workspace & Bookmarks
### Meta Information
- Title: “SyncMark — Workspaces”
- Description: “Manage workspaces, browse bookmarks, resolve conflicts.”

### Page Structure
- 3-panel layout (desktop):
  - Left: Workspaces list
  - Center: Bookmarks tree
  - Right: Details/Inspector OR Conflict Center (tabbed)

### Sections & Components
1. Workspace list panel
   - Workspace cards (name, last sync, conflict badge)
   - Actions: Create, Rename, Delete (with confirmation)
   - Switch behavior: if syncing, show modal (Cancel / Switch anyway)
2. Bookmarks tree panel
   - Toolbar: search input, refresh, filter (All / Conflicted / Recently changed)
   - Tree: folders expandable; bookmarks show favicon placeholder, title, domain
   - Row states: changed highlight; conflicted badge
3. Inspector / Conflict Center panel (tabs)
   - Inspector tab: fields (title/url/path/updated/version/source), version timeline list, “Restore this version” action
   - Conflict Center tab:
     - Conflict list with compare button
     - Compare view: two side-by-side cards (“Desktop” vs “Browser”) with differing fields highlighted
     - Resolution actions: Choose Desktop / Choose Browser / Restore Previous; on resolve, show toast and mark resolved

## 3) Desktop Settings
### Meta Information
- Title: “SyncMark — Settings”
- Description: “Sync policies, storage, import/export, backup/restore.”

### Page Structure
- Single column with grouped sections (cards) + sticky “Save” bar.

### Sections & Components
1. Storage
   - Path display + “Change…” (file picker)
   - Retention controls: max versions per item; tombstone retention days
2. Sync Behavior
   - Default conflict policy dropdown (Ask / LWW / Prefer desktop / Prefer browser)
   - Health options: ping interval display (read-only unless exposed in config)
3. Import / Export
   - Export: select workspace → “Export” button → file save dialog
   - Import: select workspace + mode (Merge/Replace) → file open dialog → summary preview → confirm
4. Backup / Restore
   - Backup now: creates timestamped snapshot
   - Restore: choose backup file → preview (workspaces + counts) → confirm restore → post-restore resync prompt

## 4) Extension Popup
### Meta Information
- Title: “SyncMark Extension”
- Description: “Workspace switching and sync status.”

### Page Structure
- Fixed width (320–360px) stacked layout.

### Sections & Components
1. Connection header
   - Status dot + text; fallback notice if desktop not reachable
2. Workspace selector
   - Dropdown of workspaces; “Switch” triggers message and waits for ack; disable while syncing unless confirmed
3. Sync status
   - Last sync time + result; latest error (collapsible)
4. Minimal actions
   - “Sync now” (if supported) and “Open desktop app” deep link/button (