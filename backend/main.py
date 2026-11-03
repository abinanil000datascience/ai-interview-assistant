import os
import json
import base64
import asyncio
import websockets
import numpy as np
import httpx  
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from services.document_parser import extract_text_from_pdf, format_interview_context
from faster_whisper import WhisperModel

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY is missing from the .env file.")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

session_context = ""
github_portfolio_context = ""  

print("Loading Whisper Model...")
whisper_model = WhisperModel("base.en", device="cpu", compute_type="int8", cpu_threads=4)
print("Whisper Model loaded successfully.")

def process_audio_with_whisper(audio_array):
    technical_vocab = "BM25, HNSW, QLoRA, RAGAS, Llama-3, PyTorch, WSL2, L2 vector, jargon, synergy, hardware, inference, FastMCP, Docker, Jenkins"
    
    segments, _ = whisper_model.transcribe(
        audio_array, 
        beam_size=2, 
        initial_prompt=technical_vocab,
        condition_on_previous_text=False,
        vad_filter=True
    )
    return " ".join([segment.text for segment in segments]).strip()

# Pre-fetch GitHub repositories and core files during initialization to prevent mid-interview lag
async def fetch_full_github_portfolio(username: str) -> str:
    if not username:
        return "No GitHub username provided."
    
    print(f"Pre-fetching GitHub portfolio for '{username}'...")
    portfolio_text = "--- PRE-FETCHED GITHUB REPOSITORIES & CODE SNIPPETS ---\n"
    
    headers = {"User-Agent": "AI-Interviewer-App", "Accept": "application/vnd.github.v3+json"}
    raw_headers = {"User-Agent": "AI-Interviewer-App", "Accept": "application/vnd.github.v3.raw"}
    
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(f"https://api.github.com/users/{username}/repos", headers=headers)
            if resp.status_code != 200:
                return f"Could not fetch repositories for {username} (HTTP {resp.status_code})"
            
            repos = resp.json()
            for repo in repos[:6]:
                repo_name = repo.get("name")
                description = repo.get("description", "No description")
                language = repo.get("language", "Unknown")
                portfolio_text += f"\nRepository: {repo_name} | Language: {language} | Description: {description}\n"
                
                for target_file in ["README.md", "main.py", "app.py"]:
                    file_url = f"https://api.github.com/repos/{username}/{repo_name}/contents/{target_file}"
                    file_resp = await client.get(file_url, headers=raw_headers)
                    if file_resp.status_code == 200:
                        snippet = file_resp.text[:1500] 
                        portfolio_text += f"--- File: {target_file} in {repo_name} ---\n{snippet}\n"
                        break 
                        
        print("GitHub portfolio pre-fetched successfully!")
        return portfolio_text
    except Exception as e:
        print(f"Error pre-fetching GitHub portfolio: {e}")
        return f"Error loading GitHub portfolio: {str(e)}"

@app.post("/upload-context")
async def upload_context(resume: UploadFile = File(...), jd: str = Form(...), github_username: str = Form(default="")):
    global session_context
    global github_portfolio_context
    
    clean_username = github_username.strip()
    
    if clean_username:
        github_portfolio_context = await fetch_full_github_portfolio(clean_username)
    else:
        github_portfolio_context = "No GitHub profile linked."
    
    resume_bytes = await resume.read()
    resume_text = extract_text_from_pdf(resume_bytes)
    session_context = format_interview_context(resume_text, jd)
    
    return {"message": "Context and GitHub portfolio uploaded successfully.", "jd_length": len(jd)}

GEMINI_WS_URL = f"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={API_KEY}"

@app.websocket("/ws/interview")
async def interview_proxy(client_ws: WebSocket):
    await client_ws.accept()
    print("Frontend connected to WebSocket.")

    async with websockets.connect(GEMINI_WS_URL, ping_interval=20, ping_timeout=20) as gemini_ws:
        
        system_instruction = f"""
        You are an elite, highly empathetic, but STRICT technical interviewer and mentor. 
        You specialize in the domain of the provided resume, job description, and the candidate's pre-loaded GitHub portfolio code.
        
        CRITICAL PERSONA & LANGUAGE RULE (AUTHENTICITY):
        - Speak softly, calmly, and with deep empathy. Act like a supportive human peer.
        - Speak STRICTLY in professional English. Do NOT use casual Malayalam filler words. Only use Malayalam if explicitly requested by the candidate.
        
        INTERACTIVE LISTENING & ADAPTABILITY:
        - Always listen carefully to what the candidate wants. If they interrupt the interview flow to ask a question, request a change of topic, or ask you to inspect their GitHub code/logic, use the pre-loaded repository data below to answer them immediately and fluidly without going silent.
        
        CRITICAL TYPO RULE: The candidate is using a speech-to-text tool. Mentally auto-correct minor typos (e.g., "BMQ" for BM25). 
        
        CRITICAL INTERVIEW LOOP:
        1. FIRST RESPONSE: Your very first response must briefly introduce yourself and immediately ask the first technical question based on their resume or GitHub code.
        2. EVALUATION OR REPETITION: 
           - IF the candidate asks you to repeat, say "Of course!" and repeat it clearly and warmly.
           - IF the candidate says they don't know or asks for help, DO NOT grade them as incorrect; switch to "Tutor Mode" and teach them the concept step-by-step.
           - IF the candidate answers, explicitly state: "That is correct.", "That is partially correct.", or "That is incorrect."
        3. ASSESS & CORRECT: Explain WHY gently but firmly. 
        4. ADVANCE THE INTERVIEW: End your turn by asking ONE new technical question based on their resume, job description, or pre-loaded GitHub code.
        5. MEMORY: The interviewer must remember every detail of the full interview right from the beginning.
        6. CONTEXT FOCUS: Focus heavily on asking questions from both the candidate's resume, the job description, and their code architecture.
        
        Candidate Resume & Job Description Context:
        {session_context}
        
        Pre-Loaded GitHub Repository Portfolio & Code Snippets:
        {github_portfolio_context}
        """

        setup_message = {
            "setup": {
                "model": "models/gemini-3.8-live", 
                "systemInstruction": {
                    "parts": [{"text": system_instruction}]
                },
                "generationConfig": {
                    "responseModalities": ["AUDIO"],
                    "speechConfig": {
                        "voiceConfig": {
                            "prebuiltVoiceConfig": {"voiceName": "Kore"} 
                        }
                    }
                }
            }
        }

        # 1. Send Setup
        await gemini_ws.send(json.dumps(setup_message))

        # 2. Synchronously wait for setupComplete to guarantee stable handshake
        print("Waiting for Gemini setup confirmation...")
        while True:
            raw_msg = await gemini_ws.recv()
            msg = json.loads(raw_msg)
            if "setupComplete" in msg:
                print("Setup complete received!")
                break
                
        # 3. Send initial greeting
        print("Sending initial greeting...")
        initial_prompt = {
            "clientContent": {
                "turns": [
                    {
                        "role": "user",
                        "parts": [{"text": "Hello! I am connected and ready. Please introduce yourself briefly and ask the first technical question based on my resume or GitHub projects."}]
                    }
                ],
                "turnComplete": True
            }
        }
        await gemini_ws.send(json.dumps(initial_prompt))

        transcription_lock = asyncio.Lock()

        async def client_to_gemini():
            audio_buffer = bytearray()
            try:
                while True:
                    message = await client_ws.receive()
                    
                    if message.get("bytes"):
                        audio_buffer.extend(message["bytes"])
                        
                    elif message.get("text"):
                        text_data = message["text"]
                        try:
                            parsed_data = json.loads(text_data)
                            if parsed_data.get("type") == "audio_end":
                                if len(audio_buffer) > 0:
                                    buffer_copy = bytearray(audio_buffer)
                                    audio_buffer.clear()
                                    
                                    async def handle_transcription(b_copy):
                                        async with transcription_lock:
                                            try:
                                                if len(b_copy) % 2 != 0:
                                                    b_copy = b_copy[:-1]
                                                    
                                                audio_np = np.frombuffer(b_copy, dtype=np.int16).astype(np.float32) / 32768.0
                                                print("\nTranscribing with Whisper...")
                                                transcript = await asyncio.to_thread(process_audio_with_whisper, audio_np)
                                                print(f"Whisper output: {transcript}")
                                                
                                                final_text = transcript if transcript else "I am ready. What is next?"
                                                gemini_msg = {
                                                    "clientContent": {
                                                        "turns": [{"role": "user", "parts": [{"text": final_text}]}],
                                                        "turnComplete": True
                                                    }
                                                }
                                                await gemini_ws.send(json.dumps(gemini_msg))
                                            except Exception as e:
                                                print(f"Transcription Error: {e}")
                                                error_msg = {
                                                    "clientContent": {
                                                        "turns": [{"role": "user", "parts": [{"text": "Could you please repeat that? My audio failed to parse."}]}],
                                                        "turnComplete": True
                                                    }
                                                }
                                                await gemini_ws.send(json.dumps(error_msg))
                                            
                                    asyncio.create_task(handle_transcription(buffer_copy))
                            else:
                                await gemini_ws.send(text_data)
                        except json.JSONDecodeError:
                            await gemini_ws.send(text_data)
                            
            except Exception as e:
                print(f"Frontend disconnected: {e}")

        async def gemini_to_client():
            try:
                async for message in gemini_ws:
                    response = json.loads(message)
                    
                    if "serverContent" in response:
                        model_turn = response["serverContent"].get("modelTurn", {})
                        if model_turn:
                            parts = model_turn.get("parts", [])
                            for part in parts:
                                if "text" in part:
                                    print(f"\n[Gemini Internal Text]: {part['text']}")
                                
                                elif "inlineData" in part:
                                    b64_audio = part["inlineData"]["data"]
                                    await client_ws.send_bytes(base64.b64decode(b64_audio))

            except websockets.exceptions.ConnectionClosed as e:
                print(f"Gemini API connection closed: {e.code} - {e.reason}")
            except Exception as e:
                print(f"Unexpected error in Gemini stream: {e}")
                        
        client_task = asyncio.create_task(client_to_gemini())
        gemini_task = asyncio.create_task(gemini_to_client())

        done, pending = await asyncio.wait(
            [client_task, gemini_task],
            return_when=asyncio.FIRST_COMPLETED
        )

        for task in pending:
            task.cancel()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)