import subprocess
import json
import re
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import os

logger = logging.getLogger("ConfigGuidanceAPI")

class OpenShiftCommandHandler:
    """Enhanced OpenShift command handler for dynamic oc command execution."""
    
    def __init__(self, cache_duration_minutes: int = 30):
        self.cache = {}
        self.cache_duration = timedelta(minutes=cache_duration_minutes)
        self.supported_commands = {
            'explain': self._run_oc_explain,
            'get': self._run_oc_get,
            'describe': self._run_oc_describe,
            'status': self._run_oc_status,
            'version': self._run_oc_version,
            'api-resources': self._run_oc_api_resources,
            'whoami': self._run_oc_whoami
        }
        
    def detect_oc_commands_needed(self, query: str) -> List[Dict]:
        """Detect what oc commands should be run based on the query."""
        commands_to_run = []
        query_lower = query.lower()
        
        # Resource explanation patterns
        explain_patterns = [
            r'(?:what is|explain|describe)\s+(?:a\s+)?(\w+)(?:\.(\w+))?',
            r'(\w+)\.spec',
            r'(\w+)\s+api\s+reference',
            r'(\w+)\s+resource\s+definition'
        ]
        
        for pattern in explain_patterns:
            match = re.search(pattern, query_lower)
            if match:
                resource = match.group(1)
                if self._is_valid_openshift_resource(resource):
                    commands_to_run.append({
                        'command': 'explain',
                        'resource': resource,
                        'priority': 1
                    })
        
        # Status and cluster info patterns
        status_patterns = [
            r'cluster\s+status',
            r'openshift\s+status',
            r'system\s+status',
            r'node\s+status'
        ]
        
        for pattern in status_patterns:
            if re.search(pattern, query_lower):
                commands_to_run.append({
                    'command': 'status',
                    'priority': 2
                })
                break
        
        # Resource listing patterns
        get_patterns = [
            r'list\s+(\w+)s?',
            r'show\s+(\w+)s?',
            r'get\s+(\w+)s?',
            r'all\s+(\w+)s?'
        ]
        
        for pattern in get_patterns:
            match = re.search(pattern, query_lower)
            if match:
                resource = match.group(1)
                if self._is_valid_openshift_resource(resource):
                    commands_to_run.append({
                        'command': 'get',
                        'resource': resource,
                        'priority': 3
                    })
        
        # Version and API patterns
        if any(term in query_lower for term in ['version', 'api version', 'kubernetes version']):
            commands_to_run.append({
                'command': 'version',
                'priority': 4
            })
        
        # API resources patterns
        if any(term in query_lower for term in ['api resources', 'available resources', 'supported resources']):
            commands_to_run.append({
                'command': 'api-resources',
                'priority': 3
            })
        
        # Authentication patterns
        if any(term in query_lower for term in ['who am i', 'current user', 'logged in as']):
            commands_to_run.append({
                'command': 'whoami',
                'priority': 4
            })
        
        # Sort by priority and remove duplicates
        commands_to_run = sorted(commands_to_run, key=lambda x: x['priority'])
        seen = set()
        unique_commands = []
        for cmd in commands_to_run:
            cmd_key = (cmd['command'], cmd.get('resource', ''))
            if cmd_key not in seen:
                seen.add(cmd_key)
                unique_commands.append(cmd)
        
        return unique_commands[:5]  # Limit to 5 commands max
    
    def execute_commands(self, commands: List[Dict]) -> Dict[str, Dict]:
        """Execute multiple oc commands and return results."""
        results = {}
        
        for cmd_info in commands:
            try:
                command_type = cmd_info['command']
                if command_type in self.supported_commands:
                    result = self.supported_commands[command_type](cmd_info)
                    if result:
                        cache_key = self._get_cache_key(cmd_info)
                        results[cache_key] = result
                        self._cache_result(cache_key, result)
                        
            except Exception as e:
                logger.error(f"Failed to execute oc command {cmd_info}: {e}")
                continue
        
        return results
    
    def _run_oc_explain(self, cmd_info: Dict) -> Optional[Dict]:
        """Run oc explain command."""
        resource = cmd_info.get('resource', '')
        cache_key = f"explain_{resource}"
        
        # Check cache first
        cached = self._get_cached_result(cache_key)
        if cached:
            return cached
        
        try:
            # Try different API versions
            api_versions = ['', '--api-version=apps/v1', '--api-version=v1']
            
            for api_version in api_versions:
                cmd = ['oc', 'explain', resource]
                if api_version:
                    cmd.append(api_version)
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0:
                    return {
                        "content": result.stdout.strip(),
                        "metadata": {
                            "source": f"oc_explain_{resource}",
                            "type": "oc_explain",
                            "context": "api_reference",
                            "resource": resource,
                            "timestamp": datetime.now().isoformat(),
                            "command": " ".join(cmd)
                        }
                    }
            
            logger.warning(f"oc explain {resource} failed with all API versions")
            return None
            
        except subprocess.TimeoutExpired:
            logger.error(f"oc explain {resource} timed out")
            return None
        except Exception as e:
            logger.error(f"Error running oc explain {resource}: {e}")
            return None
    
    def _run_oc_get(self, cmd_info: Dict) -> Optional[Dict]:
        """Run oc get command."""
        resource = cmd_info.get('resource', '')
        cache_key = f"get_{resource}"
        
        # Check cache first
        cached = self._get_cached_result(cache_key)
        if cached:
            return cached
        
        try:
            cmd = ['oc', 'get', resource, '-o', 'wide']
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                return {
                    "content": f"Command: {' '.join(cmd)}\n\n{result.stdout.strip()}",
                    "metadata": {
                        "source": f"oc_get_{resource}",
                        "type": "oc_get",
                        "context": "cluster_state",
                        "resource": resource,
                        "timestamp": datetime.now().isoformat(),
                        "command": " ".join(cmd)
                    }
                }
            else:
                logger.warning(f"oc get {resource} failed: {result.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            logger.error(f"oc get {resource} timed out")
            return None
        except Exception as e:
            logger.error(f"Error running oc get {resource}: {e}")
            return None
    
    def _run_oc_describe(self, cmd_info: Dict) -> Optional[Dict]:
        """Run oc describe command."""
        resource = cmd_info.get('resource', '')
        name = cmd_info.get('name', '')
        cache_key = f"describe_{resource}_{name}"
        
        # Check cache first (shorter cache for describe)
        cached = self._get_cached_result(cache_key, max_age_minutes=10)
        if cached:
            return cached
        
        try:
            cmd = ['oc', 'describe', resource]
            if name:
                cmd.append(name)
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                return {
                    "content": f"Command: {' '.join(cmd)}\n\n{result.stdout.strip()}",
                    "metadata": {
                        "source": f"oc_describe_{resource}",
                        "type": "oc_describe",
                        "context": "resource_details",
                        "resource": resource,
                        "timestamp": datetime.now().isoformat(),
                        "command": " ".join(cmd)
                    }
                }
            else:
                logger.warning(f"oc describe {resource} failed: {result.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            logger.error(f"oc describe {resource} timed out")
            return None
        except Exception as e:
            logger.error(f"Error running oc describe {resource}: {e}")
            return None
    
    def _run_oc_status(self, cmd_info: Dict) -> Optional[Dict]:
        """Run oc status command."""
        cache_key = "status"
        
        # Check cache first (shorter cache for status)
        cached = self._get_cached_result(cache_key, max_age_minutes=5)
        if cached:
            return cached
        
        try:
            cmd = ['oc', 'status']
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                return {
                    "content": f"Command: {' '.join(cmd)}\n\n{result.stdout.strip()}",
                    "metadata": {
                        "source": "oc_status",
                        "type": "oc_status",
                        "context": "cluster_overview",
                        "timestamp": datetime.now().isoformat(),
                        "command": " ".join(cmd)
                    }
                }
            else:
                logger.warning(f"oc status failed: {result.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            logger.error("oc status timed out")
            return None
        except Exception as e:
            logger.error(f"Error running oc status: {e}")
            return None
    
    def _run_oc_version(self, cmd_info: Dict) -> Optional[Dict]:
        """Run oc version command."""
        cache_key = "version"
        
        # Check cache first (longer cache for version)
        cached = self._get_cached_result(cache_key, max_age_minutes=60)
        if cached:
            return cached
        
        try:
            cmd = ['oc', 'version']
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                return {
                    "content": f"Command: {' '.join(cmd)}\n\n{result.stdout.strip()}",
                    "metadata": {
                        "source": "oc_version",
                        "type": "oc_version",
                        "context": "version_info",
                        "timestamp": datetime.now().isoformat(),
                        "command": " ".join(cmd)
                    }
                }
            else:
                logger.warning(f"oc version failed: {result.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            logger.error("oc version timed out")
            return None
        except Exception as e:
            logger.error(f"Error running oc version: {e}")
            return None
    
    def _run_oc_api_resources(self, cmd_info: Dict) -> Optional[Dict]:
        """Run oc api-resources command."""
        cache_key = "api_resources"
        
        # Check cache first
        cached = self._get_cached_result(cache_key, max_age_minutes=30)
        if cached:
            return cached
        
        try:
            cmd = ['oc', 'api-resources']
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                return {
                    "content": f"Command: {' '.join(cmd)}\n\n{result.stdout.strip()}",
                    "metadata": {
                        "source": "oc_api_resources",
                        "type": "oc_api_resources",
                        "context": "api_reference",
                        "timestamp": datetime.now().isoformat(),
                        "command": " ".join(cmd)
                    }
                }
            else:
                logger.warning(f"oc api-resources failed: {result.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            logger.error("oc api-resources timed out")
            return None
        except Exception as e:
            logger.error(f"Error running oc api-resources: {e}")
            return None
    
    def _run_oc_whoami(self, cmd_info: Dict) -> Optional[Dict]:
        """Run oc whoami command."""
        cache_key = "whoami"
        
        # Check cache first
        cached = self._get_cached_result(cache_key, max_age_minutes=60)
        if cached:
            return cached
        
        try:
            cmd = ['oc', 'whoami']
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                return {
                    "content": f"Command: {' '.join(cmd)}\n\n{result.stdout.strip()}",
                    "metadata": {
                        "source": "oc_whoami",
                        "type": "oc_whoami",
                        "context": "authentication",
                        "timestamp": datetime.now().isoformat(),
                        "command": " ".join(cmd)
                    }
                }
            else:
                logger.warning(f"oc whoami failed: {result.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            logger.error("oc whoami timed out")
            return None
        except Exception as e:
            logger.error(f"Error running oc whoami: {e}")
            return None
    
    def _is_valid_openshift_resource(self, resource: str) -> bool:
        """Check if the resource is a valid OpenShift/Kubernetes resource."""
        common_resources = {
            'pod', 'pods', 'deployment', 'deployments', 'service', 'services',
            'route', 'routes', 'configmap', 'configmaps', 'secret', 'secrets',
            'pvc', 'persistentvolumeclaim', 'persistentvolumeclaims',
            'node', 'nodes', 'namespace', 'namespaces', 'project', 'projects',
            'replicaset', 'replicasets', 'daemonset', 'daemonsets',
            'statefulset', 'statefulsets', 'job', 'jobs', 'cronjob', 'cronjobs',
            'ingress', 'networkpolicy', 'networkpolicies', 'serviceaccount',
            'serviceaccounts', 'role', 'roles', 'rolebinding', 'rolebindings',
            'clusterrole', 'clusterroles', 'clusterrolebinding', 'clusterrolebindings',
            'imagestream', 'imagestreams', 'buildconfig', 'buildconfigs',
            'deploymentconfig', 'deploymentconfigs', 'build', 'builds'
        }
        return resource.lower() in common_resources
    
    def _get_cache_key(self, cmd_info: Dict) -> str:
        """Generate cache key for command."""
        command = cmd_info['command']
        resource = cmd_info.get('resource', '')
        name = cmd_info.get('name', '')
        return f"{command}_{resource}_{name}".strip('_')
    
    def _cache_result(self, key: str, result: Dict):
        """Cache command result."""
        self.cache[key] = {
            'result': result,
            'timestamp': datetime.now()
        }
    
    def _get_cached_result(self, key: str, max_age_minutes: int = None) -> Optional[Dict]:
        """Get cached result if still valid."""
        if key not in self.cache:
            return None
        
        cache_entry = self.cache[key]
        age = datetime.now() - cache_entry['timestamp']
        max_age = timedelta(minutes=max_age_minutes or 30)
        
        if age < max_age:
            return cache_entry['result']
        else:
            # Remove expired entry
            del self.cache[key]
            return None
    
    def check_oc_availability(self) -> bool:
        """Check if oc command is available and user is logged in."""
        try:
            # Check if oc is available
            result = subprocess.run(['oc', 'version', '--client'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode != 0:
                return False
            
            # Check if logged in
            result = subprocess.run(['oc', 'whoami'], 
                                  capture_output=True, text=True, timeout=10)
            return result.returncode == 0
            
        except Exception:
            return False

# Global instance
oc_handler = OpenShiftCommandHandler()

def run_oc_explain(resource):
    """Run oc explain to fetch OpenShift API reference (legacy function)."""
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

def detect_and_run_oc_commands(query: str) -> Dict[str, Dict]:
    """Detect and run appropriate oc commands for a query."""
    if not oc_handler.check_oc_availability():
        logger.warning("oc command not available or user not logged in")
        return {}
    
    commands = oc_handler.detect_oc_commands_needed(query)
    if not commands:
        return {}
    
    return oc_handler.execute_commands(commands)