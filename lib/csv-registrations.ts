export type CsvRegistrationRow = {
  row: number;
  name: string | null;
  email: string;
  phone: string | null;
};

export type CsvParseError = {
  row: number;
  message: string;
};

const EMAIL_HEADERS = new Set([
  "email",
  "correo",
  "e-mail",
  "mail",
  "correo_electronico",
]);
const NAME_HEADERS = new Set([
  "name",
  "nombre",
  "full_name",
  "nombre_completo",
  "fullname",
]);
const PHONE_HEADERS = new Set([
  "phone",
  "telefono",
  "tel",
  "celular",
  "mobile",
  "numero",
  "numero_telefono",
]);

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

/** Parser CSV mínimo (comillas y comas). */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const normalized = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i];
    const next = normalized[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || (c === "\r" && next === "\n")) {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      if (c === "\r") i++;
    } else if (c !== "\r") {
      field += c;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

export function normalizeEmail(email: string): string | null {
  const v = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
  return v;
}

export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return digits.length > 0 ? digits : null;
}

export function parseRegistrationsCsv(
  text: string
): { rows: CsvRegistrationRow[]; errors: CsvParseError[] } {
  const matrix = parseCsvRows(text);
  const errors: CsvParseError[] = [];
  const rows: CsvRegistrationRow[] = [];

  if (matrix.length === 0) {
    return { rows, errors: [{ row: 0, message: "El archivo está vacío" }] };
  }

  const headerCells = matrix[0].map(normalizeHeader);
  const emailIdx = headerCells.findIndex((h) => EMAIL_HEADERS.has(h));
  const nameIdx = headerCells.findIndex((h) => NAME_HEADERS.has(h));
  const phoneIdx = headerCells.findIndex((h) => PHONE_HEADERS.has(h));

  if (emailIdx === -1) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          message:
            'Falta columna de email (usa: email, correo). Opcional: nombre, telefono',
        },
      ],
    };
  }

  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i];
    const rowNum = i + 1;
    const emailRaw = line[emailIdx] ?? "";
    const email = normalizeEmail(emailRaw);

    if (!email) {
      errors.push({
        row: rowNum,
        message: emailRaw.trim()
          ? `Email inválido: ${emailRaw.trim()}`
          : "Email vacío",
      });
      continue;
    }

    const nameRaw = nameIdx >= 0 ? (line[nameIdx] ?? "").trim() : "";
    const phoneRaw = phoneIdx >= 0 ? (line[phoneIdx] ?? "").trim() : "";

    rows.push({
      row: rowNum,
      email,
      name: nameRaw || null,
      phone: phoneRaw ? normalizePhone(phoneRaw) : null,
    });
  }

  return { rows, errors };
}
