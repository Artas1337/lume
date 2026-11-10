#!/bin/sh
# Remove o Lume do Linux, inclusive os logins dos streamings, o nome e o papel de parede.
set -eu

DADOS_XDG=${XDG_DATA_HOME:-$HOME/.local/share}
DESTINO=$DADOS_XDG/lume

printf 'Isso remove o Lume e os logins salvos dos streamings. Continuar? (s/N) '
read -r resposta
case $resposta in s|S|sim|Sim) ;; *) exit 0 ;; esac

[ -f "$DESTINO/lib/parar.js" ] && node "$DESTINO/lib/parar.js" || true
rm -f "$HOME/.local/bin/lume" "$DADOS_XDG/applications/lume.desktop" "${XDG_CONFIG_HOME:-$HOME/.config}/autostart/lume.desktop"
rm -rf "$DESTINO"
echo 'Lume removido.'
