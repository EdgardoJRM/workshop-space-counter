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


def agent_script():
    token = os.environ.get("PRINT_AGENT_TOKEN", "").strip()
    base = os.environ.get("APP_BASE_URL", "").strip()
    if token and base:
        return os.path.join(APP_DIR, "cloud_agent.py")
    return os.path.join(APP_DIR, "app.py")


def start_server():
    env = os.environ.copy()
    env["PORT"] = PORT
    script = agent_script()
    return subprocess.Popen([PYTHON_BIN, script], cwd=APP_DIR, env=env)


def stop_server(process):
    if process is None or process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def main():
    load_env_file()
    server = None

    def handle_signal(signum, frame):
        stop_server(server)
        raise SystemExit(0)

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    mode = "cloud" if os.environ.get("PRINT_AGENT_TOKEN") and os.environ.get("APP_BASE_URL") else "local"
    print("Printer watcher activo.", flush=True)
    print(f"Modo: {mode}", flush=True)
    print(f"Puerto (modo local): {PORT}", flush=True)

    while True:
        connected = printer_exists()
        running = server is not None and server.poll() is None

        if connected and not running:
            print("Impresora detectada. Iniciando agente...", flush=True)
            server = start_server()

        if not connected and running:
            print("Impresora no disponible. Deteniendo agente...", flush=True)
            stop_server(server)
            server = None

        if server is not None and server.poll() is not None:
            print("Agente detenido. Se reiniciara cuando la impresora este disponible.", flush=True)
            server = None

        time.sleep(CHECK_SECONDS)


if __name__ == "__main__":
    main()
