# Configuration Guidance API - Enhanced Robustness & Monitoring

## Overview

This FastAPI backend provides a robust, offline-first AI-powered configuration guidance system with comprehensive monitoring, error handling, and recovery capabilities.

## 🔧 Key Features

### ✅ **Robustness Enhancements**

1. **Enhanced File Upload Validation**

   - File type validation (PDF, YAML, Shell, HTML only)
   - File size limits (10MB maximum)
   - Empty file detection
   - Path traversal prevention via `os.path.basename()`
   - Comprehensive error handling and structured logging

2. **Robust Query Processing**

   - Automatic greeting detection using spaCy NLP
   - Model validation for supported LLMs
   - Temporary file cleanup after every query (including greeting responses)
   - Source document validation
   - Graceful error handling with fallback responses


### ✅ **Strict Offline Operation**

1. **LLM Configuration**

   - Ollama LLM with forced `localhost:11434` base URL
   - Custom system prompts enforcing context-only responses
   - No external API calls or internet access
   - Validation of offline mode at startup

2. **Query Validation**

   - Detection of internet-seeking terms in queries
   - Automatic query modification with offline disclaimers
   - Structured logging of potentially problematic queries

3. **Offline Status Monitoring**
   - Real-time validation of local Ollama service
   - Configuration verification endpoints
   - Recommendations for offline setup issues

### ✅ **Comprehensive Monitoring**

1. **Debug Endpoints**

   - `/debug/system-status` - Overall system health
   - `/debug/offline-status` - Offline configuration validation
   - `/debug/uploaded-files` - Active file uploads monitoring
   - `/debug/clear-uploads` - Manual file cleanup

2. **Structured Logging**
   - JSON-formatted logs with detailed context
   - Query tracking with metadata
   - Error categorization and troubleshooting info
   - Performance metrics and timing

## 🏗️ Architecture

### Core Components

1. **File Processing Pipeline**

   - Multi-format parser support (PDF, YAML, Shell, HTML)
   - Temporary file management with automatic cleanup
   - Vector store integration with FAISS

2. **LLM Integration**

   - Ollama LLM with offline enforcement
   - Custom prompt templates for context-only responses
   - Circuit breaker protection for service reliability

3. **Vector Store Management**

   - FAISS-based semantic search
   - HuggingFace embeddings with local models
   - Automatic index creation and loading

4. **Monitoring & Health Checks**
   - Multi-dimensional health assessment
   - Automated recovery actions
   - Manual intervention triggers

## 📊 Architecture Diagrams

Professional Draw.io-compatible XML diagrams are available in the `architecture_flows/` directory:

1. **System Initialization Flow** (`01_system_initialization_flow.xml`)

   - Environment setup and configuration
   - FAISS index initialization
   - LLM service startup
   - Offline mode validation

2. **File Upload Flow** (`02_file_upload_flow.xml`)

   - File validation pipeline
   - Security checks and sanitization
   - Temporary storage management
   - Error handling scenarios

3. **Query Processing Flow** (`03_query_processing_flow.xml`)

   - Query validation and processing
   - Context retrieval and LLM interaction
   - Response generation and cleanup
   - Offline enforcement

4. **Error Handling & Recovery** (`04_error_handling_recovery_flow.xml`)

   - Failure detection and categorization
   - Circuit breaker operations
   - Recovery strategies
   - Logging and alerting

5. **Monitoring Dashboard** (`05_monitoring_dashboard_flow.xml`)
   - Health check orchestration
   - Status assessment and reporting
   - Automated and manual recovery actions
   - Continuous monitoring loop

## 🚀 Getting Started

### Prerequisites

1. **Install Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

2. **Setup Ollama (Required for Offline Operation)**

   ```bash
   # Install Ollama
   curl -fsSL https://ollama.ai/install.sh | sh

   # Start Ollama service
   ollama serve

   # Download required model
   ollama pull mistral:instruct
   ```

3. **Setup spaCy Model**
   ```bash
   python -m spacy download en_core_web_sm
   ```

### Running the Application

```bash
# Start the FastAPI server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Health Check Endpoints

```bash
# Check overall system status
curl http://localhost:8000/debug/system-status

# Verify offline configuration
curl http://localhost:8000/debug/offline-status


# List uploaded files
curl http://localhost:8000/debug/uploaded-files
```

## 🔧 Configuration

### Environment Variables

- `LLM_MODEL`: Default LLM model (default: `mistral:instruct`)
- `EMBEDDING_MODEL`: HuggingFace embedding model (default: `all-MiniLM-L6-v2`)
- `FAISS_INDEX_PATH`: Path to FAISS index storage (default: `faiss_index`)
- `NAS_PATH`: Path to initial document directory (default: `nas_data`)

### File Upload Limits

```python
# File size and type restrictions
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.pdf', '.yaml', '.yml', '.sh', '.html', '.htm'}
```

## 📋 API Endpoints

### Core Endpoints

- `POST /upload` - Upload files for processing
- `POST /query` - Submit queries for AI processing

### Debug & Monitoring

- `GET /debug/system-status` - System health overview
- `GET /debug/offline-status` - Offline configuration check
- `GET /debug/circuit-breaker` - LLM service health
- `GET /debug/uploaded-files` - Active file list
- `DELETE /debug/clear-uploads` - Manual file cleanup

## 🛠️ Troubleshooting

### Common Issues

1. **LLM Service Unavailable**

   - Check: `curl http://localhost:11434/api/tags`
   - Solution: `ollama serve` or restart Ollama service

2. **Circuit Breaker Open**

   - Check: `/debug/circuit-breaker` endpoint
   - Solution: Wait for recovery timeout or restart LLM service

3. **File Upload Failures**

   - Check: File size (<10MB) and supported formats
   - Solution: Validate file format and size

4. **No Vector Store**
   - Check: FAISS index exists or upload initial documents
   - Solution: Upload files to populate vector store

### Monitoring Dashboard

The monitoring dashboard provides comprehensive system visibility:

- **Green Status**: All systems operational
- **Yellow Status**: Degraded performance, fallback active
- **Red Status**: Critical failure, manual intervention required

## 🔐 Security Features

1. **Path Traversal Prevention**

   - Filename sanitization with `os.path.basename()`
   - Restricted upload directory access

2. **File Validation**

   - Whitelist-based file type validation
   - Size limitations and content verification

3. **Offline Enforcement**
   - No external API calls
   - Local-only LLM processing
   - Context-restricted responses

## 📈 Performance Optimization

1. **Efficient Vector Search**

   - FAISS indexing for fast similarity search
   - Optimized embedding model selection

2. **Resource Management**

   - Automatic temporary file cleanup
   - Memory-efficient document processing

3. **Caching Strategy**
   - Persistent FAISS index storage
   - Reusable vector store instances

## 🔄 Future Enhancements

1. **Advanced Monitoring**

   - Metrics dashboard integration
   - Performance analytics
   - Predictive maintenance

2. **Scalability**

   - Horizontal scaling support
   - Load balancing considerations
   - Database integration

3. **Security**
   - Authentication and authorization
   - API rate limiting
   - Audit logging

## 📚 Documentation

- Architecture diagrams in `architecture_flows/`
- Comprehensive logging in `logs/app.log`

