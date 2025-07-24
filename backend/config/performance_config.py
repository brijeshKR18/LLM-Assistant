# Performance-optimized configurations for maximum output quality

# Maximum response configurations (prioritizing detailed responses over speed)
FAST_LLM_CONFIGS = {
    "mistral:instruct": {
        "temperature": 0.3,
        "top_k": 20,         
        "top_p": 0.9,
        "num_ctx": 32768,    # Maximum context window for mistral:instruct
        "repeat_penalty": 1.1,
        "num_predict": 2048, # Maximum response length for detailed answers
        "stop": ["</s>", "[INST]", "[/INST]"]
    },
    "llama3.1:8b": {
        "temperature": 0.2,
        "top_k": 15,         
        "top_p": 0.9,
        "num_ctx": 16384,    # Keep existing for llama3.1
        "repeat_penalty": 1.05,
        "num_predict": 2048, # Increased response length
        "stop": ["<|eot_id|>", "<|end_of_text|>"]
    }
}

# Consider switching to smaller, faster models
FAST_MODELS = {
    "tiny": "phi3:mini",           # 3.8B parameters - much faster
    "small": "gemma2:2b",          # 2B parameters - very fast
    "medium": "mistral:7b",        # 7B parameters - good balance
    "current": "mistral:instruct"  # Your current model
}

# Fast embedding models
FAST_EMBEDDING_CONFIGS = {
    "fastest": "sentence-transformers/all-MiniLM-L6-v2",     # Current - good speed
    "balanced": "sentence-transformers/all-MiniLM-L12-v2",   # Slightly slower but better
    "small": "sentence-transformers/paraphrase-MiniLM-L3-v2" # Smallest/fastest
}

# Retrieval optimization for speed
FAST_RETRIEVAL_CONFIGS = {
    "k": 2,              # Retrieve even fewer documents for speed (was 3)
    "score_threshold": 0.75,  # Balanced threshold
    "max_tokens_per_doc": 400,  # Smaller chunks for faster processing
    "overlap": 50        # Minimal overlap for speed
}

# Text processing optimizations
TEXT_PROCESSING_CONFIGS = {
    "max_chunk_size": 800,      # Increased chunk size
    "chunk_overlap": 100,       # Increased overlap for better context
    "max_context_length": 16000, # Significantly increased context limit
    "strip_extra_whitespace": True,
    "remove_empty_lines": True
}

# GPU optimization flags (if available)
GPU_CONFIGS = {
    "use_gpu": True,
    "gpu_layers": 35,    # Adjust based on your GPU memory
    "batch_size": 1,     # Keep low for faster single queries
    "threads": 4         # Adjust based on your CPU cores
}

# Speed testing configurations
SPEED_TEST_CONFIGS = {
    "ultra_fast": {
        "num_predict": 100,
        "num_ctx": 2048,
        "top_k": 10,
        "temperature": 0.3
    },
    "balanced": {
        "num_predict": 200,
        "num_ctx": 3072,
        "top_k": 15,
        "temperature": 0.3
    },
    "quality": {
        "num_predict": 300,
        "num_ctx": 4096,
        "top_k": 20,
        "temperature": 0.2
    }
}
