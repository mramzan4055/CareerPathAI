# KaamYabi AI - Backend Developer Handoff Guide

Welcome to the KaamYabi AI Backend! This repository contains the FastAPI service powering the CV Parsing Module and the Job Fetching Module.

This guide is intended for frontend developers to successfully set up, understand, and integrate with the backend APIs.

---

## 1. Local Setup Instructions

Follow these steps to run the backend API on your local machine for testing.

### Prerequisites
- Python 3.9+ installed
- Git

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd <your-repo-directory>
   ```

2. **Create a Virtual Environment:**
   This isolates the project dependencies from your global python setup.
   ```bash
   python -m venv venv
   ```

3. **Activate the Virtual Environment:**
   - **Windows:**
     ```powershell
     .\venv\Scripts\activate
     ```
   - **macOS/Linux:**
     ```bash
     source venv/bin/activate
     ```

4. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Set up Environment Variables:**
   Create a `.env` file in the root directory (where `main.py` is located) by copying the template. See the Environment Variables section below for details.

6. **Run the FastAPI Server:**
   ```bash
   uvicorn main:app --reload
   ```
   The backend will now be running at `http://127.0.0.1:8000`.

---

## 2. Environment Variables Setup

You must create a `.env` file in the root folder with the following variables. Do **not** commit this file to version control.

```env
# Groq API for LLM Parsing
GROQ_API_KEY=gsk_your_groq_api_key_here

# Adzuna API for Job Fetching
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key

# Supabase Database Credentials (Optional depending on your immediate needs)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_supabase_anon_key
```
*(Note: Ask the backend lead for the actual keys during active development).*

---

## 3. API Documentation (Swagger UI)

FastAPI automatically generates interactive documentation. Once your server is running, simply navigate to:

👉 **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

From this interface, you can see all endpoints, their required data types, and you can even click **"Try it out"** to execute API calls directly from your browser without needing Postman!

---

## 4. Endpoint Summary

Here is a quick reference table of the available endpoints.

### 4.1 Health Check
Check if the API is online.
- **Method:** `GET`
- **Route:** `/`
- **Response (200 OK):**
  ```json
  {
    "status": "online",
    "message": "KaamYabi AI Backend is running!"
  }
  ```

### 4.2 Parse Resume (CV Module)
Extracts structured JSON data from a PDF resume using AI.
- **Method:** `POST`
- **Route:** `/api/v1/parser/resume`
- **Body / Form-Data:**
  - `file`: A `.pdf` file
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "extracted_data": {
      "name": "John Doe",
      "education": [
        {
          "degree": "BSc Computer Science",
          "institution": "University XYZ"
        }
      ],
      "skills": ["Python", "React", "FastAPI"],
      "experience": ["Developed a full-stack AI application."]
    }
  }
  ```
- **Expected Errors:**
  - `400 Bad Request`: If the file is not a PDF or cannot be parsed.
  - `502 Bad Gateway`: If the Groq API fails.

### 4.3 Find Cleaned Jobs (Job Module)
Fetches raw jobs from Adzuna and uses AI to clean and format the descriptions.
- **Method:** `GET`
- **Route:** `/jobs/find`
- **Query Parameters:**
  - `query` (string, default: "software engineer")
  - `location` (string, default: "us")
  - `results` (integer, default: 5)
  - *Example:* `/jobs/find?query=react%20developer&location=gb&results=3`
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "total_jobs": 3,
    "data": [
      {
        "job_title": "React Developer",
        "company": "Tech Corp",
        "location": "London",
        "clean_description": "We are looking for a react developer to build amazing interfaces..."
      }
    ]
  }
  ```
- **Expected Errors:**
  - `404 Not Found`: No jobs found for the specific query/location.
  - `500 Internal Server Error`: Adzuna or Groq API failure.

---

## 5. Frontend Integration Advice

As a frontend developer, keep the following best practices in mind when connecting to these APIs:

### 1. CORS (Cross-Origin Resource Sharing)
- The backend is currently configured to allow `["*"]` (all origins) for local development convenience. 
- You do not need to configure any special CORS headers in your frontend `fetch` or `axios` requests right now. 
- *Note: Before production deployment, we will lock the origins down to your exact frontend domain.*

### 2. Handling Async Loading States
- The endpoints `/api/v1/parser/resume` and `/jobs/find` both rely on external LLM inference (Groq). 
- **Important:** These requests might take anywhere from **2 to 6 seconds** to resolve. 
- You MUST implement strong UI loading indicators (spinners, skeleton loaders, or progress bars) while waiting for the promise to resolve so the user does not think the app froze.

### 3. File Uploads (Multipart Form Data)
- When uploading the resume, do not send it as JSON. Use the standard `FormData` browser API.
  ```javascript
  const formData = new FormData();
  formData.append("file", selectedPdfFile);
  
  await fetch("http://127.0.0.1:8000/api/v1/parser/resume", {
    method: "POST",
    body: formData // No Content-Type header needed; browser handles it
  });
  ```

### 4. Error Handling
- The backend utilizes standard HTTP status codes (`400`, `404`, `500`). Ensure your `try/catch` blocks catch non-200 responses and render an appropriate Toast or error message to the user (e.g., "Invalid PDF format" or "No jobs found").

### 5. Supabase
- The backend handles connecting to Supabase and logging/saving information securely. You don't need to implement Supabase directly in the frontend for *these specific workflows* unless you are querying the saved data directly later on.
