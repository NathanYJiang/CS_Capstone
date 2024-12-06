let substitutions = {}; // Track all substitutions
let originalEncryptedText = ""; // Keep track of the original encrypted message
let solutionRevealed = false;

async function fetchCryptogram() {
    try {
        const response = await fetch("/get_cryptogram");
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        if (!data.cryptogram || !data.author) {
            throw new Error("Incomplete cryptogram data received from the server.");
        }

        // Store original text for later reference
        originalEncryptedText = data.cryptogram;

        // Clear old content
        const cryptogramContainer = document.getElementById("cryptogram-container");
        cryptogramContainer.innerHTML = "";

        // Split cryptogram into words
        const words = data.cryptogram.split(" ");
        const blankWords = data.cryptogram.replace(/[A-Z]/g, "_").split(" ");

        for (let i = 0; i < words.length; i++) {
            const wordGroup = document.createElement("div");
            wordGroup.style.display = "flex"; // Group letters in a word horizontally
            wordGroup.style.gap = "5px"; // Space between letters

            // Process each character in the word
            for (let j = 0; j < words[i].length; j++) {
                const box = document.createElement("div");
                box.className = "cryptogram-box";

                // Add blank (solved text or underscore)
                const blankChar = document.createElement("div");
                blankChar.textContent = blankWords[i][j];
                blankChar.className = "blank-text";

                // Add ciphertext (static encrypted text)
                const cipherChar = document.createElement("div");
                cipherChar.textContent = words[i][j];
                cipherChar.className = "cipher-text";

                // Append both to the box
                box.appendChild(blankChar);
                box.appendChild(cipherChar);

                // Append the box to the word group
                wordGroup.appendChild(box);
            }

            // Add the word group to the container
            cryptogramContainer.appendChild(wordGroup);

            // Add spacing between words (skip adding empty boxes for spaces)
            if (i < words.length - 1) {
                const spacer = document.createElement("div");
                spacer.style.width = "15px"; // Adjust the spacing between words
                cryptogramContainer.appendChild(spacer);
            }
        }

        // Display the author's name
        document.getElementById("author-name").textContent = `By: ${data.author}`;
    } catch (error) {
        console.error("Error fetching cryptogram:", error);
        document.getElementById("feedback").textContent = "Error loading cryptogram.";
        document.getElementById("feedback").style.color = "red";
    }
}

async function updateProgress(updatedText) {
    const blankChars = updatedText.split(""); // Split updated text into characters
    const blankBoxes = document.querySelectorAll(".blank-text");

    blankBoxes.forEach((box, i) => {
        box.textContent = blankChars[i] || "_";
    });
}

// Submit a substitution
async function submitSubstitution() {
    const substitutionInput = document.getElementById("guess");
    const substitution = substitutionInput.value; // e.g., "A=B"

    // Validate substitution format
    if (!substitution.includes("=") || substitution.length < 2) {
        document.getElementById("feedback").textContent =
            "Invalid format. Use 'A=B' or 'A=' to clear.";
        document.getElementById("feedback").style.color = "red";
        return;
    }

    try {
        const response = await fetch("/apply_substitution", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ substitution }),
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // Update the partially solved cryptogram (alternating lines)
        updateProgress(data.updatedGuess);

        document.getElementById("feedback").textContent = "Substitution applied!";
        document.getElementById("feedback").style.color = "green";

        // Clear the input field
        substitutionInput.value = "";
    } catch (error) {
        console.error("Error applying substitution:", error);
        document.getElementById("feedback").textContent = "Error applying substitution.";
        document.getElementById("feedback").style.color = "red";
    }
}

// Submit the solution
async function checkSolution() {
    try {
        const response = await fetch("/check_solution", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (data.correct) {
            document.getElementById("feedback").textContent = "Congratulations! You solved it!";
            document.getElementById("feedback").style.color = "green";
        } else {
            document.getElementById("feedback").textContent = "Incorrect solution. Keep trying!";
            document.getElementById("feedback").style.color = "red";
        }
    } catch (error) {
        console.error("Error checking solution:", error);
        document.getElementById("feedback").textContent = "Error checking solution.";
        document.getElementById("feedback").style.color = "red";
    }
}

// Exit the game and reveal the solution
function exitGame() {
    if (solutionRevealed) return;

    solutionRevealed = true;

    fetch("/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                throw new Error(data.error);
            }

            const solution = data.solution || "Solution unavailable.";
            document.getElementById("feedback").textContent = `Game Over. Solution: ${solution}`;
            document.getElementById("feedback").style.color = "blue";

            // Display the solution line-by-line in the cryptogram container
            const cryptogramContainer = document.getElementById("cryptogram-container");
            cryptogramContainer.innerHTML = ""; // Clear old content

            // Split the solution into lines
            const solutionLines = solution.split("\n");
            const cipherLines = originalEncryptedText.split("\n");

            for (let i = 0; i < cipherLines.length; i++) {
                const cipherLine = document.createElement("p");
                cipherLine.textContent = cipherLines[i];
                cipherLine.className = "cryptogram-text";

                const solutionLine = document.createElement("p");
                solutionLine.textContent = solutionLines[i] || "";
                solutionLine.className = "cryptogram-text";

                cryptogramContainer.appendChild(cipherLine);
                cryptogramContainer.appendChild(solutionLine);
            }
        })
        .catch((error) => {
            console.error("Error exiting game:", error);
            document.getElementById("feedback").textContent = `Error: ${error.message}`;
            document.getElementById("feedback").style.color = "red";
        });
}

// Add keyboard support for Enter key
document.getElementById("guess").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        submitSubstitution();
    }
});

// Fetch cryptogram on page load
window.onload = fetchCryptogram;