# Use official Ollama image
FROM ollama/ollama:latest

# Set working directory
WORKDIR /app

# Copy model initialization script
COPY init-models.sh /app/init-models.sh

# Make script executable
RUN chmod +x /app/init-models.sh

# Create volume for model storage
VOLUME ["/root/.ollama"]

# Expose Ollama port
EXPOSE 11434


# Start Ollama service and initialize models
CMD ["sh", "-c", "/app/init-models.sh & ollama serve"]
