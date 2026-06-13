import { LayoutGrid, GitPullRequest, FolderGit2, Settings, BookOpen, type LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

/** Primary dashboard navigation, shared by the desktop sidebar and mobile drawer. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/overview', label: 'Overview', icon: LayoutGrid },
  { href: '/reviews', label: 'Reviews', icon: GitPullRequest },
  { href: '/repositories', label: 'Repositories', icon: FolderGit2 },
  { href: '/how-it-works', label: 'How it works', icon: BookOpen },
  { href: '/settings', label: 'Settings', icon: Settings },
]
