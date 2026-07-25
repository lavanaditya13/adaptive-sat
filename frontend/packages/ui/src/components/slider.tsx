import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value?: number
  min?: number
  max?: number
  step?: number
  onChange?: (value: number) => void
}

function Slider({
  className,
  value = 1,
  min = 1,
  max = 5,
  step = 1,
  onChange,
  disabled,
  ...props
}: SliderProps) {
  return (
    <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(Number(e.target.value))}
        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      />
    </div>
  )
}

export { Slider }
