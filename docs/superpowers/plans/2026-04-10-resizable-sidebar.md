# Resizable Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed 200px CSS-grid shell with a draggable `react-resizable-panels` layout that lets users resize or fully hide the sidebar, with state persisted to localStorage.

**Architecture:** The `.shell` div becomes a flex-column container. A new `ResizableShell` client component wraps `PanelGroup` (sidebar + main panels) and owns the toggle button. `DashboardLayout` stays a server component — it passes `<Sidebar>` as a slot prop to `ResizableShell` rather than importing it inside a client boundary.

**Tech Stack:** Next.js 15 (App Router), React 19, `react-resizable-panels` (new), Tailwind + custom CSS tokens, TypeScript.

**Verification strategy:** No test framework exists. Use `npm run typecheck` after each task and `npm run build` as the final gate.

---

## File Map

| Status | File | Role |
| --- | --- | --- |
| Modify | `package.json` | Add `react-resizable-panels` dependency |
| Modify | `app/globals.css` | `.shell` → flex column; remove grid rules; add 4 new CSS classes |
| **Create** | `components/layout/resizable-shell.tsx` | `'use client'` — `PanelGroup`, toggle button, collapse state |
| Modify | `app/(dashboard)/layout.tsx` | Swap shell internals to use `ResizableShell` |

---

## Task 1: Install `react-resizable-panels`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
cd d:/Repositories/Project_Tendriv-Admin
npm install react-resizable-panels
```

Expected: package installs without errors, `package.json` gains `"react-resizable-panels"` in dependencies.

- [ ] **Step 2: Verify types are available**

```bash
npm run typecheck
```

Expected: no new errors (the package ships its own types).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-resizable-panels"
```

---

## Task 2: Update shell CSS

**Files:**
- Modify: `app/globals.css` — Section 7 (`SHELL LAYOUT`)

Replace the entire Section 7 block (`.shell`, `.topbar`, `.sidebar`, `.nav-*`, `.shell-main` classes) with the updated version below. Everything outside Section 7 is unchanged.

- [ ] **Step 1: Replace `.shell` — remove grid, use flex column**

In `app/globals.css`, find:

```css
.shell {
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-rows: 44px 1fr;
  height: 100vh;
  background: var(--surface-root);
}
```

Replace with:

```css
.shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--surface-root);
}
```

- [ ] **Step 2: Update `.topbar` — remove `grid-column` span**

Find:

```css
.topbar {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 0.5px solid var(--border);
  background: var(--surface-root);
}
```

Replace with:

```css
.topbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 0.5px solid var(--border);
  background: var(--surface-root);
}
```

- [ ] **Step 3: Update `.shell-main` — add `height: 100%`**

Find:

```css
.shell-main {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
```

Replace with:

```css
.shell-main {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
```

- [ ] **Step 4: Add new shell utility classes**

Append these classes immediately after the `.shell-main` block (before the `/* PRINT */` section):

```css
/* ResizableShell wrapper — fills height below topbar */
.shell-resizable {
  flex: 1;
  min-height: 0;
}

/* Main panel content wrapper — owns the toggle button */
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
.shell-resize-dots {
  display: flex;
  flex-direction: column;
  gap: 3px;
  pointer-events: none;
}
.shell-resize-dots span {
  display: block;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
}

/* Sidebar toggle button — pinned to left edge of main panel */
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
  line-height: 1;
  box-shadow: 2px 0 6px var(--jade-20);
  z-index: 10;
  transition: background var(--duration-base) ease;
  padding: 0;
}
.shell-toggle:hover { background: var(--jade-dim); }
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css
git commit -m "style(shell): flex column layout + resizable panel classes"
```

---

## Task 3: Create `ResizableShell` component

**Files:**
- Create: `components/layout/resizable-shell.tsx`

- [ ] **Step 1: Create the file**

Create `components/layout/resizable-shell.tsx` with this exact content:

```tsx
'use client'

import { useRef, useState, useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelHandle } from 'react-resizable-panels'

interface ResizableShellProps {
  readonly sidebar: React.ReactNode
  readonly children: React.ReactNode
}

export function ResizableShell({ sidebar, children }: ResizableShellProps) {
  const sidebarRef = useRef<ImperativePanelHandle>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function handleToggle() {
    if (collapsed) {
      sidebarRef.current?.expand()
    } else {
      sidebarRef.current?.collapse()
    }
  }

  return (
    <div className="shell-resizable" style={{ visibility: mounted ? 'visible' : 'hidden' }}>
      <PanelGroup
        direction="horizontal"
        autoSaveId="tendriv-shell"
        style={{ height: '100%' }}
      >
        <Panel
          ref={sidebarRef}
          defaultSize={15}
          minSize={11}
          maxSize={28}
          collapsible
          collapsedSize={0}
          onCollapse={() => setCollapsed(true)}
          onExpand={() => setCollapsed(false)}
        >
          {sidebar}
        </Panel>

        <PanelResizeHandle className="shell-resize-handle">
          <div className="shell-resize-dots">
            <span />
            <span />
            <span />
          </div>
        </PanelResizeHandle>

        <Panel>
          <div className="shell-main-wrapper">
            <button
              className="shell-toggle"
              onClick={handleToggle}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              type="button"
            >
              {collapsed ? '›' : '‹'}
            </button>
            <main className="shell-main">{children}</main>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}
```

> **Note on `expand()`:** `expand()` with no argument restores the sidebar to its last pre-collapse size (library internal behaviour). If testing reveals this does not work (e.g. sidebar stays at `collapsedSize=0`), replace with `sidebarRef.current?.resize(15)` to explicitly restore `defaultSize`.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. If you see `Cannot find module 'react-resizable-panels'`, run `npm install` first.

- [ ] **Step 3: Commit**

```bash
git add components/layout/resizable-shell.tsx
git commit -m "feat(shell): ResizableShell client component with draggable sidebar"
```

---

## Task 4: Wire `DashboardLayout` to `ResizableShell`

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

> **Important:** `DashboardLayout` must stay a **server component** — do NOT add `'use client'`. Passing a client component (`ResizableShell`) as a child from a server component is valid in Next.js 15. The `<Sidebar>` JSX is constructed server-side and passed as a prop — it does not cross the client boundary.

- [ ] **Step 1: Update `layout.tsx`**

Replace the entire file content:

```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/roles'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { ResizableShell } from '@/components/layout/resizable-shell'

export default async function DashboardLayout({ children }: { readonly children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const role = user
    ? await getUserRole(supabase, user.id)
    : { role: 'admin' as const, modules: ['content', 'analytics', 'crm', 'system'] as const }

  return (
    <div className="shell">
      <Topbar email={user?.email} />
      <ResizableShell sidebar={<Sidebar modules={[...role.modules]} role={role.role} />}>
        {children}
      </ResizableShell>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build completes with no errors. Warnings about `autoSaveId` hydration are acceptable.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/layout.tsx
git commit -m "feat(shell): wire DashboardLayout to ResizableShell"
```

---

## Task 5: Manual verification

Start the dev server and verify these behaviours in the browser:

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) and log in.

- [ ] **Step 2: Verify drag resize**

Drag the jade handle between sidebar and main content. The sidebar should resize fluidly between ~154px and ~390px. Width should persist on page reload.

- [ ] **Step 3: Verify snap-to-collapse via drag**

Drag the sidebar handle all the way to the left past the minimum width. The sidebar should snap fully hidden. The toggle button (jade pill) should remain visible on the left edge of the main content, with a `›` chevron.

- [ ] **Step 4: Verify toggle button**

Click the toggle button. The sidebar should re-expand. Chevron should flip back to `‹`. Click again to collapse. Verify collapse state persists on page reload.

- [ ] **Step 5: Verify all pages**

Navigate to several pages (Dashboard, Blog posts, Analytics, CRM, Finance). Confirm the sidebar state is consistent across all pages (shared `autoSaveId`).

- [ ] **Step 6: Commit if any fixups were made**

```bash
git add -p
git commit -m "fix(shell): sidebar resize fixups from manual verification"
```

Only needed if step 2-5 revealed issues requiring code changes.

---

## Troubleshooting

**Sidebar doesn't re-expand after drag-collapse:**
Replace `sidebarRef.current?.expand()` in `handleToggle` with `sidebarRef.current?.resize(15)`. This explicitly restores to `defaultSize` rather than relying on the library's internal last-size tracking.

**PanelGroup has zero height:**
Check that `.shell-resizable` has `flex: 1; min-height: 0` in globals.css and that `PanelGroup` has `style={{ height: '100%' }}`. Both are required.

**Hydration flash on load:**
This is expected — the panel renders at `defaultSize` server-side then jumps to the localStorage value on mount. The `visibility: hidden` → `visible` transition after `mounted` suppresses the visual flash. A layout shift still occurs; this is an accepted trade-off.
