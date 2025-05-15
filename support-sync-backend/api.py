# api.py

import os
import sys
import logging
from typing import Optional, Dict, List

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PyPDF2 import PdfReader

from langchain.text_splitter import CharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import FAISS

# Add the parent directory to the path so we can import creation/create_ticket
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from creation.create_ticket import create_ticket as jira_create_ticket
from fetcher.jira_fetcher import fetch_open_tickets
from fetcher.clickup_fetcher import fetch_all_tasks, filter_and_format_tasks
from fetcher.embedder import embed_ticket_content
from fetcher.vector_store import search_similar_tickets
from llm.chatbot import get_openai_solution, chatbot_response
from llm.solution_generation import update_vector_database_with_closed_tickets

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)


# --- Pydantic Models ---

class Question(BaseModel):
    question: str


class UserQuery(BaseModel):
    ticket_id: str
    query: str
    project_key: str  


class ProjectKeyRequest(BaseModel):
    project_key: str


class JiraCreateRequest(BaseModel):
    project_key: str
    summary: str
    description: str
    assignee_email: Optional[str] = None
    category_value: Optional[str] = None
    level: Optional[str] = None


# --- In-Memory Stores ---

ticket_contexts: Dict[str, dict] = {}
vectorstore = None  


# --- Helper Functions ---

def get_pdf_text(pdf_files: List[UploadFile]):
    text = ""
    for pdf in pdf_files:
        reader = PdfReader(pdf.file)
        for page in reader.pages:
            text += page.extract_text() or ""
    return text


def get_text_chunks(text: str):
    splitter = CharacterTextSplitter(
        separator="\n",
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    return splitter.split_text(text)


def get_vectorstore(text_chunks: List[str]):
    embeddings = OpenAIEmbeddings()
    return FAISS.from_texts(texts=text_chunks, embedding=embeddings)


# --- Endpoints ---

@app.post("/process_pdf/")
async def process_pdf(pdf_files: List[UploadFile] = File(...)):
    raw_text = get_pdf_text(pdf_files)
    text_chunks = get_text_chunks(raw_text)

    global vectorstore
    vectorstore = get_vectorstore(text_chunks)

    return {"message": "PDFs processed successfully"}


@app.post("/tickets/open/jira")
async def get_open_jira_tickets(request: ProjectKeyRequest):
    try:
        open_tickets = fetch_open_tickets(request.project_key)
        ticket_list = [
            {
                "issue_key": t["Issue Key"],
                "title": t["Summary"],
                "description": t["Description"],
                "priority": t["Level"],
                "platform": "JIRA",
                "projectKey": request.project_key,
                "issue_category": t["Category"],
                "issue_stats": t["Stats"],
                "Assignee": t["Assignee"],
                "DateTime": t["Time"],
            }
            for t in open_tickets
        ]
        return {"open_tickets": ticket_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching open tickets: {e}")


@app.post("/tickets/open/clickup")
async def get_open_clickup_tasks(request: ProjectKeyRequest):
    try:
        tasks = fetch_all_tasks(request.project_key)
        open_tasks = filter_and_format_tasks(tasks, 'open')
        logging.info("Open Tasks: %s", open_tasks)

        ticket_list = [
            {
                "issue_key": task["Task Id"],
                "title": task["Task Name"],
                "description": task.get("Description", "No description available"),
                "priority": task.get("Priority", "No priority"),
                "platform": "ClickUp",
                "projectKey": request.project_key
            }
            for task in open_tasks
        ]
        return {"open_tasks": ticket_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching open ClickUp tasks: {e}")


@app.post("/tickets/solve/{ticket_id}")
async def get_ticket_solution(ticket_id: str, request: ProjectKeyRequest):
    try:
        open_tickets = fetch_open_tickets(request.project_key)
        selected = next((t for t in open_tickets if t["Issue Key"] == ticket_id), None)
        if not selected:
            raise HTTPException(status_code=404, detail="Ticket not found")

        ticket_embedding = embed_ticket_content(selected)
        similar = search_similar_tickets(ticket_embedding)
        similar_sols = "\n".join(
            f"Comments: {t['metadata'].get('Comments','N/A')}\n"
            f"Description: {t['metadata'].get('Description','N/A')}\n"
            f"Summary: {t['metadata'].get('Summary','N/A')}"
            for t in similar if 'metadata' in t
        )

        initial_solution = get_openai_solution(selected, similar_sols)

        ticket_contexts[ticket_id] = {
            'ticket_details': selected,
            'initial_solution': initial_solution,
            'similar_solutions': similar_sols,
            'chat_history': []
        }

        return {
            "ticket": selected,
            "similar_ticket_solutions": similar_sols,
            "initial_solution": initial_solution
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating solution: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tickets/chat")
async def chat_with_chatbot(user_query: UserQuery):
    try:
        ctx = ticket_contexts.get(user_query.ticket_id)
        if not ctx:
            raise HTTPException(
                status_code=400,
                detail="Please get an initial solution first using /tickets/solve endpoint"
            )

        pdf_ctx = ""
        if vectorstore:
            retriever = vectorstore.as_retriever()
            docs = retriever.get_relevant_documents(user_query.query)
            pdf_ctx = "Context: " + " ".join(d.page_content for d in docs) + f"\nUser Question: {user_query.query}"

        response = chatbot_response(ctx, user_query.query, pdf_ctx)

        ctx['chat_history'].append(f"User: {user_query.query}")
        ctx['chat_history'].append(f"Assistant: {response}")
        # Keep last 20 messages
        ctx['chat_history'] = ctx['chat_history'][-20:]

        return {"chatbot_response": response}

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in chatbot interaction: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tickets/create/jira")
async def create_jira_ticket(request: JiraCreateRequest):
    """
    Create a Jira ticket using the provided fields.
    Returns the new issue key on success.
    """
    try:
        issue_key = jira_create_ticket(
            request.project_key,
            request.summary,
            request.description,
            request.assignee_email,
            request.category_value,
            request.level
        )
        return {"issue_key": issue_key}
    except Exception as e:
        logging.error(f"Error creating JIRA ticket: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
