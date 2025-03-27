// script.js
// Final version: Clean cryptogram UI with global autofill and auto-tab to next empty input

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
 * Render the cryptogram, grouping letters into words and spaces.
 */
function renderCryptogram(text) {
  const container = document.getElementById("cryptogram-container");
  container.innerHTML = "";
  letterBoxes = [];
  // Split text into groups (words and whitespace)
  const groups = text.match(/\S+|\s+/g) || [text];
  groups.forEach((group) => {
    if (/^\s+$/.test(group)) {
      // Create a space box for whitespace
      const spaceBox = document.createElement("div");
      spaceBox.className = "space-box";
      // Optionally display the space visibly:
      spaceBox.textContent = group;
      container.appendChild(spaceBox);
    } else {
      // Create a container for the word
      const wordBox = document.createElement("div");
      wordBox.className = "word-box";
      group.split("").forEach((char) => {
        const box = document.createElement("div");
        box.className = "cryptogram-box";

        // Top row: ciphertext display
        const cipherDiv = document.createElement("div");
        cipherDiv.className = "cipher-text";
        cipherDiv.textContent = char;

        // Bottom row: plaintext input for substitution
        const input = document.createElement("input");
        input.className = "plain-input";
        input.type = "text";
        input.maxLength = 1;
        input.dataset.originalLetter = char.toUpperCase();

        // Assign a stable index and attach event listener
        const index = letterBoxes.length;
        input.dataset.index = index;
        input.addEventListener("keydown", (e) => handleKeyDown(e, index));

        box.appendChild(cipherDiv);
        box.appendChild(input);
        wordBox.appendChild(box);
        letterBoxes.push(input);
      });
      container.appendChild(wordBox);
    }
  });
}

/**
 * Handle keydown events on each plaintext input.
 * - Backspace: clears the input, sends an empty guess, then auto-focuses next empty input.
 * - Tab: auto-focuses the next empty input.
 * - A–Z: submits the guess, performs global autofill, then moves focus to the next empty input.
 */
async function handleKeyDown(event, index) {
  if (event.key === "Backspace") {
    event.preventDefault();
    event.target.value = "";
    await sendSubstitution(index, "");
    focusNextUnfilledLetter(index);
    return;
  }
  if (event.key === "Tab") {
    event.preventDefault();
    focusNextUnfilledLetter(index);
    return;
  }
  const key = event.key.toUpperCase();
  if (key >= "A" && key <= "Z") {
    event.preventDefault();
    event.target.value = key;
    await sendSubstitution(index, key);
    focusNextUnfilledLetter(index);
  }
}

/**
 * Auto-focus the next empty input box.
 */
function focusNextUnfilledLetter(currentIndex) {
  for (let i = currentIndex + 1; i < letterBoxes.length; i++) {
    if (letterBoxes[i].value.trim() === "") {
      letterBoxes[i].focus();
      return;
    }
  }
  // Fallback: if no empty box is found, focus the next box regardless.
  if (currentIndex + 1 < letterBoxes.length) {
    letterBoxes[currentIndex + 1].focus();
  }
}

/**
 * Send the substitution to the server and perform global autofill.
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
    // Global autofill: update every input with the same original letter
    letterBoxes.forEach((inp) => {
      if (inp.dataset.originalLetter === originalLetter) {
        inp.value = guessedLetter;
      }
    });
    showFeedback(`Substitution applied for ${originalLetter} -> ${guessedLetter}`, "green");
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

// Expose functions to HTML buttons
window.checkSolution = checkSolution;
window.exitGame = exitGame;
window.openHelp = function () {
  window.open("https://cryptograms.puzzlebaron.com/tutorial.php", "_blank");
};