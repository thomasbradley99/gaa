import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps {
  message?: string
  variant?: "fullscreen" | "inline"
  size?: "sm" | "md" | "lg"
}

export function LoadingSpinner({ 
  message = "Loading ClannAi...", 
  variant = "fullscreen",
  size = "md" 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  }

  if (variant === "fullscreen") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
          <p className="text-muted-foreground">{message}</p>
        </div>
      </div>
    )
  }

  // Inline variant for smaller contexts
  return (
    <div className="flex items-center justify-center">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {message && <span className="ml-2 text-muted-foreground">{message}</span>}
    </div>
  )
} 