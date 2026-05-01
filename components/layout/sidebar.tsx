'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield } from 'lucide-react'
import type { ModuleKey, UserRole } from '@/lib/auth/roles'

interface NavItem {
  label: string
  href: string
  badge?: number
}

interface NavSection {
  key: ModuleKey | 'overview'
  title: string
  items: NavItem[]
}

const allSections: NavSection[] = [
  {
    key: 'overview',
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/' },
    ],
  },
  {
    key: 'content',
    title: 'Content',
    items: [
      { label: 'Posts', href: '/posts' },
      { label: 'Calendar', href: '/posts/calendar' },
      { label: 'Drafts', href: '/drafts' },
      { label: 'Media', href: '/media' },
    ],
  },
  {
    key: 'analytics',
    title: 'Marketing',
    items: [
      { label: 'Analytics', href: '/analytics' },
      { label: 'Funnel', href: '/funnel' },
      { label: 'UTMs', href: '/utms' },
      { label: 'Agencies', href: '/agencies' },
    ],
  },
  {
    key: 'crm',
    title: 'CRM',
    items: [
      { label: 'Prospects', href: '/crm' },
      { label: 'Accounts', href: '/crm/accounts' },
      { label: 'Geo', href: '/crm/geo' },
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
      { label: 'Vendor Spend', href: '/finance/billing' },
      { label: 'Customer Revenue', href: '/finance/customers' },
      { label: 'Top Users', href: '/finance/top-users' },
    ],
  },
  {
    key: 'feedback',
    title: 'Support',
    items: [
      { label: 'Feedback', href: '/feedback' },
    ],
  },
  {
    key: 'system',
    title: 'System',
    items: [
      { label: 'Audit', href: '/audit' },
    ],
  },
]

const systemHealthItem: NavItem = { label: 'System health', href: '/system-health' }

interface SidebarProps {
  readonly modules?: ModuleKey[]
  readonly role?: UserRole
  readonly iconRail?: boolean
}

export function Sidebar({ modules, role, iconRail }: SidebarProps) {
  const pathname = usePathname()

  const visibleSections = allSections.filter((s) => {
    if (s.key === 'overview') return true
    return modules ? modules.includes(s.key) : true
  }).map((section) =>
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
    if (
      href === '/posts' &&
      pathname.startsWith('/posts/') &&
      pathname !== '/posts/calendar'
    )
      return true
    if (
      href !== '/' &&
      href !== '/posts' &&
      pathname.startsWith(href + '/')
    )
      return true
    return false
  }

  return (
    <aside className={`sidebar${iconRail ? ' icon-rail' : ''}`}>
      {visibleSections.map((section) => (
        <div key={section.key}>
          {!iconRail && (
            <div className="nav-section">{section.title}</div>
          )}
          {section.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${isActive(item.href) ? ' active' : ''}`}
              title={iconRail ? item.label : undefined}
            >
              <span className="nav-dot" />
              {!iconRail && item.label}
              {!iconRail && item.badge != null && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </Link>
          ))}
        </div>
      ))}

      <div style={{ marginTop: 'auto' }}>
        {!iconRail && (
          <div className="nav-section">Settings</div>
        )}
        {settingsItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${isActive(item.href) ? ' active' : ''}`}
            title={iconRail ? item.label : undefined}
          >
            <span className="nav-dot" />
            {!iconRail && item.label}
          </Link>
        ))}
      </div>

      <div className="sovereignty-pill" title={iconRail ? 'Data stored in Canada' : undefined}>
        {iconRail ? (
          <Shield size={16} className="sovereignty-icon" aria-label="Data stored in Canada" />
        ) : (
          'Data stored in Canada'
        )}
      </div>
    </aside>
  )
}
