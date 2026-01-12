import { Chess } from 'chess.js';
import { gameStore } from '../utils/gameStore.js';

export const listGames = (req, res) => {
  try {
    const games = gameStore.getAllGames();
    res.json({
      success: true,
      games: games.map(game => ({
        id: game.id,
        fen: game.chess.fen(),
        turn: game.chess.turn(),
        isGameOver: game.chess.isGameOver(),
        createdAt: game.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve games',
      message: error.message
    });
  }
};

export const createGame = (req, res) => {
  try {
    const { isAIGame } = req.body || {};
    const chess = new Chess();
    const game = gameStore.createGame(chess, isAIGame === true);
    
    res.status(201).json({
      success: true,
      game: {
        id: game.id,
        fen: chess.fen(),
        pgn: chess.pgn(),
        turn: chess.turn(),
        isGameOver: chess.isGameOver(),
        isAIGame: game.isAIGame || false,
        createdAt: game.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create game',
      message: error.message
    });
  }
};

export const getGame = (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid game ID'
      });
    }
    
    const game = gameStore.getGame(id);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    res.json({
      success: true,
      game: {
        id: game.id,
        fen: game.chess.fen(),
        pgn: game.chess.pgn(),
        turn: game.chess.turn(),
        isGameOver: game.chess.isGameOver(),
        history: game.chess.history({ verbose: true }),
        createdAt: game.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve game',
      message: error.message
    });
  }
};
