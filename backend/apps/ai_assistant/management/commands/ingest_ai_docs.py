from pathlib import Path
from shutil import copy2
from typing import Optional

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.ai_assistant import rag


VALID_CATEGORIES = [
    "anatomy",
    "procedures",
    "diseases",
    "symptoms",
    "equipment",
    "medications",
    "faqs",
    "recovery",
    "guidelines",
    "emergency",
    "imaging",
    "complications",
    "patient_education",
    "imported",
]


def _slugify_filename(name: str) -> str:
    cleaned = "".join(char if char.isalnum() or char in {"-", "_", " "} else " " for char in name.lower())
    parts = [part for part in cleaned.replace("_", " ").split() if part]
    return "-".join(parts) or "document"


def _infer_category(relative_path: Path) -> str:
    lowered = str(relative_path).replace("\\", "/").lower()
    for category in VALID_CATEGORIES:
        if category in lowered:
            return category
    hints = {
        "fibroid": "diseases",
        "dvt": "diseases",
        "procedure": "procedures",
        "embol": "procedures",
        "ablation": "procedures",
        "catheter": "equipment",
        "guidewire": "equipment",
        "medication": "medications",
        "drug": "medications",
        "guideline": "guidelines",
        "consent": "guidelines",
        "complication": "complications",
        "recovery": "recovery",
        "faq": "faqs",
        "symptom": "symptoms",
        "imaging": "imaging",
        "anatomy": "anatomy",
        "emergency": "emergency",
    }
    for hint, category in hints.items():
        if hint in lowered:
            return category
    return "imported"


def _extract_pdf_text(path: Path) -> Optional[str]:
    try:
        from pypdf import PdfReader  # type: ignore
    except Exception:
        try:
            from PyPDF2 import PdfReader  # type: ignore
        except Exception:
            return None

    reader = PdfReader(str(path))
    pages_text = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        if page_text.strip():
            pages_text.append(page_text.strip())
    combined = "\n\n".join(pages_text).strip()
    return combined or ""


class Command(BaseCommand):
    help = "Ingest AI knowledge documents (.pdf/.md/.txt) into backend/knowledge for RAG retrieval."

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            type=str,
            default=str((Path(settings.BASE_DIR) / "knowledge_import").resolve()),
            help="Source file or directory containing documents to ingest.",
        )
        parser.add_argument(
            "--category",
            type=str,
            choices=VALID_CATEGORIES,
            help="Optional forced category folder under backend/knowledge.",
        )
        parser.add_argument("--recursive", action="store_true", help="Recursively ingest files from source directory.")
        parser.add_argument("--overwrite", action="store_true", help="Overwrite existing ingested files if present.")
        parser.add_argument("--dry-run", action="store_true", help="Show ingestion plan without writing files.")
        parser.add_argument("--limit", type=int, default=0, help="Optional max number of files to ingest (0 = no limit).")

    def handle(self, *args, **options):
        source = Path(options["source"]).resolve()
        force_category = options.get("category")
        recursive = options.get("recursive", False)
        overwrite = options.get("overwrite", False)
        dry_run = options.get("dry_run", False)
        limit = max(0, int(options.get("limit", 0) or 0))

        if not source.exists():
            raise CommandError(f"Source path does not exist: {source}")

        knowledge_root = (Path(settings.BASE_DIR) / "knowledge").resolve()
        knowledge_root.mkdir(parents=True, exist_ok=True)

        supported_suffixes = {".pdf", ".md", ".txt"}
        if source.is_file():
            candidates = [source] if source.suffix.lower() in supported_suffixes else []
        else:
            iterator = source.rglob("*") if recursive else source.glob("*")
            candidates = [path for path in iterator if path.is_file() and path.suffix.lower() in supported_suffixes]

        if limit:
            candidates = candidates[:limit]

        if not candidates:
            self.stdout.write(self.style.WARNING("No supported files found (.pdf, .md, .txt)."))
            return

        ingested = 0
        skipped = 0
        failed = 0
        missing_pdf_parser = 0

        for path in candidates:
            try:
                relative = path.relative_to(source.parent if source.is_file() else source)
                category = force_category or _infer_category(relative)
                target_dir = knowledge_root / category
                target_dir.mkdir(parents=True, exist_ok=True)

                base_name = _slugify_filename(path.stem)
                target_path = target_dir / f"{base_name}.md"

                if target_path.exists() and not overwrite:
                    skipped += 1
                    self.stdout.write(self.style.WARNING(f"Skipped (exists): {target_path}"))
                    continue

                if path.suffix.lower() == ".pdf":
                    extracted = _extract_pdf_text(path)
                    if extracted is None:
                        missing_pdf_parser += 1
                        failed += 1
                        self.stdout.write(
                            self.style.ERROR(
                                f"Failed (no PDF parser): {path}. Install pypdf or PyPDF2 to ingest PDFs."
                            )
                        )
                        continue
                    content = (
                        f"# {path.stem}\n\n"
                        f"_Source file: {path.name}_\n\n"
                        f"_Ingested category: {category}_\n\n"
                        f"{extracted}\n"
                    )
                    if dry_run:
                        self.stdout.write(self.style.SUCCESS(f"[Dry-run] Would ingest PDF -> {target_path}"))
                    else:
                        target_path.write_text(content, encoding="utf-8")
                        self.stdout.write(self.style.SUCCESS(f"Ingested PDF -> {target_path}"))
                else:
                    if dry_run:
                        self.stdout.write(self.style.SUCCESS(f"[Dry-run] Would ingest file -> {target_path}"))
                    else:
                        if path.suffix.lower() == ".md":
                            copy2(path, target_path)
                        else:
                            raw = path.read_text(encoding="utf-8", errors="ignore")
                            content = (
                                f"# {path.stem}\n\n"
                                f"_Source file: {path.name}_\n\n"
                                f"_Ingested category: {category}_\n\n"
                                f"{raw.strip()}\n"
                            )
                            target_path.write_text(content, encoding="utf-8")
                        self.stdout.write(self.style.SUCCESS(f"Ingested file -> {target_path}"))

                ingested += 1
            except Exception as exc:  # pragma: no cover - defensive CLI safety
                failed += 1
                self.stdout.write(self.style.ERROR(f"Failed to ingest {path}: {exc}"))

        if not dry_run:
            rag.load_knowledge_chunks.cache_clear()

        summary = (
            f"Ingestion complete. Ingested: {ingested}, Skipped: {skipped}, Failed: {failed}, "
            f"Missing PDF parser: {missing_pdf_parser}"
        )
        if failed:
            self.stdout.write(self.style.WARNING(summary))
        else:
            self.stdout.write(self.style.SUCCESS(summary))
