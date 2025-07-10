// I. GET REFERENCES TO HTML ELEMENTS
// We need to interact with these elements to update the game's state and display.
const gameContainer = document.getElementById('game-container');
const player = document.getElementById('player');
const keyboardContainer = document.getElementById('keyboard-container');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const languageSelectionDiv = document.getElementById('language-selection-div');
const startEnglishButton = document.getElementById('start-english');
const startHebrewButton = document.getElementById('start-hebrew');
const difficultySelectionDiv = document.getElementById('difficulty-selection-div');
const easyButton = document.getElementById('difficulty-easy');
const normalButton = document.getElementById('difficulty-normal');
const hardButton = document.getElementById('difficulty-hard');
const restartButton = document.getElementById('restart-button');

// II. DEFINE GAME CONSTANTS AND STATE VARIABLES
// These values control the game's behavior and keep track of its current state.
const GAME_WIDTH = gameContainer.offsetWidth;
const GAME_HEIGHT = gameContainer.offsetHeight;
const PLAYER_WIDTH = player.offsetWidth;
const LETTER_WIDTH = 40; // Must match the width in style.css
const PROJECTILE_WIDTH = 25; // Must match the width in style.css
const PLAYER_SPEED = 8; // How many pixels the player moves per frame.
const PROJECTILE_SPEED = 10; // How many pixels the projectile moves per frame.

// Difficulty Settings
const DIFFICULTY_SETTINGS = {
    easy:   { speed: 0.3, increase: 0.05, spawn: 10000 },
    normal: { speed: 1,   increase: 0.15, spawn: 5000 },
    hard:   { speed: 2,   increase: 0.05, spawn: 3000 }
};

const MIN_SPAWN_INTERVAL = 400; // The fastest possible time between new letters (in ms).
const SPAWN_INTERVAL_REDUCTION_PER_SCORE = 10; // How many ms the interval shortens by per point.
let initialFallSpeed;
let fallSpeedIncreasePerScore;
let initialSpawnInterval;

// Keyboard layout definitions
const ENGLISH_KEYBOARD_LAYOUT = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const HEBREW_KEYBOARD_LAYOUT = ["קראטוןםפ", "שדגכעיחלךף", "זסבהנמצתץ"];

// A flattened list of all possible characters for each language, used for spawning letters.
const ENGLISH_CHARACTERS = ENGLISH_KEYBOARD_LAYOUT.join('').split('');
const HEBREW_CHARACTERS = HEBREW_KEYBOARD_LAYOUT.join('').split('');

let score = 0;
let selectedLanguage = 'en';
let gameIsActive = false;
let playerPosition = (GAME_WIDTH - PLAYER_WIDTH) / 2; // Start player in the middle.
let fallingLetters = []; // An array to hold all active letter objects.
let projectiles = []; // An array to hold all active projectile objects.
let keyboardMap = new Map(); // To store references to the on-screen keyboard keys.
let isMovingLeft = false;
let isMovingRight = false;
let letterInterval; // A variable to hold our setInterval timer.

// III. GAME LOGIC FUNCTIONS

/**
 * Initializes and starts the game. Resets all state variables.
 */
function startGame(difficulty) {
    // 1. Set difficulty and reset game state
    const settings = DIFFICULTY_SETTINGS[difficulty];
    initialFallSpeed = settings.speed;
    fallSpeedIncreasePerScore = settings.increase;
    initialSpawnInterval = settings.spawn;

    score = 0;
    playerPosition = (GAME_WIDTH - PLAYER_WIDTH) / 2;
    // selectedLanguage is now set by the language button listeners
    gameIsActive = true;
    fallingLetters = [];
    projectiles = [];
    isMovingLeft = false;
    isMovingRight = false;

    // 2. Update the UI
    scoreDisplay.textContent = score;
    player.style.left = `${playerPosition}px`;
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';

    // 3. Clear any leftover letters from a previous game
    gameContainer.querySelectorAll('.letter').forEach(letter => letter.remove());
    gameContainer.querySelectorAll('.projectile').forEach(p => p.remove());

    // 4. Set up the on-screen keyboard for the chosen language
    setupKeyboard();

    // 4. Start the dynamic letter spawning
    scheduleNextLetter();

    // 5. Start the main animation loop
    requestAnimationFrame(gameLoop);
}

/**
 * The main game loop, powered by requestAnimationFrame for smooth animation.
 */
function gameLoop() {
    if (!gameIsActive) return; // Stop the loop if the game is over.

    // These functions update the positions of game objects on each frame.
    updatePlayerPosition();
    updateProjectiles();

    updateKeyboardVisuals();
    // This function will move the letters down on each frame.
    updateLetters();

    // Continue the loop for the next frame.
    requestAnimationFrame(gameLoop);
}

/**
 * Creates a new letter element and adds it to the game.
 */
function createLetter() {
    let character;
    const letterElement = document.createElement('div');
    letterElement.classList.add('letter');

    if (selectedLanguage === 'he') {
        character = HEBREW_CHARACTERS[Math.floor(Math.random() * HEBREW_CHARACTERS.length)];
        letterElement.lang = 'he'; // Add lang attribute for CSS styling
    } else { // Default to English
        character = ENGLISH_CHARACTERS[Math.floor(Math.random() * ENGLISH_CHARACTERS.length)];
    }

    letterElement.textContent = character;

    // Start the letter at a random horizontal position.
    const randomX = Math.floor(Math.random() * (GAME_WIDTH - LETTER_WIDTH));
    letterElement.style.left = `${randomX}px`;
    letterElement.style.top = '0px';

    gameContainer.appendChild(letterElement);
    fallingLetters.push({ element: letterElement, character: character, y: 0 });
}

/**
 * Creates and displays the on-screen keyboard based on the selected language.
 */
function setupKeyboard() {
    keyboardContainer.innerHTML = ''; // Clear previous keys
    keyboardMap.clear();
    
    const layout = selectedLanguage === 'he' ? HEBREW_KEYBOARD_LAYOUT : ENGLISH_KEYBOARD_LAYOUT;

    for (const rowString of layout) {
        const rowElement = document.createElement('div');
        rowElement.classList.add('keyboard-row');
        for (const char of rowString) {
            const keyElement = document.createElement('div');
            keyElement.classList.add('keyboard-key');
            keyElement.textContent = char;
            if (selectedLanguage === 'he') {
                keyElement.lang = 'he';
            }
            rowElement.appendChild(keyElement);
            keyboardMap.set(char, keyElement);
        }
        keyboardContainer.appendChild(rowElement);
    }
}

/**
 * Creates a new projectile element and adds it to the game.
 * @param {string} character The character of the projectile (e.g., 'a').
 */
function createProjectile(character) {
    const projectileElement = document.createElement('div');
    projectileElement.classList.add('projectile');
    projectileElement.textContent = character;

    // Start projectile from the top-center of the player.
    // We use a constant for projectile width because offsetWidth is 0 before being added to the DOM.
    const projectileX = playerPosition + (PLAYER_WIDTH / 2) - (PROJECTILE_WIDTH / 2);
    const projectileY = GAME_HEIGHT - player.offsetHeight; // Start at the top of the player basket.

    projectileElement.style.left = `${projectileX}px`;
    projectileElement.style.top = `${projectileY}px`;

    gameContainer.appendChild(projectileElement);
    projectiles.push({ element: projectileElement, character: character });
}

/**
 * Schedules the next letter to be created with a dynamically decreasing interval.
 * This function calls itself in a loop using setTimeout.
 */
function scheduleNextLetter() {
    if (!gameIsActive) return;

    // Calculate the time until the next letter spawns based on the current score.
    const intervalReduction = score * SPAWN_INTERVAL_REDUCTION_PER_SCORE;
    const nextInterval = Math.max(MIN_SPAWN_INTERVAL, initialSpawnInterval - intervalReduction);

    // Schedule the creation of the letter and the next call to this function.
    letterInterval = setTimeout(() => {
        createLetter();
        scheduleNextLetter();
    }, nextInterval);
}

/**
 * Updates the position of each falling letter and checks for misses.
 */
function updateLetters() {
    // Loop through the letters array backwards to safely remove items while iterating.
    for (let i = fallingLetters.length - 1; i >= 0; i--) {
        const letter = fallingLetters[i];

        // The fall speed increases as the score gets higher, making the game harder.
        const fallSpeed = initialFallSpeed + (score * fallSpeedIncreasePerScore);
        letter.y += fallSpeed;
        letter.element.style.top = `${Math.floor(letter.y)}px`;

        // If a letter falls past the bottom of the screen, the game is over.
        if (letter.y > GAME_HEIGHT) {
            endGame();
            return; // Exit the function immediately.
        }
    }
}

/**
 * Updates the color of the on-screen keyboard keys based on letter proximity.
 */
function updateKeyboardVisuals() {
    const proximityMap = new Map();

    // 1. Find the closest falling instance for each character.
    for (const letter of fallingLetters) {
        const char = letter.character;
        // Normalize proximity from 0 (top) to 1 (bottom).
        const proximity = letter.element.offsetTop / (GAME_HEIGHT - LETTER_WIDTH);

        // If this letter is closer than another of the same character, update its proximity.
        if (!proximityMap.has(char) || proximity > proximityMap.get(char)) {
            proximityMap.set(char, proximity);
        }
    }

    // 2. Update the visual style of each key on the keyboard.
    for (const [char, keyElement] of keyboardMap.entries()) {
        if (proximityMap.has(char)) {
            const intensity = Math.min(proximityMap.get(char), 1); // Clamp value between 0 and 1.
            // Use HSL to create a "heating up" effect from gray to red.
            const lightness = 70 - (25 * intensity); // 70% (light) down to 45% (dark).
            keyElement.style.backgroundColor = `hsl(0, 90%, ${lightness}%)`;
            keyElement.style.color = 'white';
        } else {
            // Reset to default style if no corresponding letter is falling.
            keyElement.style.backgroundColor = '';
            keyElement.style.color = '';
        }
    }
}

/**
 * Updates projectile positions and checks for collisions with falling letters.
 */
function updateProjectiles() {
    // Loop backwards to safely remove items from the array while iterating.
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        const currentTop = parseInt(proj.element.style.top);

        // 1. Move the projectile upwards.
        proj.element.style.top = `${currentTop - PROJECTILE_SPEED}px`;

        // 2. Check for collision with any falling letter.
        let hasCollided = false;
        for (let j = fallingLetters.length - 1; j >= 0; j--) {
            const letter = fallingLetters[j];

            // Only check for collision if the projectile's character matches the falling letter's character.
            if (proj.character.toUpperCase() === letter.character) {
                const projRect = proj.element.getBoundingClientRect();
                const letterRect = letter.element.getBoundingClientRect();

                // Check if the rectangles of the projectile and letter are overlapping.
                if (projRect.left < letterRect.right && projRect.right > letterRect.left &&
                    projRect.top < letterRect.bottom && projRect.bottom > letterRect.top) {
                    
                    // Successful hit!
                    score++;
                    scoreDisplay.textContent = score;

                    // Remove both elements from the screen and their respective arrays.
                    proj.element.remove();
                    letter.element.remove();
                    projectiles.splice(i, 1);
                    fallingLetters.splice(j, 1);

                    // If the player clears the screen, keep the action going.
                    if (fallingLetters.length === 0) {
                        clearTimeout(letterInterval); // Cancel the previously scheduled letter.
                        createLetter();               // Spawn a new one immediately.
                        scheduleNextLetter();         // Schedule the one after that.
                    }

                    hasCollided = true;
                    break; // Exit the inner loop since this projectile is now gone.
                }
            }
        }

        // If a collision happened, we've already handled this projectile, so skip to the next one.
        if (hasCollided) continue;

        // 3. Remove the projectile if it goes off the top of the screen.
        if (currentTop < 0) {
            proj.element.remove();
            projectiles.splice(i, 1);
        }
    }
}

/**
 * Updates the player's position based on which keys are currently held down.
 * This is called on every frame from the gameLoop for smooth movement.
 */
function updatePlayerPosition() {
    if (isMovingLeft) {
        playerPosition -= PLAYER_SPEED;
    }
    if (isMovingRight) {
        playerPosition += PLAYER_SPEED;
    }

    // Constrain the player to stay within the game container boundaries.
    if (playerPosition < 0) playerPosition = 0;
    if (playerPosition > GAME_WIDTH - PLAYER_WIDTH) playerPosition = GAME_WIDTH - PLAYER_WIDTH;
    player.style.left = `${playerPosition}px`;
}

/**
 * Handles all keyboard input for the game.
 */
function handleKeyPress(e) {
    if (!gameIsActive) return;

    // Set movement state to true on key down. The actual movement happens in the game loop.
    if (e.key === 'ArrowLeft') {
        isMovingLeft = true;
    } else if (e.key === 'ArrowRight') {
        isMovingRight = true;
    }

    // Handle letter shooting. We use `e.key` to get the actual character, including case.
    const pressedKey = e.key;
    // Check for English letters or valid Hebrew letters from our list.
    if (pressedKey.length === 1 && (pressedKey.match(/[a-z]/i) || HEBREW_CHARACTERS.includes(pressedKey))) {
        // Create a projectile. For English, use lowercase. Hebrew has no case.
        createProjectile(pressedKey.toLowerCase()); 
    }
}

/**
 * Handles the key up event to stop the player's movement.
 */
function handleKeyUp(e) {
    if (e.key === 'ArrowLeft') {
        isMovingLeft = false;
    } else if (e.key === 'ArrowRight') {
        isMovingRight = false;
    }
}

/**
 * Ends the game, stops the loops, and shows the game over screen.
 */
function endGame() {
    gameIsActive = false;
    clearTimeout(letterInterval); // Stop the letter spawning loop.
    finalScoreDisplay.textContent = score;
    // Reset keyboard colors on game over.
    for (const keyElement of keyboardMap.values()) {
        keyElement.style.backgroundColor = '';
        keyElement.style.color = '';
    }
    gameOverScreen.style.display = 'flex';
}

// IV. SET UP EVENT LISTENERS
// These connect user actions (clicks, key presses) to our game functions.
restartButton.addEventListener('click', () => {
    // When restarting, reset the start screen to its initial state.
    gameOverScreen.style.display = 'none';
    languageSelectionDiv.style.display = 'block';
    difficultySelectionDiv.style.display = 'none';
    startScreen.style.display = 'flex';
});
document.addEventListener('keydown', handleKeyPress);
document.addEventListener('keyup', handleKeyUp);

function selectLanguage(lang) {
    selectedLanguage = lang;
    languageSelectionDiv.style.display = 'none';
    difficultySelectionDiv.style.display = 'block';
}

startEnglishButton.addEventListener('click', () => selectLanguage('en'));
startHebrewButton.addEventListener('click', () => selectLanguage('he'));

easyButton.addEventListener('click', () => startGame('easy'));
normalButton.addEventListener('click', () => startGame('normal'));
hardButton.addEventListener('click', () => startGame('hard'));