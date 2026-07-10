from pathlib import Path
import sys


def bootstrap_local_venv() -> None:
    """
    Add local .venv site-packages to sys.path when commands are run with
    the system Python interpreter.
    """
    project_root = Path(__file__).resolve().parents[1]
    candidates = [
        project_root / ".venv" / "Lib" / "site-packages",  # Windows
        project_root / ".venv" / "lib" / f"python{sys.version_info.major}.{sys.version_info.minor}" / "site-packages",  # Unix
    ]

    for site_packages in candidates:
        if site_packages.exists():
            site_path = str(site_packages)
            if site_path not in sys.path:
                sys.path.insert(0, site_path)
            break
