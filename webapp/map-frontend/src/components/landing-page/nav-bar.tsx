import { Button } from "@/components/ui/button"
import { Sparkles, AppWindow } from "lucide-react"
import Link from "next/link"

interface NavigationProps {
  isAuthenticated: boolean
  onSignIn: () => void
  onSignUp: () => void
}

export function Navigation({ isAuthenticated, onSignIn, onSignUp }: NavigationProps) {
  return (
    <nav className="sticky top-0 z-50 bg-transparent backdrop-blur-md supports-[backdrop-filter]:bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <img src="/logo-white.png" alt="ClannAi Logo" className="h-8 w-auto" />
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button className="flex items-center gap-2">
                  <AppWindow className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Button variant="outline" className="bg-white text-black hover:bg-gray-100" onClick={onSignIn}>Sign In</Button>
                <Button onClick={onSignUp}>Get Started</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 