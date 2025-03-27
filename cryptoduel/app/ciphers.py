import random
import string
import numpy as np


class Cipher:
    def __init__(self):
        self.cipher = self.generate_cipher()

    def generate_cipher(self):
        while True:
            letters = list(string.ascii_uppercase)
            shuffled = random.sample(letters, len(letters))
            if np.all(np.array(shuffled) != np.array(letters)):
                return dict(zip(letters, shuffled))

    def encrypt(self, message):
        return "".join([self.cipher.get(char, char) for char in message.upper()])

    def decrypt(self, ciphertext):
        reverse_cipher = {v: k for k, v in self.cipher.items()}
        return "".join([reverse_cipher.get(char, char) for char in ciphertext.upper()])


class InteractiveDecoder:
    def __init__(self, encrypted_message, cipher, author):
        self.encrypted_message = encrypted_message
        self.cipher = cipher
        self.author = author
        self.guessed_message = self.initialize_guess()

    def initialize_guess(self):
        # Initialize the guess with underscores for letters and leave other characters as they are
        return ["_" if char.isalpha() else char for char in self.encrypted_message]

    def update_guess(self, original_letter, guessed_letter):
        # Update guessed_message with the user's guessed letter, or clear it if the letter is empty
        for i, char in enumerate(self.encrypted_message):
            if char == original_letter:
                self.guessed_message[i] = guessed_letter if guessed_letter else "_"

    def display_current_guess(self):
        # Display the current guess
        print("Current Guess: " + "".join(self.guessed_message))

    def start(self):
        print(
            f"Solve this cryptogram by {self.author[:-1]} by providing a letter substitution."
        )

        while True:
            print(f"Original Code: {self.encrypted_message}")
            self.display_current_guess()
            guess = input(
                "Enter a letter substitution in the format 'A=B' (or 'A=' to clear, 'enter' to submit, 'exit' to quit): "
            ).upper()

            if guess == "EXIT":
                print(
                    f"Puzzle ended. The quote was: {self.cipher.decrypt(self.encrypted_message)}"
                )
                break
            elif guess == "ENTER":
                # Check if the user has correctly decoded the message
                if "".join(self.guessed_message).upper() == self.cipher.decrypt(
                    self.encrypted_message
                ):
                    print("Congratulations! You decoded the message correctly!")
                    break
                else:
                    print("Incorrect. Keep trying!")
            else:
                try:
                    if "=" in guess:
                        parts = guess.split("=")
                        original_letter = parts[0]
                        guessed_letter = parts[1] if len(parts) > 1 else ""

                        # Check for self-decoding
                        if original_letter == guessed_letter:
                            print(
                                "Self-decoding is not allowed. Please choose different letters."
                            )
                            continue

                        # Clear the letter if the user inputs an empty guessed_letter
                        if guessed_letter == "":
                            print(
                                f"Clearing letter {original_letter} from the current guess."
                            )

                        # Update the current guess with the substitution
                        self.update_guess(original_letter, guessed_letter)
                    else:
                        print(
                            "Invalid format. Please enter in the format 'A=B' or 'A=' to clear."
                        )
                except ValueError:
                    print("Invalid format. Please enter in the format 'A=B'.")
                    continue
