#!/bin/bash

# Wait for Ollama service to be ready
echo "Waiting for Ollama service to start..."
while ! curl -s http://localhost:11434/api/tags > /dev/null; do
    sleep 5
done

echo "Ollama service is ready. Pulling models..."

# Pull required models
echo "Pulling mistral:instruct model..."
ollama pull mistral:instruct

echo "Pulling llama3.1:8b model..."
ollama pull llama3.1:8b

echo "All models pulled successfully!"

# Keep the script running
tail -f /dev/null
