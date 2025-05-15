import os
import sys
import requests
from requests.auth import HTTPBasicAuth

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config import JIRA_API_URL, JIRA_EMAIL, JIRA_API_TOKEN

headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
}

def fetch_closed_tickets(project_key):
    query = {
        'jql': f'project = {project_key} AND status = "DONE"',
    }

    response = requests.get(JIRA_API_URL + "search", headers=headers, params=query, auth=(JIRA_EMAIL, JIRA_API_TOKEN))
    response.raise_for_status()

    tickets = response.json().get('issues', [])
    return format_tickets(tickets)

def fetch_open_tickets(project_key):
    query = {
        'jql': f'project = {project_key} AND status != "DONE"',
    }

    response = requests.get(JIRA_API_URL + "search", headers=headers, params=query, auth=(JIRA_EMAIL, JIRA_API_TOKEN))
    response.raise_for_status()

    tickets = response.json().get('issues', [])
    return format_tickets(tickets)

def fetch_comments(issue_key):
    url = f"{JIRA_API_URL}issue/{issue_key}/comment"
    response = requests.get(url, headers=headers, auth=HTTPBasicAuth(JIRA_EMAIL, JIRA_API_TOKEN))

    if response.status_code == 200:
        comments_data = response.json()
        comments = comments_data.get('comments', [])
        return [concatenate_comment_body(comment.get('body')) for comment in comments]
    else:
        return []

def concatenate_comment_body(body):
    comment_text = ""
    for paragraph in body.get('content', []):
        for content in paragraph.get('content', []):
            if content.get('type') == 'text':
                comment_text += content.get('text', '') + " "
    return comment_text.strip()

def format_tickets(tickets):
    formatted_tickets = []
    for ticket in tickets:
        comments = fetch_comments(ticket['key']) 
        comment_text = "\n".join(comments) if comments else "No comments"

        description_content = ticket["fields"]["description"]["content"]
        description_text = ""
        
        for paragraph in description_content:
            if paragraph["type"] == "paragraph":
                for content in paragraph["content"]:
                    if content["type"] == "text":
                        description_text += content["text"] + " "

        formatted_tickets.append({
            'Issue Id': ticket['id'],
            'Issue Key': ticket['key'],
            'Summary': ticket['fields'].get('summary', 'N/A'),
            'Project Name': ticket['fields']['project']['name'],
            'Assignee': ticket['fields'].get('assignee', {}).get('displayName', 'Unassigned'),
            'Description': description_text.strip(),
            'Comments': comment_text,
            'Priority': ticket['fields'].get('priority', {}).get('name', 'N/A'),
            'Category': ticket['fields']['customfield_10064'],
            'Stats': ticket['fields']['customfield_10065'],
            'Level': ticket['fields']['customfield_10066'],
            'Time': ticket['fields']['statuscategorychangedate']
        })
    return formatted_tickets

def print_ticket_details(tickets):
    for ticket in tickets:
        print("---------------------------------------------------")
        print(f"Issue Key: {ticket['Issue Key']}")
        print(f"Summary: {ticket['Summary']}")
        print(f"Project Name: {ticket['Project Name']}")
        print(f"Assignee: {ticket['Assignee']}")
        print(f"Description: {ticket['Description']}")
        print(f"Comments: {ticket['Comments']}")
        print(f"Priority: {ticket['Priority']}")
        print(f"Category: {ticket['Category']}")
        print(f"Stats: {ticket['Stats']}")
        print(f"Level: {ticket['Level']}")
        print(f"Time: {ticket['Time']}")
        print("---------------------------------------------------")

if __name__ == "__main__":
    user_project_key = input("Please enter the JIRA project key: ").strip()

    closed_tickets = fetch_closed_tickets(user_project_key)
    print("Closed Tickets:")
    print_ticket_details(closed_tickets)

    open_tickets = fetch_open_tickets(user_project_key)
    print("Open Tickets:")
    print_ticket_details(open_tickets)
