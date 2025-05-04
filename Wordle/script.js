// Game state
const gameState = {
    wordLength: 5,
    maxAttempts: 6,
    attempts: 0,
    currentGuess: [],
    gameOver: false,
    hardMode: false,
    targetWord: '',
    usedLetters: {
        correct: new Set(),
        present: new Set(),
        absent: new Set()
    }
};

// DOM elements
const board = document.getElementById('board');
const keyboard = document.getElementById('keyboard');
const message = document.getElementById('message');
const modeSelector = document.getElementById('mode-selector');
const newGameBtn = document.getElementById('new-game-btn');
const backBtn = document.getElementById('back-btn');

// Initialize the game board
function initBoard() {
    board.innerHTML = '';
    for (let i = 0; i < gameState.maxAttempts; i++) {
        const row = document.createElement('div');
        row.className = 'row';
        
        for (let j = 0; j < gameState.wordLength; j++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.dataset.state = 'empty';
            tile.dataset.index = `${i}-${j}`;
            row.appendChild(tile);
        }
        
        board.appendChild(row);
    }
}

// Start a new game
async function startNewGame() {
    gameState.attempts = 0;
    gameState.currentGuess = [];
    gameState.gameOver = false;
    gameState.usedLetters = {
        correct: new Set(),
        present: new Set(),
        absent: new Set()
    };
    
    // Get a random word from the API
    try {
        const response = await fetch('https://random-word-api.herokuapp.com/word?length=5');
        const words = await response.json();
        gameState.targetWord = words[0].toUpperCase();
        console.log('Target word:', gameState.targetWord);
    } catch (error) {
        console.error('Error fetching random word:', error);
        gameState.targetWord = 'CRANE';
    }
    
    initBoard();
    resetKeyboard();
    showMessage('New game started!');
}

// Reset keyboard colors
function resetKeyboard() {
    document.querySelectorAll('.key').forEach(key => {
        key.classList.remove('correct', 'present', 'absent');
    });
}

// Show a temporary message
function showMessage(text) {
    message.textContent = text;
    message.classList.add('show');
    setTimeout(() => {
        message.classList.remove('show');
    }, 2000);
}

// Handle keyboard input
function handleKeyPress(key) {
    if (gameState.gameOver) return;
    
    const currentRow = board.children[gameState.attempts];
    
    if (key === 'BACKSPACE') {
        if (gameState.currentGuess.length > 0) {
            const lastIndex = gameState.currentGuess.length - 1;
            gameState.currentGuess.pop();
            currentRow.children[lastIndex].textContent = '';
            currentRow.children[lastIndex].dataset.state = 'empty';
        }
    } else if (key === 'ENTER') {
        if (gameState.currentGuess.length === gameState.wordLength) {
            submitGuess();
        } else {
            showMessage('Not enough letters');
        }
    } else if (gameState.currentGuess.length < gameState.wordLength) {
        const index = gameState.currentGuess.length;
        gameState.currentGuess.push(key);
        currentRow.children[index].textContent = key;
        currentRow.children[index].dataset.state = 'tbd';
    }
}

// Submit the current guess
async function submitGuess() {
    const guess = gameState.currentGuess.join('');
    const currentRow = board.children[gameState.attempts];
    
    // Check if word is valid using API
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${guess.toLowerCase()}`);
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            showMessage('Not in word list');
            return;
        }
    } catch (error) {
        console.error('Error validating word:', error);
    }
    
    // Check for duplicate guesses
    for (let i = 0; i < gameState.attempts; i++) {
        const previousGuess = Array.from(board.children[i].children)
            .map(tile => tile.textContent)
            .join('');
        if (previousGuess === guess) {
            showMessage('You already tried this word!');
            return;
        }
    }
    
    // Hard mode checks
    if (gameState.hardMode && gameState.attempts > 0) {
        const missingCorrect = Array.from(gameState.usedLetters.correct).filter(letter => 
            !gameState.currentGuess.includes(letter)
        );
        
        if (missingCorrect.length > 0) {
            showMessage(`Must include ${missingCorrect.join(', ')}`);
            return;
        }
        
        const missingPresent = Array.from(gameState.usedLetters.present).filter(letter => 
            !gameState.currentGuess.includes(letter)
        );
        
        if (missingPresent.length > 0) {
            showMessage(`Must use ${missingPresent.join(', ')}`);
            return;
        }
    }
    
    // Evaluate the guess
    const targetLetters = gameState.targetWord.split('');
    const guessLetters = gameState.currentGuess;
    const evaluation = Array(gameState.wordLength).fill('absent');
    
    // First pass for correct letters
    for (let i = 0; i < gameState.wordLength; i++) {
        if (guessLetters[i] === targetLetters[i]) {
            evaluation[i] = 'correct';
            targetLetters[i] = null;
            gameState.usedLetters.correct.add(guessLetters[i]);
        }
    }
    
    // Second pass for present letters
    for (let i = 0; i < gameState.wordLength; i++) {
        if (evaluation[i] === 'correct') continue;
        
        const index = targetLetters.indexOf(guessLetters[i]);
        if (index !== -1) {
            evaluation[i] = 'present';
            targetLetters[index] = null;
            gameState.usedLetters.present.add(guessLetters[i]);
        } else {
            gameState.usedLetters.absent.add(guessLetters[i]);
        }
    }
    
    // Update tiles and keyboard
    for (let i = 0; i < gameState.wordLength; i++) {
        currentRow.children[i].dataset.state = evaluation[i];
        
        const key = document.querySelector(`.key[data-key="${guessLetters[i]}"]`);
        if (evaluation[i] === 'correct') {
            key.classList.add('correct');
        } else if (evaluation[i] === 'present' && !key.classList.contains('correct')) {
            key.classList.add('present');
        } else if (evaluation[i] === 'absent' && 
                  !key.classList.contains('correct') && 
                  !key.classList.contains('present')) {
            key.classList.add('absent');
        }
    }
    
    gameState.attempts++;
    gameState.currentGuess = [];
    
    // Check for win or loss
    if (evaluation.every(state => state === 'correct')) {
        gameState.gameOver = true;
        setTimeout(() => {
            showMessage(`You won in ${gameState.attempts} ${gameState.attempts === 1 ? 'try' : 'tries'}!`);
        }, 500);
    } else if (gameState.attempts >= gameState.maxAttempts) {
        gameState.gameOver = true;
        setTimeout(() => {
            showMessage(`Game over! The word was ${gameState.targetWord}`);
        }, 500);
    }
}

// Event listeners
keyboard.addEventListener('click', (e) => {
    if (e.target.classList.contains('key')) {
        handleKeyPress(e.target.dataset.key);
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleKeyPress('ENTER');
    } else if (e.key === 'Backspace') {
        handleKeyPress('BACKSPACE');
    } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKeyPress(e.key.toUpperCase());
    }
});

modeSelector.addEventListener('click', (e) => {
    if (e.target.classList.contains('mode-btn')) {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
        gameState.hardMode = e.target.dataset.mode === 'hard';
    }
});

newGameBtn.addEventListener('click', startNewGame);

// Updated Back button functionality to navigate to parent directory's index.html
backBtn.addEventListener('click', () => {
    window.location.href = '../index.html';
});

// Start the game when the page loads
document.addEventListener('DOMContentLoaded', startNewGame);