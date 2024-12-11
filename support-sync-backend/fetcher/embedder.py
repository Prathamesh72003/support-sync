import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import openai
from config import OPENAI_API_KEY

openai.api_key = OPENAI_API_KEY

def embed_ticket_content(ticket):
    
    try:
        
        text = f"Issue Key: {ticket['Issue Key']}\nSummary: {ticket['Summary']}\nDescription: {ticket['Description']}\nComments: {ticket['Comments']}"

        response = openai.Embedding.create(
            input=text,
            model="text-embedding-ada-002" 
        )
    
        embedding = response['data'][0]['embedding']
        return embedding
    except Exception as e:
        print(e)
