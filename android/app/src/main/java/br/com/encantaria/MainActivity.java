package br.com.encantaria;

import android.annotation.SuppressLint;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.WebViewAssetLoader;

/**
 * Casca do app: uma WebView em tela cheia rodando o jogo que está embutido
 * nos assets. Nenhuma lógica de jogo mora aqui — o jogo é o mesmo
 * prototype/web que roda no navegador.
 *
 * Os assets são servidos por WebViewAssetLoader, em
 * https://appassets.androidplatform.net/, e não por file://. A diferença
 * importa: file:// é uma origem "opaca" onde localStorage é pouco confiável
 * entre versões do Android, e o save do jogo depende de localStorage.
 */
public class MainActivity extends AppCompatActivity {

  private WebView web;

  @SuppressLint("SetJavaScriptEnabled")
  @Override
  protected void onCreate(Bundle state) {
    super.onCreate(state);

    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    hideSystemBars();

    final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
        .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
        .build();

    web = new WebView(this);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);            // o save do jogo vive em localStorage
    s.setMediaPlaybackRequiresUserGesture(false); // Web Audio sem gesto extra
    s.setSupportZoom(false);
    s.setBuiltInZoomControls(false);
    s.setTextZoom(100);                      // fonte do sistema não pode esticar o HUD

    web.setWebViewClient(new WebViewClient() {
      @Override
      public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return loader.shouldInterceptRequest(request.getUrl());
      }
    });

    web.setBackgroundColor(0xFF16211F);
    setContentView(web);
    web.loadUrl("https://appassets.androidplatform.net/assets/www/index.html");
  }

  private void hideSystemBars() {
    WindowInsetsControllerCompat c =
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
    c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    c.hide(WindowInsetsCompat.Type.systemBars());
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus) hideSystemBars();
  }

  // voltar navega no histórico do jogo antes de sair do app
  @Override
  public void onBackPressed() {
    if (web != null && web.canGoBack()) web.goBack();
    else super.onBackPressed();
  }
}
