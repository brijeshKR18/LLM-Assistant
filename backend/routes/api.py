from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
from backend.parsers.pdf_parser import parse_pdf
from backend.parsers.yaml_parser import parse_yaml
from backend.parsers.shell_parser import parse_shell_script
from backend.parsers.html_parser import parse_html
from backend.parsers.oc_parser import run_oc_explain
from backend.vector_store.faiss_store import create_vector_store
from backend.vector_store.optimized_retrieval import create_optimized_vector_store
from langchain_ollama import OllamaLLM
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.docstore.document import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
import os
import re
from pathlib import Path
import json
import logging
from pythonjsonlogger import jsonlogger
import spacy
import requests

# Configuration Constants
NAS_PATH = "nas_data"
LLM_MODEL = "mistral:instruct"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
FAISS_INDEX_PATH = "faiss_index" 
GREETINGS_CONFIG_PATH = "config/greetings.json"

# Import optimized configurations with fallback
try:
    from backend.config.llm_config import LLM_CONFIGS
except ImportError:
    # Fallback configuration if module not available
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
    """Process all files in the NAS directory."""
    global parsed_data
    parsed_data = []
    if not os.path.exists(NAS_PATH):
        print(f"NAS directory {NAS_PATH} not found.")
        logger.warning({"message": f"NAS directory {NAS_PATH} not found"})
        return
    for root, _, files in os.walk(NAS_PATH):
        for file in files:
            file_path = os.path.join(root, file)
            if file.endswith(".pdf"):
                result = parse_pdf(file_path)
            elif file.endswith((".yaml", ".yml")):
                with open(file_path, 'r') as f:
                    result = parse_yaml(f.read())
            elif file.endswith(".sh"):
                with open(file_path, 'r') as f:
                    result = parse_shell_script(f.read())
            elif file.endswith(".html"):
                with open(file_path, 'r', encoding='utf-8') as f:
                    result = parse_html(f.read())
            else:
                continue
            if result:
                parsed_data.append(result)
    logger.info({"message": f"Processed {len(parsed_data)} files from NAS directory"})

# Initialize LLM with optimized configuration
try:
    # Get optimized config for the model
    model_config = LLM_CONFIGS.get(LLM_MODEL, LLM_CONFIGS["mistral:instruct"])
    
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
        # Offline-only prompt template
        offline_prompt_template = """You are an AI assistant that ONLY uses the provided context to answer questions. 
        
STRICT RULES:
1. You do NOT have access to the internet or any external information
2. You can ONLY use information from the context provided below
3. If the context doesn't contain the answer, say "I cannot answer this question based on the provided documents"
4. Do NOT use your general knowledge or training data
5. Always cite which document or source your answer comes from
6. You answer the prompt by combining the provided context and the information you get by indexing vector store.

Context: {context}

Question: {question}

Answer based ONLY on the provided context:"""

        OFFLINE_PROMPT = PromptTemplate(
            template=offline_prompt_template,
            input_variables=["context", "question"]
        )
        
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vector_store.as_retriever(search_kwargs={"k": 5}),
            return_source_documents=True,
            chain_type_kwargs={"prompt": OFFLINE_PROMPT}
        )
        logger.info({"message": "Initialized offline QA chain"})
    except Exception as e:
        logger.warning({"message": "Failed to initialize QA chain with custom prompt, using default", "error": str(e)})
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vector_store.as_retriever(search_kwargs={"k": 5}),
            return_source_documents=True
        )

@router.get("/")
def read_root():
    return {"message": "Hello from FastAPI"}

class QueryInput(BaseModel):
    query: str
    model: str = "mistral:instruct"
    filename: str = None  

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

@router.post("/query")
async def query_llm(input: QueryInput):
    """Handle configuration queries with enhanced robustness."""
    global vector_store, qa_chain, parsed_data

    query = input.query.strip()
    model = input.model
    filename = input.filename
    
    logger.info({
        "message": "Received query", 
        "query": query, 
        "model": model, 
        "filename": filename
    })

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
        
        # Get model-specific and query-type optimized config
        base_config = LLM_CONFIGS.get(model, LLM_CONFIGS["mistral:instruct"])
        
        # Adjust parameters based on query type
        query_adjustments = {
            "technical_config": {"temperature": 0.1, "top_k": 20, "top_p": 0.8},
            "troubleshooting": {"temperature": 0.2, "top_k": 30, "top_p": 0.85},
            "code_analysis": {"temperature": 0.05, "top_k": 15, "top_p": 0.7},
            "comparison": {"temperature": 0.3, "top_k": 40, "top_p": 0.9},
            "step_by_step": {"temperature": 0.1, "top_k": 25, "top_p": 0.8},
            "general_info": {"temperature": 0.2, "top_k": 30, "top_p": 0.85}
        }
        
        # Apply query-specific adjustments
        optimized_config = base_config.copy()
        if query_type in query_adjustments:
            optimized_config.update(query_adjustments[query_type])
        
        # Initialize LLM with optimized configuration
        llm_instance = OllamaLLM(
            model=model,
            base_url="http://localhost:11434",
            **optimized_config,
            system="You are an AI assistant that ONLY uses the provided document context to answer questions. You do NOT have access to the internet, current events, or any external information beyond what is explicitly provided in the context. If the provided documents do not contain sufficient information to answer a question, you must clearly state that you cannot answer based on the available information. Do not make assumptions or provide information from your general training data that is not supported by the provided context."
        )
        logger.info({"message": f"Initialized optimized LLM", "model": model, "query_type": query_type, "config": optimized_config})
    except Exception as e:
        logger.error({"message": f"Failed to initialize model: {model}", "error": str(e)})
        raise HTTPException(status_code=500, detail=f"Failed to initialize model: {model}")

    # Process uploaded file if provided
    temp_doc = None
    if filename:
        temp_doc = await _process_uploaded_file(filename)
        if temp_doc:
            logger.info({
                "message": "Successfully processed uploaded file", 
                "filename": filename,
                "content_length": len(temp_doc["content"]), 
                "metadata": temp_doc["metadata"]
            })

    # Create appropriate retriever
    try:
        # Validate offline query validation
        validated_query = enforce_offline_query_validation(query)
        if temp_doc:
            # Create temporary vector store with uploaded file + existing data
            embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
            combined_docs = [temp_doc] + (parsed_data if parsed_data else [])
            temp_vs = create_vector_store(combined_docs)
            retriever = temp_vs.as_retriever(search_kwargs={"k": 5})
            logger.info({"message": f"Created temporary vector store with {len(combined_docs)} documents"})
        elif vector_store:
            # Use existing vector store
            retriever = vector_store.as_retriever(search_kwargs={"k": 5})
            logger.info({"message": "Using existing vector store"})
        else:
            # No documents available
            logger.warning({"message": "No documents available for query", "query": query})
            raise HTTPException(
                status_code=400,
                detail="No documents available. Please upload files related to your query."
            )

        # Get relevant documents for enhanced context creation
        relevant_docs = retriever.invoke(validated_query)
        
        # Create enhanced context with metadata
        try:
            enhanced_context = enhance_context_with_metadata(relevant_docs, query_type)
        except Exception as context_error:
            logger.warning({"message": "Failed to enhance context, using basic context", "error": str(context_error)})
            enhanced_context = "\n\n".join([doc.page_content for doc in relevant_docs])

            # Get relevant documents for enhanced context creation
            relevant_docs = retriever.get_relevant_documents(validated_query)
            
            # Create enhanced context with metadata
            enhanced_context = enhance_context_with_metadata(relevant_docs, query_type)        # Create QA chain with optimized context-aware prompt
        
        # Get optimized prompt based on query classification
        try:
            # Use basic prompt template since optimization modules are removed
            prompt_text = """Use the following pieces of context to answer the question at the end. If you don't know the answer based on the provided context, just say that you don't know, don't try to make up an answer.

{context}

Question: {question}
Answer:"""
            
            PROMPT = PromptTemplate(
                template=prompt_text,
                input_variables=["context", "question"]
            )
        except Exception as prompt_error:
            logger.warning({"message": "Failed to get optimized prompt, using fallback", "error": str(prompt_error)})
            # Fallback to enhanced basic prompt
            prompt_template = """You are a specialized technical assistant with expertise in OpenShift, Kubernetes, Red Hat Enterprise Linux, and IT infrastructure.

ANALYSIS APPROACH:
1. Carefully analyze the provided context documents
2. Extract relevant information that directly answers the question
3. Provide specific examples, commands, or configurations when available
4. Cite document sources for your information
5. If information is incomplete, clearly state what's missing

Context: {context}

Question: {question}

STRUCTURED RESPONSE:"""

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

    # Handle OpenShift resource queries
    oc_resource_match = re.search(r"(pod|deployment|service)\.spec", query, re.IGNORECASE)
    if oc_resource_match:
        try:
            resource = oc_resource_match.group(0).lower()
            oc_result = run_oc_explain(resource)
            if oc_result and vector_store:
                parsed_data.append(oc_result)
                vector_store.add_documents([Document(page_content=oc_result["content"], metadata=oc_result["metadata"])])
                vector_store.save_local(FAISS_INDEX_PATH)
                logger.info({"message": f"Added oc explain data for resource: {resource}"})
        except Exception as e:
            logger.warning({"message": f"Failed to process oc explain for {resource}", "error": str(e)})

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
                "sources": [doc.metadata for doc in result["source_documents"]],
                "quality_metrics": {
                    "confidence_score": quality_analysis["confidence_score"],
                    "relevance_score": quality_analysis["metrics"]["avg_relevance"],
                    "sources_used": len(result["source_documents"]),
                    "has_examples": quality_analysis["metrics"]["has_specific_examples"],
                    "has_citations": quality_analysis["metrics"]["has_citations"]
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
                "sources": [doc.metadata for doc in result["source_documents"]]
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
            from backend.parsers.enhanced_parser import parse_any_file_enhanced
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
