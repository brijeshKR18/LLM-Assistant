from bs4 import BeautifulSoup
import html2text

def parse_html(content):
    """Parse HTML content using BeautifulSoup and html2text."""
    try:
        soup = BeautifulSoup(content, 'html.parser')
        text_maker = html2text.HTML2Text()
        text_maker.ignore_links = True
        text = text_maker.handle(str(soup))
        metadata = {
            "source": "uploaded_html",
            "type": "html",
            "context": "documentation",
            "filename": "uploaded.html"
        }
        return {"content": text.strip(), "metadata": metadata}
    except Exception as e:
        print(f"Error parsing HTML: {e}")
        return None