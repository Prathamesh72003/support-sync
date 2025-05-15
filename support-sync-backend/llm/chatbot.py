import os
import sys
import json

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import openai
from groq import Groq
from config import OPENAI_API_KEY, GROQ_API_KEY

openai.api_key = OPENAI_API_KEY
client = Groq(api_key=GROQ_API_KEY)

chat_memory = []

def chatbot_response(ticket_context, user_query, pdf_context):
    pdf_context = pdf_context or "No additional context available."
    conversation_history = ticket_context.get('chat_history', [])
    initial_solution = ticket_context.get('initial_solution', '')
    ticket_details = ticket_context.get('ticket_details', {})

    conversation_history_var = '\n'.join(conversation_history)

    prompt = f"""
    You are an IT support assistant equipped with comprehensive context to assist users effectively. Please consider the following information when formulating your response:

    We also have additional context from a related document that may help you provide a more accurate response. The context is as follows:
    {pdf_context}
    Read the context carefully and use it to enhance your response.

    1. Ticket Details:
    - Issue Key: {ticket_details.get('Issue Key')}
    - Summary: {ticket_details.get('Summary')}
    - Description: {ticket_details.get('Description')}

    2. Initial Solution Provided:
    {initial_solution}

    3. Previous Conversation:
    {conversation_history_var}  # Retrieve the complete history of the conversation for context.

    **IMPORTANT:** 
    1. Query Classification:
    - Identify and classify the user query as one of the following:
        - Technical Problem: An issue requiring a technical solution.
        - Request: A request for assistance or information.
        - Communication: General inquiries or messages that require a response.

    2. Actionable Steps:
    - For Technical Issues: Provide a detailed step-by-step solution, including any relevant code snippets, debugging tips, or technical references as necessary.
    - For Requests: Clearly outline the next steps to be taken, deliverables expected, or information to be provided.
    - For Communications: Suggest appropriate actions or responses to facilitate effective communication with the user.

    3. **Response Length**:
    - Keep the chat response as small as possible while ensuring accuracy and relevance. Limit the response to a maximum of 200 characters.

    The user query is: {user_query}

    Ensure your response is:
    - Clear: Use straightforward language and avoid jargon unless necessary.
    - Relevant: Directly address the user’s query with pertinent information.
    - Professional: Maintain a courteous tone and provide helpful guidance.

    **Your goal is to assist the user efficiently while ensuring all relevant context is considered.**
    """

    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.1-8b-instant",  
        max_tokens=700  
    )

    response_content = response.choices[0].message.content 

    chat_memory.append({"user_query": user_query, "response": response_content})
    ticket_context['chat_history'] = [f"User: {entry['user_query']}\nAssistant: {entry['response']}" for entry in chat_memory]

    return response_content

def get_openai_solution(ticket, similar_ticket_solutions):
    text = f"Issue Key: {ticket['Issue Key']}\nSummary: {ticket['Summary']}\nDescription: {ticket['Description']}\nComments: {ticket['Comments']}"
    
    prompt = f"""
    Analyze the following IT support ticket and relevant similar tickets, providing a detailed response in markup language format. Follow this structure:

    1. Issue Type: Classify the ticket as a technical problem, request, or communication.
    2. Root Cause/Clarification: Explain the underlying issue or clarify any requests. If applicable, check if the issue is related to coding or configuration.
        Important: Do not rely entirely on similar_ticket_solutions. If they don’t address the issue, prioritize the ticket's title and details to provide the correct solution.
    
    3. Actionable Steps:
        For Technical Issues: Provide a step-by-step solution, including relevant code fixes if applicable.
        For Requests: Outline the next steps or deliverables.
        For Communications: Suggest appropriate actions or responses.
    
    4. Prevention/Improvement Recommendations: Offer advice on how to prevent similar issues in the future or improve processes.
    
    Input Details:
    Ticket Details:
    {text}
    Similar Tickets:
    {similar_ticket_solutions}
    
    Ensure your response is clear, relevant, and professional, focusing primarily on the specific context of the ticket while utilizing similar_ticket_solutions only when they provide direct assistance.    
    
    """

    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.1-8b-instant",
    )
    
    return response.choices[0].message.content
