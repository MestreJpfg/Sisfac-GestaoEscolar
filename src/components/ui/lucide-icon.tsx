"use client"
import { icons, BellRing, List } from "lucide-react"

export const LucideIcon = ({
  name,
  ...props
}: {
  name: keyof typeof icons
} & React.ComponentProps<"svg">) => {
  const Icon = icons[name]
  if (!Icon) {
    // Return a default icon or null if the icon name is not found
    return <BellRing {...props} />; // Example default
  }
  return <Icon {...props} />
}
