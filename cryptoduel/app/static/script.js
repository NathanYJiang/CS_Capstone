// script.js
// Final regenerated version: Clean cryptogram UI with global autofill and auto-tab

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
    if (!data.cryptogram || !data.author) {
      throw new Error("Incomplete cryptogram data received.");
    }
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
 * Letters become editable inputs; punctuation and digits become disabled.
 */
function renderCryptogram(text) {
  const container = document.getElementById("cryptogram-container");
  container.innerHTML = "";
  letterBoxes = [];

  // Split into groups: words and whitespace (preserving spaces)
  const groups = text.match(/\S+|\s+/g) || [text];

  groups.forEach((group) => {
    if (/^\s+$/.test(group)) {
      // Create a visible space element
      const spaceBox = document.createElement("div");
      spaceBox.className = "space-box";
      // Optionally display the space (or leave it empty for styling)
      spaceBox.textContent = group;
      container.appendChild(spaceBox);
    } else {
      // Create a container for the word
      const wordBox = document.createElement("div");
      wordBox.className = "word-box";
      group.split("").forEach((char) => {
        const box = document.createElement("div");
        box.className = "cryptogram-box";

        // Top row: ciphertext (always shown)
        const cipherDiv = document.createElement("div");
        cipherDiv.className = "cipher-text";
        cipherDiv.textContent = char;

        // Bottom row: input element
        const input = document.createElement("input");
        input.className = "plain-input";
        input.type = "text";
        input.maxLength = 1;

        if (char.match(/[A-Za-z]/)) {
          // Editable letter: allow substitution.
          input.dataset.originalLetter = char.toUpperCase();
          const index = letterBoxes.length;
          input.dataset.index = index;
          input.addEventListener("keydown", (e) => handleKeyDown(e, index));
          letterBoxes.push(input);
        } else {
          // For punctuation/digits: fix the value and disable editing.
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
 * Handle keydown events on editable inputs.
 * - Backspace: clear the input and auto-tab to next empty input.
 * - Tab: jump to next empty input.
 * - A–Z: set the input, send substitution, and auto-tab.
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
 * Auto-focus the next input box that is empty.
 */
function focusNextUnfilledLetter(currentIndex) {
  for (let i = currentIndex + 1; i < letterBoxes.length; i++) {
    if (letterBoxes[i].value.trim() === "") {
      letterBoxes[i].focus();
      return;
    }
  }
  // Fallback: if none are empty, focus the very next input if it exists.
  if (currentIndex + 1 < letterBoxes.length) {
    letterBoxes[currentIndex + 1].focus();
  }
}

/**
 * Send the substitution for a given input and perform global autofill.
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

    // Global autofill: update all inputs with the same original letter.
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
 * Check the solution by sending a request to the server.
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
 * Exit the game and reveal the solution.
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