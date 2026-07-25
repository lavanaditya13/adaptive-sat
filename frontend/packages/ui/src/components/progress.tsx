import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
}

function Progress({ className, value = 0, ...props }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, value))
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="h-full w-full flex-1 bg-primary transition-all duration-300"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  )
}

export { Progress }
