import requests
import time
import re
from urllib.parse import quote, urlparse
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import logging
from backend.config.web_search_config import (
    TRUSTED_WEBSITES, QUERY_PATTERNS, WEB_SEARCH_CONFIG, 
    CONTENT_FILTER, HYBRID_CONFIG
)

logger = logging.getLogger("WebSearchModule")

class TrustedWebSearch:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': WEB_SEARCH_CONFIG["user_agent"]
        })
        self.cache = {}
    
    def determine_website_category(self, query: str) -> List[str]:
        """Determine which website categories to search based on query content."""
        query_lower = query.lower()
        categories = []
        
        for category, patterns in QUERY_PATTERNS.items():
            if any(pattern in query_lower for pattern in patterns):
                categories.append(category)
        
        # Default to general tech if no specific category matches
        if not categories:
            categories = ["general_tech"]
        
        return categories
    
    def build_search_urls(self, query: str, categories: List[str]) -> List[str]:
        """Build direct Red Hat documentation URLs for targeted searches."""
        urls = []
        
        # Use direct documentation URLs based on categories
        for category in categories:
            if category in TRUSTED_WEBSITES:
                urls.extend(TRUSTED_WEBSITES[category])
        
        # If no specific category matches, use general tech URLs
        if not urls:
            urls.extend(TRUSTED_WEBSITES.get("general_tech", []))
        
        # Remove duplicates while preserving order
        urls = list(dict.fromkeys(urls))
        
        # Limit to max results
        return urls[:WEB_SEARCH_CONFIG["max_total_results"]]
    
    def fetch_page_content(self, url: str) -> Optional[Dict]:
        """Fetch and extract content from Red Hat documentation pages."""
        try:
            # Check cache first
            if WEB_SEARCH_CONFIG["enable_caching"] and url in self.cache:
                cache_time, content = self.cache[url]
                if time.time() - cache_time < WEB_SEARCH_CONFIG["cache_duration"]:
                    return content
            
            response = self.session.get(
                url, 
                timeout=WEB_SEARCH_CONFIG["timeout"],
                headers={
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            )
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove unwanted elements (Red Hat docs specific)
            for element in soup(['script', 'style', 'nav', 'footer', 'aside', 'header', 
                                'noscript', '.navigation', '.sidebar', '.breadcrumb']):
                element.decompose()
            
            # Try to find main content areas specific to Red Hat docs
            main_content = None
            
            # Common Red Hat documentation content selectors
            content_selectors = [
                'main', '.main-content', '.content', '.article-content', 
                '.documentation-content', '#main-content', '.book-content',
                '.chapter-content', '.section-content'
            ]
            
            for selector in content_selectors:
                main_content = soup.select_one(selector)
                if main_content:
                    break
            
            # If no specific content area found, use body
            if not main_content:
                main_content = soup.find('body')
            
            if main_content:
                content_text = main_content.get_text(separator=' ', strip=True)
            else:
                content_text = soup.get_text(separator=' ', strip=True)
            
            # Clean up the text
            content_text = re.sub(r'\s+', ' ', content_text)  # Replace multiple spaces with single space
            content_text = re.sub(r'\n\s*\n', '\n', content_text)  # Clean up line breaks
            
            # Apply content filtering
            if len(content_text) < CONTENT_FILTER["min_content_length"]:
                logger.debug(f"Content too short for {url}: {len(content_text)} chars")
                return None
            
            # Check for exclude patterns
            content_lower = content_text.lower()
            if any(pattern in content_lower for pattern in CONTENT_FILTER["exclude_patterns"]):
                logger.debug(f"Content filtered out for {url} due to exclude patterns")
                return None
            
            # Get page title
            title = "Red Hat Documentation"
            if soup.title:
                title = soup.title.string.strip()
            elif soup.find('h1'):
                title = soup.find('h1').get_text(strip=True)
            
            # Truncate content if too long
            if len(content_text) > WEB_SEARCH_CONFIG["max_content_length"]:
                content_text = content_text[:WEB_SEARCH_CONFIG["max_content_length"]] + "...\n[Content truncated - see full documentation at source URL]"
            
            result = {
                "url": url,
                "title": title,
                "content": content_text,
                "domain": urlparse(url).netloc,
                "timestamp": time.time(),
                "doc_type": self._determine_doc_type(url, title)
            }
            
            # Cache the result
            if WEB_SEARCH_CONFIG["enable_caching"]:
                self.cache[url] = (time.time(), result)
            
            logger.info(f"Successfully extracted {len(content_text)} chars from {url}")
            return result
            
        except requests.RequestException as e:
            logger.warning(f"Network error fetching {url}: {str(e)}")
            return None
        except Exception as e:
            logger.warning(f"Failed to fetch content from {url}: {str(e)}")
            return None
    
    def _determine_doc_type(self, url: str, title: str) -> str:
        """Determine the type of documentation based on URL and title."""
        url_lower = url.lower()
        title_lower = title.lower()
        
        if "openshift" in url_lower or "openshift" in title_lower:
            if "virtualization" in url_lower or "virtualization" in title_lower:
                return "OpenShift Virtualization"
            elif "postinstall" in url_lower or "post-install" in title_lower:
                return "OpenShift Post-Installation"
            else:
                return "OpenShift Container Platform"
        elif "rhel" in url_lower or "red_hat_enterprise_linux" in url_lower:
            return "Red Hat Enterprise Linux"
        elif "ansible" in url_lower or "automation_platform" in url_lower:
            return "Red Hat Ansible Automation Platform"
        else:
            return "Red Hat Documentation"
    
    def search_trusted_sites(self, query: str) -> List[Dict]:
        """Search trusted websites for relevant information."""
        categories = self.determine_website_category(query)
        logger.info(f"Searching categories: {categories} for query: {query}")
        
        search_urls = self.build_search_urls(query, categories)
        results = []
        
        for url in search_urls:
            content = self.fetch_page_content(url)
            if content:
                results.append(content)
                
            # Respect rate limits
            time.sleep(0.5)
            
            if len(results) >= WEB_SEARCH_CONFIG["max_total_results"]:
                break
        
        logger.info(f"Found {len(results)} web results for query: {query}")
        return results

class HybridKnowledgeSystem:
    def __init__(self, local_vector_store, local_qa_chain):
        self.local_vector_store = local_vector_store
        self.local_qa_chain = local_qa_chain
        self.web_search = TrustedWebSearch()
    
    def get_local_results(self, query: str) -> Dict:
        """Get results from local knowledge base."""
        try:
            if self.local_qa_chain:
                result = self.local_qa_chain({"query": query})
                return {
                    "answer": result.get("result", ""),
                    "sources": [doc.metadata for doc in result.get("source_documents", [])],
                    "confidence": "high"  # Local results are trusted
                }
        except Exception as e:
            logger.error(f"Local search failed: {str(e)}")
        
        return {"answer": "", "sources": [], "confidence": "none"}
    
    def get_web_results(self, query: str) -> List[Dict]:
        """Get results from trusted web sources."""
        return self.web_search.search_trusted_sites(query)
    
    def merge_results(self, local_result: Dict, web_results: List[Dict], query: str) -> Dict:
        """Merge local and web results into a comprehensive response."""
        
        # Prepare context for the LLM
        context_parts = []
        sources = []
        
        # Check weight configuration to determine what to include
        local_weight = HYBRID_CONFIG.get("local_weight",0.3)
        web_weight = HYBRID_CONFIG.get("web_weight",0.7)
        
        # Add local results only if local_weight > 0
        if local_weight > 0 and local_result["answer"]:
            context_parts.append(local_result['answer'])
            # Structure local sources properly
            for src in local_result['sources']:
                source_path = src.get('source', 'Unknown')
                # Extract just the filename from the full path
                filename = source_path.split('/')[-1] if '/' in source_path else source_path.split('\\')[-1]
                sources.append({
                    "type": "local",
                    "filename": filename,
                    "resource": filename
                })
        
        # Add web results from Red Hat documentation only if web_weight > 0
        if web_weight > 0 and web_results:
            web_context = ""
            for i, web_result in enumerate(web_results[:4], 1):  # Limit to top 4 web results
                doc_type = web_result.get('doc_type', 'Red Hat Documentation')
                title = web_result.get('title', 'Untitled')
                content = web_result.get('content', '')
                url = web_result.get('url', '')
                
                # Truncate content for context while preserving important info
                content_preview = content[:800] if len(content) > 800 else content
                if len(content) > 800:
                    content_preview += "...\n[See full documentation at source URL]"
                
                web_context += f"{title}:\n{content_preview}\n\n"
                
                # Structure web sources properly
                sources.append({
                    "type": "web",
                    "title": title,
                    "resource": url,
                    "doc_type": doc_type
                })
            
            context_parts.append(web_context)
        
        # Combine all context
        full_context = "\n\n".join(context_parts)
        
        # Truncate if too long
        if len(full_context) > HYBRID_CONFIG["max_hybrid_context"]:
            full_context = full_context[:HYBRID_CONFIG["max_hybrid_context"]] + "...\n[Context truncated - prioritizing most relevant information]"
        
        return {
            "context": full_context,
            "sources": sources,
            "has_local": bool(local_result["answer"]),
            "has_web": bool(web_results),
            "query": query,
            "documentation_types": [result.get('doc_type', 'Unknown') for result in web_results] if web_results else []
        }
    
    def hybrid_search(self, query: str) -> Dict:
        """Perform hybrid search combining local and web knowledge."""
        
        # Check weight configuration to determine what to search
        local_weight = HYBRID_CONFIG.get("local_weight", 0.5)
        web_weight = HYBRID_CONFIG.get("web_weight", 0.5)
        
        # Get local results only if local_weight > 0
        local_result = {"answer": "", "sources": [], "confidence": "none"}
        if local_weight > 0:
            local_result = self.get_local_results(query)
        
        # Get web results only if web_weight > 0
        web_results = []
        if web_weight > 0:
            web_results = self.get_web_results(query)
        
        # Merge results
        merged_result = self.merge_results(local_result, web_results, query)
        
        return merged_result
