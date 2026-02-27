import Link from 'next/link'

export default function Home() {
  return (
    <main className="fixed inset-0 bg-game-bg flex items-center justify-center font-mono">
      <div className="text-center max-w-lg px-6">
        {/* Logo / Title */}
        <div className="text-6xl mb-4">🌿</div>
        <h1 className="text-4xl font-bold text-game-text mb-2 tracking-widest">
          WILDBORNE
        </h1>
        <p className="text-gray-500 text-sm mb-8 leading-6">
          An open-world RPG with procedural worlds,<br />
          16 deep skill trees, and a pet companion system.
        </p>

        {/* Feature highlights */}
        <div className="grid grid-cols-2 gap-3 mb-10 text-left">
          {FEATURES.map(f => (
            <div key={f.icon} className="bg-game-panel border border-game-border rounded p-3">
              <div className="text-xl mb-1">{f.icon}</div>
              <div className="text-xs font-bold text-game-text">{f.title}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Play button */}
        <Link
          href="/game"
          className="inline-block px-10 py-3 bg-game-accent text-white font-bold text-lg rounded-lg hover:bg-purple-600 transition-colors tracking-wider"
        >
          PLAY
        </Link>

        {/* Controls reminder */}
        <div className="mt-6 text-[11px] text-gray-600 leading-5">
          WASD / Arrow Keys to move · Shift to sprint<br />
          L – Skills · P – Pets · Tab – Inventory · M – Map
        </div>
      </div>
    </main>
  )
}

const FEATURES = [
  { icon: '🗺️', title: 'Infinite World', desc: 'Procedurally generated biomes, dungeons, and POIs' },
  { icon: '🐾', title: 'Pet System', desc: 'Capture, evolve, and bond with 14+ creature types' },
  { icon: '⚔️', title: '16 Skills', desc: 'Combat, gathering, artisan, and special skill trees' },
  { icon: '⚗️', title: 'Element System', desc: 'Combo reactions between fire, water, lightning, and more' },
]
