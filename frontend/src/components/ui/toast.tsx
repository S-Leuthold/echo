/**
 * Toast Component System
 * 
 * A toast notification system for showing temporary messages with auto-dismiss functionality.
 * Built on top of the existing Alert component for consistency.
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "./alert"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"
import { Button } from "./button"

// Toast variants for different types of notifications
const toastVariants = cva(
  "fixed top-4 right-4 z-50 w-full max-w-sm rounded-lg border shadow-lg transition-all duration-300 ease-in-out",
  {
    variants: {
      variant: {
        success: "border-emerald-200 bg-emerald-50 text-emerald-900",
        error: "border-red-200 bg-red-50 text-red-900", 
        info: "border-blue-200 bg-blue-50 text-blue-900",
        warning: "border-amber-200 bg-amber-50 text-amber-900",
      },
      state: {
        entering: "animate-in slide-in-from-right-full",
        visible: "opacity-100 translate-x-0",
        exiting: "animate-out slide-out-to-right-full opacity-0",
      }
    },
    defaultVariants: {
      variant: "info",
      state: "visible",
    },
  }
)

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  title?: string
  description: string
  duration?: number
  onDismiss?: () => void
  showDismiss?: boolean
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ 
    className, 
    variant = "info", 
    title, 
    description, 
    duration = 5000,
    onDismiss,
    showDismiss = true,
    ...props 
  }, ref) => {
    const [state, setState] = React.useState<'entering' | 'visible' | 'exiting'>('entering')
    
    // Auto-dismiss functionality
    React.useEffect(() => {
      // Show entering animation
      const enterTimer = setTimeout(() => setState('visible'), 50)
      
      // Auto-dismiss after duration
      const dismissTimer = setTimeout(() => {
        setState('exiting')
        setTimeout(() => onDismiss?.(), 300) // Wait for exit animation
      }, duration)

      return () => {
        clearTimeout(enterTimer)
        clearTimeout(dismissTimer)
      }
    }, [duration, onDismiss])

    // Get appropriate icon for variant
    const getIcon = () => {
      switch (variant) {
        case 'success':
          return <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        case 'error':
          return <AlertCircle className="w-5 h-5 text-red-600" />
        case 'warning':
          return <AlertCircle className="w-5 h-5 text-amber-600" />
        case 'info':
        default:
          return <Info className="w-5 h-5 text-blue-600" />
      }
    }

    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant, state }), className)}
        {...props}
      >
        <Alert variant={variant} className="border-0 bg-transparent p-4">
          <div className="flex items-start gap-3">
            {getIcon()}
            <div className="flex-1 space-y-1">
              {title && (
                <div className="font-medium text-sm leading-none">
                  {title}
                </div>
              )}
              <AlertDescription className="text-sm">
                {description}
              </AlertDescription>
            </div>
            {showDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-transparent"
                onClick={() => {
                  setState('exiting')
                  setTimeout(() => onDismiss?.(), 300)
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Alert>
      </div>
    )
  }
)
Toast.displayName = "Toast"

export { Toast, toastVariants }