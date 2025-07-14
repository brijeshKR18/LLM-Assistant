import yaml
import json

def parse_yaml(content):
    """Parse YAML content using PyYAML."""
    try:
        data = yaml.safe_load(content)
        metadata = {
            "source": "uploaded_yaml",
            "type": "yaml",
            "context": "project",
            "filename": "uploaded.yaml"
        }
        return {"content": json.dumps(data, indent=2), "metadata": metadata}
    except Exception as e:
        print(f"Error parsing YAML: {e}")
        return None