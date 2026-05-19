'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV = [
  { href: '/',          label: 'Dashboard',  icon: '▦' },
  { href: '/journal',   label: 'Journal',    icon: '≡' },
  { href: '/analytics', label: 'Analytics',  icon: '◈' },
  { href: '/playbook',  label: 'Playbook',   icon: '◉' },
  { href: '/calendar',  label: 'Calendar',   icon: '⊞' },
  { href: '/import',    label: 'Import',     icon: '↑' },
  { href: '/settings',  label: 'Settings',   icon: '⚙' },
]

export default function Sidebar() {
  const path = usePathname()
  const [expanded, setExpanded] = useState(false)

  const W = expanded ? 160 : 52

  return (
    <aside style={{
      width: W,
      background: 'var(--bg1)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: expanded ? 'flex-start' : 'center',
      padding: '12px 0',
      gap: 2,
      flexShrink: 0,
      height: '100vh',
      transition: 'width 0.2s ease',
      overflow: 'hidden',
    }}>
      {/* Logo + collapse toggle */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 8, padding: expanded ? '0 12px' : '0',
        marginBottom: 14, width: '100%',
        justifyContent: expanded ? 'space-between' : 'center',
      }}>
        <div style={{
          width: 32, height: 32,
          background: 'var(--blue)', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: '#fff', fontWeight: 700, flexShrink: 0,
        }}>W</div>
        {expanded && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t1)', whiteSpace: 'nowrap' }}>
            whatsmyedge
          </span>
        )}
        <button
          onClick={() => setExpanded(e => !e)}
          title={expanded ? 'Collapse' : 'Expand'}
          style={{
            background: 'none', border: 'none',
            color: 'var(--t3)', cursor: 'pointer',
            fontSize: 14, padding: '2px 4px',
            flexShrink: 0,
            marginLeft: expanded ? 'auto' : 0,
          }}
        >
          {expanded ? '◂' : '▸'}
        </button>
      </div>

      {/* Nav items */}
      {NAV.map(item => {
        const active = item.href === '/'
          ? path === '/'
          : path.startsWith(item.href)

        return (
          <Link key={item.href} href={item.href} title={item.label}
            style={{
              width: expanded ? 'calc(100% - 16px)' : 36,
              height: 36,
              margin: expanded ? '1px 8px' : '1px 0',
              borderRadius: 8,
              display: 'flex', alignItems: 'center',
              gap: 10,
              padding: expanded ? '0 10px' : '0',
              justifyContent: expanded ? 'flex-start' : 'center',
              fontSize: 16,
              color: active ? 'var(--blue)' : 'var(--t3)',
              background: active ? 'rgba(59,130,246,0.12)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
            <span style={{ flexShrink: 0 }}>{item.icon}</span>
            {expanded && (
              <span style={{
                fontSize: 12, fontWeight: active ? 500 : 400,
                color: active ? 'var(--blue)' : 'var(--t2)',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{item.label}</span>
            )}
          </Link>
        )
      })}
    </aside>
  )
}
