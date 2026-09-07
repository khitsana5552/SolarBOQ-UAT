from __future__ import annotations
import hashlib, os, subprocess, sys, threading, time, webbrowser
from pathlib import Path

APP_DIR=Path(__file__).resolve().parent
RESTART_CODE=42

def sync_requirements():
    req=APP_DIR/'requirements.txt'
    if not req.exists(): return
    marker=APP_DIR/'.venv'/'.requirements.sha256'
    digest=hashlib.sha256(req.read_bytes()).hexdigest()
    if marker.exists() and marker.read_text(errors='ignore').strip()==digest:return
    print('[Solar BOQ] Syncing Python requirements...')
    subprocess.check_call([sys.executable,'-m','pip','install','-r',str(req)])
    marker.parent.mkdir(parents=True,exist_ok=True);marker.write_text(digest,encoding='utf-8')

def open_browser_once():
    time.sleep(1.2);webbrowser.open('http://127.0.0.1:8765')

def main():
    os.chdir(APP_DIR)
    from updater import apply_pending_update,load_config,check_for_update
    try:
        result=apply_pending_update()
        if result: print('[Solar BOQ] Applied pending:',result)
    except Exception as e: print('[Solar BOQ] Pending update failed:',e)
    sync_requirements();cfg=load_config()
    if cfg.get('enabled') and cfg.get('auto_check_on_start') and (cfg.get('manifest_url') or cfg.get('github_repo')):
        try:
            info=check_for_update()
            if info.get('update_available'):print(f"[Solar BOQ] Update available: {info.get('latest_version')}. Open System / Updates to install.")
        except Exception as e:print('[Solar BOQ] Update check skipped:',e)
    threading.Thread(target=open_browser_once,daemon=True).start()
    while True:
        code=subprocess.call([sys.executable,str(APP_DIR/'server.py')])
        if code==RESTART_CODE:
            print('[Solar BOQ] Restart requested. Applying staged update/rollback...')
            try:apply_pending_update();sync_requirements()
            except Exception as e:
                print('[Solar BOQ] Update/rollback failed:',e);input('Press Enter to continue with current app...')
            continue
        return code

if __name__=='__main__':raise SystemExit(main())
