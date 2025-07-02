import os
import logging
from pathlib import Path
from typing import List
import pdfplumber
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.schema import Document

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DOCS_PATH = Path("./rhel_docs")
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 100
EMBED_MODEL = "all-MiniLM-L6-v2"
INDEX_SAVE_PATH = "rhel_faiss_index"


def load_pdfs_with_pdfplumber(path: Path) -> List[Document]:
    """
    Load PDFs from a directory using pdfplumber and return as LangChain Documents.
    """
    documents = []
    if not path.exists():
        logger.error(f"Documents path {path} does not exist.")
        return documents

    for file in path.iterdir():
        if file.suffix.lower() == ".pdf":
            logger.info(f"Reading {file.name}")
            try:
                with pdfplumber.open(file) as pdf:
                    text = ""
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
                if text.strip():
                    doc = Document(
                        page_content=text,
                        metadata={
                            "source": file.name,
                            "pages": len(pdf.pages),
                            "file_path": str(file)
                        }
                    )
                    documents.append(doc)
                else:
                    logger.warning(f"No extractable text in {file.name}")
            except Exception as e:
                logger.error(f"Error reading {file.name}: {e}")
    return documents


def create_vectorstore(docs: List[Document], embed_model: str, index_path: str) -> None:
    """
    Create and save a FAISS vectorstore from documents.
    """
    splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
    split_docs = splitter.split_documents(docs)
    logger.info(f"📄 Split into {len(split_docs)} chunks.")

    logger.info("💡 Creating embeddings and vectorstore...")
    embeddings = HuggingFaceEmbeddings(model_name=embed_model)
    vectorstore = FAISS.from_documents(split_docs, embeddings)

    vectorstore.save_local(index_path)
    logger.info(f"🎉 Vector store saved to '{index_path}'")


if __name__ == "__main__":
    logger.info("🔍 Loading PDFs with pdfplumber...")
    all_docs = load_pdfs_with_pdfplumber(DOCS_PATH)
    logger.info(f"✅ Loaded {len(all_docs)} documents.")

    if all_docs:
        create_vectorstore(all_docs, EMBED_MODEL, INDEX_SAVE_PATH)
    else:
        logger.warning("No documents loaded. Exiting.")
