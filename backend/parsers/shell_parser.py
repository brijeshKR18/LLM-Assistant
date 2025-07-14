def parse_shell_script(content, filter=False):
    """Parse shell script content and optionally filter relevant commands."""
    if not content:
        return None
    
    lines = content.splitlines()
    relevant_content = []
    metadata = {"source": "uploaded_file", "type": "shell"}
    
    if filter:
        # Filter out comments and boilerplate (e.g., chown, chmod)
        for line in lines:
            line = line.strip()
            if not line:
                continue
            if line.startswith('#'):
                continue
            if any(keyword in line.lower() for keyword in ['chown', 'chmod', 'systemctl enable', 'systemctl start', 'firewall-cmd']):
                continue
            if any(keyword in line.lower() for keyword in ['dnf', 'yum', 'vim', 'named.conf', 'named.rfc1912.zones', 'named']):
                relevant_content.append(line)
    else:
        relevant_content = lines
    
    if not relevant_content:
        return {"content": "", "relevant_content": "", "metadata": metadata}
    
    full_content = "\n".join(lines)
    filtered_content = "\n".join(relevant_content)
    
    return {
        "content": full_content,
        "relevant_content": filtered_content,
        "metadata": metadata
    }