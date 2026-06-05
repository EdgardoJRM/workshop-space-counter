import os
import signal
import subprocess
import sys
import time


APP_DIR = os.path.dirname(os.path.abspath(__file__))
PYTHON_BIN = sys.executable
CHECK_SECONDS = int(os.environ.get("PRINTER_CHECK_SECONDS", "5"))
PRINTER_NAME = os.environ.get("PRINTER_NAME", "").strip()
PORT = os.environ.get("PORT", "3000")
ENV_FILE = os.path.join(APP_DIR, ".env.local")
LOG_DIR = os.path.expanduser("~/Library/Logs/Impresora Auto")


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
            if key:
                os.environ.setdefault(key, value)


def run_command(args):
    return subprocess.run(args, capture_output=True, text=True, check=False)


def default_printer():
    result = run_command(["lpstat", "-d"])
    if result.returncode != 0:
        return ""
    marker = "system default destination:"
    if marker in result.stdout:
        return result.stdout.split(marker, 1)[1].strip()
    return result.stdout.strip()


def printer_exists():
    if PRINTER_NAME:
        result = run_command(["lpstat", "-p", PRINTER_NAME])
        return result.returncode == 0
    return bool(default_printer())


def is_cloud_mode():
    return bool(
        os.environ.get("PRINT_AGENT_TOKEN", "").strip()
        and os.environ.get("APP_BASE_URL", "").strip()
    )


def start_local_server():
    env = os.environ.copy()
    env["PORT"] = PORT
    env["PYTHONUNBUFFERED"] = "1"
    script = os.path.join(APP_DIR, "app.py")
    return subprocess.Popen(
        [PYTHON_BIN, "-u", script],
        cwd=APP_DIR,
        env=env,
    )


def stop_subprocess(process):
    if process is None or process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def run_cloud_watcher():
    """Modo cloud: un solo proceso, todo el log en server.log."""
    from cloud_agent import poll_once, run_startup_messages

    print("Printer watcher activo.", flush=True)
    print("Modo: cloud (cola Hernandez Pass)", flush=True)
    print(f"Logs: {LOG_DIR}/server.log", flush=True)
    print(f"Carpeta: {APP_DIR}", flush=True)

    cloud_ready = False

    while True:
        connected = printer_exists()

        if not connected:
            if cloud_ready:
                print("Impresora no disponible. Pausando polling...", flush=True)
                cloud_ready = False
            time.sleep(CHECK_SECONDS)
            continue

        if not cloud_ready:
            print("Impresora detectada. Conectando con la nube...", flush=True)
            try:
                run_startup_messages()
            except SystemExit:
                print(
                    "ERROR: Revisa APP_BASE_URL y PRINT_AGENT_TOKEN en .env.local",
                    flush=True,
                )
                time.sleep(30)
                continue
            except Exception as exc:
                print(f"ERROR al iniciar agente cloud: {exc}", flush=True)
                time.sleep(30)
                continue
            cloud_ready = True
            print("Agente listo. Esperando check-ins para imprimir.", flush=True)

        poll_once()
        time.sleep(int(os.environ.get("PRINT_POLL_SECONDS", "3")))


def run_local_watcher():
    local_server = None

    print("Printer watcher activo.", flush=True)
    print("Modo: local", flush=True)
    print(f"Puerto: {PORT}", flush=True)

    while True:
        connected = printer_exists()
        running = local_server is not None and local_server.poll() is None

        if connected and not running:
            print("Impresora detectada. Iniciando servidor local...", flush=True)
            local_server = start_local_server()
        elif not connected and running:
            print("Impresora no disponible. Deteniendo servidor...", flush=True)
            stop_subprocess(local_server)
            local_server = None
        elif local_server is not None and local_server.poll() is not None:
            print("Servidor detenido. Se reiniciara cuando la impresora este disponible.", flush=True)
            local_server = None

        time.sleep(CHECK_SECONDS)


def main():
    load_env_file()
    if not os.path.exists(ENV_FILE):
        print(f"AVISO: No existe {ENV_FILE}", flush=True)

    def handle_signal(signum, frame):
        raise SystemExit(0)

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    if is_cloud_mode():
        run_cloud_watcher()
    else:
        print(
            "AVISO: Sin APP_BASE_URL + PRINT_AGENT_TOKEN — solo modo local.",
            flush=True,
        )
        run_local_watcher()


if __name__ == "__main__":
    main()
