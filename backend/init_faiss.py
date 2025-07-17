import os
from pathlib import Path
import sys
from parsers.pdf_parser import parse_pdf
from parsers.yaml_parser import parse_yaml
from parsers.shell_parser import parse_shell_script
from parsers.html_parser import parse_html
from parsers.oc_parser import run_oc_explain
from vector_store.faiss_store import create_vector_store
from vector_store.optimized_retrieval import create_optimized_vector_store


NAS_PATH = "../nas_data"  # Adjust to your NAS path
FAISS_INDEX_PATH = "faiss_index"

def process_nas_files():
    """Process all files in the NAS directory with enhanced directory structure support."""
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
        """
        sample_doc = {
            "content": sample_yaml,
            "metadata": {
                "source": "sample_deployment.yaml",
                "type": "kubernetes_yaml"
            }
        }
        parsed_data.append(sample_doc)
        return parsed_data
    
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
    
    print(f"Processing NAS directory: {NAS_PATH}")
    
    for root, dirs, files in os.walk(NAS_PATH):
        if files:  # Only log directories that contain files
            relative_path = os.path.relpath(root, NAS_PATH)
            file_stats["directories"].add(relative_path)
            print(f"Processing directory: {relative_path} ({len(files)} files)")
        
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
                    continue
                
                if result:
                    # Enhance result metadata with directory information
                    if hasattr(result, 'metadata'):
                        result.metadata.update(base_metadata)
                    elif isinstance(result, dict) and 'metadata' in result:
                        result['metadata'].update(base_metadata)
                    else:
                        # Handle different result formats
                        if isinstance(result, dict):
                            result['metadata'] = base_metadata
                        else:
                            result.metadata = base_metadata
                    parsed_data.append(result)
                    
            except Exception as e:
                print(f"Failed to process file: {file} in {relative_dir} - Error: {str(e)}")
                file_stats["skipped"] += 1
    
    # Enhanced logging with detailed statistics
    print(f"\nCompleted NAS directory processing:")
    print(f"  Total files found: {file_stats['total_files']}")
    print(f"  Successfully processed: {len(parsed_data)}")
    print(f"  PDF files: {file_stats['pdf']}")
    print(f"  YAML files: {file_stats['yaml']}")
    print(f"  Shell files: {file_stats['shell']}")
    print(f"  HTML files: {file_stats['html']}")
    print(f"  Skipped files: {file_stats['skipped']}")
    print(f"  Directories processed: {len(file_stats['directories'])}")
    print(f"  Directories: {sorted(list(file_stats['directories']))}")
    
    return parsed_data

def main():
    """Initialize FAISS index."""
    os.makedirs(FAISS_INDEX_PATH, exist_ok=True)
    parsed_data = process_nas_files()
    if not parsed_data:
        print("No data to index. FAISS index not created.")
        return
    vector_store = create_vector_store(parsed_data)
    # vector_store = create_optimized_vector_store(parsed_data)
    print(f"FAISS index created and saved at {FAISS_INDEX_PATH}")

if __name__ == "__main__":
    sys.path.append(str(Path(__file__).parent.parent))
    main()