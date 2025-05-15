
import os
import sys
import requests
import json
from requests.auth import HTTPBasicAuth

# Load env from config.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config import JIRA_API_URL, JIRA_EMAIL, JIRA_API_TOKEN

headers = {
    "Accept": "application/json",
    "Content-Type": "application/json"
}

def get_account_id(email):
    """Fetches the accountId of a user given their email."""
    url = JIRA_API_URL + f"user/search?query={email}"
    response = requests.get(url, headers=headers, auth=HTTPBasicAuth(JIRA_EMAIL, JIRA_API_TOKEN))
    response.raise_for_status()
    users = response.json()
    if users:
        return users[0]['accountId']
    else:
        raise Exception("User not found in Jira")

def create_ticket(project_key, summary, description, assignee_email=None, category_value=None, level=None):
    """Creates a Jira ticket and returns its key."""
    url = JIRA_API_URL + "issue"
    fields = {
        "project": {"key": project_key},
        "summary": summary,
        "description": {
            "type": "doc",
            "version": 1,
            "content": [
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": description}]
                }
            ]
        },
        "issuetype": {"name": "Task"}
    }
    if assignee_email:
        fields["assignee"] = {"id": get_account_id(assignee_email)}
    if category_value:
        fields["customfield_10064"] = category_value
    if level:
        fields["customfield_10066"] = level

    response = requests.post(
        url,
        data=json.dumps({"fields": fields}),
        headers=headers,
        auth=HTTPBasicAuth(JIRA_EMAIL, JIRA_API_TOKEN)
    )
    if response.status_code != 201:
        # bubble up full error
        detail = response.json()
        raise Exception(f"Failed to create JIRA ticket: {json.dumps(detail, indent=2)}")
    return response.json()["key"]