from fastapi import FastAPI, HTTPException, File,UploadFile
from pydantic import BaseModel
from fetcher.jira_fetcher import fetch_open_tickets
from fetcher.clickup_fetcher import fetch_all_tasks, filter_and_format_tasks
from fetcher.embedder import embed_ticket_content
from fetcher.vector_store import search_similar_tickets
from llm.chatbot import get_openai_solution, chatbot_response
from llm.solution_generation import update_vector_database_with_closed_tickets
from fastapi.middleware.cors import CORSMiddleware
import logging
from typing import Optional, Dict,List

from PyPDF2 import PdfReader
from langchain.text_splitter import CharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import FAISS

app = FastAPI()

class Question(BaseModel):
    question: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

class UserQuery(BaseModel):
    ticket_id: str
    query: str
    project_key: str  

class ProjectKeyRequest(BaseModel):
    project_key: str

ticket_contexts: Dict[str, dict] = {}

vectorstore = None  


def get_pdf_text(pdf_files):
    text = ""
    for pdf in pdf_files:
        pdf_reader = PdfReader(pdf.file) 
        for page in pdf_reader.pages:
            text += page.extract_text() or ""  
    return text

def get_text_chunks(text):
    text_splitter = CharacterTextSplitter(
        separator="\n",
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.split_text(text)
    return chunks

def get_vectorstore(text_chunks):
    embeddings = OpenAIEmbeddings()  
    vectorstore = FAISS.from_texts(texts=text_chunks, embedding=embeddings)
    return vectorstore

@app.post("/process_pdf/")
async def process_pdf(pdf_files: List[UploadFile] = File(...)):
    raw_text = get_pdf_text(pdf_files)  
    text_chunks = get_text_chunks(raw_text)
    
    global vectorstore 
    vectorstore = get_vectorstore(text_chunks)

    return {"message": "PDFs processed successfully"}


@app.post("/tickets/open/jira")
async def get_open_tickets(request: ProjectKeyRequest):
    try:
        open_tickets = fetch_open_tickets(request.project_key)
        # update_vector_database_with_closed_tickets(request.project_key)
        ticket_list = [
            {
                "issue_key": ticket["Issue Key"],
                "title": ticket["Summary"],
                "description": ticket["Description"],
                "priority": ticket["Priority"],
                "platform": "JIRA",
                "projectKey": request.project_key,
                "issue_category": ticket["Category"],
                "issue_stats": ticket["Stats"],
                "Assignee": ticket["Assignee"],
                "DateTime": ticket["Time"],
            }
            for ticket in open_tickets
        ]
        return {"open_tickets": ticket_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching open tickets: {e}")

@app.post("/tickets/open/clickup")
async def get_open_clickup_tasks(request: ProjectKeyRequest):
    try:
        tasks = fetch_all_tasks(request.project_key)  
        open_tasks = filter_and_format_tasks(tasks, 'open') 
        # update_vector_database_with_closed_tickets(request.project_key)
        logging.info("Open Tasks: %s", open_tasks)

        ticket_list = [
            {
                "issue_key": task["Task Id"],
                "title": task["Task Name"],
                "description": task["Description"] if task["Description"] else "No description available",
                "priority": task["Priority"] if task["Priority"] else "No priority",
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
        selected_ticket = next((ticket for ticket in open_tickets if ticket["Issue Key"] == ticket_id), None)
        
        if not selected_ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
            
        ticket_embedding = embed_ticket_content(selected_ticket)
        similar_tickets = search_similar_tickets(ticket_embedding)
        similar_ticket_solutions = "\n".join(
            [
                f"Comments: {t['metadata'].get('Comments', 'N/A')}\nDescription: {t['metadata'].get('Description', 'N/A')}\nSummary: {t['metadata'].get('Summary', 'N/A')}"
                for t in similar_tickets if 'metadata' in t
            ]
        )

        initial_solution = get_openai_solution(selected_ticket, similar_ticket_solutions)
        
        ticket_contexts[ticket_id] = {
            'ticket_details': selected_ticket,
            'initial_solution': initial_solution,
            'similar_solutions': similar_ticket_solutions,
            'chat_history': []
        }
        
        return {
            "ticket": selected_ticket,
            "similar_ticket_solutions": similar_ticket_solutions,
            "initial_solution": initial_solution
        }
        
    except Exception as e:
        logging.error(f"Error generating solution: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tickets/chat")
async def chat_with_chatbot(user_query: UserQuery):
    try:
        ticket_context = ticket_contexts.get(user_query.ticket_id)
        
        if not ticket_context:
            raise HTTPException(
                status_code=400,
                detail="Please get an initial solution first using /tickets/solve endpoint"
            )

        pdf_context=""

        if vectorstore:
            retriever = vectorstore.as_retriever()
            similar_docs = retriever.get_relevant_documents(user_query.query) 
            
            pdf_context = "Context: " + " ".join([doc.page_content for doc in similar_docs]) + f"\nUser Question: {user_query.query}"
            
        response = chatbot_response(ticket_context, user_query.query, pdf_context)
        
        ticket_context['chat_history'].append(f"User: {user_query.query}")
        ticket_context['chat_history'].append(f"Assistant: {response}")
        
        if len(ticket_context['chat_history']) > 20:
            ticket_context['chat_history'] = ticket_context['chat_history'][-20:]
            
        return {"chatbot_response": response}
        
    except Exception as e:
        logging.error(f"Error in chatbot interaction: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


