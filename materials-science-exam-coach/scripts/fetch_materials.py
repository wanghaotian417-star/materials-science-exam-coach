"""Download explicitly selected references and verify them before saving."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
from urllib.parse import urlsplit
from urllib.request import urlopen


def fetch(item, root):
    target = (root / item["path"]).resolve()
    if not target.is_relative_to(root):
        raise ValueError("Reference path must stay inside references/")
    if urlsplit(item["url"]).scheme != "https":
        raise ValueError("Expected an HTTPS source")
    expected = item["sha256"]
    if target.exists():
        with target.open("rb") as source:
            if hashlib.file_digest(source, "sha256").hexdigest() == expected:
                return
        raise ValueError(f"Existing file has different contents: {target}")
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as tmp:
        staged = Path(tmp.name)
        try:
            with urlopen(item["url"], timeout=60) as response:
                if urlsplit(response.geturl()).scheme != "https":
                    raise ValueError("Expected an HTTPS download")
                digest = hashlib.sha256()
                while chunk := response.read(1024 * 1024):
                    digest.update(chunk)
                    tmp.write(chunk)
            if digest.hexdigest() != expected:
                raise ValueError("Downloaded bytes do not match the source checksum")
            tmp.close()
            os.replace(staged, target)
        finally:
            staged.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--list", action="store_true")
    group.add_argument("--all", action="store_true")
    group.add_argument("--path", action="append", help="A path from --list. Repeat to select several.")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1] / "references"
    entries = json.loads((root / "sources.json").read_text(encoding="utf-8"))
    by_path = {item["path"]: item for item in entries}
    if args.list:
        print(*by_path, sep="\n")
        return 0
    paths = list(by_path) if args.all else list(dict.fromkeys(args.path))
    unknown = [path for path in paths if path not in by_path]
    if unknown:
        parser.error("Unknown paths: " + ", ".join(unknown))
    failed = False
    for path in paths:
        try:
            fetch(by_path[path], root)
            print(f"OK {path}")
        except (OSError, ValueError) as exc:
            failed = True
            print(f"{path}: {exc}", file=sys.stderr)
    return int(failed)


if __name__ == "__main__":
    sys.exit(main())
