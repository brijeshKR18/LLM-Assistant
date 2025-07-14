import os
from pathlib import Path
import sys
from parsers.pdf_parser import parse_pdf
from parsers.yaml_parser import parse_yaml
from parsers.shell_parser import parse_shell_script
from parsers.html_parser import parse_html
from parsers.oc_parser import run_oc_explain
from vector_store.faiss_store import create_vector_store


NAS_PATH = "../nas_data"  # Adjust to your NAS path
FAISS_INDEX_PATH = "faiss_index"

def process_nas_files():
    """Process all files in the NAS directory."""
    parsed_data = []
    if not os.path.exists(NAS_PATH):
        print(f"NAS directory {NAS_PATH} not found. Using sample data.")
        # Sample data for initial index creation
        sample_yaml = """
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: example
        spec:
          replicas: 3
          selector:
            matchLabels:
              app: example
          template:
            metadata:
              labels:
                app: example
            spec:
              containers:
              - name: nginx
                image: nginx:latest
        """
        parsed_data.append(parse_yaml(sample_yaml))
        
        # Sample oc explain data
        resources = ["pod.spec", "deployment.spec", "service"]
        for resource in resources:
            result = run_oc_explain(resource)
            if result:
                parsed_data.append(result)
        return parsed_data

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
    return parsed_data

def main():
    """Initialize FAISS index."""
    os.makedirs(FAISS_INDEX_PATH, exist_ok=True)
    parsed_data = process_nas_files()
    if not parsed_data:
        print("No data to index. FAISS index not created.")
        return
    vector_store = create_vector_store(parsed_data)
    print(f"FAISS index created and saved at {FAISS_INDEX_PATH}")

if __name__ == "__main__":
    sys.path.append(str(Path(__file__).parent.parent))
    main()