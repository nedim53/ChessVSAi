export default function PromotionDialog({ isOpen, color, onSelect }) {
  if (!isOpen) return null;

  const pieces = [
    { symbol: '♕', name: 'Queen', value: 'q' },
    { symbol: '♖', name: 'Rook', value: 'r' },
    { symbol: '♗', name: 'Bishop', value: 'b' },
    { symbol: '♘', name: 'Knight', value: 'n' },
  ];

  const pieceColors = {
    w: { bg: 'bg-white', border: 'border-gray-300', text: 'text-gray-800' },
    b: { bg: 'bg-gray-800', border: 'border-gray-600', text: 'text-white' },
  };

  const colors = pieceColors[color] || pieceColors.w;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Choose Promotion Piece
        </h3>
        <p className="text-gray-600 mb-6 text-center">
          Your pawn has reached the end! Choose which piece to promote to:
        </p>
        
        <div className="grid grid-cols-4 gap-4">
          {pieces.map((piece) => (
            <button
              key={piece.value}
              onClick={() => onSelect(piece.value)}
              className={`
                ${colors.bg} ${colors.border} ${colors.text}
                border-2 rounded-lg p-4 hover:scale-110 hover:shadow-lg
                transition-all duration-200 cursor-pointer
                flex flex-col items-center justify-center
                min-h-[100px]
              `}
            >
              <div className="text-5xl mb-2">{piece.symbol}</div>
              <div className="text-sm font-semibold">{piece.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
