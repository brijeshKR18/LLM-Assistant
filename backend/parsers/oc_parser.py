import subprocess

def run_oc_explain(resource):
    """Run oc explain to fetch OpenShift API reference."""
    try:
        result = subprocess.run(["oc", "explain", resource, "--api-version=apps/v1"], capture_output=True, text=True)
        if result.returncode == 0:
            metadata = {
                "source": f"oc_explain_{resource}",
                "type": "oc_explain",
                "context": "api_reference",
                "resource": resource
            }
            return {"content": result.stdout.strip(), "metadata": metadata}
        else:
            print(f"Error running oc explain {resource}: {result.stderr}")
            return None
    except Exception as e:
        print(f"Error executing oc explain {resource}: {e}")
        return None