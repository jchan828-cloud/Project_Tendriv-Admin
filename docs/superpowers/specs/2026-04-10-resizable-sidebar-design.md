# Resizable Sidebar — Design Spec

**Date:** 2026-04-10  
**Status:** Approved  
**Scope:** All dashboard pages (`app/(dashboard)/`)

---

## Problem

The admin shell has a fixed 200px sidebar with no way to resize or hide it. Users working on data-dense pages (analytics, finance, CRM) want more horizontal space for the main content area.

---

## Solution

Add a draggable splitter between the sidebar and main content using `react-resizable-panels`. Dragging below the minimum width snaps the sidebar fully hidden. A persistent toggle button on the left edge of the main content re-opens it. Width and collapse state are saved to localStorage automatically.

---

## Architecture

### Shell layout change

The outermost `.shell` div (which currently defines a CSS grid) becomes a `flex-direction: column` container. It wraps **both** `Topbar` and `ResizableShell` as siblings — Topbar occupies 44px, `ResizableShell` fills the remaining height. `ResizableShell` internally renders only the horizontal `PanelGroup` (sidebar + main); it does not contain the Topbar.

```text
<div class="shell">                             ← flex column, 100vh
  <Topbar />                                    ← 44px, full width (unchanged)
  <ResizableShell sidebar={<Sidebar />}>        ← NEW client component
    <PanelGroup direction="horizontal"          ← height: 100%
                style={{ height: '100%' }}>
      <Panel ref={sidebarRef}>                  ← sidebar slot prop
      <PanelResizeHandle />                     ← jade drag handle
      <Panel>                                   ← main panel
        <div class="shell-main-wrapper">        ← position:relative, height:100%, overflow:hidden
          <button class="shell-toggle" />       ← owned by ResizableShell
          {children}                            ← RSC children pass through
        </div>
    </PanelGroup>
  </ResizableShell>                             ← flex: 1; min-height: 0
</div>
```

The `grid-column: 1 / -1` rule on `.topbar` is removed (no longer needed in flex layout).

### RSC boundary preservation

`DashboardLayout` stays a **server component**. Importing `ResizableShell` (a client component) into a server component is valid in Next.js 14 — server-rendered JSX (`<Sidebar>`) is passed as a prop, not imported inside the client boundary. No data fetching moves client-side. Do **not** add `'use client'` to `layout.tsx`.

### Files changed

| File | Change |
| --- | --- |
| `app/(dashboard)/layout.tsx` | Wrap with `ResizableShell`; pass `<Sidebar>` as `sidebar` prop |
| `components/layout/resizable-shell.tsx` | **NEW** — `'use client'` with `PanelGroup` + toggle button |
| `app/globals.css` | `.shell` → flex column; remove grid rules; add `.shell-resize-handle`, `.shell-toggle`, `.shell-main-wrapper` |
| `package.json` | Add `react-resizable-panels` |

---

## Behaviour

### Sizing (percentage-based — library requirement)

All sizes are percentages of the `PanelGroup` width. Pixel equivalents are approximate at 1400px viewport and will scale with window width — this is expected behaviour, not a bug.

`minSize` acts as the snap-to-collapse threshold: dragging the sidebar below 11% triggers a snap to `collapsedSize` (0). It is **not** a hard floor that prevents collapse — it is the point at which the library decides to collapse rather than continue resizing.

| Prop | Value | Approx px at 1400px viewport |
| --- | --- | --- |
| `defaultSize` | 15 | ~210px — matches current 200px sidebar |
| `minSize` | 11 | ~154px — floor before snap-to-collapse |
| `maxSize` | 28 | ~390px — ceiling |
| `collapsible` | `true` | Enables snap-to-collapse behaviour |
| `collapsedSize` | `0` | Size when collapsed — sidebar disappears completely |
| `autoSaveId` | `"tendriv-shell"` | localStorage key — persists width and collapse state across all pages |

> **Shared state:** `autoSaveId` is shared across all dashboard pages — collapsing the sidebar on one page collapses it everywhere. Per-page sidebar state is out of scope.
>
> **Hydration:** The panel renders at `defaultSize` on the server, then jumps to the localStorage value on mount. `autoSaveId` persists percentage values, so at different viewport widths the restored size yields different pixel widths — this is expected. Mitigation: apply `visibility: hidden` to `ResizableShell` until after first mount (via a `mounted` state flag), then fade in. This hides the visual flash but does not prevent the layout shift — the element still occupies space while hidden. This is an accepted trade-off for an internal admin tool.

### Toggle button

The toggle button is **rendered by `ResizableShell`** (the client component), not by the server-component children. It is absolutely positioned inside `.shell-main-wrapper`, a div that `ResizableShell` renders around `{children}` inside the main `Panel`.

- Dimensions: 14×28px jade pill, `border-radius: 0 6px 6px 0`
- The sidebar `Panel` receives a `ref` typed as `ImperativePanelHandle` (exported from `react-resizable-panels`).

  ```tsx
  const sidebarRef = useRef<ImperativePanelHandle>(null)
  // ...
  <Panel ref={sidebarRef} ... >
  ```

- The button calls `sidebarRef.current?.collapse()` when expanded, and `sidebarRef.current?.expand()` when collapsed. `expand()` internally restores the last pre-collapse size; verify this works for both drag-collapse and button-collapse paths. If it does not restore correctly in testing, use `sidebarRef.current?.resize(15)` to explicitly restore `defaultSize` as a fallback.
- Collapse state for the chevron is tracked via React state using `onCollapse` / `onExpand` callbacks on `Panel`. Do **not** use any imperative `isCollapsed()` method — it does not exist in v2.x of the library.

  ```tsx
  const [collapsed, setCollapsed] = useState(false)
  // ...
  <Panel onCollapse={() => setCollapsed(true)} onExpand={() => setCollapsed(false)} ... >
  ```

- Chevron: `‹` when `collapsed === false`, `›` when `collapsed === true`
- Always visible — user can always re-open the sidebar

### Drag handle

- `PanelResizeHandle` renders as a 4px vertical bar via `.shell-resize-handle`
- Colour at rest: `var(--border)` (neutral)
- Colour on hover / active (`[data-resize-handle-active]`): `var(--jade)`
- Three dot grips centred vertically
- Transition: `150ms` (`var(--duration-base)`)

### PanelGroup height

`ResizableShell` must have `flex: 1; min-height: 0` so it fills the remaining height below the topbar. The `PanelGroup` inside must have `height: 100%`. Each `Panel` element rendered by the library already has a defined height via its internal flex layout. `.shell-main-wrapper` (inside the main `Panel`) must have `position: relative; height: 100%; overflow: hidden` — **not** `flex: 1` — since `Panel` controls sizing and an extra `flex: 1` causes double-flex interference. The `height: 100%` on `.shell-main-wrapper` resolves correctly because its parent `Panel` element already has a defined height provided by the library.

---

## CSS changes

```css
/* .shell: grid → flex column */
.shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--surface-root);
}

/* Topbar: remove grid-column span */
.topbar {
  flex-shrink: 0;
  /* grid-column: 1 / -1  ← REMOVED */
}

/* ResizableShell wrapper */
.shell-resizable {
  flex: 1;
  min-height: 0;
}

/* Main panel content wrapper (owned by ResizableShell) */
.shell-main-wrapper {
  position: relative;
  height: 100%;
  overflow: hidden;
}

/* Drag handle */
.shell-resize-handle {
  width: 4px;
  background: var(--border);
  cursor: col-resize;
  transition: background var(--duration-base) ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.shell-resize-handle:hover,
.shell-resize-handle[data-resize-handle-active] {
  background: var(--jade);
}

/* Toggle button */
.shell-toggle {
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  width: 14px;
  height: 28px;
  background: var(--jade);
  border-radius: 0 6px 6px 0;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 10px;
  box-shadow: 2px 0 6px var(--jade-20);
  z-index: 10;
  transition: background var(--duration-base) ease;
}
.shell-toggle:hover { background: var(--jade-dim); }
```

---

## Out of scope

- Responsive / mobile breakpoints (sidebar becomes a drawer on narrow screens) — separate task
- Per-page sidebar state overrides
- Post editor internal split (lives inside `.shell-main-wrapper`, unaffected)

---

## Dependencies

- `react-resizable-panels` — latest stable version
