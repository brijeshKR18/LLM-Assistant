from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
from backend.parsers.pdf_parser import parse_pdf, parse_pdf_enhanced, parse_any_file_enhanced
from backend.parsers.yaml_parser import parse_yaml
from backend.parsers.shell_parser import parse_shell_script
from backend.parsers.html_parser import parse_html
from backend.parsers.oc_parser import run_oc_explain, detect_and_run_oc_commands, oc_handler
from backend.vector_store.faiss_store import create_vector_store
from backend.vector_store.optimized_retrieval import create_optimized_vector_store
from backend.services.web_search import HybridKnowledgeSystem
from langchain_ollama import OllamaLLM
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.docstore.document import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
import os
import re
import time
from pathlib import Path
import json
import logging
from pythonjsonlogger import jsonlogger
import spacy
import requests

# Configuration Constants
NAS_PATH = "nas_data"
# For faster responses, consider switching to a smaller model:
# LLM_MODEL = "phi3:mini"      # 3.8B params - much faster
# LLM_MODEL = "gemma2:2b"      # 2B params - very fast
LLM_MODEL = "mistral:instruct"  # Current model
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
FAISS_INDEX_PATH = "faiss_index" 
GREETINGS_CONFIG_PATH = "config/greetings.json"

# Import optimized configurations with fallback
# try:
#     from backend.config.llm_config import LLM_CONFIGS
#     from backend.config.performance_config import FAST_LLM_CONFIGS
# except ImportError:
try:
    from backend.config.llm_config import LLM_CONFIGS
    from backend.config.performance_config import FAST_LLM_CONFIGS
except ImportError:
    # Fallback configuration if module not available
    FAST_LLM_CONFIGS = {
        "mistral:instruct": {
            "temperature": 0.3,
            "top_k": 20,
            "top_p": 0.9,
            "num_ctx": 4096,     # Reduced for speed
            "repeat_penalty": 1.1,
            "num_predict": 256,  # Reduced for speed
        }
    }
    LLM_CONFIGS = {
        "mistral:instruct": {
            "temperature": 0.2,
            "top_k": 30,
            "top_p": 0.8,
            "num_ctx": 8192,
            "repeat_penalty": 1.1,
            "num_predict": 512
        },
        "llama3.1:8b": {
            "temperature": 0.1,
            "top_k": 25,
            "top_p": 0.85,
            "num_ctx": 16384,
            "repeat_penalty": 1.05,
            "num_predict": 1024
        }
    }

router = APIRouter()

# Initialize logging
LOG_DIR = "logs"
LOG_FILE = os.path.join(LOG_DIR, "app.log")
os.makedirs(LOG_DIR, exist_ok=True)
logger = logging.getLogger("ConfigGuidanceAPI")
logger.setLevel(logging.INFO)
file_handler = logging.FileHandler(LOG_FILE)
file_handler.setFormatter(jsonlogger.JsonFormatter())
logger.addHandler(file_handler)

# Initialize spaCy
nlp = spacy.load("en_core_web_sm")

# Load greetings configuration
with open(GREETINGS_CONFIG_PATH, 'r') as f:
    greetings_config = json.load(f)
if isinstance(greetings_config, dict) and "greetings" in greetings_config:
    greetings_config = greetings_config["greetings"]

# Initialize global variables
parsed_data = []
vector_store = None
qa_chain = None
hybrid_system = None  # Add hybrid system

# Chat session management
chat_sessions = {}  # Store chat-specific contexts and files
session_vector_stores = {}  # Store vector stores per chat session

def is_greeting(query):
    """Check if the query is a greeting using spaCy and config patterns."""
    query = query.strip().lower()
    doc = nlp(query)
    
    if len(doc) <= 3:  
        for token in doc:
            if token.lemma_ in ["hi", "hello", "hey", "yo", "hola", "greetings", "salut", "ciao", "good"]:
                return greetings_config[0]["response"]
    
    # Check configured greeting patterns
    for greeting in greetings_config:
        pattern = greeting["pattern"]
        if re.match(pattern, query, re.IGNORECASE):
            response = greeting["response"]
            # Replace {time_of_day} for time-based greetings
            if "{time_of_day}" in response:
                match = re.match(pattern, query, re.IGNORECASE)
                time_of_day = match.group(1) if match and match.lastindex else "day"
                response = response.replace("{time_of_day}", time_of_day)
            return response
    
    return None

def process_nas_files():
    """Process all files in the NAS directory with enhanced directory structure support."""
    global parsed_data
    parsed_data = []
    if not os.path.exists(NAS_PATH):
        print(f"NAS directory {NAS_PATH} not found.")
        logger.warning({"message": f"NAS directory {NAS_PATH} not found"})
        return
    
    # Track processing statistics
    file_stats = {
        "pdf": 0,
        "yaml": 0, 
        "shell": 0,
        "html": 0,
        "skipped": 0,
        "directories": set(),
        "total_files": 0
    }
    
    logger.info({"message": "Starting NAS directory processing", "path": NAS_PATH})
    
    for root, dirs, files in os.walk(NAS_PATH):
        if files:  # Only log directories that contain files
            relative_path = os.path.relpath(root, NAS_PATH)
            file_stats["directories"].add(relative_path)
            logger.info({"message": f"Processing directory: {relative_path}", "file_count": len(files)})
        
        for file in files:
            file_path = os.path.join(root, file)
            relative_dir = os.path.relpath(root, NAS_PATH)
            file_stats["total_files"] += 1
            
            # Add directory context to metadata for better organization
            result = None
            base_metadata = {
                "source": file_path,
                "directory": relative_dir,
                "filename": file,
                "file_type": None
            }
            
            try:
                if file.endswith(".pdf"):
                    result = parse_pdf(file_path)
                    file_stats["pdf"] += 1
                    base_metadata["file_type"] = "pdf"
                elif file.endswith((".yaml", ".yml")):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        result = parse_yaml(f.read())
                    file_stats["yaml"] += 1
                    base_metadata["file_type"] = "yaml"
                elif file.endswith(".sh"):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        result = parse_shell_script(f.read())
                    file_stats["shell"] += 1
                    base_metadata["file_type"] = "shell"
                elif file.endswith((".html", ".htm")):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        result = parse_html(f.read())
                    file_stats["html"] += 1
                    base_metadata["file_type"] = "html"
                else:
                    file_stats["skipped"] += 1
                    logger.debug({"message": f"Skipped unsupported file: {file}", "directory": relative_dir})
                    continue
                
                if result:
                    # Enhance result metadata with directory information
                    if hasattr(result, 'metadata'):
                        result.metadata.update(base_metadata)
                    else:
                        result.metadata = base_metadata
                    parsed_data.append(result)
                    
            except Exception as e:
                logger.error({
                    "message": f"Failed to process file: {file}", 
                    "directory": relative_dir,
                    "error": str(e)
                })
                file_stats["skipped"] += 1
    
    # Enhanced logging with detailed statistics
    logger.info({
        "message": f"Completed NAS directory processing",
        "total_files_found": file_stats["total_files"],
        "successfully_processed": len(parsed_data),
        "pdf_files": file_stats["pdf"],
        "yaml_files": file_stats["yaml"],
        "shell_files": file_stats["shell"],
        "html_files": file_stats["html"],
        "skipped_files": file_stats["skipped"],
        "directories_processed": len(file_stats["directories"]),
        "directory_list": sorted(list(file_stats["directories"]))
    })
    
    print(f"Successfully processed {len(parsed_data)} files from {len(file_stats['directories'])} directories in NAS")
    return parsed_data

# Initialize LLM with optimized configuration for speed
try:
    # Use fast config for better response times
    model_config = FAST_LLM_CONFIGS.get(LLM_MODEL, FAST_LLM_CONFIGS["mistral:instruct"])
    
    llm = OllamaLLM(
        model=LLM_MODEL,
        base_url="http://localhost:11434",
        **model_config,
        system="You are an AI assistant that ONLY uses the provided document context to answer questions. You do NOT have access to the internet, current events, or any external information beyond what is explicitly provided in the context. If the provided documents do not contain sufficient information to answer a question, you must clearly state that you cannot answer based on the available information."
    )
    logger.info({"message": f"Initialized optimized LLM with model: {LLM_MODEL}", "config": model_config})
except Exception as e:
    logger.error({"message": f"Failed to initialize global LLM: {LLM_MODEL}", "error": str(e)})
    llm = None

# Initialize vector store with NAS data
index_file = Path(FAISS_INDEX_PATH) / "index.faiss"
if index_file.exists():
    embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    vector_store = FAISS.load_local(FAISS_INDEX_PATH, embeddings=embedding_model, allow_dangerous_deserialization=True)
    logger.info({"message": f"Loaded existing FAISS index from {FAISS_INDEX_PATH}"})
else:
    process_nas_files()
    if parsed_data:
        vector_store = create_vector_store(parsed_data)
        # vector_store = create_optimized_vector_store(parsed_data)
        logger.info({"message": f"Created new FAISS index with {len(parsed_data)} documents"})
    else:
        print("No initial data to create vector store. Upload files to initialize.")
        logger.warning({"message": "No initial data to create vector store. Queries require file uploads"})

# Initialize QA chain with offline LLM if vector store exists
if vector_store and llm:
    try:
        # Offline-only prompt template with enhanced formatting
        offline_prompt_template = """You are an AI assistant that ONLY uses the provided context to answer questions.

STRICT RULES:
1. You do NOT have access to the internet or any external information
2. You can ONLY use information from the context provided below
3. If the context doesn't contain the answer, say "I cannot answer this question based on the provided documents"
4. Do NOT use your general knowledge or training data
5. Always cite which document or source your answer comes from
6. You answer the prompt by combining the provided context and the information you get by indexing vector store

FORMATTING GUIDELINES:
- Use clear, numbered steps for procedures (1., 2., 3., etc.)
- Use bullet points (•) for lists of items or features
- Use proper headings with **bold text** for sections
- Format code blocks with triple backticks (```)
- Use line breaks between different sections for readability
- Number multi-step processes clearly and consistently
- Format commands with proper indentation and syntax

Context: {context}

Question: {question}

Answer based ONLY on the provided context (use proper formatting with numbered steps, bullet points, and clear structure):"""

        OFFLINE_PROMPT = PromptTemplate(
            template=offline_prompt_template,
            input_variables=["context", "question"]
        )
        
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vector_store.as_retriever(search_kwargs={"k": 3}),  # Reduced from 5 for speed
            return_source_documents=True,
            chain_type_kwargs={"prompt": OFFLINE_PROMPT}
        )
        logger.info({"message": "Initialized offline QA chain"})
        
        # Initialize hybrid knowledge system
        hybrid_system = HybridKnowledgeSystem(vector_store, qa_chain)
        logger.info({"message": "Initialized hybrid knowledge system with web search capability"})
        
    except Exception as e:
        logger.warning({"message": "Failed to initialize QA chain with custom prompt, using default", "error": str(e)})
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vector_store.as_retriever(search_kwargs={"k": 3}),  # Reduced from 5 for speed
            return_source_documents=True
        )

@router.get("/")
def read_root():
    return {"message": "Hello from FastAPI"}

class QueryInput(BaseModel):
    query: str
    model: str = "mistral:instruct"
    filename: str = None
    chat_id: str = None  # Add chat session ID
    conversation_history: list = []  # Add conversation history  
    use_web_search: bool = True  # Enable/disable web search
    trusted_sites_only: bool = True  # Limit to trusted sites  

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Save uploaded file to a temp directory with enhanced validation."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Validate file type
    allowed_extensions = {'.pdf', '.yaml', '.yml', '.sh', '.html', '.htm'}
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type: {file_ext}. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size (10MB limit)
    max_size = 10 * 1024 * 1024  # 10MB
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB")
    
    if len(file_content) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")
    
    try:
        temp_dir = "tmp_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        
        # Sanitize filename to prevent path traversal
        safe_filename = os.path.basename(file.filename)
        file_path = os.path.join(temp_dir, safe_filename)
        
        # Write file
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        logger.info({
            "message": "File uploaded successfully", 
            "filename": safe_filename, 
            "size": len(file_content),
            "type": file_ext
        })
        
        return {
            "message": f"File {safe_filename} uploaded successfully",
            "filename": safe_filename,
            "size": len(file_content),
            "type": file_ext
        }
        
    except Exception as e:
        logger.error({"message": f"Failed to upload file: {file.filename}", "error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to save uploaded file")

@router.post("/hybrid-query")
async def hybrid_query_llm(input: QueryInput):
    """Handle queries using hybrid local + web knowledge."""
    global hybrid_system
    
    if not hybrid_system:
        raise HTTPException(status_code=503, detail="Hybrid knowledge system not initialized")
    
    query = input.query.strip()
    use_web = input.use_web_search
    
    logger.info({
        "message": "Received hybrid query",
        "query": query[:100],
        "use_web_search": use_web
    })
    
    try:
        if use_web:
            # Get hybrid results (local + web)
            hybrid_result = hybrid_system.hybrid_search(query)
            
            # Create enhanced prompt for hybrid context with better formatting
            hybrid_prompt = f"""You are an AI assistant with access to both local documentation and current web information from trusted sources.

INSTRUCTIONS:
1. Use both local knowledge and web information to provide comprehensive answers
2. Prioritize information from official documentation and trusted sources
3. If there are conflicts between sources, explain the differences
4. Provide the most current and accurate information available
5. Give clear, professional responses without indicating the source type in your answer

FORMATTING REQUIREMENTS:
• Use numbered lists (1., 2., 3.) for step-by-step procedures
• Use bullet points (•) for feature lists or requirements
• Format commands in code blocks with proper syntax highlighting
• Use **bold** for important concepts or section headers
• Use clear paragraph breaks between different topics
• Number complex procedures with consistent formatting
• Indent sub-steps with proper hierarchy (1.1, 1.2, etc.)
• Format file paths and configurations clearly

CONTEXT:
{hybrid_result['context']}

QUESTION: {query}

COMPREHENSIVE ANSWER:"""

            # Use the existing LLM to process hybrid context
            from backend.config.performance_config import FAST_LLM_CONFIGS
            
            model_config = FAST_LLM_CONFIGS.get("mistral:instruct", {})
            
            llm_instance = OllamaLLM(
                model="mistral:instruct",
                base_url="http://localhost:11434",
                **model_config,
                system="You are an expert AI assistant with access to both local documentation and current web information. Always format your responses professionally with numbered procedures (1., 2., 3.), bullet points (•) for lists, code blocks with triple backticks (```), and **bold** for important concepts. Structure your answers clearly with proper paragraph breaks and logical organization."
            )
            
            response = llm_instance.invoke(hybrid_prompt)
            
            return {
                "response": response,
                "sources": hybrid_result['sources'],
                "has_local_knowledge": hybrid_result['has_local'],
                "has_web_knowledge": hybrid_result['has_web'],
                "search_type": "hybrid",
                "timestamp": time.time()
            }
        else:
            # Fall back to local-only search
            local_result = hybrid_system.get_local_results(query)
            # Structure local sources properly
            local_sources = []
            for src in local_result['sources']:
                source_path = src.get('source', 'Unknown')
                # Extract just the filename from the full path
                filename = source_path.split('/')[-1] if '/' in source_path else source_path.split('\\')[-1]
                local_sources.append({
                    "type": "local",
                    "filename": filename,
                    "resource": filename
                })
            
            return {
                "response": local_result['answer'],
                "sources": local_sources,
                "has_local_knowledge": bool(local_result['answer']),
                "has_web_knowledge": False,
                "search_type": "local_only"
            }
            
    except Exception as e:
        logger.error({"message": "Hybrid query failed", "error": str(e)})
        raise HTTPException(status_code=500, detail=f"Hybrid query processing failed: {str(e)}")

@router.get("/test-redhat-search")
async def test_redhat_search():
    """Test endpoint to verify Red Hat docs search functionality with specific URLs."""
    try:
        if not hybrid_system:
            return {"status": "error", "message": "Hybrid system not initialized"}
        
        # Test query
        test_query = "OpenShift post installation configuration"
        categories = hybrid_system.web_search.determine_website_category(test_query)
        search_urls = hybrid_system.web_search.build_search_urls(test_query, categories)
        
        # Test fetching from one URL
        sample_results = []
        for url in search_urls[:2]:  # Test first 2 URLs
            try:
                result = hybrid_system.web_search.fetch_page_content(url)
                if result:
                    sample_results.append({
                        "url": result["url"],
                        "title": result["title"],
                        "doc_type": result.get("doc_type", "Unknown"),
                        "content_length": len(result["content"]),
                        "success": True
                    })
                else:
                    sample_results.append({
                        "url": url,
                        "success": False,
                        "reason": "No content extracted"
                    })
            except Exception as e:
                sample_results.append({
                    "url": url,
                    "success": False,
                    "reason": str(e)
                })
        
        return {
            "status": "success",
            "test_query": test_query,
            "categories_detected": categories,
            "search_urls": search_urls,
            "sample_results": sample_results,
            "documentation_urls": {
                "openshift_postinstall": "https://docs.redhat.com/en/documentation/openshift_container_platform/4.19/html/postinstallation_configuration/index",
                "openshift_virtualization": "https://docs.redhat.com/en/documentation/openshift_container_platform/4.19/html/virtualization/index",
                "rhel_installation": "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/interactively_installing_rhel_from_installation_media/index",
                "ansible_automation": "https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.5"
            },
            "message": f"Using specific Red Hat documentation URLs instead of generic searches"
        }
    except Exception as e:
        logger.error({"message": "Red Hat search test failed", "error": str(e)})
        return {
            "status": "error", 
            "message": f"Test failed: {str(e)}",
            "suggestion": "Check if internet connection is available and Red Hat documentation URLs are accessible"
        }

@router.post("/query")
async def query_llm(input: QueryInput):
    """Handle configuration queries with enhanced robustness and chat session isolation."""
    global vector_store, qa_chain, parsed_data, chat_sessions, session_vector_stores

    query = input.query.strip()
    model = input.model
    filename = input.filename
    chat_id = input.chat_id or "default"  # Use default if no chat_id provided
    conversation_history = input.conversation_history or []
    
    logger.info({
        "message": "Received query", 
        "query": query, 
        "model": model, 
        "filename": filename,
        "chat_id": chat_id,
        "conversation_length": len(conversation_history)
    })
    
    # Initialize chat session if it doesn't exist
    if chat_id not in chat_sessions:
        chat_sessions[chat_id] = {
            "files": [],  # Files uploaded in this chat session
            "context": [],  # Additional context for this session
            "created_at": json.dumps({"timestamp": "now"}),  # For cleanup purposes
        }

    # Handle greetings first
    greeting_response = is_greeting(query)
    if greeting_response:
        logger.info({"message": "Detected greeting", "query": query, "response": greeting_response})
        # Clear temp files even for greetings
        try:
            await _clear_temp_files()
        except Exception as e:
            logger.warning({"message": "Failed to clear temp files for greeting", "error": str(e)})
        return {
            "answer": greeting_response,
            "sources": []
        }

    # Validate model
    SUPPORTED_MODELS = ["mistral:instruct", "llama3.1:8b"]
    if model not in SUPPORTED_MODELS:
        logger.error({"message": f"Unsupported model selected: {model}"})
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid model: {model}. Supported models: {', '.join(SUPPORTED_MODELS)}"
        )

    try:
        # Query Classification and Optimization Functions
        from enum import Enum

        class QueryType(Enum):
            TECHNICAL_CONFIG = "technical_config"
            TROUBLESHOOTING = "troubleshooting"
            CODE_ANALYSIS = "code_analysis"
            GENERAL_INFO = "general_info"
            COMPARISON = "comparison"
            STEP_BY_STEP = "step_by_step"

        class QueryClassifier:
            """Simple query classifier for optimized processing."""
            
            @staticmethod
            def classify_query(query: str) -> QueryType:
                """Classify query type based on keywords and patterns."""
                query_lower = query.lower()
                
                # Technical configuration keywords
                if any(word in query_lower for word in ["configure", "config", "setup", "install", "deploy", "create"]):
                    return QueryType.TECHNICAL_CONFIG
                
                # Troubleshooting keywords
                if any(word in query_lower for word in ["error", "problem", "issue", "fix", "debug", "troubleshoot", "fails", "not working"]):
                    return QueryType.TROUBLESHOOTING
                
                # Code analysis keywords
                if any(word in query_lower for word in ["code", "script", "command", "analyze", "explain", "review"]):
                    return QueryType.CODE_ANALYSIS
                
                # Comparison keywords
                if any(word in query_lower for word in ["compare", "difference", "vs", "versus", "better", "prefer"]):
                    return QueryType.COMPARISON
                
                # Step-by-step keywords
                if any(word in query_lower for word in ["how to", "step by step", "guide", "tutorial", "process"]):
                    return QueryType.STEP_BY_STEP
                
                return QueryType.GENERAL_INFO

        def enhance_context_with_metadata(documents, query_type):
            """Enhance document context with metadata based on query type."""
            if not documents:
                return ""
            
            enhanced_context = []
            for doc in documents:
                # Add document source information
                source = getattr(doc, 'metadata', {}).get('source', 'Unknown')
                page = getattr(doc, 'metadata', {}).get('page', 'N/A')
                
                context_block = f"[Source: {source}, Page: {page}]\n{doc.page_content}\n"
                enhanced_context.append(context_block)
            
            return "\n---\n".join(enhanced_context)

        def optimize_response_quality(query, source_documents, response):
            """Simple response quality optimization."""
            quality_metrics = {
                "has_sources": len(source_documents) > 0,
                "response_length": len(response),
                "includes_examples": "example" in response.lower() or "for instance" in response.lower(),
                "includes_commands": any(char in response for char in ["$", "#", "oc ", "kubectl"]),
                "confidence_score": 0.8  # Default confidence
            }
            
            # Calculate overall quality score
            score = sum([
                quality_metrics["has_sources"] * 0.3,
                (quality_metrics["response_length"] > 100) * 0.2,
                quality_metrics["includes_examples"] * 0.2,
                quality_metrics["includes_commands"] * 0.3
            ])
            
            quality_metrics["overall_score"] = min(score, 1.0)
            return quality_metrics
        
        # Classify query type for optimized parameters
        query_type = QueryClassifier.classify_query(query).value
        
        # Get fast configuration for speed optimization
        try:
            base_config = FAST_LLM_CONFIGS.get(model, FAST_LLM_CONFIGS["mistral:instruct"])
        except (NameError, KeyError):
            # Fallback to regular config if fast config not available
            base_config = LLM_CONFIGS.get(model, LLM_CONFIGS["mistral:instruct"])
        
        # Speed-optimized adjustments - allow more tokens for better formatting
        query_adjustments = {
            "technical_config": {"num_predict": 400, "num_ctx": 3072},
            "troubleshooting": {"num_predict": 450, "num_ctx": 3072}, 
            "code_analysis": {"num_predict": 350, "num_ctx": 2048},
            "comparison": {"num_predict": 500, "num_ctx": 3072},
            "step_by_step": {"num_predict": 600, "num_ctx": 3072},  # More tokens for detailed steps
            "general_info": {"num_predict": 400, "num_ctx": 3072}
        }
        
        # Apply query-specific adjustments
        optimized_config = base_config.copy()
        if query_type in query_adjustments:
            optimized_config.update(query_adjustments[query_type])
        
        # Initialize LLM with optimized configuration and enhanced formatting system prompt
        llm_instance = OllamaLLM(
            model=model,
            base_url="http://localhost:11434",
            **optimized_config,
            system="You are an AI assistant that ONLY uses the provided document context to answer questions. You do NOT have access to the internet, current events, or any external information beyond what is explicitly provided in the context. If the provided documents do not contain sufficient information, clearly state you cannot answer based on available information. IMPORTANT: Always format your responses with proper structure - use numbered lists (1., 2., 3.) for procedures, bullet points (•) for lists, code blocks with triple backticks (```), and **bold** for important concepts. Make your responses well-organized and easy to read."
        )
        logger.info({"message": f"Initialized optimized LLM", "model": model, "query_type": query_type, "config": optimized_config})
    except Exception as e:
        logger.error({"message": f"Failed to initialize model: {model}", "error": str(e)})
        raise HTTPException(status_code=500, detail=f"Failed to initialize model: {model}")

    # Process uploaded file if provided and add to session
    temp_doc = None
    if filename:
        temp_doc = await _process_uploaded_file(filename)
        if temp_doc:
            # Add file to this chat session
            chat_sessions[chat_id]["files"].append(temp_doc)
            logger.info({
                "message": "Successfully processed uploaded file for chat session", 
                "filename": filename,
                "chat_id": chat_id,
                "content_length": len(temp_doc["content"]), 
                "metadata": temp_doc["metadata"],
                "session_files_count": len(chat_sessions[chat_id]["files"])
            })

    # Create session-specific retriever
    try:
        # Initialize oc_command_results early
        oc_command_results = {}
        
        # Validate offline query validation
        validated_query = enforce_offline_query_validation(query)
        
        # Get documents for this specific chat session
        session_docs = chat_sessions[chat_id]["files"]
        
        if session_docs:
            # Create or use cached session-specific vector store
            if chat_id not in session_vector_stores:
                embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
                # Only use documents from this specific chat session
                session_vector_stores[chat_id] = create_vector_store(session_docs)
                logger.info({"message": f"Created session-specific vector store", "chat_id": chat_id, "documents": len(session_docs)})
            elif temp_doc:
                # Update existing session vector store with new document
                embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
                session_vector_stores[chat_id] = create_vector_store(session_docs)
                logger.info({"message": f"Updated session-specific vector store", "chat_id": chat_id, "documents": len(session_docs)})
            
            retriever = session_vector_stores[chat_id].as_retriever(search_kwargs={"k": 5})
            logger.info({"message": f"Using session-specific vector store", "chat_id": chat_id, "documents": len(session_docs)})
        elif vector_store:
            # Fallback to global vector store if no session documents
            retriever = vector_store.as_retriever(search_kwargs={"k": 5})
            logger.info({"message": "Using global vector store as fallback", "chat_id": chat_id})
        else:
            # No documents available
            logger.warning({"message": "No documents available for query", "query": query, "chat_id": chat_id})
            raise HTTPException(
                status_code=400,
                detail="No documents available for this chat session. Please upload files related to your query."
            )

        # Get relevant documents for enhanced context creation
        relevant_docs = retriever.invoke(validated_query)
        
        # Create enhanced context that includes both documents and live OpenShift data
        try:
            enhanced_context = enhance_context_with_metadata(relevant_docs, query_type)
            
            # Add OpenShift command results to context if available
            if oc_command_results:
                oc_context_parts = []
                for cmd_key, oc_result in oc_command_results.items():
                    if oc_result and "content" in oc_result:
                        cmd_info = oc_result.get("metadata", {})
                        command_used = cmd_info.get("command", cmd_key)
                        oc_context_parts.append(f"[Live OpenShift Data - {command_used}]\n{oc_result['content']}")
                
                if oc_context_parts:
                    live_oc_context = "\n\n---LIVE OPENSHIFT DATA---\n" + "\n\n".join(oc_context_parts)
                    enhanced_context = f"{enhanced_context}\n\n{live_oc_context}"
                    
                    logger.info({
                        "message": "Enhanced context with live OpenShift data",
                        "oc_commands_included": len(oc_command_results),
                        "context_length": len(enhanced_context)
                    })
                    
        except Exception as context_error:
            logger.warning({"message": "Failed to enhance context, using basic context", "error": str(context_error)})
            enhanced_context = "\n\n".join([doc.page_content for doc in relevant_docs])

        # Create QA chain with optimized context-aware prompt
        
        # Get optimized prompt based on query classification
        try:
            # Use basic prompt template since optimization modules are removed
            conversation_context = ""
            if conversation_history:
                conversation_context = "\n\nConversation History:\n"
                for i, msg in enumerate(conversation_history[-10:]):  # Include last 10 messages for context
                    role = msg.get('role', 'user')
                    content = msg.get('content', '')
                    conversation_context += f"{role.upper()}: {content}\n"
                conversation_context += "\n"
            
            prompt_text = f"""Use the following pieces of context to answer the question at the end. If you don't know the answer based on the provided context, just say that you don't know, don't try to make up an answer.
            
            THIS IS AN ISOLATED CHAT SESSION - only use information from the provided context and conversation history below. Do not reference information from other conversations or sessions.

FORMATTING REQUIREMENTS:
• Structure your answer with clear numbered steps for procedures (1., 2., 3.)
• Use bullet points (•) for lists of features or requirements
• Format code blocks and commands with triple backticks (```)
• Use **bold text** for important concepts or section headers
• Create clear paragraph breaks between different topics
• Number complex multi-step processes with proper hierarchy
• Format file paths, configurations, and technical terms clearly
• Use consistent indentation for sub-steps

{{context}}{conversation_context}
Question: {{question}}
Answer (use proper formatting with numbered steps and clear structure):"""
            
            PROMPT = PromptTemplate(
                template=prompt_text,
                input_variables=["context", "question"]
            )
        except Exception as prompt_error:
            logger.warning({"message": "Failed to get optimized prompt, using fallback", "error": str(prompt_error)})
            # Fallback to enhanced basic prompt
            conversation_context = ""
            if conversation_history:
                conversation_context = "\n\nConversation History:\n"
                for i, msg in enumerate(conversation_history[-10:]):  # Include last 10 messages for context
                    role = msg.get('role', 'user')
                    content = msg.get('content', '')
                    conversation_context += f"{role.upper()}: {content}\n"
                conversation_context += "\n"
            
            prompt_template = f"""You are a specialized technical assistant with expertise in OpenShift, Kubernetes, Red Hat Enterprise Linux, and IT infrastructure.

THIS IS AN ISOLATED CHAT SESSION - only use information from the provided context and conversation history below. Do not reference information from other conversations or sessions.

ANALYSIS APPROACH:
1. Carefully analyze the provided context documents
2. Extract relevant information that directly answers the question
3. Provide specific examples, commands, or configurations when available
4. Cite document sources for your information
5. If information is incomplete, clearly state what's missing

FORMATTING STANDARDS:
• Structure responses with numbered procedures (1., 2., 3.) for step-by-step instructions
• Use bullet points (•) for feature lists, requirements, or options
• Format all code blocks and commands with triple backticks (```)
• Use **bold formatting** for important concepts, warnings, or section headers
• Create clear paragraph separation between different topics
• Use proper hierarchy for complex procedures (1.1, 1.2, etc.)
• Format file paths, URLs, and technical terms with consistent styling
• Indent sub-steps appropriately for better readability

SPECIAL INSTRUCTIONS FOR LIVE DATA:
- If you see "Live OpenShift Data" sections, these contain current cluster information
- Live data takes precedence over static documentation when there are conflicts
- Combine static documentation with live data to provide comprehensive answers
- When suggesting commands, consider the current cluster state from live data

Context: {{context}}{conversation_context}

Question: {{question}}

WELL-FORMATTED RESPONSE (use numbered steps, bullet points, code blocks, and proper structure):"""

            PROMPT = PromptTemplate(
                template=prompt_template,
                input_variables=["context", "question"]
            )
            
            qa_chain = RetrievalQA.from_chain_type(
                llm=llm_instance,
                chain_type="stuff",
                retriever=retriever,
                return_source_documents=True,
                chain_type_kwargs={"prompt": PROMPT}
            )

    except Exception as e:
        logger.error({"message": "Failed to create QA chain", "error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to initialize query system")

    # Enhanced OpenShift resource queries with dynamic command detection
    if oc_handler.check_oc_availability():
        try:
            oc_command_results = detect_and_run_oc_commands(query)
            if oc_command_results:
                logger.info({
                    "message": f"Executed {len(oc_command_results)} oc commands for query", 
                    "commands": list(oc_command_results.keys()),
                    "query": query
                })
                
                # Add oc command results to the vector store for immediate use
                for cmd_key, oc_result in oc_command_results.items():
                    if oc_result and "content" in oc_result:
                        # Create document from oc command result
                        oc_doc = Document(
                            page_content=oc_result["content"], 
                            metadata=oc_result.get("metadata", {})
                        )
                        
                        # Add to parsed data and update vector store
                        parsed_data.append(oc_result)
                        if vector_store:
                            try:
                                vector_store.add_documents([oc_doc])
                                vector_store.save_local(FAISS_INDEX_PATH)
                            except Exception as vs_error:
                                logger.warning(f"Failed to add oc result to vector store: {vs_error}")
                        
        except Exception as oc_error:
            logger.warning({"message": "Failed to execute oc commands", "error": str(oc_error)})
    else:
        logger.info("OpenShift CLI not available or user not logged in, skipping oc commands")

    # Legacy oc explain handling for backward compatibility
    oc_resource_match = re.search(r"(pod|deployment|service)\.spec", query, re.IGNORECASE)
    if oc_resource_match and not oc_command_results:  # Only run if enhanced handler didn't already handle it
        try:
            resource = oc_resource_match.group(0).lower()
            oc_result = run_oc_explain(resource)
            if oc_result and vector_store:
                parsed_data.append(oc_result)
                vector_store.add_documents([Document(page_content=oc_result["content"], metadata=oc_result["metadata"])])
                vector_store.save_local(FAISS_INDEX_PATH)
                logger.info({"message": f"Added legacy oc explain data for resource: {resource}"})
        except Exception as e:
            logger.warning({"message": f"Failed to process legacy oc explain for {resource}", "error": str(e)})

    # Execute query with offline enforcement and quality assessment
    try:
        # Validate offline mode before processing
        if not validate_offline_mode():
            logger.warning({"message": "Offline mode validation failed, but proceeding with query"})
        
        result = qa_chain.invoke({"query": validated_query})
        
        # Validate response
        if not result["source_documents"]:
            logger.warning({"message": "No relevant documents found", "query": query})
            return {
                "answer": "Sorry, I couldn't find relevant information in the available documents to answer your question. Please note that I can only access information from uploaded documents and cannot search the internet.",
                "sources": []
            }

        # Enhanced response quality assessment
        try:
            quality_analysis = optimize_response_quality(query, result["source_documents"], result["result"])
            
            # Log quality metrics
            logger.info({
                "message": "Query processed with quality assessment",
                "query": query,
                "answer_length": len(result["result"]),
                "sources_count": len(result["source_documents"]),
                "confidence_score": quality_analysis["confidence_score"],
                "avg_relevance": quality_analysis["metrics"]["avg_relevance"],
                "suggestions": quality_analysis["suggestions"]
            })
            
            # Enhance response with quality indicators
            enhanced_answer = result["result"]
            
            # Add confidence indicator if low
            if quality_analysis["confidence_score"] < 0.5:
                enhanced_answer += f"\n\n⚠️ **Note**: This response has a confidence score of {quality_analysis['confidence_score']:.1f}. " + \
                                 "You may want to refine your query or upload more relevant documents."
            
            # Add suggestions if available
            if quality_analysis["suggestions"]:
                enhanced_answer += "\n\n💡 **Suggestions for better results**:\n" + \
                                 "\n".join([f"• {suggestion}" for suggestion in quality_analysis["suggestions"]])
            
            return {
                "answer": enhanced_answer,
                "sources": [
                    {
                        **doc.metadata,
                        "source": doc.metadata.get("source", "Unknown").split('/')[-1] if '/' in doc.metadata.get("source", "") else doc.metadata.get("source", "Unknown").split('\\')[-1]
                    } for doc in result["source_documents"]
                ],
                "openshift_commands_executed": list(oc_command_results.keys()) if oc_command_results else [],
                "quality_metrics": {
                    "confidence_score": quality_analysis["confidence_score"],
                    "relevance_score": quality_analysis["metrics"]["avg_relevance"],
                    "sources_used": len(result["source_documents"]),
                    "has_examples": quality_analysis["metrics"]["has_specific_examples"],
                    "has_citations": quality_analysis["metrics"]["has_citations"],
                    "live_data_included": len(oc_command_results) > 0
                }
            }
            
        except Exception as quality_error:
            logger.warning({"message": "Quality assessment failed, returning basic response", "error": str(quality_error)})
            
            # Fallback to basic response
            logger.info({
                "message": "Query processed successfully",
                "query": query,
                "answer_length": len(result["result"]),
                "sources_count": len(result["source_documents"])
            })

            return {
                "answer": result["result"],
                "sources": [
                    {
                        **doc.metadata,
                        "source": doc.metadata.get("source", "Unknown").split('/')[-1] if '/' in doc.metadata.get("source", "") else doc.metadata.get("source", "Unknown").split('\\')[-1]
                    } for doc in result["source_documents"]
                ],
                "openshift_commands_executed": list(oc_command_results.keys()) if oc_command_results else []
            }

    except Exception as e:
        logger.error({"message": "Failed to process query", "query": query, "error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to process your query")
    
    finally:
        # Always clear uploaded files after processing query
        try:
            await _clear_temp_files()
            logger.info({"message": "Cleared temporary uploaded files after query"})
        except Exception as e:
            logger.warning({"message": "Failed to clear temp files", "error": str(e)})

async def _clear_temp_files():
    """Helper function to clear temporary uploaded files."""
    temp_dir = "tmp_uploads"
    if not os.path.exists(temp_dir):
        return
    
    for filename in os.listdir(temp_dir):
        file_path = os.path.join(temp_dir, filename)
        if os.path.isfile(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                logger.warning({"message": f"Failed to delete temp file: {filename}", "error": str(e)})

async def _process_uploaded_file(filename: str):
    """Process uploaded file and return parsed document with enhanced processing."""
    if not filename:
        return None
    
    temp_dir = "tmp_uploads"
    file_path = os.path.join(temp_dir, filename)
    
    if not os.path.exists(file_path):
        logger.warning({"message": f"Uploaded file not found: {filename}", "path": file_path})
        return None
    
    try:
        # Get file size for logging
        file_size = os.path.getsize(file_path)
        logger.info({"message": f"Processing uploaded file: {filename}", "size": file_size})
        
        temp_doc = None
        file_lower = filename.lower()
        
        # Try enhanced parsing first
        try:
            temp_doc = parse_any_file_enhanced(file_path)
            if temp_doc:
                temp_doc["metadata"]["processing_method"] = "enhanced"
                logger.info({"message": f"Successfully used enhanced parsing for {filename}"})
        except Exception as enhanced_error:
            logger.warning({"message": f"Enhanced parsing failed for {filename}, using basic", "error": str(enhanced_error)})
        
        # Fallback to basic parsing if enhanced failed
        if not temp_doc:
            if file_lower.endswith(".pdf"):
                temp_doc = parse_pdf(file_path)
            elif file_lower.endswith((".yaml", ".yml")):
                with open(file_path, 'r', encoding='utf-8') as f:
                    temp_doc = parse_yaml(f.read())
            elif file_lower.endswith(".sh"):
                with open(file_path, 'r', encoding='utf-8') as f:
                    temp_doc = parse_shell_script(f.read())
            elif file_lower.endswith((".html", ".htm")):
                with open(file_path, 'r', encoding='utf-8') as f:
                    temp_doc = parse_html(f.read())
            else:
                logger.warning({"message": f"Unsupported file type: {filename}"})
                return None
            
            if temp_doc and "metadata" in temp_doc:
                temp_doc["metadata"]["processing_method"] = "basic"
        
        if temp_doc and temp_doc.get("content"):
            # Add filename to metadata for better tracking
            if "metadata" not in temp_doc:
                temp_doc["metadata"] = {}
            temp_doc["metadata"]["uploaded_filename"] = filename
            temp_doc["metadata"]["file_size"] = file_size
            return temp_doc
        else:
            logger.warning({"message": f"Failed to parse content from file: {filename}"})
            return None
            
    except Exception as e:
        logger.error({"message": f"Error processing uploaded file: {filename}", "error": str(e)})
        return None

@router.get("/debug/uploaded-files")
async def list_uploaded_files():
    """List all files in the temp uploads directory for debugging."""
    temp_dir = "tmp_uploads"
    if not os.path.exists(temp_dir):
        return {"files": [], "message": "Upload directory does not exist"}
    
    files = []
    for filename in os.listdir(temp_dir):
        file_path = os.path.join(temp_dir, filename)
        if os.path.isfile(file_path):
            stat = os.stat(file_path)
            files.append({
                "filename": filename,
                "size": stat.st_size,
                "modified": stat.st_mtime,
                "exists": True
            })
    
    return {"files": files, "count": len(files)}

@router.get("/debug/system-status")
async def system_status():
    """Get system status for debugging."""
    return {
        "vector_store_initialized": vector_store is not None,
        "parsed_data_count": len(parsed_data) if parsed_data else 0,
        "faiss_index_exists": os.path.exists(os.path.join(FAISS_INDEX_PATH, "index.faiss")),
        "upload_dir_exists": os.path.exists("tmp_uploads"),
        "nas_dir_exists": os.path.exists(NAS_PATH),
        "embedding_model": EMBEDDING_MODEL,
        "default_llm_model": LLM_MODEL
    }

@router.delete("/debug/clear-uploads")
async def clear_uploaded_files():
    """Clear all uploaded files for debugging."""
    temp_dir = "tmp_uploads"
    if not os.path.exists(temp_dir):
        return {"message": "Upload directory does not exist"}
    
    cleared_files = []
    for filename in os.listdir(temp_dir):
        file_path = os.path.join(temp_dir, filename)
        if os.path.isfile(file_path):
            try:
                os.remove(file_path)
                cleared_files.append(filename)
            except Exception as e:
                logger.error({"message": f"Failed to delete {filename}", "error": str(e)})
    
    logger.info({"message": f"Manually cleared {len(cleared_files)} uploaded files"})
    return {"cleared_files": cleared_files, "count": len(cleared_files)}

@router.get("/debug/openshift-status")
async def openshift_status():
    """Check OpenShift CLI availability and connection status."""
    try:
        oc_available = oc_handler.check_oc_availability()
        
        status_info = {
            "oc_available": oc_available,
            "commands_supported": list(oc_handler.supported_commands.keys()),
            "cache_size": len(oc_handler.cache),
            "cache_entries": list(oc_handler.cache.keys()) if oc_handler.cache else []
        }
        
        if oc_available:
            # Get basic cluster info
            try:
                import subprocess
                version_result = subprocess.run(['oc', 'version', '--client'], 
                                              capture_output=True, text=True, timeout=10)
                if version_result.returncode == 0:
                    status_info["oc_version"] = version_result.stdout.strip()
                
                whoami_result = subprocess.run(['oc', 'whoami'], 
                                             capture_output=True, text=True, timeout=10)
                if whoami_result.returncode == 0:
                    status_info["current_user"] = whoami_result.stdout.strip()
                
                project_result = subprocess.run(['oc', 'project'], 
                                              capture_output=True, text=True, timeout=10)
                if project_result.returncode == 0:
                    status_info["current_project"] = project_result.stdout.strip()
                    
            except Exception as e:
                status_info["cluster_info_error"] = str(e)
        
        return status_info
        
    except Exception as e:
        return {
            "error": f"Failed to check OpenShift status: {e}",
            "oc_available": False
        }

@router.post("/openshift/test-commands")
async def test_openshift_commands(query_input: QueryInput):
    """Test OpenShift command detection for a given query."""
    query = query_input.query
    
    if not oc_handler.check_oc_availability():
        raise HTTPException(
            status_code=400,
            detail="OpenShift CLI not available or user not logged in"
        )
    
    try:
        # Detect commands that would be run
        commands_detected = oc_handler.detect_oc_commands_needed(query)
        
        return {
            "query": query,
            "commands_detected": commands_detected,
            "would_execute": len(commands_detected) > 0,
            "estimated_execution_time": len(commands_detected) * 5  # rough estimate in seconds
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze query for OpenShift commands: {e}"
        )

@router.delete("/debug/clear-oc-cache")
async def clear_openshift_cache():
    """Clear OpenShift command cache."""
    cache_size = len(oc_handler.cache)
    oc_handler.cache.clear()
    
    logger.info({"message": f"Cleared OpenShift command cache", "entries_cleared": cache_size})
    
    return {
        "message": f"Cleared {cache_size} cached OpenShift command results",
        "cache_size_before": cache_size,
        "cache_size_after": 0
    }

@router.get("/debug/offline-status")
async def check_offline_status():
    """Check if the system is properly configured for offline operation."""
    status = {
        "offline_mode_configured": True,
        "local_ollama_running": validate_offline_mode(),
        "base_url": "http://localhost:11434",
        "internet_restrictions": {
            "custom_prompts_enabled": True,
            "query_validation_enabled": True,
            "system_prompt_configured": True
        },
        "recommendations": []
    }
    
    if not status["local_ollama_running"]:
        status["recommendations"].append("Start local Ollama instance: ollama serve")
        status["recommendations"].append("Verify Ollama is accessible at http://localhost:11434")
    
    if status["local_ollama_running"] and status["offline_mode_configured"]:
        status["status"] = "FULLY_OFFLINE"
    elif status["local_ollama_running"]:
        status["status"] = "PARTIALLY_OFFLINE"
    else:
        status["status"] = "OFFLINE_MODE_FAILED"
    
    return status

def enforce_offline_query_validation(query: str) -> str:
    """Validate and modify query to enforce offline behavior."""
    # List of patterns that might indicate internet-seeking behavior
    internet_patterns = [
        r"latest", r"current", r"recent", r"today", r"now", r"2024", r"2025",
        r"up to date", r"real.?time", r"live", r"breaking", r"news",
        r"check online", r"search", r"google", r"browse", r"internet"
    ]
    
    # Check if query contains internet-seeking terms
    query_lower = query.lower()
    for pattern in internet_patterns:
        if re.search(pattern, query_lower):
            logger.warning({
                "message": "Query contains terms that might seek current/online information", 
                "query": query,
                "pattern": pattern
            })
    
    # Add offline disclaimer to query
    modified_query = f"{query}\n\nNote: Please answer based only on the provided document context. Do not use current information or external sources."
    return modified_query

def validate_offline_mode():
    """Validate that the system is configured for offline operation."""
    try:
        # Check if Ollama is running locally
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            logger.info({"message": "Local Ollama instance detected and running"})
            return True
        else:
            logger.warning({"message": "Local Ollama instance not responding properly"})
            return False
    except Exception as e:
        logger.error({"message": "Failed to connect to local Ollama instance", "error": str(e)})
        return False

# Validate offline mode at startup
offline_mode_valid = validate_offline_mode()
if not offline_mode_valid:
    logger.warning({"message": "System may not be properly configured for offline operation"})

@router.delete("/sessions/{chat_id}")
async def cleanup_chat_session(chat_id: str):
    """Clean up a specific chat session and its associated resources."""
    global chat_sessions, session_vector_stores
    
    cleaned_up = False
    if chat_id in chat_sessions:
        del chat_sessions[chat_id]
        cleaned_up = True
        
    if chat_id in session_vector_stores:
        del session_vector_stores[chat_id]
        cleaned_up = True
    
    logger.info({"message": f"Cleaned up chat session", "chat_id": chat_id, "resources_found": cleaned_up})
    
    return {
        "message": f"Chat session {chat_id} cleaned up successfully",
        "resources_found": cleaned_up
    }

@router.delete("/sessions")
async def cleanup_all_sessions():
    """Clean up all chat sessions and their associated resources."""
    global chat_sessions, session_vector_stores
    
    session_count = len(chat_sessions)
    vector_store_count = len(session_vector_stores)
    
    chat_sessions.clear()
    session_vector_stores.clear()
    
    logger.info({"message": "Cleaned up all chat sessions", "sessions_cleared": session_count, "vector_stores_cleared": vector_store_count})
    
    return {
        "message": "All chat sessions cleaned up successfully",
        "sessions_cleared": session_count,
        "vector_stores_cleared": vector_store_count
    }
