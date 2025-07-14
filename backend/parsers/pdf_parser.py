import pdfplumber
import os

def parse_pdf(file_path):
    """Parse PDF files using pdfplumber."""
    try:
        with pdfplumber.open(file_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text() or ""
            metadata = {
                "source": file_path,
                "type": "pdf",
                "context": "documentation" if "redhat" in file_path.lower() or "nutanix" in file_path.lower() else "project",
                "filename": os.path.basename(file_path)
            }
            return {"content": text.strip(), "metadata": metadata}
    except Exception as e:
        print(f"Error parsing PDF {file_path}: {e}")
        return None