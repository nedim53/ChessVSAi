import { Chess } from 'chess.js';
import { gameStore } from '../utils/gameStore.js';
import { getAIMove } from '../controllers/aiController.js';

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    socket.on('join_game', ({ gameId }) => {
      try {
        if (!gameId || typeof gameId !== 'string') {
          socket.emit('error', { message: 'Invalid game ID' });
          return;
        }

        let game = gameStore.getGame(gameId);
        
        if (!game) {
          const chess = new Chess();
          game = gameStore.createGame(chess);
          console.log(`🆕 Created new game: ${game.id}`);
        }

        gameStore.addPlayer(game.id, socket.id);
        socket.join(game.id);

        socket.emit('game_state', {
          gameId: game.id,
          fen: game.chess.fen(),
          pgn: game.chess.pgn(),
          turn: game.chess.turn(),
          isGameOver: game.chess.isGameOver(),
          isAIGame: game.isAIGame || false,
          history: game.chess.history({ verbose: true })
        });

        console.log(`👤 Player ${socket.id} joined game ${game.id}`);
      } catch (error) {
        console.error('Error joining game:', error);
        socket.emit('error', { message: 'Failed to join game', error: error.message });
      }
    });

    socket.on('make_move', ({ gameId, move }) => {
      try {
        if (!gameId || typeof gameId !== 'string') {
          socket.emit('error', { message: 'Invalid game ID' });
          return;
        }

        if (!move) {
          socket.emit('error', { message: 'Move is required' });
          return;
        }

        const game = gameStore.getGame(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        if (!game.players.has(socket.id)) {
          socket.emit('error', { message: 'You are not part of this game' });
          return;
        }

        let moveResult;
        if (typeof move === 'string') {
          moveResult = game.chess.move(move);
        } else if (move.from && move.to) {
          moveResult = game.chess.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion || 'q'
          });
        } else {
          socket.emit('error', { message: 'Invalid move format' });
          return;
        }

        if (!moveResult) {
          socket.emit('error', { message: 'Invalid move' });
          return;
        }

        io.to(gameId).emit('move_made', {
          gameId,
          move: moveResult,
          fen: game.chess.fen(),
          pgn: game.chess.pgn(),
          turn: game.chess.turn(),
          isGameOver: game.chess.isGameOver(),
          history: game.chess.history({ verbose: true })
        });

        console.log(`♟️  Move made in game ${gameId}: ${moveResult.san}`);

        if (game.isAIGame && !game.chess.isGameOver() && game.chess.turn() === 'b') {
          const AI_THINKING_DELAY = parseInt(process.env.AI_THINKING_DELAY_MS) || 1000;
          
          setTimeout(async () => {
            try {
              console.log(`🤖 AI is thinking... (game ${gameId})`);
              
              io.to(gameId).emit('ai_thinking', { gameId, thinking: true });
              
              const aiMove = await getAIMove(game.chess);
              
              if (!aiMove) {
                throw new Error('AI returned null move');
              }
              
              const aiMoveResult = game.chess.move(aiMove);
              
              if (!aiMoveResult) {
                throw new Error('AI move is invalid');
              }
              
              io.to(gameId).emit('move_made', {
                gameId,
                move: aiMoveResult,
                fen: game.chess.fen(),
                pgn: game.chess.pgn(),
                turn: game.chess.turn(),
                isGameOver: game.chess.isGameOver(),
                history: game.chess.history({ verbose: true }),
                isAIMove: true
              });
              
              console.log(`✅ AI move made in game ${gameId}: ${aiMoveResult.san}`);
              
              io.to(gameId).emit('ai_thinking', { gameId, thinking: false });
              
            } catch (error) {
              console.error(`❌ Error making AI move in game ${gameId}:`, error.message);
              
              io.to(gameId).emit('ai_thinking', { gameId, thinking: false });
              
              io.to(gameId).emit('ai_error', {
                gameId,
                error: error.message || 'AI failed to generate a move. Please try again.'
              });
              
              console.error('Full AI error:', error);
            }
          }, AI_THINKING_DELAY);
        }
      } catch (error) {
        console.error('Error making move:', error);
        socket.emit('error', { message: 'Failed to make move', error: error.message });
      }
    });

    socket.on('restart_game', ({ gameId }) => {
      try {
        if (!gameId || typeof gameId !== 'string') {
          socket.emit('error', { message: 'Invalid game ID' });
          return;
        }

        const game = gameStore.getGame(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        game.chess.reset();

        io.to(gameId).emit('game_restarted', {
          gameId,
          fen: game.chess.fen(),
          pgn: game.chess.pgn(),
          turn: game.chess.turn(),
          isGameOver: game.chess.isGameOver(),
          history: []
        });

        console.log(`🔄 Game ${gameId} restarted`);
      } catch (error) {
        console.error('Error restarting game:', error);
        socket.emit('error', { message: 'Failed to restart game', error: error.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
      gameStore.removePlayer(socket.id);
    });
  });
}
