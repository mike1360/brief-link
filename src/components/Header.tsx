import { Link2, Moon, Sun } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Header() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <header className="card-bg border-b border-th2 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
               style={{ backgroundColor: 'var(--accent)' }}>
            <Link2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-th">Brief Link</h1>
            <p className="text-xs text-th3">Exhibit Hyperlinking Service</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-th3 hidden sm:block">Veritext Legal Solutions</span>
          <button onClick={() => setDark(!dark)}
                  className="p-2 rounded-lg transition-colors hover:opacity-80"
                  style={{ color: 'var(--text-3)' }}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  )
}
