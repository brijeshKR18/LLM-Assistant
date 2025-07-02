import os
import yaml
import pdfplumber
from pathlib import Path
from langchain_ollama import OllamaLLM
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.chains import RetrievalQA
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter

INDEX_PATH = "rhel_faiss_index"
EMBED_MODEL = "all-MiniLM-L6-v2"

# Load vectorstore
def load_vectorstore(index_path=INDEX_PATH, embed_model=EMBED_MODEL):
    embeddings = HuggingFaceEmbeddings(model_name=embed_model)
    vectorstore = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
    return vectorstore

vectorstore = load_vectorstore()

def extract_text(file_path: str) -> str:
    if file_path.endswith(".pdf"):
        with pdfplumber.open(file_path) as pdf:
            return "\n".join([page.extract_text() or "" for page in pdf.pages])
    elif file_path.endswith((".yaml", ".yml")):
        with open(file_path, "r") as f:
            data = yaml.safe_load(f)
            return yaml.dump(data, default_flow_style=False)
    elif file_path.endswith(".txt") or file_path.endswith(".sh"):
        with open(file_path, "r") as f:
            return f.read()
    else:
        return ""

def embed_uploaded_file(file_path: str, embed_model_name=EMBED_MODEL):
    text = extract_text(file_path)
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
    docs = splitter.split_text(text)
    documents = [Document(page_content=chunk) for chunk in docs]

    embeddings = HuggingFaceEmbeddings(model_name=embed_model_name)
    upload_vectorstore = FAISS.from_documents(documents, embeddings)
    return upload_vectorstore

def run_query(query: str, model_choice: str, uploaded_file_path: str = None):
    llm = OllamaLLM(model=model_choice)

    retrievers = [vectorstore.as_retriever()]

    if uploaded_file_path:
        upload_vectorstore = embed_uploaded_file(uploaded_file_path)
        retrievers.append(upload_vectorstore.as_retriever())

    all_docs = []
    for retriever in retrievers:
        docs = retriever.get_relevant_documents(query)
        all_docs.extend(docs)

    if not all_docs:
        return "No relevant context found."

    combined_vectorstore = FAISS.from_documents(
        all_docs,
        HuggingFaceEmbeddings(model_name=EMBED_MODEL)
    )
    combined_qa = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=combined_vectorstore.as_retriever(),
        chain_type="stuff"
    )
    result = combined_qa.invoke(query)
    return result['result']
