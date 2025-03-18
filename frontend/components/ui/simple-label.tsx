import * as React from "react"
import { cn } from "@/lib/utils"

// A simple label component that doesn't depend on Radix UI
export interface SimpleLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor?: string
}

const SimpleLabel = React.forwardRef<HTMLLabelElement, SimpleLabelProps>(({ className, htmlFor, ...props }, ref) => {
  return (
    <label
      ref={ref}
      htmlFor={htmlFor}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  )
})
SimpleLabel.displayName = "SimpleLabel"

export { SimpleLabel }