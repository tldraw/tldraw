# THIS FILE IS AUTO-GENERATED. DO NOT MODIFY!!

# Copyright 2020-2023 Tauri Programme within The Commons Conservancy
# SPDX-License-Identifier: Apache-2.0
# SPDX-License-Identifier: MIT

-keep class com.tldraw_native_app.* {
  native <methods>;
}

-keep class com.tldraw_native_app.WryActivity {
  public <init>(...);

  void setWebView(com.tldraw_native_app.RustWebView);
  java.lang.Class getAppClass(...);
  java.lang.String getVersion();
}

-keep class com.tldraw_native_app.Ipc {
  public <init>(...);

  @android.webkit.JavascriptInterface public <methods>;
}

-keep class com.tldraw_native_app.RustWebView {
  public <init>(...);

  void loadUrlMainThread(...);
  void loadHTMLMainThread(...);
  void setAutoPlay(...);
  void setUserAgent(...);
  void evalScript(...);
}

-keep class com.tldraw_native_app.RustWebChromeClient,com.tldraw_native_app.RustWebViewClient {
  public <init>(...);
}