import pdfplumber
import os
from .enhanced_parser import parse_pdf_enhanced

def parse_pdf(file_path):
    """Parse PDF files using enhanced parser with fallback."""
    try:
        # Try enhanced parsing first
        enhanced_result = parse_pdf_enhanced(file_path)
        if enhanced_result:
            return enhanced_result
        
        # Fallback to basic parsing
        return parse_pdf_basic(file_path)
    except Exception as e:
        print(f"Error parsing PDF {file_path}: {e}")
        return None

def parse_pdf_basic(file_path):
    """Basic PDF parsing for fallback."""
    try:
        with pdfplumber.open(file_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text() or ""
            
            # Enhanced metadata
            metadata = {
                "source": file_path,
                "type": "pdf",
                "context": "documentation" if "redhat" in file_path.lower() or "nutanix" in file_path.lower() else "project",
                "filename": os.path.basename(file_path),
                "page_count": len(pdf.pages),
                "processing_method": "basic"
            }
            
            return {"content": text.strip(), "metadata": metadata}
    except Exception as e:
        print(f"Error in basic PDF parsing {file_path}: {e}")
        return None