class GameStore {
  constructor() {
    this.games = new Map();
    this.playerGames = new Map();
  }

  createGame(chess, isAIGame = false) {
    const id = this.generateGameId();
    const game = {
      id,
      chess,
      createdAt: new Date().toISOString(),
      players: new Set(),
      isAIGame: isAIGame
    };
    this.games.set(id, game);
    return game;
  }

  getGame(gameId) {
    return this.games.get(gameId) || null;
  }

  getAllGames() {
    return Array.from(this.games.values());
  }

  addPlayer(gameId, socketId) {
    const game = this.games.get(gameId);
    if (game) {
      game.players.add(socketId);
      this.playerGames.set(socketId, gameId);
    }
  }

  removePlayer(socketId) {
    const gameId = this.playerGames.get(socketId);
    if (gameId) {
      const game = this.games.get(gameId);
      if (game) {
        game.players.delete(socketId);
      }
      this.playerGames.delete(socketId);
    }
  }

  getGameIdForPlayer(socketId) {
    return this.playerGames.get(socketId) || null;
  }

  deleteGame(gameId) {
    const game = this.games.get(gameId);
    if (game) {
      game.players.forEach(socketId => {
        this.playerGames.delete(socketId);
      });
      this.games.delete(gameId);
    }
  }

  generateGameId() {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const gameStore = new GameStore();
