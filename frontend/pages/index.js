import { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { io } from 'socket.io-client';
import MoveHistory from '../components/MoveHistory';
import GameControls from '../components/GameControls';
import PromotionDialog from '../components/PromotionDialog';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

if (typeof window !== 'undefined') {
  console.log('🔗 Backend URL:', BACKEND_URL);
  console.log('🌐 Frontend URL:', window.location.origin);
}

export default function Home() {
  const [game, setGame] = useState(new Chess());
  const [gameId, setGameId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameStatus, setGameStatus] = useState('');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [isAIGame, setIsAIGame] = useState(false);
  const [isAITurn, setIsAITurn] = useState(false);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  const [promotionColor, setPromotionColor] = useState('w');

  useEffect(() => {
    console.log('Move history updated:', moveHistory.length, 'moves');
    if (moveHistory.length > 0) {
      console.log('Last move:', moveHistory[moveHistory.length - 1]);
    }
  }, [moveHistory]);

  useEffect(() => {
    const newSocket = io(BACKEND_URL, {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('game_state', (data) => {
      console.log('📥 Received game state:', data);
      const newGame = new Chess(data.fen);
      setGame(newGame);
      setGameId(data.gameId);
      setMoveHistory(data.history || []);
      setIsPlayerTurn(data.turn === 'w');
      setIsAIGame(data.isAIGame || false);
      setIsAITurn(data.isAIGame && data.turn === 'b');
      setSelectedSquare(null);
      setPossibleMoves([]);
      updateGameStatus(newGame);
    });

    newSocket.on('move_made', (data) => {
      console.log('📥 Move received from server:', data);
      console.log('📥 History from server:', data.history?.length || 0, 'moves');
      const newGame = new Chess(data.fen);
      const serverHistory = data.history && Array.isArray(data.history) && data.history.length > 0
        ? data.history 
        : newGame.history({ verbose: true });
      
      console.log('📥 Setting history to:', serverHistory.length, 'moves');
      console.log('📥 History details:', serverHistory.map(m => m.san).join(', '));
      
      setGame(newGame);
      setMoveHistory(serverHistory);
      setIsPlayerTurn(data.turn === 'w');
      setIsAITurn(isAIGame && data.turn === 'b');
      setSelectedSquare(null);
      setPossibleMoves([]);
      updateGameStatus(newGame);
    });

    newSocket.on('game_restarted', (data) => {
      console.log('🔄 Game restarted');
      const newGame = new Chess();
      setGame(newGame);
      setMoveHistory([]);
      setIsPlayerTurn(true);
      setSelectedSquare(null);
      setPossibleMoves([]);
      updateGameStatus(newGame);
    });

    newSocket.on('ai_thinking', (data) => {
      if (data.thinking) {
        setIsAITurn(true);
        console.log('🤖 AI is thinking...');
      } else {
        setIsAITurn(false);
        console.log('✅ AI finished thinking');
      }
    });

    newSocket.on('ai_error', (data) => {
      console.error('❌ AI error:', data.error);
      setIsAITurn(false);
      alert(`AI Error: ${data.error || 'AI failed to generate a move. Please try again.'}`);
    });

    newSocket.on('error', (error) => {
      console.error('❌ Error:', error);
      alert(`Error: ${error.message || 'Unknown error'}`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const updateGameStatus = (chessGame) => {
    if (chessGame.isCheckmate()) {
      setGameStatus(`Checkmate! ${chessGame.turn() === 'w' ? 'Black' : 'White'} wins!`);
    } else if (chessGame.isDraw()) {
      setGameStatus('Draw!');
    } else if (chessGame.isStalemate()) {
      setGameStatus('Stalemate!');
    } else if (chessGame.isCheck()) {
      setGameStatus('Check!');
    } else {
      setGameStatus(`${chessGame.turn() === 'w' ? 'White' : 'Black'}'s turn`);
    }
  };

  function requiresPromotion(sourceSquare, targetSquare) {
    const piece = game.get(sourceSquare);
    if (!piece || piece.type !== 'p') {
      return false;
    }
    
    const targetRank = parseInt(targetSquare[1]);
    const isWhitePawn = piece.color === 'w';
    
    return (isWhitePawn && targetRank === 8) || (!isWhitePawn && targetRank === 1);
  }

  function completeMoveWithPromotion(promotion) {
    if (!pendingMove) return;

    const { from, to } = pendingMove;
    
    try {
      const gameCopy = new Chess(game.fen());
      
      const move = gameCopy.move({
        from: from,
        to: to,
        promotion: promotion,
      });

      if (move === null) {
        console.error('Invalid move with promotion');
        setShowPromotionDialog(false);
        setPendingMove(null);
        return;
      }

      setShowPromotionDialog(false);
      setPendingMove(null);
      setSelectedSquare(null);
      setPossibleMoves([]);

      const updatedHistory = gameCopy.history({ verbose: true });
      setGame(gameCopy);
      setMoveHistory(updatedHistory);
      setIsPlayerTurn(gameCopy.turn() === 'w');
      updateGameStatus(gameCopy);

      if (socket && gameId) {
        socket.emit('make_move', {
          gameId,
          move: {
            from: from,
            to: to,
            promotion: promotion,
          },
        });
      }
    } catch (error) {
      console.error('Error completing move with promotion:', error);
      setShowPromotionDialog(false);
      setPendingMove(null);
    }
  }

  function onDrop(sourceSquare, targetSquare) {
    try {
      const gameCopy = new Chess(game.fen());
      
      const currentTurn = gameCopy.turn();
      const piece = gameCopy.get(sourceSquare);
      
      if (isAIGame && currentTurn === 'b') {
        return false;
      }
      
      if (!piece || (currentTurn === 'w' && piece.color !== 'w') || (currentTurn === 'b' && piece.color !== 'b')) {
        return false;
      }
      
      if (requiresPromotion(sourceSquare, targetSquare)) {
        const testMove = gameCopy.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q',
        });
        
        if (testMove === null) {
          return false;
        }
        
        gameCopy.undo();
        
        setPendingMove({ from: sourceSquare, to: targetSquare });
        setPromotionColor(piece.color);
        setShowPromotionDialog(true);
        
        return false;
      }
      
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
      });

      if (move === null) {
        return false;
      }

      setSelectedSquare(null);
      setPossibleMoves([]);

      const updatedHistory = gameCopy.history({ verbose: true });
      setGame(gameCopy);
      setMoveHistory(updatedHistory);
      setIsPlayerTurn(gameCopy.turn() === 'w');
      updateGameStatus(gameCopy);
      
      console.log('Move made locally, history updated:', updatedHistory.length, 'moves');

      if (socket && gameId) {
        socket.emit('make_move', {
          gameId,
          move: {
            from: sourceSquare,
            to: targetSquare,
          },
        });
      }

      return true;
    } catch (error) {
      console.error('Error making move:', error);
      return false;
    }
  }

  function onSquareClick(square) {
    try {
      const gameCopy = new Chess(game.fen());
      const piece = gameCopy.get(square);
      const currentTurn = gameCopy.turn();

      if (selectedSquare === square) {
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }

      if (piece && piece.color === currentTurn) {
        setSelectedSquare(square);
        const moves = gameCopy.moves({
          square: square,
          verbose: true
        });
        const targetSquares = moves.map(move => move.to);
        setPossibleMoves(targetSquares);
      } 
      else if (selectedSquare && possibleMoves.includes(square)) {
        if (requiresPromotion(selectedSquare, square)) {
          const piece = gameCopy.get(selectedSquare);
          setPendingMove({ from: selectedSquare, to: square });
          setPromotionColor(piece.color);
          setShowPromotionDialog(true);
          setSelectedSquare(null);
          setPossibleMoves([]);
        } else {
          onDrop(selectedSquare, square);
        }
      }
      else {
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    } catch (error) {
      console.error('Error handling square click:', error);
    }
  }

  function getKingInCheckSquare() {
    if (!game.isCheck()) {
      return null;
    }
    
    const currentTurn = game.turn();
    const kingColor = currentTurn === 'w' ? 'w' : 'b';
    
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + (8 - rank);
        const piece = game.get(square);
        if (piece && piece.type === 'k' && piece.color === kingColor) {
          return square;
        }
      }
    }
    return null;
  }

  function getCustomSquareStyles() {
    const styles = {};
    
    const kingSquare = getKingInCheckSquare();
    if (kingSquare) {
      styles[kingSquare] = {
        background: 'rgba(239, 68, 68, 0.7)',
        borderRadius: '4px',
      };
    }
    
    if (selectedSquare && selectedSquare !== kingSquare) {
      styles[selectedSquare] = {
        background: 'rgba(59, 130, 246, 0.5)',
        borderRadius: '50%',
      };
    }
    
    possibleMoves.forEach(square => {
      if (square !== kingSquare) {
        styles[square] = {
          background: 'rgba(34, 197, 94, 0.4)',
          borderRadius: '50%',
        };
      }
    });
    
    return styles;
  }

  const handleNewGame = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isAIGame: false }),
      });

      if (!response.ok) {
        throw new Error('Failed to create game');
      }

      const data = await response.json();
      
      if (socket && data.game?.id) {
        socket.emit('join_game', { gameId: data.game.id });
      }
    } catch (error) {
      console.error('Error creating new game:', error);
      alert(`Failed to create new game: ${error.message}`);
    }
  };

  const handleRestart = () => {
    if (socket && gameId) {
      socket.emit('restart_game', { gameId });
    } else {
      handleNewGame();
    }
  };

  const handlePlayVsAI = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isAIGame: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to create AI game');
      }

      const data = await response.json();
      
      if (socket && data.game?.id) {
        socket.emit('join_game', { gameId: data.game.id });
        setIsAIGame(true);
      }
    } catch (error) {
      console.error('Error creating AI game:', error);
      alert(`Failed to create AI game: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          ♟️ Chess Game
        </h1>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 flex flex-col items-center">
            <div className="bg-white rounded-lg shadow-xl p-4 md:p-6">
              <div className="w-full max-w-[600px]">
                <Chessboard
                  position={game.fen()}
                  onPieceDrop={onDrop}
                  onSquareClick={onSquareClick}
                  customSquareStyles={getCustomSquareStyles()}
                  boardWidth={600}
                  customBoardStyle={{
                    borderRadius: '4px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  }}
                  customDarkSquareStyle={{ backgroundColor: '#b58863' }}
                  customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
                  arePiecesDraggable={!isAITurn && !showPromotionDialog}
                />
              </div>
            </div>

            <div className="mt-6 w-full max-w-[600px]">
              <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isConnected ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <span className="text-sm text-gray-600">
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-gray-800">
                    {isAITurn ? '🤖 AI is thinking...' : (gameStatus || "White's turn")}
                  </div>
                  {isAIGame && (
                    <div className="text-sm text-purple-600 font-medium mt-1">
                      Playing vs AI
                    </div>
                  )}
                </div>

                <GameControls
                  onNewGame={handleNewGame}
                  onRestart={handleRestart}
                  onPlayVsAI={handlePlayVsAI}
                  disabled={!isConnected}
                />
              </div>
            </div>
          </div>

          <div className="w-full lg:w-80">
            <MoveHistory moves={moveHistory} />
          </div>
        </div>
      </div>

      <PromotionDialog
        isOpen={showPromotionDialog}
        color={promotionColor}
        onSelect={completeMoveWithPromotion}
      />
    </div>
  );
}
