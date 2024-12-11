import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fetcher.jira_fetcher import fetch_closed_tickets
from fetcher.embedder import embed_ticket_content
from fetcher.vector_store import store_ticket_embedding, fetch_stored_tickets  

def update_vector_database_with_closed_tickets(project_key):
    print("Fetching closed tickets...")  
    closed_tickets = fetch_closed_tickets(project_key)

    if not closed_tickets:
        print("No closed tickets found.") 
        return

    print(f"Found {len(closed_tickets)} closed tickets.")  

    stored_ticket_keys = [ticket['Issue Key'] for ticket in fetch_stored_tickets()] 

    for ticket in closed_tickets:
        print(f"Processing ticket: {ticket['Issue Key']}")  
        ticket_embedding = embed_ticket_content(ticket)
        
        metadata = {
            "Summary": ticket['Summary'],
            "Description": ticket['Description'],
            "Comments": ticket['Comments']
        }
        
        if ticket['Issue Key'] not in stored_ticket_keys:
            store_ticket_embedding(ticket['Issue Key'], ticket_embedding, metadata)
            print(f"Stored new resolved ticket: {ticket['Issue Key']}")  
        else:
            print(f"Ticket {ticket['Issue Key']} already stored.")


# update_vector_database_with_closed_tickets("KAN")
