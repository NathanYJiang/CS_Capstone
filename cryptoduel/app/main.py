from flask import Flask, render_template, jsonify, request
from ciphers import Cipher, InteractiveDecoder
import random
from quotes import db

app = Flask(__name__)

# Global decoder instance to manage state
decoder = None


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/get_cryptogram", methods=["GET"])
def get_cryptogram():
    global decoder
    try:
        # Randomly select a quote
        quote, author = random.choice(db)

        # Initialize Cipher and encrypt the quote
        cipher = Cipher()
        encrypted = cipher.encrypt(quote)

        # Initialize InteractiveDecoder for this cryptogram
        decoder = InteractiveDecoder(
            encrypted_message=encrypted, cipher=cipher, author=author
        )

        # Send the encrypted cryptogram and author to the frontend
        return jsonify({"cryptogram": encrypted, "author": author})
    except Exception as e:
        print("Error generating cryptogram:", e)
        return jsonify({"error": "Failed to generate cryptogram"}), 500


@app.route("/apply_substitution", methods=["POST"])
def apply_substitution():
    global decoder
    data = request.json
    substitution = data.get("substitution")  # Expecting "A=B" or "A="

    if not decoder:
        return jsonify({"error": "No active cryptogram"}), 400

    try:
        if "=" in substitution:
            parts = substitution.split("=")
            if len(parts) != 2:
                return jsonify({"error": "Invalid format. Use 'A=B' or 'A='."}), 400

            original_letter, guessed_letter = parts
            guessed_letter = (
                guessed_letter if guessed_letter else None
            )  # Handle "A=" case

            # Update the guess using InteractiveDecoder
            decoder.update_guess(
                original_letter.upper(),
                guessed_letter.upper() if guessed_letter else "",
            )

            # Return the updated guess to the frontend
            return jsonify({"updatedGuess": "".join(decoder.guessed_message)})
        else:
            return jsonify({"error": "Invalid format. Use 'A=B' or 'A='."}), 400
    except Exception as e:
        print("Error applying substitution:", e)
        return jsonify({"error": "Failed to apply substitution"}), 500


@app.route("/check_solution", methods=["POST"])
def check_solution():
    global decoder
    if not decoder:
        return jsonify({"error": "No active cryptogram"}), 400

    try:
        # Decrypt the encrypted message to compare with the user's guess
        decrypted_message = decoder.cipher.decrypt(decoder.encrypted_message)
        guessed_message = "".join(decoder.guessed_message)

        # Check if the user's guess matches the solution
        is_correct = guessed_message.upper() == decrypted_message.upper()
        return jsonify({"correct": is_correct})

    except Exception as e:
        # Log the error and return a generic failure message
        print("Error in check_solution:", e)
        return jsonify({"error": "Failed to verify solution"}), 500


@app.route("/decrypt", methods=["POST"])
def decrypt():
    global decoder
    if not decoder:
        return jsonify({"error": "No active cryptogram"}), 400

    try:
        decrypted_message = decoder.cipher.decrypt(decoder.encrypted_message)
        return jsonify({"solution": decrypted_message})
    except Exception as e:
        print(f"Error in decrypt: {e}")
        return jsonify({"error": "Failed to decrypt message"}), 500


if __name__ == "__main__":
    app.run(debug=True)
