from flask import Flask, render_template, jsonify, request
import json
import random
import re
from ciphers import Cipher
from ciphers import InteractiveDecoder
from google import genai
import os
from dotenv import load_dotenv
import textwrap  # import textwrap for wrapping text

load_dotenv()

# Helper function to wrap text without cutting words
def wrap_text(text, width=80):
    return textwrap.fill(text, width=width)

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
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents="You are acting as a generator to generate quotes for Code Race, a project designed to help provide practice for the Science Olympiad event Codebusters. Give me a short quote and the author in JSON format like this: {\"quote\": \"...\", \"author\": \"...\"}"
        )
        try:
            data = json.loads(response.text)
            quote = data.get("quote")
            author = data.get("author")
        except json.JSONDecodeError:
            print("Falling back to regex parsing.")
            text = response.text.strip()
            match = re.search(r'"quote"\s*:\s*"([^"]+)"\s*,\s*"author"\s*:\s*"([^"]+)"', text)
            if not match:
                raise ValueError("Gemini response is not valid JSON or properly formatted string")
            quote, author = match.group(1), match.group(2)
        if not quote or not author:
            raise ValueError("Invalid data received from Gemini model")

        # Initialize Cipher and encrypt the quote
        cipher = Cipher()
        encrypted = cipher.encrypt(quote)
        
        # Wrap the encrypted text so words aren't cut off at the edge
        encrypted = wrap_text(encrypted, width=80)

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
    original_letter = data.get("original_letter")
    guessed_letter = data.get("guessed_letter")  # Can be empty string if user clears input

    if not decoder:
        return jsonify({"error": "No active cryptogram"}), 400
    if not original_letter:
        return jsonify({"error": "Missing original_letter"}), 400

    try:
        # Update the guess using InteractiveDecoder based on the clicked letter
        decoder.update_guess(
            original_letter.upper(),
            guessed_letter.upper() if guessed_letter else ""
        )
        # Return the updated guess to the frontend
        return jsonify({"updatedGuess": "".join(decoder.guessed_message)})
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