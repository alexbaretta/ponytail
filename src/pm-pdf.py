#!/usr/bin/env python3
"""Render configured project-management Markdown collections as PDFs."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import NamedTuple


CONFIG_PATH = Path(".agents/config/project/pm-pdf.json")
MARKDOWN_LINK = re.compile(r"(?<!!)\[([^\]]+)\]\(([^)]+)\)")
HEADING = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
FENCE = re.compile(r"^\s*(`{3,}|~{3,})")
INLINE_CODE = re.compile(r"(?<!`)`([^`\n]+)`(?!`)")


class ReportMetadata(NamedTuple):
    timestamp: str
    commit: str
    branch: str
    tags: tuple[str, ...]


class Collection(NamedTuple):
    name: str
    root: Path
    title: str
    excluded_directories: frozenset[str]
    pandoc_variables: tuple[str, ...]


class Configuration(NamedTuple):
    output_directory: Path
    collections: dict[str, Collection]


def relative_path(value: object, label: str) -> Path:
    if not isinstance(value, str) or not value or "\\" in value:
        raise ValueError(f"{label} must be an exact repository-relative path")
    path = Path(value)
    if path.is_absolute() or any(part in ("", ".", "..") for part in path.parts):
        raise ValueError(f"{label} must be an exact repository-relative path")
    return path


def read_configuration(repository_root: Path) -> Configuration:
    path = repository_root / CONFIG_PATH
    if path.is_symlink() or not path.is_file():
        raise ValueError(f"Missing or unsafe PM PDF configuration: {CONFIG_PATH}")
    try:
        value = json.loads(path.read_text())
    except json.JSONDecodeError as error:
        raise ValueError(f"Invalid PM PDF configuration {CONFIG_PATH}: {error}") from error
    if not isinstance(value, dict) or set(value) != {
        "schemaVersion", "outputDirectory", "collections"
    } or value["schemaVersion"] != 1:
        raise ValueError(f"Invalid V1 PM PDF configuration: {CONFIG_PATH}")
    raw_collections = value["collections"]
    if not isinstance(raw_collections, dict) or not raw_collections:
        raise ValueError("collections must be a nonempty object")
    collections: dict[str, Collection] = {}
    for name, raw_collection in raw_collections.items():
        if not isinstance(name, str) or not re.fullmatch(r"[a-z][a-z0-9-]*", name) or name == "all":
            raise ValueError(f"Invalid collection name: {name}")
        if not isinstance(raw_collection, dict) or set(raw_collection) != {
            "root", "title", "excludedDirectories", "pandocVariables"
        }:
            raise ValueError(f"Invalid collection configuration: {name}")
        title = raw_collection["title"]
        excluded_directories = raw_collection["excludedDirectories"]
        pandoc_variables = raw_collection["pandocVariables"]
        if not isinstance(title, str) or not title.strip() or "\n" in title or "\r" in title:
            raise ValueError(f"{name}.title must be a nonempty single-line string")
        if not isinstance(excluded_directories, list) or any(
            not isinstance(item, str) or not re.fullmatch(r"[^/\\]+", item)
            for item in excluded_directories
        ) or len(set(excluded_directories)) != len(excluded_directories):
            raise ValueError(f"{name}.excludedDirectories must contain unique directory names")
        if not isinstance(pandoc_variables, list) or any(
            not isinstance(item, str) or not item or "\n" in item or "\r" in item
            for item in pandoc_variables
        ) or len(set(pandoc_variables)) != len(pandoc_variables):
            raise ValueError(f"{name}.pandocVariables must contain unique nonempty strings")
        collections[name] = Collection(
            name=name,
            root=repository_root / relative_path(raw_collection["root"], f"{name}.root"),
            title=title,
            excluded_directories=frozenset(excluded_directories),
            pandoc_variables=tuple(pandoc_variables),
        )
    return Configuration(
        output_directory=repository_root / relative_path(value["outputDirectory"], "outputDirectory"),
        collections=collections,
    )


def read_report_metadata(repository_root: Path) -> ReportMetadata:
    def git(*arguments: str) -> str:
        result = subprocess.run(
            ["git", "-C", str(repository_root), *arguments],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            raise RuntimeError(f"Cannot read report revision from Git: {result.stderr.strip()}")
        return result.stdout.strip()

    return ReportMetadata(
        timestamp=datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S %Z"),
        commit=git("rev-parse", "--short", "HEAD"),
        branch=git("branch", "--show-current") or "(detached HEAD)",
        tags=tuple(git("tag", "--points-at", "HEAD").splitlines()),
    )


def latex_escape(value: str) -> str:
    replacements = {
        "\\": r"\textbackslash{}", "&": r"\&", "%": r"\%", "$": r"\$",
        "#": r"\#", "_": r"\_", "{": r"\{", "}": r"\}",
        "~": r"\textasciitilde{}", "^": r"\textasciicircum{}",
    }
    return "".join(replacements.get(character, character) for character in value)


def title_subtitle(report_metadata: ReportMetadata) -> str:
    lines = [
        f"Commit: \\texttt{{{latex_escape(report_metadata.commit)}}}",
        f"Branch: \\texttt{{{latex_escape(report_metadata.branch)}}}",
    ]
    if report_metadata.tags:
        lines.append(f"Tag: \\texttt{{{latex_escape(', '.join(report_metadata.tags))}}}")
    return r" \par ".join(lines)


def slug(text: str) -> str:
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"[`*_{}]", "", text).lower()
    return re.sub(r"\s+", "-", re.sub(r"[^\w\s-]", "", text).strip())


def document_id(path: Path, root: Path) -> str:
    relative = str(path.relative_to(root).with_suffix("")).lower()
    return "doc-" + re.sub(r"[^a-z0-9]+", "-", relative).strip("-")


def collect_pages(collection: Collection) -> list[Path]:
    root = collection.root.resolve()
    index = root / "index.md"
    if not index.is_file():
        raise ValueError(f"Missing index: {index}")
    pages = [index]
    for match in MARKDOWN_LINK.finditer(index.read_text()):
        target = match.group(2).split("#", 1)[0]
        if not target.endswith(".md"):
            continue
        path = (root / target).resolve()
        if not path.is_relative_to(root):
            continue
        if not path.is_file():
            raise ValueError(f"Index references missing page: {target}")
        if path not in pages:
            pages.append(path)
    unlisted = {
        path for path in root.rglob("*.md") if path not in pages
        and not collection.excluded_directories.intersection(path.relative_to(root).parts)
    }
    if unlisted:
        names = ", ".join(str(path.relative_to(root)) for path in sorted(unlisted))
        raise ValueError(f"Pages not linked from {index}: {names}")
    return pages


def heading_anchors(path: Path, root: Path) -> dict[str, str]:
    anchors: dict[str, str] = {}
    counts: dict[str, int] = {}
    fence_marker: str | None = None
    for line in path.read_text().splitlines():
        fence = FENCE.match(line)
        if fence:
            marker = fence.group(1)
            if fence_marker is None:
                fence_marker = marker[0]
            elif marker[0] == fence_marker:
                fence_marker = None
            continue
        if fence_marker is not None:
            continue
        match = HEADING.match(line)
        if not match:
            continue
        base = slug(match.group(2))
        number = counts.get(base, 0)
        counts[base] = number + 1
        fragment = f"{base}-{number}" if number else base
        anchors[fragment] = (
            document_id(path, root) if not anchors else f"{document_id(path, root)}--{fragment}"
        )
    if not anchors:
        raise ValueError(f"Page has no heading: {path}")
    return anchors


def compose(collection: Collection, repository_root: Path) -> str:
    root = collection.root.resolve()
    pages = collect_pages(collection)
    included = set(pages)
    anchors = {path: heading_anchors(path, root) for path in pages}
    sections: list[str] = []
    first_chapter = True
    for page in pages:
        heading_number = 0
        fence_marker: str | None = None
        lines: list[str] = []
        for original_line in page.read_text().splitlines():
            line = original_line
            fence = FENCE.match(line)
            if fence:
                marker = fence.group(1)
                if fence_marker is None:
                    fence_marker = marker[0]
                elif marker[0] == fence_marker:
                    fence_marker = None
                lines.append(line)
                continue
            if fence_marker is not None:
                lines.append(line)
                continue
            heading = HEADING.match(line)
            if heading:
                fragment = list(anchors[page])[heading_number]
                heading_number += 1
                if heading.group(1) == "#":
                    if first_chapter:
                        first_chapter = False
                    else:
                        lines.append("\\clearpage")
                line = f"{heading.group(1)} {heading.group(2)} {{#{anchors[page][fragment]}}}"

            def replace_link(match: re.Match[str]) -> str:
                label, href = match.groups()
                if href.startswith(("http://", "https://", "mailto:")):
                    return match.group(0)
                target_name, _, fragment = href.partition("#")
                target = (page.parent / target_name).resolve() if target_name else page
                if target in included:
                    if fragment and fragment not in anchors[target]:
                        raise ValueError(f"Broken heading link in {page}: {href}")
                    anchor = anchors[target][fragment] if fragment else document_id(target, root)
                    return f"[{label}](#{anchor})"
                if not target.exists():
                    raise ValueError(f"Broken source link in {page}: {href}")
                source = target.relative_to(repository_root) if target.is_relative_to(repository_root) else target
                return f"{label} (source: \\path{{{source}}})"

            line = MARKDOWN_LINK.sub(replace_link, line)

            def replace_code(match: re.Match[str]) -> str:
                value = match.group(1)
                if "/" not in value or any(character in value for character in "{}\\"):
                    return match.group(0)
                following = "\\ " if line[match.end():].startswith(" ") else ""
                return f"\\path{{{value}}}{following}"

            lines.append(INLINE_CODE.sub(replace_code, line))
        sections.append("\n".join(lines))
    return "\\clearpage\n\\sloppy\n\\setlength{\\emergencystretch}{3em}\n\n" + "\n\n".join(sections) + "\n"


def render(
    collection: Collection,
    output_directory: Path,
    repository_root: Path,
) -> Path:
    for executable in ("pandoc", "xelatex"):
        if shutil.which(executable) is None:
            raise RuntimeError(f"{executable} is required to render PDF reports; install it and retry")
    source = compose(collection, repository_root)
    report_metadata = read_report_metadata(repository_root)
    output_directory.mkdir(parents=True, exist_ok=True)
    output = output_directory / f"{collection.name}.pdf"
    command = [
        "pandoc", "--from=markdown", "--pdf-engine=xelatex", "--toc", "--toc-depth=2",
        "--number-sections", "--variable=geometry:margin=0.8in", "--variable=colorlinks:true",
        "--variable=classoption:titlepage", f"--metadata=title:{collection.title}",
        f"--metadata=date:{report_metadata.timestamp}",
        f"--variable=subtitle:{title_subtitle(report_metadata)}",
        "--output", str(output),
        *(f"--variable={variable}" for variable in collection.pandoc_variables),
    ]
    result = subprocess.run(command, input=source, text=True, capture_output=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"PDF generation failed for {collection.name}:\n{result.stderr.strip()}")
    return output


def repository_root() -> Path:
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True, check=False
    )
    if result.returncode != 0:
        raise RuntimeError("Current directory is not in a Git worktree")
    return Path(result.stdout.strip()).resolve()


def main() -> int:
    parser = argparse.ArgumentParser(prog="ponytail pm")
    subparsers = parser.add_subparsers(dest="operation", required=True)
    pdf_parser = subparsers.add_parser("pdf", help=__doc__)
    pdf_parser.add_argument("collection")
    pdf_parser.add_argument("--output-dir", type=Path)
    args = parser.parse_args()
    try:
        root = repository_root()
        configuration = read_configuration(root)
        if args.collection == "all":
            collection_names = tuple(configuration.collections)
        elif args.collection in configuration.collections:
            collection_names = (args.collection,)
        else:
            choices = ", ".join((*configuration.collections, "all"))
            raise ValueError(f"Unknown collection {args.collection!r}; choose one of: {choices}")
        output_directory = args.output_dir or configuration.output_directory
        if not output_directory.is_absolute():
            output_directory = root / output_directory
        for name in collection_names:
            print(render(configuration.collections[name], output_directory, root))
    except (OSError, RuntimeError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
