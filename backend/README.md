# 🚀 AI-Powered Technical Interview Assistant

An advanced, real-time AI technical interview simulator featuring **Gemini Live (Multimodal WebSocket API)**, **Faster-Whisper (STT)**, **Pre-fetched GitHub Portfolio Interrogation**, and a responsive **React Glassmorphism UI**.

---

## 🛠️ Tech Stack
* **Frontend**: React, Vite, TailwindCSS (Glassmorphism UI)
* **Backend**: FastAPI, WebSockets, Google Generative AI (`Gemini 3.8-Live`), Faster-Whisper (`base.en` with Silero VAD)
* **Integration**: GitHub REST API (Auto-portfolio ingestion)

---

## ✨ Key Features
* **Real-Time Voice Interrogation**: Low-latency bidirectional audio streaming using Google's BidiGenerateContent WebSocket protocol.
* **Pre-Fetched GitHub Context**: Automatically ingests your public GitHub repositories, READMEs, and core code (`main.py`, `app.py`) during session initialization to quiz you on your actual code architecture.
* **Smart Speech-to-Text**: Built-in technical vocabulary tuning (BM25, HNSW, QLoRA, FastAPI, etc.) and auto-typo correction via Faster-Whisper.
* **Empathetic Mentor Persona**: Calm, supportive voice ("Kore" voice profile) equipped with a structured interview loop (Tutor mode, grading, and repetition support).

---

## ⚙️ Getting Started & Setup

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file inside the `backend/` directory:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

Run the FastAPI server:
```bash
python main.py
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```