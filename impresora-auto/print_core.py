import os
import re
import subprocess
import tempfile
import time
from PIL import Image, ImageDraw, ImageFont

FONT_PATH = os.environ.get("FONT_PATH", "/System/Library/Fonts/Supplemental/Arial.ttf")
MEDIA_SIZE = os.environ.get("MEDIA_SIZE", "3x2")
PRINTER_NAME = os.environ.get("PRINTER_NAME", "").strip()
PRINT_CONFIRM_TIMEOUT = int(os.environ.get("PRINT_CONFIRM_TIMEOUT", "45"))
PRINT_CONFIRM_INTERVAL = float(os.environ.get("PRINT_CONFIRM_INTERVAL", "1"))


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


def current_printer_name():
    return PRINTER_NAME or default_printer()


def printer_status_detail(printer):
    if not printer:
        return "No default printer configured"
    result = run_command(["lpstat", "-l", "-p", printer])
    return (result.stdout or result.stderr).strip()


def printer_is_offline(printer):
    detail = printer_status_detail(printer).lower()
    return "offline" in detail or "connecting-to-device" in detail


def parse_cups_job_id(output):
    match = re.search(r"request id is\s+(\S+)", output, re.IGNORECASE)
    return match.group(1) if match else None


def cups_job_is_pending(job_id):
    result = run_command(["lpstat", "-W", "not-completed", "-o", job_id])
    return result.returncode == 0 and job_id in result.stdout


def wait_for_cups_job(job_id, printer):
    deadline = time.time() + PRINT_CONFIRM_TIMEOUT
    while time.time() < deadline:
        if printer_is_offline(printer):
            run_command(["cancel", job_id])
            return False, "Printer is offline or connecting to device"
        if not cups_job_is_pending(job_id):
            return True, "ok"
        time.sleep(PRINT_CONFIRM_INTERVAL)

    run_command(["cancel", job_id])
    return False, f"Print job {job_id} did not complete within {PRINT_CONFIRM_TIMEOUT}s"


def cups_media_options(media):
    normalized = (media or MEDIA_SIZE).strip().lower().replace(" ", "")
    if normalized in {"3x2", "3x2in", "3x2inch"}:
        return ["-o", "media=Custom.3x2in", "-o", "PageSize=Custom.3x2in"]
    if normalized in {"2x3", "2x3in", "2x3inch"}:
        return ["-o", "media=Custom.2x3in", "-o", "PageSize=Custom.2x3in"]
    if normalized in {"4x6", "4x6in", "4x6inch"}:
        return ["-o", "media=4x6", "-o", "PageSize=4x6"]
    return ["-o", f"media={media}"]


def load_font(size):
    if os.path.exists(FONT_PATH):
        return ImageFont.truetype(FONT_PATH, size)
    return ImageFont.load_default()


def normalize_name_for_label(full_name: str):
    s = " ".join((full_name or "").replace("\n", " ").split()).strip()
    has_star = "*" in s
    s = s.replace("*", "").strip()
    parts = s.split(" ")
    first_base = parts[0] if parts else ""
    last = " ".join(parts[1:]) if len(parts) > 1 else ""
    first_display = first_base
    if has_star and first_base:
        first_display = f"{first_base} *"
    return first_display, last, first_base, has_star


def text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont):
    if not text:
        return 0, 0
    x0, y0, x1, y1 = draw.textbbox((0, 0), text, font=font)
    return (x1 - x0, y1 - y0)


def render_label_to_path(payload: dict) -> str:
    full_name = (payload.get("name") or "").strip()
    if not full_name:
        raise ValueError("Missing name")

    font_large = int(payload.get("fontLarge") or 160)
    font_small = int(payload.get("fontSmall") or 80)
    show_email = bool(payload.get("showEmail"))
    show_workshop = bool(payload.get("showWorkshop"))
    email = (payload.get("email") or "").strip()
    workshop = (payload.get("workshopLabel") or "").strip()

    first_display, last, first_base, _ = normalize_name_for_label(full_name)

    W, H = 900, 600
    img = Image.new("RGB", (W, H), color="white")
    draw = ImageDraw.Draw(img)

    font_large_obj = load_font(font_large)
    font_small_obj = load_font(font_small)
    font_extra = load_font(max(40, font_small // 2))

    w1_base, h1 = text_size(draw, first_base, font_large_obj)
    w2, h2 = text_size(draw, last, font_small_obj)

    x1 = (W - w1_base) / 2
    x2 = (W - w2) / 2
    y1 = 160
    y2 = y1 + h1 + 40

    if first_display:
        draw.text((x1, y1), first_display, font=font_large_obj, fill="black")
    if last:
        draw.text((x2, y2), last, font=font_small_obj, fill="black")

    extra_y = y2 + h2 + 30
    if show_workshop and workshop:
        w3, _ = text_size(draw, workshop, font_extra)
        draw.text(((W - w3) / 2, extra_y), workshop, font=font_extra, fill="#444444")
        extra_y += 50
    if show_email and email:
        w4, _ = text_size(draw, email, font_extra)
        draw.text(((W - w4) / 2, extra_y), email, font=font_extra, fill="#444444")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
        img.save(tmp.name, dpi=(300, 300))
        return tmp.name


def print_image_file(path, media_size=None):
    media = media_size or MEDIA_SIZE
    printer = current_printer_name()
    command = ["lp", *cups_media_options(media)]
    if printer:
        command.extend(["-d", printer])
    command.append(path)

    result = run_command(command)
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip()
        return False, detail or "lp failed"

    detail = "\n".join(
        part for part in [result.stdout.strip(), result.stderr.strip()] if part
    )
    job_id = parse_cups_job_id(detail)
    if not job_id:
        return False, detail or "Could not confirm CUPS print job id"

    return wait_for_cups_job(job_id, printer)
