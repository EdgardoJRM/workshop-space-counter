# Agente Mac — distribución firmada

## Empaquetado local

```bash
cd impresora-auto
zsh scripts/build-dmg.sh
```

Genera `dist/HernandezPassPrinter.dmg` (o carpeta en `dist/`).

## Emparejamiento SaaS (por negocio)

1. Admin web → **Impresora** → Generar código (8 caracteres, 15 min).
2. Mac del evento:

```bash
zsh emparejar.sh
zsh instalar.sh
```

No uses `PRINT_AGENT_TOKEN` manual salvo migración legacy.

## Firma y notarización (Apple Developer)

1. Certificado **Developer ID Application**.
2. Firmar la app/scripts o el .app si creas bundle.
3. `notarytool` + `stapler` para evitar alertas de Gatekeeper.

Documentación: [Notarizing macOS software](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)

## Autoarranque

`zsh instalar.sh` registra LaunchAgent `com.edgardo.impresora-auto`.

## Revocar impresora

Admin → Impresora → Revocar en la lista de Macs conectadas.
