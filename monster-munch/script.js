// --- DOM Element References ---
const gameContainer = document.getElementById('game-container');
const wordDisplay = document.getElementById('word-display');
const foodContainer = document.getElementById('food-container');
const foodItem = document.getElementById('food-item');
const monster = document.getElementById('monster');

// --- Audio Element References ---
const sfxCorrect = document.getElementById('sfx-correct-key');
const sfxEat = document.getElementById('sfx-eat');
const sfxSatisfied = document.getElementById('sfx-satisfied');
const bgm = document.getElementById('bgm-music');

// --- Game State & Configuration ---

// Word bank based on difficulty, as per the GDD
const wordBank = {
    level1: ['sun', 'dog', 'cat', 'run', 'mom', 'dad', 'egg', 'big'],
    level2: ['ball', 'home', 'play', 'food', 'cake', 'jump'],
    level3: ['happy', 'friend', 'water', 'house', 'apple', 'cookie']
};

// For this simple version, we'll combine all words.
// A more advanced version would implement the dynamic difficulty scaling.
const allWords = [...wordBank.level1, ...wordBank.level2, ...wordBank.level3];

let currentWord = '';
let typedIndex = 0;
let isAnimating = false; // Prevents input during the reward animation
let gameStarted = false; // To handle starting BGM on first interaction

// --- Core Functions ---

/**
 * Selects a new random word, resets the state, and displays it on the screen.
 */
function spawnNewWord() {
    isAnimating = false;
    foodContainer.style.opacity = 1; // Make the food visible again
    monster.classList.remove('ready-to-eat'); // Reset monster state
    monster.classList.remove('satisfied'); // Reset monster state

    // Select a random word from the list
    const randomIndex = Math.floor(Math.random() * allWords.length);
    currentWord = allWords[randomIndex];
    typedIndex = 0;

    // Clear the previous word and create new spans for each letter
    wordDisplay.innerHTML = '';
    currentWord.split('').forEach(letter => {
        const letterSpan = document.createElement('span');
        letterSpan.textContent = letter;
        wordDisplay.appendChild(letterSpan);
    });
}

/**
 * Handles the reward sequence when a word is typed correctly.
 */
function handleCorrectWord() {
    isAnimating = true; // Disable keypresses during animation

    // --- Sound Effects ---
    playSound(sfxEat);
    // Play the satisfied sound slightly after the eating sound
    setTimeout(() => playSound(sfxSatisfied), 300);

    // --- Animations ---
    monster.classList.add('satisfied'); // Trigger monster's happy animation

    // To animate the food, we hide the original and create a temporary clone
    // that we can move freely without disrupting the layout.
    const foodClone = foodItem.cloneNode(true);
    foodClone.classList.add('food-travel'); // Add the animation class
    gameContainer.appendChild(foodClone);

    // Hide the original food container
    foodContainer.style.opacity = 0;

    // After the animation is done, clean up and spawn the next word
    setTimeout(() => {
        gameContainer.removeChild(foodClone); // Remove the animated clone
        spawnNewWord(); // Get the next word
    }, 1000); // Must match the animation duration in CSS
}

/**
 * A helper function to play sounds, resetting them first.
 * This allows the same sound to be played again quickly.
 * @param {HTMLAudioElement} sound - The audio element to play.
 */
function playSound(sound) {
    sound.currentTime = 0;
    sound.play().catch(e => console.log("Audio play was prevented. User must interact with the page first."));
}

// --- Event Listener ---

document.addEventListener('keydown', (e) => {
    // On the very first keypress, start the background music.
    // This is required by modern browsers which block autoplay.
    if (!gameStarted) {
        gameStarted = true;
        bgm.volume = 0.3; // Set a pleasant volume
        bgm.play();
    }

    // Ignore input if an animation is in progress or if the key is not a single letter
    if (isAnimating || e.key.length !== 1) {
        return;
    }

    const expectedLetter = currentWord[typedIndex];
    if (e.key.toLowerCase() === expectedLetter) {
        playSound(sfxCorrect);

        // If this is the first correct letter, trigger the "ready-to-eat" state
        if (typedIndex === 0) {
            monster.classList.add('ready-to-eat');
        }

        wordDisplay.children[typedIndex].classList.add('correct');
        typedIndex++;

        // Check if the full word has been typed
        if (typedIndex === currentWord.length) {
            handleCorrectWord();
        }
    }
    // Per the GDD's "Forgiving Mode", incorrect keys are simply ignored.
});

// --- Initial Game Start ---
spawnNewWord();