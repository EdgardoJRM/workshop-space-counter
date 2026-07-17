from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import socket

from print_core import (
    current_printer_name,
    print_image_file,
    printer_is_offline,
    render_label_to_path,
)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


def get_local_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"


@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def health():
    port = int(os.environ.get("PORT", 3000))
    printer = current_printer_name()
    return jsonify({
        "status": "ok",
        "service": "Impresora Auto",
        "local_url": f"http://127.0.0.1:{port}",
        "network_url": f"http://{get_local_ip()}:{port}",
        "cloud_agent": bool(os.environ.get("PRINT_AGENT_TOKEN")),
        "printer": printer,
        "printer_offline": printer_is_offline(printer) if printer else False,
    })


@app.route("/printer", methods=["GET"])
def printer():
    name = current_printer_name()
    return jsonify({
        "name": name,
        "configured": bool(name),
        "offline": printer_is_offline(name) if name else False,
    })


@app.route("/imprimir", methods=["POST"])
def imprimir():
    data = request.json or {}
    full_name = (data.get("name") or "").strip()
    if not full_name:
        return jsonify({"error": "Missing name"}), 400

    payload = {
        "name": full_name,
        "email": data.get("email"),
        "fontLarge": data.get("fontLarge", 160),
        "fontSmall": data.get("fontSmall", 80),
        "mediaSize": data.get("mediaSize", os.environ.get("MEDIA_SIZE", "3x2")),
        "showEmail": data.get("showEmail", False),
        "showWorkshop": data.get("showWorkshop", False),
        "workshopLabel": data.get("workshopLabel"),
    }

    path = None
    try:
        path = render_label_to_path(payload)
        ok, detail = print_image_file(path, payload.get("mediaSize"))
        if not ok:
            return jsonify({"error": "No se pudo enviar a imprimir", "details": detail}), 500
        return jsonify({"message": f"Etiqueta generada para {full_name}"}), 200
    finally:
        if path and os.path.exists(path):
            try:
                os.unlink(path)
            except OSError:
                pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    app.run(host="0.0.0.0", port=port)
