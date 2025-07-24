# Web search configuration for combining local and internet knowledge

# Trusted websites for different types of queries - SPECIFIC REDHAT DOCUMENTATION URLS
TRUSTED_WEBSITES = {
    "openshift": [
        "https://docs.redhat.com/en/documentation/openshift_container_platform",
    ],
    "kubernetes": [
        "https://docs.redhat.com/en/documentation/openshift_container_platform",
    ],
    "rhel": [
        "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux",
    ],
    "ansible": [
        "https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform",
    ],
    "virtualization": [
        "https://docs.redhat.com/en/documentation/openshift_container_platform",
    ],
    "containerization": [
        "https://docs.redhat.com/en/documentation/openshift_container_platform",
        "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux",
    ],
    "configuration": [
        "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux",
        "https://docs.redhat.com/en/documentation/openshift_container_platform",
    ],
    "general_tech": [
        "https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform",
        "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux",
        "https://docs.redhat.com/en/documentation/openshift_container_platform",
    ]
}

OPENSHIFT_VERSION_URLS = {
    "4.16": "https://docs.redhat.com/en/documentation/openshift_container_platform/4.16",
    "4.17": "https://docs.redhat.com/en/documentation/openshift_container_platform/4.17",
    "4.18": "https://docs.redhat.com/en/documentation/openshift_container_platform/4.18",
    "4.19": "https://docs.redhat.com/en/documentation/openshift_container_platform/4.19",
    "4.15": "https://docs.redhat.com/en/documentation/openshift_container_platform/4.15",
    "4.14": "https://docs.redhat.com/en/documentation/openshift_container_platform/4.14",
    "4.13": "https://docs.redhat.com/en/documentation/openshift_container_platform/4.13",
    "4.12": "https://docs.redhat.com/en/documentation/openshift_container_platform/4.12"
}

# Version-specific URLs for RHEL documentation
RHEL_VERSION_URLS = {
    "9": "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9",
    "8": "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8",
    "7": "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7"
}

# Search query patterns to determine which websites to use - ENHANCED WITH ANSIBLE AND VIRTUALIZATION
QUERY_PATTERNS = {
    "openshift": ["openshift", "oc command", "cluster", "operator", "route", "pod", "deployment", "postinstall", "post-install"],
    "kubernetes": ["kubernetes", "kubectl", "pod", "deployment", "service", "ingress", "container"],
    "rhel": ["rhel", "red hat", "linux", "systemd", "rpm", "yum", "dnf", "enterprise linux", "installation", "install"],
    "ansible": ["ansible", "automation", "playbook", "tower", "awx", "automation platform"],
    "virtualization": ["virtualization", "virtual machine", "vm", "virt", "kvm", "libvirt", "hypervisor"],
    "containerization": ["docker", "podman", "container", "image", "dockerfile", "buildah"],
    "configuration": ["yaml", "config", "configuration", "settings", "parameters", "setup", "postinstall"]
}

# Web search settings - OPTIMIZED FOR REDHAT DOCS
WEB_SEARCH_CONFIG = {
    "max_results_per_site": 5,     # More results since we're only using one site
    "max_total_results": 8,        # Increased for better coverage
    "timeout": 15,                 # Longer timeout for thorough search
    "max_content_length": 12000,    # Increased for longer content
    "enable_caching": True,
    "cache_duration": 7200,        # 2 hour cache for official docs
    "user_agent": "LLM-Assistant/1.0 (Educational Purpose - Red Hat Documentation)"
}

# Content filtering settings
CONTENT_FILTER = {
    "min_content_length": 100,
    "exclude_patterns": [
        "advertisement", "cookie policy", "privacy policy", 
        "subscribe", "newsletter", "login required"
    ],
    "include_patterns": [
        "documentation", "tutorial", "guide", "example", 
        "configuration", "setup", "installation"
    ]
}

# Hybrid response configuration
HYBRID_CONFIG = {
    "local_weight": 0.4,      # 30% weight to local documents
    "web_weight": 0.6,        # 70% weight to web content
    "merge_strategy": "complement",  # "complement" or "verify" or "expand"
    "max_hybrid_context": 64000,  # Further increased context limit for full responses
    "prioritize_local": True,     # Show local results first
    "web_fallback": True         # Use web if local results insufficient
}
