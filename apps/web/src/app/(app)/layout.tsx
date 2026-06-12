import { Sidebar } from '@/components/shell/sidebar'
import { Topbar } from '@/components/shell/topbar'
import { CommandPaletteProvider } from '@/components/shell/command-palette'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CommandPaletteProvider>
      <Sidebar />
      <div className="md:pl-52">
        <Topbar />
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">{children}</main>
      </div>
    </CommandPaletteProvider>
  )
}
