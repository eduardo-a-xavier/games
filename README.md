# Encantaria

RPG mobile 2D brasileiro de fantasia, vida tranquila e folclore. O jogo é
implementado em JavaScript/Canvas, roda como PWA e é empacotado para Android
em uma WebView.

## Executar localmente

```bash
python3 prototype/web/prepare_web_assets.py
python3 -m http.server 4173 --directory prototype/web
```

Abra `http://localhost:4173`. O primeiro comando monta no app web as cópias
dos sprites canônicos mantidos em `/assets`.

## Validar

```bash
find prototype/web/src -name '*.js' -print0 | xargs -0 -n1 node --check
node --test prototype/web/tests/*.test.js
python3 -m unittest discover -s prototype/web/tests -p 'test_*.py'
```

Os testes cobrem migração do save, contrato de frames das animações,
preparação de assets e integridade do precache offline.

## Gerar bundle autocontido

```bash
python3 prototype/web/build_bundle.py
```

O resultado é `prototype/web/dist/index.bundled.html`. O bundle é uma saída
gerada; as fontes canônicas continuam em `prototype/web/src`.

## Android

```bash
cd android
./gradlew assembleDebug --no-daemon
```

O Gradle copia o jogo e os sprites canônicos para o APK durante o build. O
workflow `APK Android` também gera um APK de debug para download nos
artefatos da execução.
