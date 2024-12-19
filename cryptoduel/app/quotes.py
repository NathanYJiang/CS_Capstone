import pandas as pd

quotes_df = pd.read_csv("hf://datasets/jstet/quotes-500k/quotes.csv")

# print(quotes_df.head())
# Retrieve all quotes
all_quotes = quotes_df["quote"]
all_authors = quotes_df["author"]
db = list(zip(all_quotes, all_authors))

# test
# print(db)
# print("test")
# print(all_quotes.head(), all_authors.head())
# exit()