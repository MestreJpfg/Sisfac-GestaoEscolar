"use client"
import { icons } from "lucide-react"

export const LucideIcon = ({
  name,
  ...props
}: {
  name: keyof typeof icons
} & React.ComponentProps<"svg">) => {
  const Icon = icons[name]
  if (!Icon) {
    return null
  }
  return <Icon {...props} />
}
