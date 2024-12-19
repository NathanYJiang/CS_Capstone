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

        originalEncryptedText = data.cryptogram;

        console.log("Original encrypted text length:", originalEncryptedText.length);

        // Render the cryptogram
        const cryptogramContainer = document.getElementById("cryptogram-container");
        cryptogramContainer.innerHTML = ""; // Clear old content

        originalEncryptedText.split("").forEach((char) => {
            // Create the outer box container
            const box = document.createElement("div");
            box.className = "cryptogram-box";

            // Create the ciphertext (top row)
            const cipherText = document.createElement("div");
            cipherText.className = "cipher-text";
            cipherText.textContent = char; // Display the original ciphertext character

            // Create the plaintext (bottom row, starts as underscore)
            const plainText = document.createElement("div");
            plainText.className = "plain-text";
            plainText.textContent = char.match(/[a-zA-Z]/) ? "_" : char; // Default to `_` for letters

            // Append both rows to the box
            box.appendChild(cipherText);
            box.appendChild(plainText);

            // Add a special class for spaces
            if (char === " ") {
                box.classList.add("space-box");
                cipherText.textContent = ""; // No display for spaces
                plainText.textContent = ""; // No display for spaces
            }

            cryptogramContainer.appendChild(box);
        });
    } catch (error) {
        console.error("Error fetching cryptogram:", error);
        document.getElementById("feedback").textContent = "Error loading cryptogram.";
        document.getElementById("feedback").style.color = "red";
    }
}

async function updateProgress(updatedText) {
    const blankChars = updatedText.split(""); // Break the updated text into individual characters
    const plainTextBoxes = document.querySelectorAll(".cryptogram-box .plain-text"); // Select the plain-text elements

    console.log("Updated guess length:", blankChars.length);
    console.log("Number of plain-text elements:", plainTextBoxes.length);

    // Check for length mismatch
    if (blankChars.length !== plainTextBoxes.length) {
        console.warn("Length mismatch! Check server output formatting.");
        return; // Prevent further execution if lengths don't match
    }

    // Update each plain-text element with the corresponding character
    plainTextBoxes.forEach((box, i) => {
        box.textContent = blankChars[i] || "_"; // Replace underscore with updated guess
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

        console.log("Updated guess received from server:", data.updatedGuess);
        console.log("Updated guess length:", data.updatedGuess.length);
        console.log("Original cryptogram length:", originalEncryptedText.length);

        // Update the partially solved cryptogram
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