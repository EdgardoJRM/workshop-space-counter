"""
Agente de cola en la nube: hace polling a Hernandez Pass e imprime labels en la Rollo.
Requiere APP_BASE_URL y PRINT_AGENT_TOKEN en el entorno (o archivo .env.local).
"""
import json
import os
import time
import urllib.error
import urllib.request

from print_core import print_image_file, render_label_to_path

POLL_SECONDS = int(os.environ.get("PRINT_POLL_SECONDS", "3"))
APP_BASE_URL = os.environ.get("APP_BASE_URL", "").rstrip("/")
PRINT_AGENT_TOKEN = os.environ.get("PRINT_AGENT_TOKEN", "").strip()
ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env.local")


def load_env_file():
    if not os.path.exists(ENV_FILE):
        return
    with open(ENV_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


def api_request(method: str, path: str, body: dict | None = None) -> dict:
    global APP_BASE_URL, PRINT_AGENT_TOKEN
    if not APP_BASE_URL:
        APP_BASE_URL = os.environ.get("APP_BASE_URL", "").rstrip("/")
    if not PRINT_AGENT_TOKEN:
        PRINT_AGENT_TOKEN = os.environ.get("PRINT_AGENT_TOKEN", "").strip()

    if not APP_BASE_URL or not PRINT_AGENT_TOKEN:
        raise RuntimeError("Faltan APP_BASE_URL o PRINT_AGENT_TOKEN")

    url = f"{APP_BASE_URL}{path}"
    data = None
    headers = {
        "Authorization": f"Bearer {PRINT_AGENT_TOKEN}",
        "Content-Type": "application/json",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def complete_job(job_id: str, success: bool, error: str | None = None):
    api_request(
        "POST",
        f"/api/print/jobs/{job_id}/complete",
        {"success": success, "error": error},
    )


def process_one_job(job: dict) -> bool:
    job_id = job["id"]
    payload = job.get("payload") or {}
    path = None
    try:
        path = render_label_to_path(payload)
        media = payload.get("mediaSize")
        ok, detail = print_image_file(path, media)
        if not ok:
            complete_job(job_id, False, detail)
            print(f"Error imprimiendo job {job_id}: {detail}", flush=True)
            return False
        complete_job(job_id, True)
        name = payload.get("name", "")
        print(f"Impreso: {name} (job {job_id})", flush=True)
        return True
    except Exception as exc:
        try:
            complete_job(job_id, False, str(exc))
        except Exception:
            pass
        print(f"Error job {job_id}: {exc}", flush=True)
        return False
    finally:
        if path and os.path.exists(path):
            try:
                os.unlink(path)
            except OSError:
                pass


def poll_once() -> bool:
    try:
        data = api_request("GET", "/api/print/jobs/next")
    except urllib.error.HTTPError as exc:
        if exc.code == 401:
            print(
                "ERROR 401: PRINT_AGENT_TOKEN no coincide con Vercel. "
                "Corrige .env.local, redeploy en Vercel, y reinicia el agente.",
                flush=True,
            )
        else:
            print(f"HTTP error polling: {exc}", flush=True)
        return False
    except Exception as exc:
        print(f"Poll error: {exc}", flush=True)
        return False

    job = data.get("job")
    if not job:
        return False
    return process_one_job(job)


def main():
    load_env_file()
    global APP_BASE_URL, PRINT_AGENT_TOKEN
    APP_BASE_URL = os.environ.get("APP_BASE_URL", "").rstrip("/")
    PRINT_AGENT_TOKEN = os.environ.get("PRINT_AGENT_TOKEN", "").strip()

    if not APP_BASE_URL or not PRINT_AGENT_TOKEN:
        print(
            "ERROR: Configura APP_BASE_URL y PRINT_AGENT_TOKEN en .env.local",
            flush=True,
        )
        raise SystemExit(1)

    print(f"Cloud agent activo → {APP_BASE_URL}", flush=True)
    print(f"Polling cada {POLL_SECONDS}s", flush=True)

    while True:
        had_job = poll_once()
        if not had_job:
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
