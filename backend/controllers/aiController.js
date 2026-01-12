import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Chess } from 'chess.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const AI_PROVIDER = process.env.AI_PROVIDER || 'groq';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;

console.log('🔍 AI Controller Environment Check:');
console.log(`   AI_PROVIDER: ${AI_PROVIDER}`);
console.log(`   GROQ_API_KEY: ${GROQ_API_KEY ? GROQ_API_KEY.substring(0, 15) + '...' : 'NOT SET'}`);
console.log(`   OPENAI_API_KEY: ${OPENAI_API_KEY ? 'SET' : 'NOT SET'}`);
console.log(`   GOOGLE_AI_API_KEY: ${GOOGLE_AI_API_KEY ? 'SET' : 'NOT SET'}`);

let groqClient = null;
let openaiClient = null;
let googleClient = null;
let clientsInitialized = false;

async function initializeClients() {
  if (clientsInitialized) return;
  
  console.log(`🔧 Initializing AI clients. Provider: ${AI_PROVIDER}`);
  console.log(`   GROQ_API_KEY: ${GROQ_API_KEY ? GROQ_API_KEY.substring(0, 10) + '...' : 'NOT SET'}`);
  
  if (AI_PROVIDER === 'groq') {
    if (!GROQ_API_KEY) {
      console.error('❌ GROQ_API_KEY is not set in .env file!');
      throw new Error('GROQ_API_KEY is not set. Please add it to .env file.');
    }
    
    try {
      const { Groq } = await import('groq-sdk');
      groqClient = new Groq({ apiKey: GROQ_API_KEY });
      console.log('✅ AI Controller: Groq client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Groq:', error.message);
      throw error;
    }
  }

  if (AI_PROVIDER === 'openai' && OPENAI_API_KEY) {
    try {
      const { default: OpenAI } = await import('openai');
      openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
      console.log('✅ AI Controller: OpenAI client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI:', error.message);
    }
  }

  if (AI_PROVIDER === 'google' && GOOGLE_AI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      googleClient = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);
      console.log('✅ AI Controller: Google AI client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Google AI:', error.message);
    }
  }
  
  clientsInitialized = true;
}

const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT_MS) || 30000;
const AI_MAX_RETRIES = parseInt(process.env.AI_MAX_RETRIES) || 3;
const AI_RETRY_DELAY = parseInt(process.env.AI_RETRY_DELAY_MS) || 2000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAIMoveGroq(chessGame) {
  await initializeClients();
  
  if (!groqClient) {
    throw new Error('Groq client not initialized. Set GROQ_API_KEY in .env');
  }

  const fen = chessGame.fen();
  const pgn = chessGame.pgn();
  const turn = chessGame.turn();
  const isCheck = chessGame.isCheck();
  const isCheckmate = chessGame.isCheckmate();
  const isDraw = chessGame.isDraw();
  const isStalemate = chessGame.isStalemate();
  const legalMoves = chessGame.moves({ verbose: true });
  const history = chessGame.history({ verbose: true });

  if (legalMoves.length === 0) {
    return null;
  }

  const moveDetails = legalMoves.map(m => {
    return `${m.san} (${m.from}→${m.to}${m.promotion ? ` promotes to ${m.promotion}` : ''})`;
  }).join('\n');

  const moveHistory = history.map((move, index) => {
    return `${index + 1}. ${move.color === 'w' ? 'White' : 'Black'}: ${move.san} (${move.from}→${move.to})`;
  }).join('\n');

  const prompt = `You are a GRANDMASTER level chess engine. Your goal is to WIN. Analyze this position DEEPLY and find the STRONGEST move that gives you the best winning chances.

=== CURRENT POSITION ===
FEN: ${fen}
Current turn: ${turn === 'w' ? 'White' : 'Black'} (You are playing as ${turn === 'w' ? 'White' : 'Black'})
In check: ${isCheck ? 'YES - King is under attack! You MUST defend!' : 'No'}
Checkmate: ${isCheckmate ? 'YES' : 'No'}
Draw: ${isDraw ? 'YES' : 'No'}
Stalemate: ${isStalemate ? 'YES' : 'No'}

=== MOVE HISTORY (All previous moves) ===
${moveHistory || 'No moves yet - starting position'}

=== ALL LEGAL MOVES AVAILABLE (You can choose any of these) ===
${moveDetails}

=== YOUR ANALYSIS PROCESS ===
Think like a chess grandmaster. For EACH move, evaluate:

1. **TACTICAL PRIORITIES** (Check these FIRST):
   - Can you CHECKMATE? If yes, play that move immediately!
   - Can you CHECK the opponent? Checks are powerful.
   - Can you CAPTURE a valuable piece? Calculate material gain.
   - Can you create a FORK, PIN, or SKEWER?
   - Can you win material through tactics?

2. **POSITIONAL STRENGTH**:
   - Which move controls the CENTER better?
   - Which move ACTIVATES your pieces more?
   - Which move improves your KING SAFETY?
   - Which move creates THREATS or WEAKNESSES in opponent's position?
   - Which move coordinates your pieces better?

3. **STRATEGIC PLANNING**:
   - If in OPENING: Develop pieces, control center, castle
   - If in MIDDLEGAME: Create attacks, improve piece placement
   - If in ENDGAME: Activate king, create passed pawns, simplify if winning

4. **OPPONENT'S THREATS**:
   - What is your opponent threatening?
   - Can you prevent their plans?
   - Can you counter-attack?

=== DECISION ===
After analyzing ALL moves, choose the move that:
- Maximizes your winning chances
- Creates the most problems for your opponent
- Improves your position the most
- Is tactically sound and positionally strong

=== RESPONSE FORMAT ===
Respond with ONLY the move in Standard Algebraic Notation (SAN) format.
Examples: "e4", "Nf3", "O-O", "Qxd5", "e8=Q"
Do NOT include any explanation, analysis, or additional text.
Just the move notation.`;

  const modelsToTry = [
    process.env.GROQ_MODEL,
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'meta-llama/llama-4-maverick-17b-128e-instruct'
  ].filter(Boolean);

  let completion;
  let lastError;

  for (const modelName of modelsToTry) {
    try {
      console.log(`   Trying model: ${modelName}`);
      completion = await groqClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert chess engine. Always respond with only the move in SAN notation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: modelName,
        temperature: 0.0,
        max_tokens: 15
      });
      console.log(`   ✅ Model ${modelName} worked!`);
      break;
    } catch (modelError) {
      lastError = modelError;
      console.log(`   ❌ Model ${modelName} failed: ${modelError.message}`);
      if (modelName === modelsToTry[modelsToTry.length - 1]) {
        throw modelError;
      }
      continue;
    }
  }

  const moveText = completion.choices[0]?.message?.content?.trim() || '';
  console.log(`🤖 Groq suggested move: "${moveText}"`);

  const gameCopy = new Chess(fen);
  const move = gameCopy.move(moveText);

  if (move) {
    return {
      from: move.from,
      to: move.to,
      promotion: move.promotion || 'q',
      san: move.san
    };
  }

  for (const legalMove of legalMoves) {
    if (moveText.includes(legalMove.san) || legalMove.san.includes(moveText)) {
      return {
        from: legalMove.from,
        to: legalMove.to,
        promotion: legalMove.promotion || 'q',
        san: legalMove.san
      };
    }
  }

  throw new Error(`Invalid move from Groq: ${moveText}`);
}

async function getAIMoveOpenAI(chessGame) {
  await initializeClients();
  
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized. Set OPENAI_API_KEY in .env');
  }

  const fen = chessGame.fen();
  const pgn = chessGame.pgn();
  const turn = chessGame.turn();
  const isCheck = chessGame.isCheck();
  const legalMoves = chessGame.moves({ verbose: true });

  if (legalMoves.length === 0) {
    return null;
  }

  const prompt = `You are an expert chess engine. Analyze this position and suggest the BEST move.

Position (FEN): ${fen}
Move history: ${pgn || 'No moves yet'}
Current turn: ${turn === 'w' ? 'White' : 'Black'}
In check: ${isCheck ? 'Yes' : 'No'}
Legal moves: ${legalMoves.map(m => m.san).join(', ')}

Respond with ONLY the move in Standard Algebraic Notation (SAN). Examples: "e4", "Nf3", "O-O", "Qxd5".
Do not include any explanation, just the move notation.`;

  const completion = await openaiClient.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are an expert chess engine. Always respond with only the move in SAN notation.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 10
  });

  const moveText = completion.choices[0]?.message?.content?.trim() || '';
  console.log(`🤖 OpenAI suggested move: "${moveText}"`);

  const gameCopy = new Chess(fen);
  const move = gameCopy.move(moveText);

  if (move) {
    return {
      from: move.from,
      to: move.to,
      promotion: move.promotion || 'q',
      san: move.san
    };
  }

  throw new Error(`Invalid move from OpenAI: ${moveText}`);
}

async function getAIMoveGoogle(chessGame) {
  await initializeClients();
  
  if (!googleClient) {
    throw new Error('Google AI client not initialized. Set GOOGLE_AI_API_KEY in .env');
  }

  const fen = chessGame.fen();
  const pgn = chessGame.pgn();
  const turn = chessGame.turn();
  const isCheck = chessGame.isCheck();
  const legalMoves = chessGame.moves({ verbose: true });

  if (legalMoves.length === 0) {
    return null;
  }

  const prompt = `You are an expert chess engine. Analyze this position and suggest the BEST move.

Position (FEN): ${fen}
Move history: ${pgn || 'No moves yet'}
Current turn: ${turn === 'w' ? 'White' : 'Black'}
In check: ${isCheck ? 'Yes' : 'No'}
Legal moves: ${legalMoves.map(m => m.san).join(', ')}

Respond with ONLY the move in Standard Algebraic Notation (SAN). Examples: "e4", "Nf3", "O-O", "Qxd5".
Do not include any explanation, just the move notation.`;

  const model = googleClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const moveText = response.text().trim();

  console.log(`🤖 Google AI suggested move: "${moveText}"`);

  const gameCopy = new Chess(fen);
  const move = gameCopy.move(moveText);

  if (move) {
    return {
      from: move.from,
      to: move.to,
      promotion: move.promotion || 'q',
      san: move.san
    };
  }

  throw new Error(`Invalid move from Google AI: ${moveText}`);
}

export async function getAIMove(chessGame) {
  const legalMoves = chessGame.moves({ verbose: true });
  
  if (legalMoves.length === 0) {
    return null;
  }

  for (let attempt = 1; attempt <= AI_MAX_RETRIES; attempt++) {
    try {
      console.log(`🤖 AI thinking (attempt ${attempt}/${AI_MAX_RETRIES}) using ${AI_PROVIDER}...`);

      let move;
      
      if (AI_PROVIDER === 'groq') {
        move = await getAIMoveGroq(chessGame);
      } else if (AI_PROVIDER === 'openai') {
        move = await getAIMoveOpenAI(chessGame);
      } else if (AI_PROVIDER === 'google') {
        move = await getAIMoveGoogle(chessGame);
      } else {
        throw new Error(`Unknown AI provider: ${AI_PROVIDER}. Use 'groq', 'openai', or 'google'`);
      }

      if (move) {
        console.log(`✅ AI move validated: ${move.san}`);
        return move;
      }

    } catch (error) {
      console.error(`❌ AI attempt ${attempt} failed:`, error.message);
      
      if (attempt < AI_MAX_RETRIES) {
        await sleep(AI_RETRY_DELAY);
        continue;
      } else {
        throw new Error(`AI failed to generate a valid move after ${AI_MAX_RETRIES} attempts: ${error.message}`);
      }
    }
  }

  throw new Error(`AI failed to generate a valid move after ${AI_MAX_RETRIES} attempts`);
}
