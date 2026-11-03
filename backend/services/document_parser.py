import PyPDF2
import io

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Reads raw PDF bytes and extracts all text content."""
    try:
        # Convert the raw bytes into a file-like object
        pdf_file = io.BytesIO(pdf_bytes)
        reader = PyPDF2.PdfReader(pdf_file)
        
        extracted_text = ""
        # Loop through every page and pull the text
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"
                
        return extracted_text.strip()
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return "Error parsing document."

def format_interview_context(resume_text: str, jd_text: str) -> str:
    """Formats the extracted text into a structured block for the AI prompt."""
    return f"""
    --- CANDIDATE CONTEXT ---
    RESUME:
    {resume_text}
    
    JOB DESCRIPTION:
    {jd_text}
    -------------------------
    """