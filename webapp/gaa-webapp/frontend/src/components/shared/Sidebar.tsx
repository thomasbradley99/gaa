'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { removeToken } from '@/lib/api-client'
import { Gamepad2, Users, LogOut, User, Menu, X, Shield } from 'lucide-react'

interface SidebarProps {
  user: {
    name?: string
    email: string
    role?: string
  }
}

export default function Sidebar({ user }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    removeToken()
    router.push('/')
  }

  const menuItems = [
    {
      label: 'Matches',
      icon: Gamepad2,
      path: '/dashboard',
      active: pathname === '/dashboard',
    },
    {
      label: 'Team',
      icon: Users,
      path: '/team',
      active: pathname === '/team',
    },
    // Show admin link only if user is admin
    ...(user?.role === 'admin' ? [{
      label: 'Admin',
      icon: Shield,
      path: '/admin',
      active: pathname === '/admin',
    }] : []),
  ]

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <Image
            src="/clann-logo-text-white.png"
            alt="ClannAI"
            width={120}
            height={20}
            className="h-5 w-auto"
            style={{ width: 'auto', height: 'auto' }}
          />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/80 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-40
        w-64 bg-black/90 backdrop-blur-lg border-r border-white/10 min-h-screen flex flex-col
        transform transition-transform duration-300 lg:transform-none
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Image
          src="/clann-logo-text-white.png"
          alt="ClannAI"
          width={140}
          height={24}
          className="h-6 w-auto"
          style={{ width: 'auto', height: 'auto' }}
        />
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <User className="w-5 h-5 text-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-white/60 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.path}>
                <button
                  onClick={() => {
                    router.push(item.path)
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    item.active
                      ? 'bg-[#2D8B4D] text-white shadow-lg'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
    </>
  )
}

