from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Dict, List

from django.conf import settings


@dataclass(frozen=True)
class KnowledgeChunk:
    source: str
    section: str
    text: str


def _tokenize(text: str) -> List[str]:
    clean = "".join(char if char.isalnum() else " " for char in text.lower())
    return [token for token in clean.split() if len(token) > 2]


def _read_text_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="latin-1", errors="ignore")


def _split_chunks(text: str, source: str, max_chars: int = 900) -> List[KnowledgeChunk]:
    lines = [line.strip() for line in text.splitlines()]
    chunks: List[KnowledgeChunk] = []
    section = "General"
    buffer: List[str] = []
    size = 0

    def flush():
        nonlocal buffer, size
        if not buffer:
            return
        content = " ".join(part for part in buffer if part).strip()
        if content:
            chunks.append(KnowledgeChunk(source=source, section=section, text=content))
        buffer = []
        size = 0

    for line in lines:
        if line.startswith("#"):
            flush()
            section = line.lstrip("#").strip() or "General"
            continue
        if not line:
            flush()
            continue
        if size + len(line) > max_chars:
            flush()
        buffer.append(line)
        size += len(line)
    flush()
    return chunks


@lru_cache(maxsize=1)
def load_knowledge_chunks() -> List[KnowledgeChunk]:
    knowledge_root = Path(settings.BASE_DIR) / "knowledge"
    if not knowledge_root.exists():
        return []

    chunks: List[KnowledgeChunk] = []
    for path in sorted(knowledge_root.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".md", ".txt"}:
            continue
        relative_source = str(path.relative_to(knowledge_root)).replace("\\", "/")
        text = _read_text_file(path)
        if not text.strip():
            continue
        chunks.extend(_split_chunks(text=text, source=relative_source))
    return chunks


def rag_stats() -> Dict[str, int]:
    chunks = load_knowledge_chunks()
    sources = {chunk.source for chunk in chunks}
    return {"document_count": len(sources), "chunk_count": len(chunks)}


def retrieve_relevant_chunks(query: str, top_k: int = 8) -> List[Dict[str, str]]:
    chunks = load_knowledge_chunks()
    if not chunks:
        return []

    query_tokens = _tokenize(query)
    if not query_tokens:
        return []

    scored = []
    for chunk in chunks:
        text_lower = chunk.text.lower()
        token_hits = sum(1 for token in query_tokens if token in text_lower)
        exact_phrase_bonus = 2 if query.lower()[:40] in text_lower else 0
        score = token_hits + exact_phrase_bonus
        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)
    selected = scored[: max(1, min(top_k, 10))]
    return [
        {
            "source": chunk.source,
            "section": chunk.section,
            "text": chunk.text,
            "score": str(score),
        }
        for score, chunk in selected
    ]
