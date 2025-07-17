# Optimized LLM Configuration for better accuracy and performance

# Model-specific optimizations
LLM_CONFIGS = {
    "mistral:instruct": {
        "temperature": 0.2,  # Lower for more focused responses
        "top_k": 20,         # Reduced for better speed (was 30)
        "top_p": 0.8,        # Slightly lower for more precision
        "num_ctx": 4096,     # Reduced context window for speed (was 8192)
        "repeat_penalty": 1.1,
        "num_predict": 256,  # Reduced max response length for speed (was 512)
        "stop": ["</s>", "[INST]", "[/INST]"]
    },
    "llama3.1:8b": {
        "temperature": 0.1,
        "top_k": 15,         # Reduced for better speed (was 25)
        "top_p": 0.85,
        "num_ctx": 8192,     # Reduced from 16384 for speed
        "repeat_penalty": 1.05,
        "num_predict": 512,  # Reduced from 1024 for speed
        "stop": ["<|eot_id|>", "<|end_of_text|>"]
    },
    # Fast model alternatives
    "phi3:mini": {
        "temperature": 0.2,
        "top_k": 15,
        "top_p": 0.9,
        "num_ctx": 4096,
        "repeat_penalty": 1.1,
        "num_predict": 256,
        "stop": ["<|end|>"]
    },
    "gemma2:2b": {
        "temperature": 0.2,
        "top_k": 15,
        "top_p": 0.9,
        "num_ctx": 8192,
        "repeat_penalty": 1.05,
        "num_predict": 256,
        "stop": ["<end_of_turn>"]
    }
}

# Embedding model optimizations
EMBEDDING_CONFIGS = {
    "current": "all-MiniLM-L6-v2",
    "recommended": "sentence-transformers/all-mpnet-base-v2",  # Better accuracy
    "fast": "sentence-transformers/all-MiniLM-L12-v2",        # Good balance
    "multilingual": "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
}

# Retrieval optimization settings
RETRIEVAL_CONFIGS = {
    "k": 8,              # Retrieve more documents for better coverage
    "score_threshold": 0.7,  # Filter low-relevance results
    "max_tokens_per_doc": 1000,  # Limit document chunk size
    "overlap": 200       # Chunk overlap for better context
}

# Prompt optimization templates
OPTIMIZED_PROMPTS = {
    "enhanced_context": """You are a specialized AI assistant with expertise in technical documentation and configuration guidance.

INSTRUCTIONS:
1. Analyze the provided context carefully and extract relevant information
2. Provide accurate, specific answers based solely on the context
3. If information is incomplete, clearly state what's missing
4. Include relevant examples, commands, or configurations when available
5. Cite specific document sources for your answers

CONTEXT:
{context}

QUESTION: {question}

STRUCTURED RESPONSE:
""",
    
    "code_focused": """You are a technical documentation expert specializing in code analysis and configuration.

RULES:
- Extract and explain code snippets accurately
- Provide step-by-step instructions when applicable
- Include error handling and best practices

Context: {context}
Question: {question}

Technical Response:
"""
}