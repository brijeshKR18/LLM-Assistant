from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.docstore.document import Document
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from typing import List, Dict, Any
import numpy as np
from pathlib import Path
import pickle

class OptimizedVectorStore:
    def __init__(self, embedding_model_name: str = "sentence-transformers/all-mpnet-base-v2"):
        self.embedding_model = HuggingFaceEmbeddings(
            model_name=embedding_model_name,
            model_kwargs={'device': 'cpu'},  # Use 'cuda' if GPU available
            encode_kwargs={'normalize_embeddings': True}
        )
        self.vector_store = None
        self.bm25_retriever = None
        self.ensemble_retriever = None
        self.reranker = HuggingFaceCrossEncoder(model_name="cross-encoder/ms-marco-MiniLM-L-6-v2")
        
        # Optimized text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
    
    def create_optimized_chunks(self, documents: List[Dict]) -> List[Document]:
        """Create optimized document chunks with better text splitting."""
        processed_docs = []
        
        for doc in documents:
            content = doc["content"]
            metadata = doc["metadata"]
            
            # Split large documents into chunks
            if len(content) > 1000:
                chunks = self.text_splitter.split_text(content)
                for i, chunk in enumerate(chunks):
                    chunk_metadata = metadata.copy()
                    chunk_metadata.update({
                        "chunk_id": i,
                        "total_chunks": len(chunks),
                        "chunk_size": len(chunk)
                    })
                    processed_docs.append(Document(page_content=chunk, metadata=chunk_metadata))
            else:
                processed_docs.append(Document(page_content=content, metadata=metadata))
        
        return processed_docs
    
    def create_hybrid_retriever(self, documents: List[Dict], faiss_path: str = "./faiss_index"):
        """Create a hybrid retriever combining FAISS and BM25."""
        # Process documents into optimized chunks
        processed_docs = self.create_optimized_chunks(documents)
        
        # Create FAISS vector store
        self.vector_store = FAISS.from_documents(processed_docs, self.embedding_model)
        self.vector_store.save_local(faiss_path)
        
        # Create BM25 retriever
        self.bm25_retriever = BM25Retriever.from_documents(processed_docs)
        self.bm25_retriever.k = 5
        
        # Create ensemble retriever (combines both)
        faiss_retriever = self.vector_store.as_retriever(search_kwargs={"k": 5})
        
        self.ensemble_retriever = EnsembleRetriever(
            retrievers=[faiss_retriever, self.bm25_retriever],
            weights=[0.7, 0.3]  # Favor vector search slightly
        )
        
        return self.ensemble_retriever
    
    def retrieve_with_reranking(self, query: str, k: int = 8) -> List[Document]:
        """Retrieve documents with cross-encoder reranking."""
        if not self.ensemble_retriever:
            raise ValueError("Retriever not initialized. Call create_hybrid_retriever first.")
        
        # Initial retrieval (get more docs for reranking)
        initial_docs = self.ensemble_retriever.get_relevant_documents(query)
        
        if not initial_docs:
            return []
        
        # Rerank using cross-encoder
        doc_texts = [doc.page_content for doc in initial_docs]
        scores = self.reranker.score([[query, text] for text in doc_texts])
        
        # Sort by reranking scores
        scored_docs = list(zip(initial_docs, scores))
        scored_docs.sort(key=lambda x: x[1], reverse=True)
        
        # Return top k reranked documents
        return [doc for doc, score in scored_docs[:k]]
    
    def load_existing_store(self, faiss_path: str = "./faiss_index"):
        """Load existing FAISS store and create retrievers."""
        try:
            self.vector_store = FAISS.load_local(
                faiss_path, 
                embeddings=self.embedding_model,
                allow_dangerous_deserialization=True
            )
            
            # Load BM25 retriever if exists
            bm25_path = Path(faiss_path) / "bm25_retriever.pkl"
            if bm25_path.exists():
                with open(bm25_path, 'rb') as f:
                    self.bm25_retriever = pickle.load(f)
                
                # Recreate ensemble retriever
                faiss_retriever = self.vector_store.as_retriever(search_kwargs={"k": 5})
                self.ensemble_retriever = EnsembleRetriever(
                    retrievers=[faiss_retriever, self.bm25_retriever],
                    weights=[0.7, 0.3]
                )
            
            return True
        except Exception as e:
            print(f"Failed to load existing store: {e}")
            return False
    
    def save_bm25_retriever(self, faiss_path: str = "./faiss_index"):
        """Save BM25 retriever for persistence."""
        if self.bm25_retriever:
            bm25_path = Path(faiss_path) / "bm25_retriever.pkl"
            with open(bm25_path, 'wb') as f:
                pickle.dump(self.bm25_retriever, f)

# Usage example functions
def create_optimized_vector_store(parsed_data: List[Dict], faiss_path: str = "./faiss_index"):
    """Create optimized vector store with hybrid retrieval."""
    store = OptimizedVectorStore()
    retriever = store.create_hybrid_retriever(parsed_data, faiss_path)
    store.save_bm25_retriever(faiss_path)
    return store, retriever

def load_optimized_vector_store(faiss_path: str = "./faiss_index"):
    """Load existing optimized vector store."""
    store = OptimizedVectorStore()
    if store.load_existing_store(faiss_path):
        return store
    return None
