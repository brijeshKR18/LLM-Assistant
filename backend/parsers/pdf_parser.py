import pdfplumber
import os
import re
import hashlib
from typing import Dict, List, Optional
from pathlib import Path

class EnhancedPDFParser:
    """Enhanced PDF parser with better text extraction and structure recognition."""
    
    def __init__(self):
        self.section_patterns = [
            r'^(?:Chapter|Section|Part)\s+\d+',
            r'^\d+\.\d*\s+[A-Z]',
            r'^[A-Z][A-Z\s]{10,}$',  # ALL CAPS headers
            r'^\d+\s+[A-Z]'
        ]
    
    def extract_text_with_structure(self, file_path: str) -> Optional[Dict]:
        """Extract text while preserving document structure."""
        try:
            with pdfplumber.open(file_path) as pdf:
                sections = []
                current_section = {"title": "Introduction", "content": "", "page_start": 1}
                
                for page_num, page in enumerate(pdf.pages, 1):
                    page_text = page.extract_text() or ""
                    
                    # Split page into lines for structure detection
                    lines = page_text.split('\n')
                    
                    for line in lines:
                        line = line.strip()
                        if not line:
                            continue
                        
                        # Check if line is a section header
                        if self._is_section_header(line):
                            # Save previous section
                            if current_section["content"].strip():
                                current_section["page_end"] = page_num - 1
                                sections.append(current_section.copy())
                            
                            # Start new section
                            current_section = {
                                "title": line,
                                "content": "",
                                "page_start": page_num
                            }
                        else:
                            current_section["content"] += line + "\n"
                
                # Add final section
                if current_section["content"].strip():
                    current_section["page_end"] = len(pdf.pages)
                    sections.append(current_section)
                
                # Create metadata
                metadata = self._create_enhanced_metadata(file_path, pdf, sections)
                
                # Combine all content
                full_content = "\n\n".join([
                    f"## {section['title']}\n{section['content']}" 
                    for section in sections
                ])
                
                return {
                    "content": full_content.strip(),
                    "metadata": metadata,
                    "sections": sections
                }
                
        except Exception as e:
            print(f"Error parsing PDF {file_path}: {e}")
            return None
    
    def _is_section_header(self, line: str) -> bool:
        """Determine if a line is likely a section header."""
        if len(line) < 5 or len(line) > 100:
            return False
        
        for pattern in self.section_patterns:
            if re.match(pattern, line):
                return True
        
        # Additional heuristics
        if (line.isupper() and len(line.split()) <= 8 and 
            not line.startswith(('HTTP', 'URL', 'API', 'JSON', 'XML'))):
            return True
        
        return False
    
    def _create_enhanced_metadata(self, file_path: str, pdf, sections: List[Dict]) -> Dict:
        """Create enhanced metadata with document analysis."""
        filename = os.path.basename(file_path)
        
        # Extract document type and context
        doc_type = self._identify_document_type(filename, sections)
        context = self._identify_context(filename, sections)
        
        # Extract key topics
        topics = self._extract_topics(sections)
        
        metadata = {
            "source": file_path,
            "filename": filename,
            "type": "pdf",
            "doc_type": doc_type,
            "context": context,
            "page_count": len(pdf.pages),
            "section_count": len(sections),
            "topics": topics,
            "content_hash": self._calculate_content_hash(sections),
            "processing_method": "enhanced",
            "sections": [
                {
                    "title": section["title"],
                    "page_start": section["page_start"],
                    "page_end": section.get("page_end", section["page_start"]),
                    "word_count": len(section["content"].split())
                }
                for section in sections
            ]
        }
        
        return metadata
    
    def _identify_document_type(self, filename: str, sections: List[Dict]) -> str:
        """Identify the type of document based on filename and content."""
        filename_lower = filename.lower()
        
        # Check filename patterns
        if "guide" in filename_lower or "tutorial" in filename_lower:
            return "guide"
        elif "manual" in filename_lower or "documentation" in filename_lower:
            return "manual"
        elif "reference" in filename_lower:
            return "reference"
        elif "student-guide" in filename_lower:
            return "course_material"
        elif "ebook" in filename_lower:
            return "ebook"
        
        # Analyze content patterns
        content_text = " ".join([section["content"] for section in sections]).lower()
        
        if "exercise" in content_text and "lab" in content_text:
            return "lab_guide"
        elif "command" in content_text and "example" in content_text:
            return "command_reference"
        elif "configuration" in content_text and "setup" in content_text:
            return "configuration_guide"
        
        return "documentation"
    
    def _identify_context(self, filename: str, sections: List[Dict]) -> str:
        """Identify the context/domain of the document."""
        filename_lower = filename.lower()
        content_text = " ".join([section["content"] for section in sections[:3]]).lower()  # First 3 sections
        
        # Check for specific technologies
        if any(term in filename_lower or term in content_text for term in 
               ["openshift", "ocp", "kubernetes", "k8s", "container"]):
            return "openshift_kubernetes"
        elif any(term in filename_lower or term in content_text for term in 
                 ["rhel", "red hat enterprise linux", "linux", "system administration"]):
            return "linux_administration"
        elif any(term in filename_lower or term in content_text for term in 
                 ["ansible", "automation", "playbook"]):
            return "automation"
        elif any(term in filename_lower or term in content_text for term in 
                 ["security", "selinux", "firewall", "encryption"]):
            return "security"
        elif any(term in filename_lower or term in content_text for term in 
                 ["network", "networking", "tcp", "ip", "routing"]):
            return "networking"
        
        return "general_it"
    
    def _extract_topics(self, sections: List[Dict]) -> List[str]:
        """Extract key topics from document sections."""
        topics = set()
        
        # Extract from section titles
        for section in sections:
            title_words = re.findall(r'\b[A-Z][a-z]+\b', section["title"])
            topics.update(word.lower() for word in title_words if len(word) > 3)
        
        # Extract from content (look for frequently mentioned technical terms)
        content_text = " ".join([section["content"] for section in sections])
        
        # Technical terms patterns
        tech_patterns = [
            r'\b[A-Z]{2,}\b',  # Acronyms
            r'\b\w+\.\w+\b',   # Commands with dots
            r'\b\w+://\w+',    # URLs/protocols
            r'\b\w+-\w+\b'     # Hyphenated terms
        ]
        
        for pattern in tech_patterns:
            matches = re.findall(pattern, content_text)
            topics.update(match.lower() for match in matches[:10])  # Limit to prevent noise
        
        return list(topics)[:20]  # Return top 20 topics
    
    def _calculate_content_hash(self, sections: List[Dict]) -> str:
        """Calculate hash of content for change detection."""
        content = "".join([section["content"] for section in sections])
        return hashlib.md5(content.encode()).hexdigest()[:16]

class EnhancedTextExtractor:
    """Enhanced text extraction for various file types."""
    
    def __init__(self):
        self.pdf_parser = EnhancedPDFParser()
    
    def extract_with_metadata(self, file_path: str) -> Optional[Dict]:
        """Extract text with enhanced metadata for any supported file type."""
        file_extension = Path(file_path).suffix.lower()
        
        if file_extension == '.pdf':
            return self.pdf_parser.extract_text_with_structure(file_path)
        
        # For other file types, use existing parsers with metadata enhancement
        return self._extract_other_formats(file_path)
    
    def _extract_other_formats(self, file_path: str) -> Optional[Dict]:
        """Extract text from non-PDF formats with enhanced metadata."""
        try:
            file_extension = Path(file_path).suffix.lower()
            filename = os.path.basename(file_path)
            
            # Read file content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Create enhanced metadata
            metadata = {
                "source": file_path,
                "filename": filename,
                "type": file_extension[1:],  # Remove the dot
                "size": len(content),
                "line_count": len(content.split('\n')),
                "word_count": len(content.split()),
                "content_hash": hashlib.md5(content.encode()).hexdigest()[:16],
                "processing_method": "enhanced"
            }
            
            # Add file-specific metadata
            if file_extension in ['.yaml', '.yml']:
                metadata["doc_type"] = "configuration"
                metadata["context"] = "kubernetes_config" if "kind:" in content else "general_config"
            elif file_extension == '.sh':
                metadata["doc_type"] = "script"
                metadata["context"] = "shell_automation"
            elif file_extension in ['.html', '.htm']:
                metadata["doc_type"] = "web_content"
                metadata["context"] = "documentation"
            
            return {
                "content": content,
                "metadata": metadata
            }
            
        except Exception as e:
            print(f"Error extracting {file_path}: {e}")
            return None

# Global enhanced extractor instance
_enhanced_extractor = EnhancedTextExtractor()

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

def parse_pdf_enhanced(file_path: str) -> Optional[Dict]:
    """Enhanced PDF parsing function."""
    parser = EnhancedPDFParser()
    return parser.extract_text_with_structure(file_path)

def parse_any_file_enhanced(file_path: str) -> Optional[Dict]:
    """Parse any supported file type with enhanced metadata."""
    return _enhanced_extractor.extract_with_metadata(file_path)

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