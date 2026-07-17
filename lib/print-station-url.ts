export const PRINT_STATION_PATH = "/staff/print-station";

export const PRINT_STATION_PRODUCTION_URL =
  "https://pass.edgardohernandez.com/staff/print-station";

export function printStationUrl(origin?: string): string {
  if (origin) {
    return `${origin.replace(/\/$/, "")}${PRINT_STATION_PATH}`;
  }
  return PRINT_STATION_PRODUCTION_URL;
}

export const CHROME_KIOSK_OPEN_COMMAND = `open -na "Google Chrome" --args --kiosk-printing --new-window "${PRINT_STATION_PRODUCTION_URL}"`;
