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
      label: 'Games',
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
  ]

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <Image
          src="/clann-logo-white.png"
          alt="ClannAI"
          width={90}
          height={24}
          className="h-6 w-auto"
          style={{ width: 'auto', height: 'auto' }}
        />
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    item.active
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
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
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  )
}

