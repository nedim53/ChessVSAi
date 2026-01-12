export default function GameControls({ onNewGame, onRestart, onPlayVsAI, disabled }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={onNewGame}
        disabled={disabled}
        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
      >
        New Game
      </button>
      
      <button
        onClick={onRestart}
        disabled={disabled}
        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
      >
        Restart
      </button>
      
      <button
        onClick={onPlayVsAI}
        disabled={disabled}
        className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
      >
        Play vs AI
      </button>
    </div>
  );
}
