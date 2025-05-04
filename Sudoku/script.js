// Game state
let board = Array(9).fill().map(() => Array(9).fill(0));
let solution = Array(9).fill().map(() => Array(9).fill(0));
let fixedCells = Array(9).fill().map(() => Array(9).fill(false));
let selectedCell = null;
let hintsRemaining = 10;
let moveHistory = []; // Store moves for undo functionality

// DOM elements
const boardElement = document.getElementById('board');
const newGameBtn = document.getElementById('new-game');
const backBtn = document.getElementById('back');
const hintBtn = document.getElementById('hint');
const difficultySelector = document.getElementById('difficulty');
const loadingOverlay = document.getElementById('loading-overlay');
const undoBtn = document.getElementById('undo'); // New undo button

// Initialize the board
function initializeBoard() {
    boardElement.innerHTML = '';
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            cell.addEventListener('click', () => selectCell(row, col));
            
            boardElement.appendChild(cell);
        }
    }
}

// Select a cell
function selectCell(row, col) {
    // Deselect previous cell
    if (selectedCell) {
        const prevCell = document.querySelector(`.cell[data-row="${selectedCell.row}"][data-col="${selectedCell.col}"]`);
        prevCell?.classList.remove('selected');
        updateHighlightedCells(selectedCell.row, selectedCell.col, false);
    }
    
    // Select new cell, even if fixed (to allow highlighting)
    selectedCell = { row, col };
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    cell?.classList.add('selected');
    updateHighlightedCells(row, col, true);
}

// Update highlighted cells (same row, column, and 3x3 block)
function updateHighlightedCells(row, col, highlight) {
    // Remove all highlights first
    document.querySelectorAll('.cell.highlighted').forEach(cell => {
        cell.classList.remove('highlighted');
    });
    
    if (!highlight) return;
    
    // Highlight same row
    for (let c = 0; c < 9; c++) {
        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${c}"]`);
        if (cell) cell.classList.add('highlighted');
    }
    
    // Highlight same column
    for (let r = 0; r < 9; r++) {
        const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${col}"]`);
        if (cell) cell.classList.add('highlighted');
    }
    
    // Highlight same 3x3 block
    const blockRow = Math.floor(row / 3) * 3;
    const blockCol = Math.floor(col / 3) * 3;
    
    for (let r = blockRow; r < blockRow + 3; r++) {
        for (let c = blockCol; c < blockCol + 3; c++) {
            const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
            if (cell) cell.classList.add('highlighted');
        }
    }
    
    // Remove highlight from selected cell (it has its own style)
    const selectedCellElement = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (selectedCellElement) selectedCellElement.classList.remove('highlighted');
}

// Update the board display
function updateBoardDisplay() {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            if (!cell) continue;
            
            cell.textContent = board[row][col] === 0 ? '' : board[row][col];
            
            // Reset classes
            cell.className = 'cell';
            if (fixedCells[row][col]) {
                cell.classList.add('fixed');
            } else if (board[row][col] !== 0) {
                cell.classList.add('user-input');
            }
            
            // Mark errors
            if (board[row][col] !== 0 && board[row][col] !== solution[row][col]) {
                cell.classList.add('error');
            }
        }
    }
    
    // Reapply selected cell if exists
    if (selectedCell) {
        const cell = document.querySelector(`.cell[data-row="${selectedCell.row}"][data-col="${selectedCell.col}"]`);
        if (cell) {
            cell.classList.add('selected');
            updateHighlightedCells(selectedCell.row, selectedCell.col, true);
        }
    }
    
    // Update hint button text to show remaining hints
    if (hintBtn) hintBtn.textContent = `Hint (${hintsRemaining})`;
    
    // Update undo button state
    if (undoBtn) undoBtn.disabled = moveHistory.length === 0;
}

// Set a value in the board
function setCellValue(row, col, value) {
    if (fixedCells[row][col]) return;
    
    // Store move in history for undo
    if (board[row][col] !== value) {
        moveHistory.push({
            row,
            col,
            oldValue: board[row][col]
        });
    }
    
    board[row][col] = value;
    updateBoardDisplay();
}

// Fetch a new puzzle from the API
async function fetchNewPuzzle() {
    try {
        showLoading(true);
        const difficulty = difficultySelector ? difficultySelector.value : 'medium';
        
        const response = await fetch(`https://sudoku-api.vercel.app/api/dosuku`);
        const data = await response.json();
        
        if (!data || !data.newboard || !data.newboard.grids || !data.newboard.grids[0]) {
            throw new Error('Invalid puzzle data received');
        }
        
        // Extract puzzle and solution from the API response
        const puzzle = data.newboard.grids[0].value;
        const puzzleSolution = data.newboard.grids[0].solution;
        
        // Update game state
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                board[row][col] = puzzle[row][col];
                solution[row][col] = puzzleSolution[row][col];
                fixedCells[row][col] = puzzle[row][col] !== 0;
            }
        }
        
        // Reset game state
        hintsRemaining = 10;
        moveHistory = [];
        
        updateBoardDisplay();
        selectedCell = null;
    } catch (error) {
        console.error('Error fetching puzzle:', error);
        showFallbackPuzzle();
    } finally {
        showLoading(false);
    }
}

// Display a fallback puzzle if API fails
function showFallbackPuzzle() {
    // Example hardcoded puzzle and solution
    const fallbackPuzzle = [
        [5,3,0,0,7,0,0,0,0],
        [6,0,0,1,9,5,0,0,0],
        [0,9,8,0,0,0,0,6,0],
        [8,0,0,0,6,0,0,0,3],
        [4,0,0,8,0,3,0,0,1],
        [7,0,0,0,2,0,0,0,6],
        [0,6,0,0,0,0,2,8,0],
        [0,0,0,4,1,9,0,0,5],
        [0,0,0,0,8,0,0,7,9]
    ];
    
    const fallbackSolution = [
        [5,3,4,6,7,8,9,1,2],
        [6,7,2,1,9,5,3,4,8],
        [1,9,8,3,4,2,5,6,7],
        [8,5,9,7,6,1,4,2,3],
        [4,2,6,8,5,3,7,9,1],
        [7,1,3,9,2,4,8,5,6],
        [9,6,1,5,3,7,2,8,4],
        [2,8,7,4,1,9,6,3,5],
        [3,4,5,2,8,6,1,7,9]
    ];
    
    // Update game state with fallback puzzle
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            board[row][col] = fallbackPuzzle[row][col];
            solution[row][col] = fallbackSolution[row][col];
            fixedCells[row][col] = fallbackPuzzle[row][col] !== 0;
        }
    }
    
    // Reset game state
    hintsRemaining = 10;
    moveHistory = [];
    
    updateBoardDisplay();
    selectedCell = null;
    
    // Notify user
    setTimeout(() => {
        alert('Failed to fetch a new puzzle. Using offline puzzle instead.');
    }, 100);
}

// Show/hide loading overlay
function showLoading(show) {
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Check if the current board is complete and correct
function checkSolution() {
    let hasEmptyCells = false;
    let hasErrors = false;
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                hasEmptyCells = true;
            } else if (board[row][col] !== solution[row][col]) {
                hasErrors = true;
                break;
            }
        }
        if (hasErrors) break;
    }
    
    if (hasErrors) {
        alert('There are errors in your solution. Keep trying!');
    } else if (hasEmptyCells) {
        alert('Solution is correct so far, but not complete!');
    } else {
        alert('Congratulations! You solved the puzzle!');
    }
}

// Provide a hint by revealing one correct cell
function provideHint() {
    if (hintsRemaining <= 0) {
        alert('You have used all your hints!');
        return;
    }
    
    if (!selectedCell) {
        alert('Please select a cell first to get a hint.');
        return;
    }
    
    const { row, col } = selectedCell;
    
    if (fixedCells[row][col]) {
        alert('This cell is already filled. Select an empty cell for a hint.');
        return;
    }
    
    if (board[row][col] === solution[row][col]) {
        alert('This cell is already correct.');
        return;
    }
    
    hintsRemaining--; // Decrease available hints
    setCellValue(row, col, solution[row][col]);
    fixedCells[row][col] = true;
    updateBoardDisplay();
}

// Go back one move (undo)
function undoLastMove() {
    if (moveHistory.length === 0) return;
    
    const lastMove = moveHistory.pop();
    board[lastMove.row][lastMove.col] = lastMove.oldValue;
    updateBoardDisplay();
}

// Navigate back to the main page
function goToMainPage() {
    window.location.href = '../index.html';
}

// Event listeners for virtual keyboard
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.key').forEach(key => {
        key.addEventListener('click', () => {
            if (!selectedCell) return;
            
            const { row, col } = selectedCell;
            if (fixedCells[row][col]) return;
            
            const keyValue = key.dataset.key;
            
            if (keyValue === 'delete') {
                setCellValue(row, col, 0);
            } else if (keyValue === 'enter') {
                checkSolution();
            } else if (/^[1-9]$/.test(keyValue)) {
                setCellValue(row, col, parseInt(keyValue));
            }
        });
    });
    
    // Add event listeners to control buttons
    if (newGameBtn) newGameBtn.addEventListener('click', fetchNewPuzzle);
    if (backBtn) backBtn.addEventListener('click', goToMainPage); // Changed to goToMainPage function
    if (hintBtn) hintBtn.addEventListener('click', provideHint);
    if (undoBtn) undoBtn.addEventListener('click', undoLastMove);
    
    // Initialize the game
    initializeBoard();
    fetchNewPuzzle();
});

// Physical keyboard input
document.addEventListener('keydown', (e) => {
    if (!selectedCell) return;
    
    const { row, col } = selectedCell;
    if (fixedCells[row][col] && /^[1-9]$/.test(e.key)) return;
    
    if (e.key === 'Backspace' || e.key === 'Delete') {
        setCellValue(row, col, 0);
    } else if (/^[1-9]$/.test(e.key)) {
        setCellValue(row, col, parseInt(e.key));
    } else if (e.key === 'Enter') {
        checkSolution();
    } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        undoLastMove();
    } else if (e.key === 'ArrowUp' && row > 0) {
        selectCell(row - 1, col);
    } else if (e.key === 'ArrowDown' && row < 8) {
        selectCell(row + 1, col);
    } else if (e.key === 'ArrowLeft' && col > 0) {
        selectCell(row, col - 1);
    } else if (e.key === 'ArrowRight' && col < 8) {
        selectCell(row, col + 1);
    }
});