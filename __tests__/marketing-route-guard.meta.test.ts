import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { PUBLIC_MARKETING_ROUTES } from '@/lib/marketing/route-allowlist'

// W7 meta-test: completeness by enumeration. Every route file under
// app/api/marketing/** must either invoke requireContentAccess() in every
// exported handler, or appear on the committed allowlist with a reason.
// A new unguarded, un-allowlisted route fails this suite by construction.

const ROOT = process.cwd()
const MARKETING_DIR = path.join(ROOT, 'app', 'api', 'marketing')

function walkRouteFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkRouteFiles(full))
    else if (entry.name === 'route.ts') out.push(full)
  }
  return out
}

const toRepoPath = (file: string) => path.relative(ROOT, file).split(path.sep).join('/')

const routeFiles = walkRouteFiles(MARKETING_DIR)
const allowlist = new Map(PUBLIC_MARKETING_ROUTES.map((r) => [r.route, r]))

const HANDLER_RE = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD)\b/g
const INVOKE_RE = /await\s+requireContentAccess\(\)/g
const IMPORT_RE =
  /import\s*\{[^}]*\brequireContentAccess\b[^}]*\}\s*from\s*['"]@\/lib\/autoblog\/auth['"]/

describe('marketing route guard meta-test (W7)', () => {
  it('enumerates the marketing route files', () => {
    expect(routeFiles.length).toBeGreaterThan(0)
  })

  it.each(routeFiles.map((f) => [toRepoPath(f), f] as const))(
    '%s is session-guarded or explicitly allowlisted',
    (repoPath, file) => {
      const source = fs.readFileSync(file, 'utf8')
      const handlers = [...source.matchAll(HANDLER_RE)].map((m) => m[1])
      expect(handlers.length, `${repoPath} exports no HTTP handlers`).toBeGreaterThan(0)

      const entry = allowlist.get(repoPath)
      if (entry) {
        if (entry.guard === 'cron-secret') {
          // CRON_SECRET is this route's guard, not an exemption.
          expect(source, `${repoPath} is allowlisted as cron-secret but does not check CRON_SECRET`).toMatch(
            /CRON_SECRET/
          )
        }
        return
      }

      expect(source, `${repoPath} must import requireContentAccess`).toMatch(IMPORT_RE)
      const invocations = [...source.matchAll(INVOKE_RE)]
      expect(
        invocations.length,
        `${repoPath} exports ${handlers.length} handler(s) [${handlers.join(', ')}] but invokes requireContentAccess() only ${invocations.length} time(s)`
      ).toBeGreaterThanOrEqual(handlers.length)
    }
  )

  it('every allowlist entry points at an existing marketing route and states a reason', () => {
    for (const entry of PUBLIC_MARKETING_ROUTES) {
      expect(entry.route.startsWith('app/api/marketing/'), `${entry.route} is outside app/api/marketing`).toBe(true)
      const file = path.join(ROOT, ...entry.route.split('/'))
      expect(fs.existsSync(file), `${entry.route} does not exist — stale allowlist entry`).toBe(true)
      expect(entry.reason.trim().length, `${entry.route} needs a documented reason`).toBeGreaterThan(10)
    }
  })
})
