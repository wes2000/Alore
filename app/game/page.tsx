import dynamic from 'next/dynamic'

// GameCanvas must be client-only — Three.js needs window
const GameCanvas = dynamic(() => import('@/components/game/GameCanvas'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-game-bg flex items-center justify-center font-mono">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">🌿</div>
        <div className="text-game-text font-bold">Loading Wildborne...</div>
      </div>
    </div>
  ),
})

export default function GamePage() {
  return <GameCanvas />
}
