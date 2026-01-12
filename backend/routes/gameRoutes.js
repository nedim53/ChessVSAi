import express from 'express';
import { createGame, getGame, listGames } from '../controllers/gameController.js';
import { getAIMove } from '../controllers/aiController.js';
import { gameStore } from '../utils/gameStore.js';

const router = express.Router();

router.get('/', listGames);

router.post('/', createGame);

router.post('/:id/ai-move', async (req, res) => {
  try {
    const { id } = req.params;
    const game = gameStore.getGame(id);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    if (!game.isAIGame) {
      return res.status(400).json({
        success: false,
        error: 'This is not an AI game'
      });
    }
    
    const aiMove = await getAIMove(game.chess);
    
    if (!aiMove) {
      return res.status(400).json({
        success: false,
        error: 'No valid AI move available'
      });
    }
    
    const moveResult = game.chess.move(aiMove);
    
    if (!moveResult) {
      return res.status(400).json({
        success: false,
        error: 'AI move is invalid'
      });
    }
    
    res.json({
      success: true,
      move: moveResult,
      fen: game.chess.fen(),
      pgn: game.chess.pgn(),
      turn: game.chess.turn(),
      isGameOver: game.chess.isGameOver(),
      history: game.chess.history({ verbose: true })
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to make AI move',
      message: error.message
    });
  }
});

router.get('/:id', getGame);

export default router;
