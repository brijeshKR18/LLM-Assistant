from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.docstore.document import Document
from pathlib import Path

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
FAISS_INDEX_PATH = "./faiss_index"

def create_vector_store(parsed_data):
    """Create or update FAISS vector store with embeddings."""
    if not parsed_data:
        raise ValueError("parsed_data is empty. Cannot create vector store with no data.")
    embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    documents = [
        Document(page_content=data["content"], metadata=data["metadata"])
        for data in parsed_data
    ]
    index_file = Path(FAISS_INDEX_PATH) / "index.faiss"
    if index_file.exists():
        try:
            vector_store = FAISS.load_local(FAISS_INDEX_PATH, embeddings=embedding_model, allow_dangerous_deserialization=True)
            vector_store.add_documents(documents)
        except Exception as e:
            print(f"Error loading existing FAISS index: {e}. Creating new index.")
            vector_store = FAISS.from_documents(documents, embedding_model)
    else:
        vector_store = FAISS.from_documents(documents, embedding_model)
    vector_store.save_local(FAISS_INDEX_PATH)
    return vector_store