/* THIS FILE IS AUTO-GENERATED. DO NOT MODIFY!! */

// Copyright 2020-2023 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

package com.tldraw_native_app

import android.net.Uri
import android.webkit.*
import android.content.Context
import android.graphics.Bitmap
import android.os.Handler
import android.os.Looper
import androidx.webkit.WebViewAssetLoader

class RustWebViewClient(context: Context): WebViewClient() {
    private val interceptedState = mutableMapOf<String, Boolean>()
    var currentUrl: String = "about:blank"
    private var lastInterceptedUrl: Uri? = null
    private var pendingUrlRedirect: String? = null

    private val assetLoader = WebViewAssetLoader.Builder()
        .setDomain(assetLoaderDomain())
        .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(context))
        .build()

    override fun shouldInterceptRequest(
        view: WebView,
        request: WebResourceRequest
    ): WebResourceResponse? {
        pendingUrlRedirect?.let {
            Handler(Looper.getMainLooper()).post {
              view.loadUrl(it)
            }
            pendingUrlRedirect = null
            return null
        }

        lastInterceptedUrl = request.url
        return if (withAssetLoader()) {
            assetLoader.shouldInterceptRequest(request.url)
        } else {
            val response = handleRequest(request, (view as RustWebView).isDocumentStartScriptEnabled)
            interceptedState[request.url.toString()] = response != null
            return response
        }
    }

    override fun shouldOverrideUrlLoading(
        view: WebView,
        request: WebResourceRequest
    ): Boolean {
        return shouldOverride(request.url.toString())
    }

    override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
        currentUrl = url
        if (interceptedState[url] == false) {
            val webView = view as RustWebView
            for (script in webView.initScripts) {
                view.evaluateJavascript(script, null)
            }
        }
        return onPageLoading(url)
    }

    override fun onPageFinished(view: WebView, url: String) {
        onPageLoaded(url)
    }

    override fun onReceivedError(
        view: WebView,
        request: WebResourceRequest,
        error: WebResourceError
    ) {
        // we get a net::ERR_CONNECTION_REFUSED when an external URL redirects to a custom protocol
        // e.g. oauth flow, because shouldInterceptRequest is not called on redirects
        // so we must force retry here with loadUrl() to get a chance of the custom protocol to kick in
        if (error.errorCode == ERROR_CONNECT && request.isForMainFrame && request.url != lastInterceptedUrl) {
            // prevent the default error page from showing
            view.stopLoading()
            // without this initial loadUrl the app is stuck
            view.loadUrl(request.url.toString())
            // ensure the URL is actually loaded - for some reason there's a race condition and we need to call loadUrl() again later
            pendingUrlRedirect = request.url.toString()
        } else {
            super.onReceivedError(view, request, error)
        }
    }

    companion object {
        init {
            System.loadLibrary("tldraw_native_lib")
        }
    }

    private external fun assetLoaderDomain(): String
    private external fun withAssetLoader(): Boolean
    private external fun handleRequest(request: WebResourceRequest, isDocumentStartScriptEnabled: Boolean): WebResourceResponse?
    private external fun shouldOverride(url: String): Boolean
    private external fun onPageLoading(url: String)
    private external fun onPageLoaded(url: String)

    
}
