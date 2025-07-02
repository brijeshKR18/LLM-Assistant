import time
import logging
from pathlib import Path
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.chains import RetrievalQA
from langchain_ollama import OllamaLLM


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("benchmark")


INDEX_PATH = "rhel_faiss_index"
EMBED_MODEL = "all-MiniLM-L6-v2"
LLM_MODEL = "mistral:instruct"


SAMPLE_QUERIES = [
    "How do I configure SELinux policies on RHEL 9?",
    "What is the default firewall service in RHEL and how to check its status?",
    "Explain the purpose of /etc/fstab file in RHEL."
]

def load_vectorstore(index_path: str, embed_model: str):
    embeddings = HuggingFaceEmbeddings(model_name=embed_model, model_kwargs={"device": "cpu"})
    vectorstore = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
    return vectorstore


def benchmark_queries(vectorstore, llm, queries):
    qa = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=vectorstore.as_retriever(),
        chain_type="stuff"
    )

    for idx, query in enumerate(queries, start=1):
        logger.info(f"\n🔎 Running Query {idx}: {query}")

        start_total = time.time()

        # Measure retrieval time
        start_retrieval = time.time()
        docs = vectorstore.similarity_search(query)
        end_retrieval = time.time()

        # Measure LLM time
        start_llm = time.time()
        result = qa.invoke(query)
        end_llm = time.time()

        end_total = time.time()

        answer = result['result']

        logger.info(f"✅ Answer: {answer[:200]}...")  # Show first 200 chars

        logger.info(f"""
⏱️ Performance metrics for Query {idx}:
  ➔ Retrieval time: {end_retrieval - start_retrieval:.2f} seconds
  ➔ LLM inference time: {end_llm - start_llm:.2f} seconds
  ➔ Total end-to-end time: {end_total - start_total:.2f} seconds
""")

if __name__ == "__main__":
    logger.info("🔧 Loading vectorstore...")
    vectorstore = load_vectorstore(INDEX_PATH, EMBED_MODEL)

    logger.info("🤖 Initializing LLM...")
    llm = OllamaLLM(model=LLM_MODEL)

    logger.info("📝 Starting benchmark...")
    benchmark_queries(vectorstore, llm, SAMPLE_QUERIES)

    logger.info("🏁 Benchmark complete.")
