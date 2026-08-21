# Encantaria — APK Android

Casca fina de WebView em volta do jogo web. **Não há lógica de jogo aqui**:
o que roda dentro do APK é exatamente o mesmo `prototype/web/` que roda no
navegador. O `build.gradle` copia aquela pasta para dentro dos assets na
hora de compilar, então existe uma fonte só da verdade — mexer no jogo e
recompilar já leva a mudança para o app.

## Como pegar o APK sem instalar nada

O workflow `.github/workflows/android.yml` compila a cada push que toque em
`android/` ou `prototype/web/`. O runner do GitHub já vem com o SDK do
Android, então não é preciso montar ambiente nenhum:

1. Abrir a aba **Actions** do repositório (dá para fazer pelo celular).
2. Escolher a execução mais recente de **APK Android**.
3. Baixar o artefato **encantaria-apk** e instalar o `.apk` de dentro dele.

O Android vai pedir para liberar "instalar de fontes desconhecidas" para o
navegador ou gerenciador de arquivos — é o esperado para APK fora da loja.

## Compilando na sua máquina

Precisa de JDK 17+ e do SDK do Android (o Android Studio já traz os dois):

```bash
cd android
./gradlew assembleDebug
# APK em app/build/outputs/apk/debug/app-debug.apk
```

## Detalhes que valem saber

- **Assets são servidos por `WebViewAssetLoader`**, em
  `https://appassets.androidplatform.net/`, e não por `file://`. A diferença
  importa: `file://` é uma origem opaca onde `localStorage` é pouco
  confiável entre versões do Android, e o save do jogo vive em
  `localStorage`.
- **O service worker é pulado dentro do app** (ver a checagem de hostname em
  `prototype/web/index.html`). Lá os arquivos já são locais, e o service
  worker só concorreria com o `WebViewAssetLoader`.
- **Orientação travada em paisagem** e barras do sistema escondidas, para
  bater com o desenho do HUD (ver GDD Seção 35–36).
- **É um APK de debug**, assinado com a chave de debug padrão. Instala num
  aparelho comum, mas **não serve para publicar na Play Store** — para loja
  seria preciso um `assembleRelease` com keystore própria guardada nos
  secrets do repositório.

## E se eu não quiser APK?

O jogo também é uma PWA: abrindo o endereço no Chrome do Android e usando
"Adicionar à tela inicial", ele instala com ícone próprio, abre em tela
cheia e funciona offline (ver `prototype/web/sw.js` e
`prototype/web/manifest.webmanifest`). É o caminho mais rápido e não exige
liberar instalação de fontes desconhecidas.
