'use client'

/** Shell sidebar — sectioned navigation matching tendriv portal mockup */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@/lib/auth/roles'

export type ModuleKey = 'content' | 'analytics' | 'crm' | 'sales' | 'finance' | 'feedback' | 'system'

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
      { label: 'Blog pipeline', href: '/blog/pipeline' },
    ],
  },
  {
    key: 'analytics',
    title: 'Analytics',
    items: [
      { label: 'Post performance', href: '/analytics' },
      { label: 'Funnel', href: '/analytics/funnel' },
      { label: 'Agency RFX', href: '/analytics/agencies' },
      { label: 'UTM builder', href: '/analytics/utms' },
    ],
  },
  {
    key: 'crm',
    title: 'Leads & Outreach',
    items: [
      { label: 'Prospects', href: '/crm' },
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
    key: 'finance',
    title: 'Finance',
    items: [
      { label: 'Overview', href: '/finance' },
      { label: 'Analytics', href: '/finance/analytics' },
      { label: 'Subscribers', href: '/finance/customers' },
      { label: 'Top users', href: '/finance/top-users' },
      { label: 'Billing accounts', href: '/finance/billing' },
    ],
  },
  {
    key: 'feedback',
    title: 'Feedback',
    items: [
      { label: 'Inbox', href: '/feedback' },
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

const systemHealthItem: NavItem = { label: 'System health', href: '/system-health' }

interface SidebarProps {
  readonly modules?: ModuleKey[]
  readonly role?: UserRole
}

export function Sidebar({ modules, role }: SidebarProps) {
  const pathname = usePathname()

  const visibleSections = (modules
    ? allSections.filter((s) => modules.includes(s.key))
    : allSections
  ).map((section) =>
    section.key === 'system' && role === 'admin'
      ? { ...section, items: [...section.items, systemHealthItem] }
      : section,
  )

  const settingsItems: NavItem[] = [
    { label: 'Profile', href: '/settings/profile' },
    ...(role === 'admin' ? [{ label: 'Users', href: '/settings/users' }] : []),
  ]

  function isActive(href: string): boolean {
    if (href === pathname) return true
    if (href === '/' && pathname === '/') return true
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
      <div style={{ marginTop: 'auto' }}>
        <div className="nav-section">Settings</div>
        {settingsItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${isActive(item.href) ? ' active' : ''}`}
          >
            <span className="nav-dot" />
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  )
}
