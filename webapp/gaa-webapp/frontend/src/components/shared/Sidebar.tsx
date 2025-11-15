'use client'

import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { removeToken } from '@/lib/api-client'
import { Gamepad2, Users, LogOut, User } from 'lucide-react'

interface SidebarProps {
  user: {
    name?: string
    email: string
  }
}

export default function Sidebar({ user }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

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
      label: 'Squad',
      icon: Users,
      path: '/team',
      active: pathname === '/team',
    },
  ]

  return (
    <div className="w-64 bg-black/90 backdrop-blur-lg border-r border-white/10 min-h-screen flex flex-col">
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
                  onClick={() => router.push(item.path)}
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
  )
}

