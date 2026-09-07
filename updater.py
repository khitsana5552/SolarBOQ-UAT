from __future__ import annotations

import hashlib
import json
import os
import shutil
import tempfile
import time
import urllib.request
import zipfile
from pathlib import Path
from typing import Any

from version import APP_VERSION, LAUNCHER_VERSION, UPDATE_CHANNEL

APP_DIR = Path(__file__).resolve().parent
APPDATA_ROOT = Path(os.getenv("LOCALAPPDATA") or (Path.home() / ".solarboq")) / "SolarBOQWebUAT"
DATA_DIR = APPDATA_ROOT / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
UPDATE_DIR = APPDATA_ROOT / "updates"
BACKUP_DIR = APPDATA_ROOT / "backups"
CONFIG_PATH = APPDATA_ROOT / "updater_config.json"
PENDING_PATH = UPDATE_DIR / "pending.json"
LOG_PATH = APPDATA_ROOT / "updater.log"

DEFAULT_CONFIG = {
    "enabled": True,
    "channel": UPDATE_CHANNEL,
    "auto_check_on_start": True,
    "manifest_url": "https://raw.githubusercontent.com/khitsana5552/SolarBOQ-UAT/main/update/uat-manifest.json",
    "github_repo": "khitsana5552/SolarBOQ-UAT",
    "github_asset_keyword": "SolarBOQ_Web_UAT",
    "request_timeout_seconds": 12,
}


def _log(msg: str) -> None:
    APPDATA_ROOT.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(f"[{stamp}] {msg}\n")


def ensure_dirs() -> None:
    for p in (APPDATA_ROOT, DATA_DIR, UPLOAD_DIR, UPDATE_DIR, BACKUP_DIR):
        p.mkdir(parents=True, exist_ok=True)


def migrate_legacy_data() -> None:
    ensure_dirs()
    target_db = DATA_DIR / "solarboq_uat.db"
    candidates = []
    direct = APP_DIR / "data" / "solarboq_uat.db"
    if direct.exists():
        candidates.append(direct)
    try:
        for c in APP_DIR.parent.glob("SolarBOQ_Web_UAT_V0_*/data/solarboq_uat.db"):
            if c.exists() and c != direct:
                candidates.append(c)
    except Exception:
        pass
    candidates = sorted(set(candidates), key=lambda x: x.stat().st_mtime, reverse=True)
    source_db = candidates[0] if candidates else None
    if not target_db.exists() and source_db:
        shutil.copy2(source_db, target_db)
        _log(f"Migrated legacy database from {source_db}")
    legacy_data_dirs = []
    if source_db:
        legacy_data_dirs.append(source_db.parent)
    for c in candidates:
        if c.parent not in legacy_data_dirs:
            legacy_data_dirs.append(c.parent)
    for legacy in legacy_data_dirs:
        old_uploads = legacy / "uploads"
        if not old_uploads.exists():
            continue
        for src in old_uploads.iterdir():
            if src.is_file():
                dst = UPLOAD_DIR / src.name
                if not dst.exists():
                    try:
                        shutil.copy2(src, dst)
                    except Exception:
                        pass
    if target_db.exists():
        try:
            import sqlite3
            with sqlite3.connect(target_db) as con:
                for table, column in (("equipment", "source_file"), ("projects", "pr_source")):
                    try:
                        rows = con.execute(f"SELECT rowid,{column} FROM {table} WHERE {column} IS NOT NULL AND {column}<>''").fetchall()
                    except Exception:
                        continue
                    for rowid, old in rows:
                        name = Path(str(old)).name
                        new_path = UPLOAD_DIR / name
                        if new_path.exists() and str(new_path) != str(old):
                            con.execute(f"UPDATE {table} SET {column}=? WHERE rowid=?", (str(new_path), rowid))
        except Exception as e:
            _log(f"Legacy path rewrite skipped: {e}")


def load_config() -> dict[str, Any]:
    ensure_dirs()
    cfg = dict(DEFAULT_CONFIG)
    if CONFIG_PATH.exists():
        try:
            saved = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            if isinstance(saved, dict):
                cfg.update(saved)
                if not str(cfg.get("manifest_url") or "").strip() and not str(cfg.get("github_repo") or "").strip():
                    cfg["manifest_url"] = DEFAULT_CONFIG["manifest_url"]
                    cfg["github_repo"] = DEFAULT_CONFIG["github_repo"]
        except Exception as e:
            _log(f"Could not read updater config: {e}")
    return cfg


def save_config(patch: dict[str, Any]) -> dict[str, Any]:
    cfg = load_config()
    allowed = set(DEFAULT_CONFIG)
    for k, v in patch.items():
        if k in allowed:
            cfg[k] = v
    if cfg.get("channel") not in ("uat", "stable"):
        cfg["channel"] = "uat"
    CONFIG_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    return cfg


def _version_tuple(v: str):
    out = []
    for part in str(v).lstrip("vV").replace("-", ".").split("."):
        digits = "".join(ch for ch in part if ch.isdigit())
        out.append(int(digits or 0))
    return tuple((out + [0, 0, 0, 0])[:4])


def is_newer(remote: str, current: str = APP_VERSION) -> bool:
    return _version_tuple(remote) > _version_tuple(current)


def _http_json(url: str, timeout: int = 12) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": f"SolarBOQ-UAT/{APP_VERSION}"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def _manifest_from_github(repo: str, channel: str, keyword: str, timeout: int) -> dict[str, Any] | None:
    repo = repo.strip().strip("/")
    if repo.startswith("https://github.com/"):
        repo = repo.split("github.com/", 1)[1].strip("/")
    if repo.endswith(".git"):
        repo = repo[:-4]
    if repo.count("/") != 1:
        raise ValueError("GitHub repo must look like owner/repository")
    releases = _http_json(f"https://api.github.com/repos/{repo}/releases", timeout)
    for rel in releases:
        if rel.get("draft"):
            continue
        tag = str(rel.get("tag_name") or "").lower()
        name = str(rel.get("name") or "").lower()
        if channel == "stable" and ("uat" in tag or "beta" in tag or "uat" in name or "beta" in name or rel.get("prerelease")):
            continue
        version = str(rel.get("tag_name") or "").replace("uat-", "").replace("stable-", "").lstrip("vV")
        assets = rel.get("assets") or []
        pkg = None
        manifest_asset = None
        for a in assets:
            an = str(a.get("name") or "")
            if an.lower().endswith("manifest.json"):
                manifest_asset = a
            if an.lower().endswith(".zip") and keyword.lower() in an.lower():
                pkg = a
        if manifest_asset:
            m = _http_json(manifest_asset["browser_download_url"], timeout)
            if isinstance(m, dict):
                return m
        if pkg:
            return {"version": version, "channel": channel, "package_url": pkg["browser_download_url"], "sha256": "", "notes": (rel.get("body") or "").strip(), "published_at": rel.get("published_at") or "", "source": "github_release"}
    return None


def check_for_update() -> dict[str, Any]:
    cfg = load_config()
    base = {"ok": True, "current_version": APP_VERSION, "launcher_version": LAUNCHER_VERSION, "channel": cfg.get("channel", "uat"), "update_available": False, "configured": bool(cfg.get("manifest_url") or cfg.get("github_repo"))}
    if not cfg.get("enabled", True):
        return {**base, "message": "Updater is disabled"}
    try:
        timeout = int(cfg.get("request_timeout_seconds") or 12)
        manifest = None
        manifest_url = str(cfg.get("manifest_url") or "").strip()
        github_repo = str(cfg.get("github_repo") or "").strip()
        if not manifest_url and not github_repo:
            return {**base, "configured": False, "message": "Update source is not configured"}
        if manifest_url:
            manifest = _http_json(manifest_url, timeout)
        elif github_repo:
            manifest = _manifest_from_github(github_repo, str(cfg.get("channel") or "uat"), str(cfg.get("github_asset_keyword") or "SolarBOQ_Web_UAT"), timeout)
        if not manifest:
            return {**base, "configured": True, "message": "No compatible release found"}
        rv = str(manifest.get("version") or "0.0.0")
        avail = is_newer(rv)
        return {**base, "configured": True, "update_available": avail, "latest_version": rv, "package_url": manifest.get("package_url") or manifest.get("url") or "", "sha256": manifest.get("sha256") or "", "notes": manifest.get("notes") or "", "published_at": manifest.get("published_at") or "", "manifest": manifest, "message": "Update available" if avail else "You are up to date"}
    except Exception as e:
        _log(f"Update check failed: {e}")
        return {**base, "ok": False, "error": str(e), "message": "Update check failed"}


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def stage_update(info: dict[str, Any] | None = None) -> dict[str, Any]:
    ensure_dirs()
    info = info or check_for_update()
    if not info.get("update_available"):
        raise RuntimeError(info.get("message") or "No update available")
    url = str(info.get("package_url") or "")
    if not url:
        raise RuntimeError("Update package URL is missing")
    target = UPDATE_DIR / f"SolarBOQ_update_{info.get('latest_version','new')}.zip"
    req = urllib.request.Request(url, headers={"User-Agent": f"SolarBOQ-UAT/{APP_VERSION}"})
    with urllib.request.urlopen(req, timeout=60) as r, target.open("wb") as f:
        shutil.copyfileobj(r, f)
    expected = str(info.get("sha256") or "").strip().lower()
    actual = _sha256(target)
    if expected and actual != expected:
        target.unlink(missing_ok=True)
        raise RuntimeError("SHA256 verification failed")
    pending = {"action": "update", "package": str(target), "version": str(info.get("latest_version") or ""), "sha256": actual, "created_at": time.time()}
    PENDING_PATH.write_text(json.dumps(pending, indent=2), encoding="utf-8")
    _log(f"Staged update {pending['version']} sha256={actual}")
    return pending


def stage_local_package(path: str) -> dict[str, Any]:
    ensure_dirs()
    src = Path(path)
    if not src.exists() or src.suffix.lower() != ".zip":
        raise RuntimeError("Update package must be a ZIP file")
    dst = UPDATE_DIR / f"manual_{int(time.time())}_{src.name}"
    shutil.copy2(src, dst)
    pending = {"action": "update", "package": str(dst), "version": "manual", "sha256": _sha256(dst), "created_at": time.time()}
    PENDING_PATH.write_text(json.dumps(pending, indent=2), encoding="utf-8")
    return pending


def list_backups() -> list[dict[str, Any]]:
    ensure_dirs()
    out = []
    for p in sorted(BACKUP_DIR.iterdir(), reverse=True):
        if not p.is_dir():
            continue
        meta = {}
        mf = p / "backup.json"
        if mf.exists():
            try:
                meta = json.loads(mf.read_text(encoding="utf-8"))
            except Exception:
                pass
        out.append({"id": p.name, "path": str(p), **meta})
    return out[:8]


def stage_rollback(backup_id: str) -> dict[str, Any]:
    b = BACKUP_DIR / Path(backup_id).name
    if not b.exists() or not b.is_dir():
        raise RuntimeError("Backup not found")
    pending = {"action": "rollback", "backup": str(b), "created_at": time.time()}
    ensure_dirs()
    PENDING_PATH.write_text(json.dumps(pending, indent=2), encoding="utf-8")
    return pending


def _copy_app_to_backup(dst: Path) -> None:
    ignore = shutil.ignore_patterns(".venv", "data", "__pycache__", "*.pyc", "*.pyo")
    shutil.copytree(APP_DIR, dst, dirs_exist_ok=True, ignore=ignore)
    (dst / "backup.json").write_text(json.dumps({"version": APP_VERSION, "created_at": time.strftime("%Y-%m-%d %H:%M:%S")}, ensure_ascii=False, indent=2), encoding="utf-8")


def _normalise_zip_root(extract_dir: Path) -> Path:
    children = [p for p in extract_dir.iterdir() if p.name != "__MACOSX"]
    if len(children) == 1 and children[0].is_dir():
        return children[0]
    return extract_dir


def _replace_code_from(src_root: Path) -> None:
    preserve = {".venv", "data"}
    for child in APP_DIR.iterdir():
        if child.name in preserve:
            continue
        if child.is_dir():
            shutil.rmtree(child, ignore_errors=True)
        else:
            try:
                child.unlink()
            except FileNotFoundError:
                pass
    for child in src_root.iterdir():
        if child.name in preserve or child.name in {"__MACOSX", "backup.json"}:
            continue
        dst = APP_DIR / child.name
        if child.is_dir():
            shutil.copytree(child, dst, dirs_exist_ok=True)
        else:
            shutil.copy2(child, dst)


def apply_pending_update() -> dict[str, Any] | None:
    ensure_dirs()
    if not PENDING_PATH.exists():
        return None
    pending = json.loads(PENDING_PATH.read_text(encoding="utf-8"))
    action = pending.get("action")
    stamp = time.strftime("%Y%m%d_%H%M%S")
    if action == "rollback":
        src = Path(str(pending["backup"]))
        if not src.exists():
            raise RuntimeError("Rollback backup disappeared")
        current_backup = BACKUP_DIR / f"before_rollback_{APP_VERSION}_{stamp}"
        _copy_app_to_backup(current_backup)
        _replace_code_from(src)
        PENDING_PATH.unlink(missing_ok=True)
        _log(f"Rollback applied from {src.name}")
        return {"action": "rollback", "from": src.name}
    if action != "update":
        raise RuntimeError("Unknown pending update action")
    pkg = Path(str(pending.get("package") or ""))
    if not pkg.exists():
        raise RuntimeError("Pending update package is missing")
    backup = BACKUP_DIR / f"v{APP_VERSION}_{stamp}"
    _copy_app_to_backup(backup)
    with tempfile.TemporaryDirectory(prefix="solarboq_update_") as td:
        ex = Path(td)
        with zipfile.ZipFile(pkg, "r") as z:
            z.extractall(ex)
        root = _normalise_zip_root(ex)
        if not (root / "server.py").exists():
            raise RuntimeError("Update ZIP is not a Solar BOQ application package")
        _replace_code_from(root)
    PENDING_PATH.unlink(missing_ok=True)
    try:
        pkg.unlink()
    except Exception:
        pass
    _log(f"Applied update to {pending.get('version')}")
    return {"action": "update", "version": pending.get("version"), "backup": backup.name}


def system_info() -> dict[str, Any]:
    cfg = load_config()
    return {"version": APP_VERSION, "launcher_version": LAUNCHER_VERSION, "channel": cfg.get("channel", "uat"), "data_dir": str(DATA_DIR), "config": cfg, "backups": list_backups(), "pending": PENDING_PATH.exists()}


ensure_dirs()
migrate_legacy_data()
