import {
  ArrowUpDown,
  BookOpen,
  Droplets,
  FileImage,
  FileOutput,
  FileText,
  Hash,
  Images,
  Merge,
  Minimize2,
  PenTool,
  RotateCw,
  Scissors,
  Trash2,
  File,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  Merge,
  Scissors,
  Minimize2,
  FileImage,
  Images,
  RotateCw,
  Trash2,
  ArrowUpDown,
  FileOutput,
  Hash,
  Droplets,
  FileText,
  BookOpen,
  PenTool,
}

export function ToolIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? File
  return <Icon className={className} aria-hidden="true" />
}
