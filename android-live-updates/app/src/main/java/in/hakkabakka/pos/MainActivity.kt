package `in`.hakkabakka.pos

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.*
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private lateinit var root: FrameLayout
    private val posUrl = "https://hakkabakka-pos-v2.mail-marvelgroup.workers.dev/"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(139, 17, 24)
        window.navigationBarColor = Color.rgb(139, 17, 24)
        requestNotificationPermission()
        HbMessagingService.createChannels(this)
        if (FirebaseApp.getApps(this).isNotEmpty()) {
            FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
                getSharedPreferences("hbpos", MODE_PRIVATE).edit().putString("fcm_token", token).apply()
            }
        }

        root = FrameLayout(this)
        root.setBackgroundColor(Color.WHITE)
        web = WebView(this)
        web.setBackgroundColor(Color.WHITE)
        web.visibility = View.VISIBLE
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.databaseEnabled = true
        web.settings.loadsImagesAutomatically = true
        web.settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        web.settings.userAgentString = web.settings.userAgentString + " HBPOSNative/2"
        web.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                android.util.Log.d("HBPOS-WebView", "${message.message()} -- line ${message.lineNumber()}")
                return true
            }
        }
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                val host = uri.host ?: return false
                return if (host == "hakkabakka-pos-v2.mail-marvelgroup.workers.dev" || host == "hakkabakka.in" || host.endsWith(".hakkabakka.in")) {
                    false
                } else {
                    try { startActivity(Intent(Intent.ACTION_VIEW, uri)) } catch (_: Exception) { }
                    true
                }
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) showLoadError("Network error: ${error.description}")
            }

            override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, response: WebResourceResponse) {
                if (request.isForMainFrame && response.statusCode >= 400) {
                    showLoadError("Server error: HTTP ${response.statusCode}")
                }
            }

            override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: android.net.http.SslError) {
                handler.cancel()
                showLoadError("Secure connection could not be verified. Please check date, time and internet connection.")
            }
        }
        root.addView(web, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        setContentView(root)
        if (savedInstanceState != null) web.restoreState(savedInstanceState) else web.loadUrl(posUrl)
    }

    private fun showLoadError(message: String) {
        val safe = message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        val html = """
            <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
            <style>body{font-family:Arial;background:#f5f4f7;color:#26221f;padding:28px;text-align:center}
            .card{background:white;border-radius:18px;padding:26px;margin-top:20vh;box-shadow:0 4px 20px #0001}
            button{background:#2b211b;color:white;border:0;border-radius:12px;padding:14px 24px;font-size:17px;margin-top:18px}</style></head>
            <body><div class="card"><h2>HakkaBakka POS</h2><p>POS load nahi ho paaya.</p><p>$safe</p>
            <button onclick="location.href='$posUrl'">Retry</button></div></body></html>
        """.trimIndent()
        web.loadDataWithBaseURL(posUrl, html, "text/html", "UTF-8", null)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        if (::web.isInitialized) web.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
        }
    }

    @Deprecated("Deprecated in Android")
    override fun onBackPressed() {
        if (::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed()
    }
}