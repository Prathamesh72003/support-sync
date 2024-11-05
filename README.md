# SupportSync 🚀

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![LangChain](https://img.shields.io/badge/LangChain-7289DA?style=for-the-badge&logo=langchain&logoColor=white)](https://www.langchain.com/)
[![Llama](https://img.shields.io/badge/Llama-4285F4?style=for-the-badge)](https://ai.meta.com/llama/)
[![Pinecone](https://img.shields.io/badge/Pinecone-339933?style=for-the-badge&logo=pinecone&logoColor=white)](https://www.pinecone.io/)


SupportSync is an AI-powered ticketing solution that streamlines issue resolution across multiple platforms. It leverages past solutions to provide intelligent, context-aware responses to new tickets.

![SupportSync Hero](https://i.ibb.co/cFB5VD9/image.png?height=400&width=800&text=SupportSync+Hero)

## 🌟 Features

- Support for multiple ticketing platforms: JIRA, ClickUp, and Salesforce
- AI-powered ticket resolution using Llama 3.2 90B model
- Context-aware solutions based on past resolved tickets
- Interactive chatbot for detailed issue discussions
- Unified platform for managing tickets from various sources
- Document attachment support: Users can attach documents for more personalized and accurate responses from the chatbot

## 📸 Screenshots

### Dashboard
![Dashboard](https://i.ibb.co/sK73597/image.png?height=300&width=600&text=Dashboard)

![Dashboard](https://i.ibb.co/FDC6N8P/image.png?height=300&width=600&text=Dashboard)

### Streamlined Open Issues/Tickets
![Ticket Resolution](https://i.ibb.co/GnD544t/image.png?height=300&width=600&text=Ticket+Resolution)

### TICKET RESOLUTION AND AI Chatbot
![AI Chatbot](https://i.ibb.co/2dDL8Z4/image.png?height=300&width=600&text=AI+Chatbot)

## 🚀 Getting Started

### Clone the Repository

```bash
git clone https://github.com/Prathamesh72003/support-sync.git
cd support-sync
```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd support-sync-backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure the `.env` file with the following variables:
   ```bash
   # JIRA
   JIRA_API_URL=your_jira_api_url
   JIRA_EMAIL=your_jira_email
   JIRA_API_TOKEN=your_jira_api_token
   JIRA_PROJECT_KEY=your_jira_project_key

   # OpenAI
   OPENAI_API_KEY=your_openai_api_key

   # Pinecone
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_ENV=your_pinecone_environment
   PINECONE_INDEX_NAME=your_pinecone_index_name
   VECTOR_DB_NAME=your_vector_db_name
   PINECONE_HOST=your_pinecone_host

   # GROQ
   GROQ_API_KEY=your_groq_api_key

   # Salesforce
   USERNAME=your_salesforce_username
   PASSWORD=your_salesforce_password
   SECURITY_TOKEN=your_salesforce_security_token
   CONSUMER_KEY=your_salesforce_consumer_key
   CONSUMER_SECRET=your_salesforce_consumer_secret

   # ClickUp
   CLICKUP_API_URL=your_clickup_api_url
   CLICKUP_API_TOKEN=your_clickup_api_token
   ```

5. Run the backend server:
   ```bash
   uvicorn api:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../support-sync-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the frontend development server:
   ```bash
   npm run dev
   ```

## 🐳 Docker Setup

If you prefer using Docker, follow these steps:

1. Ensure you have Docker and Docker Compose installed on your system.
2. Configure the `.env` file as mentioned in the Backend Setup section.
3. From the root directory, run:
   ```bash
   docker-compose up --build
   ```

4. Once the build is complete, you'll see the port number in the console where the application is running.

## 🎭 Usage

1. Access the SupportSync dashboard through your browser.
2. Connect your ticketing platforms (JIRA, ClickUp, Salesforce).
3. View and select tickets from the unified dashboard.
4. Click on a ticket to see the AI-generated solution.
5. Use the chatbot for more detailed discussions or clarifications.

![Usage Demo](https://i.ibb.co/2dDL8Z4/image.png?height=400&width=800&text=Usage+Demo)

## 🛠️ Technologies Used

- Backend: Python, FastAPI, LLMs (Llama 3.2 90B), VectorDB
- Frontend: Vite.js, Tailwind CSS, Framer Motion, shadcn/ui
- Database: Pinecone (Vector Database)
- AI: GROQ API (Llama 3.2 90B Text Preview Model)
- Containerization: Docker

## 🧠 How It Works

1. Ticket Collection: SupportSync gathers tickets from JIRA, ClickUp, and Salesforce.
2. Context Analysis: The system analyzes past solved tickets related to the current issue.
3. AI Solution Generation: Using the Llama 3.2 90B model, SupportSync generates a solution, considering the historical context.
4. Interactive Refinement: Users can further discuss the issue with the AI chatbot for more detailed solutions.

## 📝 Note

This project is designed for streamlining support processes. Please ensure you have the necessary permissions to access and process ticket data from the integrated platforms.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check [issues page](https://github.com/Prathamesh72003/support-sync/issues).

## 📜 License

This project is [MIT](https://choosealicense.com/licenses/mit/) licensed.
