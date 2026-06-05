import json
import os
import socket
import time
import urllib.error
import urllib.request

POLL_SECONDS = int(os.environ.get("PRINT_POLL_SECONDS", "3"))
REQUEST_TIMEOUT = int(os.environ.get("PRINT_REQUEST_TIMEOUT", "60"))
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


def refresh_config():
    global APP_BASE_URL, PRINT_AGENT_TOKEN
    load_env_file()
    APP_BASE_URL = os.environ.get("APP_BASE_URL", "").rstrip("/")
    PRINT_AGENT_TOKEN = os.environ.get("PRINT_AGENT_TOKEN", "").strip()
    if not APP_BASE_URL or not PRINT_AGENT_TOKEN:
        print(
            "ERROR: Configura APP_BASE_URL y PRINT_AGENT_TOKEN en .env.local",
            flush=True,
        )
        raise SystemExit(1)


def api_request(method, path, body=None):
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
    last_error = None
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, socket.timeout) as exc:
            last_error = exc
            if attempt < 3:
                time.sleep(2 * attempt)
                continue
            raise
    if last_error:
        raise last_error
    raise RuntimeError("api_request failed")


def complete_job(job_id, success, error=None):
    api_request(
        "POST",
        f"/api/print/jobs/{job_id}/complete",
        {"success": success, "error": error},
    )


def process_one_job(job):
    from print_core import print_image_file, render_label_to_path

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


_auth_error_logged = False
_timeout_logged_at = 0.0


def poll_once() -> bool:
    global _auth_error_logged, _timeout_logged_at
    try:
        data = api_request("GET", "/api/print/jobs/next")
    except urllib.error.HTTPError as exc:
        if exc.code == 401:
            if not _auth_error_logged:
                _auth_error_logged = True
                print(
                    "ERROR 401: PRINT_AGENT_TOKEN no coincide con Vercel.\n"
                    "  1. Vercel → Settings → Environment Variables → PRINT_AGENT_TOKEN\n"
                    "  2. Mismo valor en .env.local (sin comillas)\n"
                    "  3. Redeploy y reinicia: launchctl kickstart -k gui/$(id -u)/com.edgardo.impresora-auto",
                    flush=True,
                )
        else:
            print(f"HTTP error polling: {exc}", flush=True)
        return False
    except (urllib.error.URLError, TimeoutError, socket.timeout) as exc:
        now = time.time()
        if now - _timeout_logged_at > 60:
            _timeout_logged_at = now
            print(
                f"Poll: sin respuesta de la nube ({exc}). Reintentando...",
                flush=True,
            )
        return False
    except Exception as exc:
        print(f"Poll error: {exc}", flush=True)
        return False

    job = data.get("job")
    if not job:
        return False
    return process_one_job(job)


def run_startup_messages():
    refresh_config()
    print(f"Cloud agent → {APP_BASE_URL}", flush=True)
    print(f"Polling cada {POLL_SECONDS}s (timeout {REQUEST_TIMEOUT}s)", flush=True)

    try:
        data = api_request("GET", "/api/print/jobs/next")
    except urllib.error.HTTPError as exc:
        if exc.code == 401:
            print(
                "ERROR 401: el token en .env.local NO es el de Vercel.",
                flush=True,
            )
        else:
            print(f"ERROR HTTP {exc.code} al conectar.", flush=True)
        raise SystemExit(1) from exc
    except (urllib.error.URLError, TimeoutError, socket.timeout) as exc:
        print(f"ERROR de red al conectar: {exc}", flush=True)
        raise SystemExit(1) from exc

    job = data.get("job")
    if job:
        print(f"Cola: trabajo pendiente ({job.get('id', '?')})", flush=True)
    else:
        print("Cola: conectado (sin trabajos pendientes)", flush=True)


def run_cloud_loop(stop_event=None) -> None:
    """Compatibilidad si algo importa run_cloud_loop."""
    run_startup_messages()
    while stop_event is None or not getattr(stop_event, "is_set", lambda: False)():
        had_job = poll_once()
        if not had_job:
            time.sleep(POLL_SECONDS)


def main():
    run_startup_messages()
    while True:
        had_job = poll_once()
        if not had_job:
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
