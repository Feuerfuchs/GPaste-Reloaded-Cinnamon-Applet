#!/bin/sh

APPLET_DIR="$HOME/.local/share/cinnamon/applets/${PWD##*/}"

if [ $# -eq 0 ]
then
    echo "[*] Installing localizations..."

    cinnamon-json-makepot -i ./po/* &> /dev/null

    echo "[*] Installing applet files..."
    [ -d "$APPLET_DIR" ] || mkdir "$APPLET_DIR"
    cp ./* "$APPLET_DIR" &> /dev/null

    echo "[*] Done!"
else
    while getopts "rh" OPTION; do
        case $OPTION in
            r)
                echo "[*] Removing localizations..."

                cinnamon-json-makepot -r ./po/* &> /dev/null

                echo "[*] Removing applet files..."

                rm -rf "$APPLET_DIR" &> /dev/null

                echo "[*] Done!"
                ;;

            h)
                echo "Usage:"
                echo ""
                echo "      install.sh [-r | -h]"
                echo ""
                echo "      If no arguments are supplied, the applied gets installed."
                echo "      If -r is supplied, the applet gets removed instead."
                echo "      If -h is supplied, this help message is displayed."
                echo ""
                echo "Options:"
                echo "  -r  remove the applet"
                echo "  -h  help (this output)"
                exit 0
                ;;
        esac
    done
fi
