// script.js
// Final version: Clean cryptogram UI with global autofill, auto-tab to next/previous input, and arrow key navigation

document.addEventListener("DOMContentLoaded", init);

let letterBoxes = [];
let originalEncryptedText = "";
let solutionRevealed = false;

function init() {
  fetchCryptogram();
}

/**
 * Fetch the cryptogram from the server and render it.
 */
async function fetchCryptogram() {
  try {
    const response = await fetch("/get_cryptogram");
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    if (!data.cryptogram || !data.author)
      throw new Error("Incomplete cryptogram data received.");
    originalEncryptedText = data.cryptogram;
    renderCryptogram(originalEncryptedText);
    document.getElementById("author-name").textContent = `Author: ${data.author}`;
  } catch (error) {
    console.error("Error fetching cryptogram:", error);
    showFeedback("Error loading cryptogram.", "red");
  }
}

/**
 * Render the cryptogram by grouping text into words and spaces.
 * Editable letters become inputs; punctuation/digits become fixed.
 */
function renderCryptogram(text) {
  const container = document.getElementById("cryptogram-container");
  container.innerHTML = "";
  letterBoxes = [];

  // Split text into groups (words and whitespace)
  const groups = text.match(/\S+|\s+/g) || [text];
  groups.forEach((group) => {
    if (/^\s+$/.test(group)) {
      // Create a visible space element
      const spaceBox = document.createElement("div");
      spaceBox.className = "space-box";
      spaceBox.textContent = group;
      container.appendChild(spaceBox);
    } else {
      // Create a container for the word
      const wordBox = document.createElement("div");
      wordBox.className = "word-box";
      group.split("").forEach((char) => {
        const box = document.createElement("div");
        box.className = "cryptogram-box";

        // Top: ciphertext display
        const cipherDiv = document.createElement("div");
        cipherDiv.className = "cipher-text";
        cipherDiv.textContent = char;

        // Bottom: input for substitution
        const input = document.createElement("input");
        input.className = "plain-input";
        input.type = "text";
        input.maxLength = 1;

        if (char.match(/[A-Za-z]/)) {
          // Editable letter
          input.dataset.originalLetter = char.toUpperCase();
          const index = letterBoxes.length;
          input.dataset.index = index;
          input.addEventListener("keydown", (e) => handleKeyDown(e, index));
          letterBoxes.push(input);
        } else {
          // Punctuation/digits: fixed
          input.value = char;
          input.disabled = true;
          input.dataset.originalLetter = char;
        }

        box.appendChild(cipherDiv);
        box.appendChild(input);
        wordBox.appendChild(box);
      });
      container.appendChild(wordBox);
    }
  });
}

/**
 * Handle keydown events on each editable input.
 * - ENTER: submits (checks) the solution.
 * - Backspace: clears the input and moves focus to the previous input.
 * - ArrowLeft/ArrowRight: navigate left/right.
 * - Tab: moves focus to the next empty input.
 * - A–Z: processes the input, sends the substitution, and auto-focuses the next empty input.
 */
async function handleKeyDown(event, index) {
    // Process allowed special keys first
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusPreviousLetter(index);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusNextLetter(index);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      checkSolution();
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      // Clear current input (if not already empty)
      if (event.target.value.trim() !== "") {
        event.target.value = "";
        await sendSubstitution(index, "");
      }
      // Always move focus to the previous input.
      focusPreviousLetter(index);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      focusNextUnfilledLetter(index);
      return;
    }
  
    // Only process if the key is a single letter A-Z.
    if (!/^[A-Za-z]$/.test(event.key)) {
      // Ignore any non-letter keys (e.g., Command, Option, Shift, etc.)
      return;
    }
    
    const key = event.key.toUpperCase();
    event.preventDefault();
    event.target.value = key;
    await sendSubstitution(index, key);
    focusNextUnfilledLetter(index);
  }

/**
 * Move focus to the next empty input box.
 */
function focusNextUnfilledLetter(currentIndex) {
  for (let i = currentIndex + 1; i < letterBoxes.length; i++) {
    if (letterBoxes[i].value.trim() === "") {
      letterBoxes[i].focus();
      return;
    }
  }
  // Fallback: if none are empty, focus the next box.
  if (currentIndex + 1 < letterBoxes.length) {
    letterBoxes[currentIndex + 1].focus();
  }
}

/**
 * Move focus to the next input box (regardless of its content).
 */
function focusNextLetter(currentIndex) {
  if (currentIndex + 1 < letterBoxes.length) {
    letterBoxes[currentIndex + 1].focus();
  }
}

/**
 * Move focus to the previous input box (regardless of its content).
 */
function focusPreviousLetter(currentIndex) {
  if (currentIndex - 1 >= 0) {
    letterBoxes[currentIndex - 1].focus();
  }
}

/**
 * Send the substitution to the server and update all inputs with the same original letter.
 */
async function sendSubstitution(index, guessedLetter) {
  const input = letterBoxes[index];
  const originalLetter = input.dataset.originalLetter;
  if (!originalLetter.match(/[A-Z]/)) return;
  try {
    const response = await fetch("/apply_substitution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        original_letter: originalLetter,
        guessed_letter: guessedLetter,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    // Global autofill: update every input with the same original letter.
    letterBoxes.forEach((inp) => {
      if (inp.dataset.originalLetter === originalLetter) {
        inp.value = guessedLetter;
      }
    });
    showFeedback(`Substitution applied for ${originalLetter} → ${guessedLetter}`, "green");
  } catch (error) {
    console.error("Error applying substitution:", error);
    showFeedback("Error applying substitution.", "red");
  }
}

/**
 * Check if the solution is correct.
 */
async function checkSolution() {
  try {
    const response = await fetch("/check_solution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    if (data.correct) {
      showFeedback("Congratulations! You solved it!", "green");
    } else {
      showFeedback("Incorrect solution. Keep trying!", "red");
    }
  } catch (error) {
    console.error("Error checking solution:", error);
    showFeedback("Error checking solution.", "red");
  }
}

/**
 * Reveal the solution and end the game.
 */
function exitGame() {
  if (solutionRevealed) return;
  solutionRevealed = true;
  fetch("/decrypt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) throw new Error(data.error);
      const solution = data.solution || "Solution unavailable.";
      showFeedback(`Game Over. Solution: ${solution}`, "blue");
      const container = document.getElementById("cryptogram-container");
      container.innerHTML = "";
      const solutionElem = document.createElement("p");
      solutionElem.className = "solution-text";
      solutionElem.textContent = solution;
      container.appendChild(solutionElem);
    })
    .catch((error) => {
      console.error("Error exiting game:", error);
      showFeedback(`Error: ${error.message}`, "red");
    });
}

/**
 * Display a feedback message.
 */
function showFeedback(message, color) {
  const feedback = document.getElementById("feedback");
  feedback.textContent = message;
  feedback.style.color = color;
}

// Expose functions to HTML buttons.
window.checkSolution = checkSolution;
window.exitGame = exitGame;
window.openHelp = function () {
  window.open("https://cryptograms.puzzlebaron.com/tutorial.php", "_blank");
};