#!/bin/sh
# Instala o Lume no Linux para o usuário atual, sem sudo.
# Uso: sh instalador/linux/instalar.sh [--iniciar-com-o-sistema]
set -eu

ORIGEM=$(cd "$(dirname "$0")/../.." && pwd)
DADOS_XDG=${XDG_DATA_HOME:-$HOME/.local/share}
DESTINO=$DADOS_XDG/lume
BIN=$HOME/.local/bin
APPS=$DADOS_XDG/applications
AUTOSTART=${XDG_CONFIG_HOME:-$HOME/.config}/autostart

passo() { printf '\n>> %s\n' "$1"; }
falha() { printf '\n   ERRO  %s\n' "$1" >&2; exit 1; }

passo 'Conferindo o que o Lume precisa'
command -v node >/dev/null 2>&1 || falha 'Instale o Node.js 22 ou mais novo (ex.: sudo apt install nodejs npm).'
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ] || falha "O Lume precisa do Node.js 22 ou mais novo (você tem $(node -v))."
command -v npm >/dev/null 2>&1 || falha 'Instale o npm (ex.: sudo apt install npm).'
NAVEGADOR=
for n in google-chrome google-chrome-stable microsoft-edge microsoft-edge-stable brave-browser chromium chromium-browser; do
  if command -v "$n" >/dev/null 2>&1; then NAVEGADOR=$n; break; fi
done
[ -n "$NAVEGADOR" ] || falha 'Instale o Google Chrome, o Microsoft Edge ou o Chromium.'
echo "   OK  Node $(node -v), navegador: $NAVEGADOR"
case $NAVEGADOR in
  chromium*) echo '   !!  O Chromium costuma vir sem Widevine: Netflix, Disney+ e Prime podem não tocar. Prefira o Chrome ou o Edge.' ;;
esac

passo 'Fechando o Lume, se estiver aberto'
[ -f "$DESTINO/lib/parar.js" ] && node "$DESTINO/lib/parar.js" || true

passo 'Copiando os arquivos'
mkdir -p "$DESTINO" "$BIN" "$APPS"
for item in server.js apps.json package.json package-lock.json LICENSE README.md lib public; do
  rm -rf "${DESTINO:?}/$item"
  cp -R "$ORIGEM/$item" "$DESTINO/"
done
cp "$ORIGEM/instalador/linux/lume.svg" "$DESTINO/lume.svg"
cp "$ORIGEM/instalador/linux/desinstalar.sh" "$DESTINO/desinstalar.sh"
echo "   OK  $DESTINO"

passo 'Instalando as dependências'
(cd "$DESTINO" && npm ci --omit=dev --no-fund --no-audit --loglevel=error)

passo 'Criando o atalho'
cat > "$BIN/lume" <<EOF
#!/bin/sh
# Abre o Lume (os registros ficam em $DESTINO/lume.log)
cd "$DESTINO" && exec node server.js >> "$DESTINO/lume.log" 2>&1
EOF
chmod +x "$BIN/lume"

cat > "$APPS/lume.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Lume
Comment=O computador vira uma TV controlada pelo celular
Exec=$BIN/lume
Icon=$DESTINO/lume.svg
Terminal=false
Categories=AudioVideo;Video;Player;
EOF
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APPS" 2>/dev/null || true
echo '   OK  Lume aparece no menu de aplicativos'

if [ "${1:-}" = '--iniciar-com-o-sistema' ]; then
  mkdir -p "$AUTOSTART"
  cp "$APPS/lume.desktop" "$AUTOSTART/lume.desktop"
  echo '   OK  o Lume vai abrir junto com o sistema'
fi

passo 'Abrindo o Lume'
nohup "$BIN/lume" >/dev/null 2>&1 &
printf '\n  PRONTO! O Lume está instalado e abrindo.\n'
printf '  - No celular (mesmo Wi-Fi), leia o QR code que aparece na tela.\n'
printf '  - Se o celular não conectar, libere a porta 7777 no firewall (ex.: sudo ufw allow 7777/tcp).\n'
printf '  - Para desinstalar: sh %s/desinstalar.sh\n' "$DESTINO"
