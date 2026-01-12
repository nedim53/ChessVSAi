export default function MoveHistory({ moves }) {
  const movesArray = Array.isArray(moves) ? moves : [];
  
  const movePairs = [];
  for (let i = 0; i < movesArray.length; i += 2) {
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: movesArray[i],
      black: movesArray[i + 1] || null,
    });
  }

  return (
    <div className="bg-white rounded-lg shadow-xl p-4 md:p-6 h-full">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Move History
        {movesArray.length > 0 && (
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({movesArray.length} moves)
          </span>
        )}
      </h2>
      
      {movePairs.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          No moves yet. Start playing!
        </div>
      ) : (
        <div className="move-history max-h-[600px] overflow-y-auto">
          <div className="space-y-2">
            {movePairs.map((pair) => (
              <div
                key={`${pair.moveNumber}-${pair.white?.san || 'empty'}-${pair.black?.san || 'empty'}`}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <span className="font-semibold text-gray-600 w-8">
                  {pair.moveNumber}.
                </span>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div className="bg-white border border-gray-200 rounded px-3 py-1 text-sm">
                    {pair.white?.san || '-'}
                  </div>
                  <div className="bg-gray-100 border border-gray-200 rounded px-3 py-1 text-sm">
                    {pair.black?.san || '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
