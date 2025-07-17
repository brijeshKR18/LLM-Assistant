# Web search configuration for combining local and internet knowledge

# Trusted websites for different types of queries - SPECIFIC REDHAT DOCUMENTATION URLS
TRUSTED_WEBSITES = {
    "openshift": [
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.16",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.17",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.18",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.19",
        "https://docs.redhat.com/en/documentation/openshift_container_platform",
        "https://www.google.com"
    ],
    "kubernetes": [
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.16",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.17",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.18",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.19",
        "https://docs.redhat.com/en/documentation/openshift_container_platform",
        "https://www.google.com"
    ],
    "rhel": [
        # "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7",
        # "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8",
        # "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9",
        # "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10",
        "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux",
        "https://www.google.com"
    ],
    "ansible": [
        # "https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.5",
        "https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform",
        "https://www.google.com"
    ],
    "virtualization": [
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.16/html/virtualization/index",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.17/html/virtualization/index",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/virtualization/index",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.19/html/virtualization/index",
        "https://docs.redhat.com/en/documentation/openshift_container_platform",
        "https://www.google.com"
    ],
    "containerization": [
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.16",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.17",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.18",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.19",
        # "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7",
        # "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8",
        # "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9",
        # "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10",
        "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux",
        "https://www.google.com"
    ],
    "configuration": [
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.16/html/postinstallation_configuration/index",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.17/html/postinstallation_configuration/index",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/postinstallation_configuration/index",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.19/html/postinstallation_configuration/index",
        # "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7",
        # "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8",
        # "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9",
        # "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10",
        "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux",
        "https://docs.redhat.com/en/documentation/openshift_container_platform",
        "https://www.google.com"
    ],
    "general_tech": [
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.16",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.17",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.18",
        # "https://docs.redhat.com/en/documentation/openshift_container_platform/4.19",
        # "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7",
        # "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8",
        # "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9",
        # "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10",
        # "https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.5",
        "https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform",
        "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux",
        "https://docs.redhat.com/en/documentation/openshift_container_platform",
        "https://www.google.com"
    ]
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
    "max_content_length": 3000,    # More content since it's official docs
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
    "local_weight": 0.3,      # 30% weight to local documents
    "web_weight": 0.7,        # 70% weight to web content
    "merge_strategy": "complement",  # "complement" or "verify" or "expand"
    "max_hybrid_context": 16000,  # Total context limit for hybrid responses
    "prioritize_local": True,     # Show local results first
    "web_fallback": True         # Use web if local results insufficient
}
