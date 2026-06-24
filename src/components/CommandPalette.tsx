import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { Search, Calculator, Package, Users, BarChart3, Bot, Settings2 } from 'lucide-react'
import { useI18n } from '../i18n'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { t } = useI18n()
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  return (
    <Command.Dialog 
      open={open} 
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] sm:pt-[20vh] bg-ink/40 backdrop-blur-sm px-4"
    >
      <div className="w-full max-w-xl bg-surface/95 backdrop-blur-2xl rounded-2xl shadow-panel border border-line/50 overflow-hidden font-sans relative">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-accent/20 blur-[60px] pointer-events-none"></div>

        <div className="flex items-center border-b border-line/50 px-4 py-3 relative z-10">
          <Search className="w-5 h-5 text-ink-soft shrink-0" />
          <Command.Input 
            autoFocus
            className="flex-1 bg-transparent border-none outline-none focus:ring-0 px-3 text-ink placeholder:text-ink-soft/70 text-base"
            placeholder={t(`Type a command or search...`)} 
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 bg-surface-strong px-2 py-1 rounded text-[10px] font-bold text-ink-soft border border-line/40 shadow-sm uppercase">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-line scrollbar-track-transparent">
          <Command.Empty className="py-6 text-center text-sm text-ink-soft">
            {t(`No results found.`)}
          </Command.Empty>

          <Command.Group heading={t(`Core Features`)} className="text-[11px] font-bold uppercase tracking-wider text-ink-soft/80 px-2 py-1.5 mt-2">
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/pos'))}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-semibold text-ink data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent transition-colors mt-1"
            >
              <Calculator className="w-4 h-4" />
              {t(`Go to POS System`)}
            </Command.Item>
            
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/inventory'))}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-semibold text-ink data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent transition-colors"
            >
              <Package className="w-4 h-4" />
              {t(`Check Inventory`)}
            </Command.Item>

            <Command.Item 
              onSelect={() => runCommand(() => navigate('/metrics'))}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-semibold text-ink data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              {t(`Dashboard & Analytics`)}
            </Command.Item>
          </Command.Group>

          <Command.Group heading={t(`AI Tools`)} className="text-[11px] font-bold uppercase tracking-wider text-ink-soft/80 px-2 py-1.5 mt-2">
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/queue'))}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-semibold text-ink data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent transition-colors mt-1"
            >
              <Bot className="w-4 h-4 text-focus" />
              {t(`AI Decision Queue (Swipe)`)}
            </Command.Item>
          </Command.Group>

          <Command.Group heading={t(`Management`)} className="text-[11px] font-bold uppercase tracking-wider text-ink-soft/80 px-2 py-1.5 mt-2 mb-1">
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/staff'))}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-semibold text-ink data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent transition-colors mt-1"
            >
              <Users className="w-4 h-4" />
              {t(`Manage Staff`)}
            </Command.Item>
            
            <Command.Item 
              onSelect={() => runCommand(() => navigate('/controls'))}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-semibold text-ink data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              {t(`Settings & Controls`)}
            </Command.Item>
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  )
}
