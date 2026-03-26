'use client'

/** Shell sidebar — sectioned navigation matching tendriv portal mockup */

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type ModuleKey = 'content' | 'analytics' | 'crm' | 'sales' | 'system'

interface NavItem {
  label: string
  href: string
  badge?: number
}

interface NavSection {
  key: ModuleKey
  title: string
  items: NavItem[]
}

const topItems: NavItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'LinkedIn drafts', href: '/drafts' },
]

const allSections: NavSection[] = [
  {
    key: 'content',
    title: 'Content',
    items: [
      { label: 'Blog posts', href: '/posts' },
      { label: 'New post', href: '/posts/new' },
      { label: 'Calendar', href: '/posts/calendar' },
      { label: 'Media library', href: '/media' },
    ],
  },
  {
    key: 'analytics',
    title: 'Analytics',
    items: [
      { label: 'Post performance', href: '/analytics' },
      { label: 'Funnel', href: '/analytics/funnel' },
      { label: 'UTM builder', href: '/analytics/utms' },
    ],
  },
  {
    key: 'crm',
    title: 'CRM',
    items: [
      { label: 'Contacts', href: '/crm' },
      { label: 'Accounts', href: '/crm/accounts' },
    ],
  },
  {
    key: 'sales',
    title: 'Sales',
    items: [
      { label: 'Pipeline', href: '/sales' },
    ],
  },
  {
    key: 'system',
    title: 'System',
    items: [
      { label: 'Audit log', href: '/audit' },
    ],
  },
]

interface SidebarProps {
  modules?: ModuleKey[]
}

export function Sidebar({ modules }: SidebarProps) {
  const pathname = usePathname()

  const visibleSections = modules
    ? allSections.filter((s) => modules.includes(s.key))
    : allSections

  function isActive(href: string): boolean {
    if (href === pathname) return true
    if (href === '/' && pathname === '/') return true
    // /posts/new and /posts/[id] should highlight "New post" or "Blog posts"
    if (href === '/posts' && pathname === '/posts') return true
    if (href === '/posts/new' && pathname.startsWith('/posts/') && pathname !== '/posts' && pathname !== '/posts/calendar') return true
    if (href !== '/' && href !== '/posts' && href !== '/posts/new' && pathname.startsWith(href + '/')) return true
    return false
  }

  return (
    <aside className="sidebar">
      {topItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-item${isActive(item.href) ? ' active' : ''}`}
        >
          <span className="nav-dot" />
          {item.label}
        </Link>
      ))}
      {visibleSections.map((section) => (
        <div key={section.key}>
          <div className="nav-section">{section.title}</div>
          {section.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${isActive(item.href) ? ' active' : ''}`}
            >
              <span className="nav-dot" />
              {item.label}
              {item.badge != null && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </Link>
          ))}
        </div>
      ))}
    </aside>
  )
}
