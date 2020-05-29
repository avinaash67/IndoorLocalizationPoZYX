mkdir icon.iconset
sips -z 16 16     Logo-Pozyx-Only-Squared-Large.png --out icon.iconset/icon_16x16.png
sips -z 32 32     Logo-Pozyx-Only-Squared-Large.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     Logo-Pozyx-Only-Squared-Large.png --out icon.iconset/icon_32x32.png
sips -z 64 64     Logo-Pozyx-Only-Squared-Large.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   Logo-Pozyx-Only-Squared-Large.png --out icon.iconset/icon_128x128.png
sips -z 256 256   Logo-Pozyx-Only-Squared-Large.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   Logo-Pozyx-Only-Squared-Large.png --out icon.iconset/icon_256x256.png
sips -z 512 512   Logo-Pozyx-Only-Squared-Large.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   Logo-Pozyx-Only-Squared-Large.png --out icon.iconset/icon_512x512.png
cp Logo-Pozyx-Only-Squared-Large.png icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
rm -R icon.iconset
