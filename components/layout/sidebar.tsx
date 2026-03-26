'use client'

/** Shell sidebar — sectioned navigation matching tendriv portal mockup */

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type ModuleKey = 'content' | 'analytics' | 'crm' | 'system'

interface NavItem { label: string; href: string; badge?: number }
interface NavSection { key: ModuleKey; title: string; items: NavItem[] }

const allSections: NavSection[] = [
  {
    key: 'content', title: 'Content',
    items: [
      { label: 'Blog posts', href: '/posts' },
      { label: 'New post', href: '/posts/new' },
      { label: 'Calendar', href: '/posts/calendar' },
    ],
  },
  {
    key: 'analytics', title: 'Analytics',
    items: [
      { label: 'Post performance', href: '/analytics' },
      { label: 'Funnel', href: '/analytics/funnel' },
      { label: 'Agency RFX', href: '/analytics/agencies' },
      { label: 'UTM builder', href: '/analytics/utms' },
    ],
  },
  {
    key: 'crm', title: 'CRM',
    items: [
      { label: 'Contacts', href: '/crm' },
      { label: 'Accounts', href: '/crm/accounts' },
    ],
  },
  {
    key: 'system', title: 'System',
    items: [{ label: 'Audit log', href: '/audit' }],
  },
]

interface SidebarProps { modules?: ModuleKey[] }

export function Sidebar({ modules }: SidebarProps) {
  const pathname = usePathname()
  const visibleSections = modules ? allSections.filter((s) => modules.includes(s.key)) : allSections

  function isActive(href: string): boolean {
    if (href === pathname) return true
    if (href === '/posts' && pathname === '/posts') return true
    if (href === '/posts/new' && pathname.startsWith('/posts/') && pathname !== '/posts' && pathname !== '/posts/calendar') return true
    if (href !== '/posts' && href !== '/posts/new' && pathname.startsWith(href + '/')) return true
    return false
  }

  return (
    <aside className="sidebar">
      {visibleSections.map((section) => (
        <div key={section.key}>
          <div className="nav-section">{section.title}</div>
          {section.items.map((item) => (
            <Link key={item.href} href={item.href}
              className={`nav-item${isActive(item.href) ? ' active' : ''}`}>
              <span className="nav-dot" />
              {item.label}
              {item.badge != null && <span className="nav-badge">{item.badge}</span>}
            </Link>
          ))}
        </div>
      ))}
    </aside>
  )
}
