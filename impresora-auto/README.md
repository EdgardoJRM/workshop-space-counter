# Impresora Auto (agente Rollo)

Agente Mac para Hernandez Pass: hace polling a la cola en Vercel e imprime labels 3×2 en la Rollo.

## Instalar en la Mac del evento (un comando)

```bash
git clone --depth 1 https://github.com/EdgardoJRM/workshop-space-counter.git ~/hernandez-pass && \
cd ~/hernandez-pass/impresora-auto && \
cp .env.local.example .env.local && \
echo "Edita .env.local (APP_BASE_URL + PRINT_AGENT_TOKEN igual que Vercel) y luego:" && \
echo "  zsh instalar.sh"
```

Edita `.env.local`:

```env
APP_BASE_URL=https://workshop-space-counter.vercel.app
PRINT_AGENT_TOKEN=el-mismo-secreto-de-vercel
```

Sin comillas. Sin `/` al final de la URL.

Instalar:

```bash
zsh instalar.sh
```

Conecta la Rollo (predeterminada en macOS). Ver log:

```bash
tail -f "$HOME/Library/Logs/Impresora Auto/server.log"
```

## Actualizar a la última versión

```bash
cd ~/hernandez-pass && git pull && cd impresora-auto && zsh instalar.sh
```

## Vercel

- Variable `PRINT_AGENT_TOKEN` = mismo valor que `.env.local`
- SQL de cola: [`../docs/PRINT_QUEUE_SQL.md`](../docs/PRINT_QUEUE_SQL.md)

## Archivos

| Archivo | Uso |
|---------|-----|
| `cloud_agent.py` | Polling e impresión (modo nube) |
| `printer_watcher.py` | Arranque al conectar impresora |
| `print_core.py` | Render PNG + `lpr` |
| `instalar.sh` | Instalador (usa esto, no los `.command`) |
