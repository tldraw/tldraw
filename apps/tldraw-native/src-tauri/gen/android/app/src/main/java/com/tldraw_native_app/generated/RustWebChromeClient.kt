/* THIS FILE IS AUTO-GENERATED. DO NOT MODIFY!! */

// Copyright 2020-2023 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

@file:Suppress("ObsoleteSdkInt", "RedundantOverride", "QueryPermissionsNeeded", "SimpleDateFormat")

package com.tldraw_native_app

// taken from https://github.com/ionic-team/capacitor/blob/6658bca41e78239347e458175b14ca8bd5c1d6e8/android/capacitor/src/main/java/com/getcapacitor/BridgeWebChromeClient.java

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.DialogInterface
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.view.View
import android.webkit.*
import android.widget.EditText
import androidx.activity.result.ActivityResult
import androidx.activity.result.ActivityResultCallback
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*

class RustWebChromeClient(appActivity: WryActivity) : WebChromeClient() {
  private interface PermissionListener {
    fun onPermissionSelect(isGranted: Boolean?)
  }

  private interface ActivityResultListener {
    fun onActivityResult(result: ActivityResult?)
  }

  private val activity: WryActivity
  private var permissionLauncher: ActivityResultLauncher<Array<String>>
  private var activityLauncher: ActivityResultLauncher<Intent>
  private var permissionListener: PermissionListener? = null
  private var activityListener: ActivityResultListener? = null

  init {
    activity = appActivity
    val permissionCallback =
      ActivityResultCallback { isGranted: Map<String, Boolean> ->
        if (permissionListener != null) {
          var granted = true
          for ((_, value) in isGranted) {
            if (!value) granted = false
          }
          permissionListener!!.onPermissionSelect(granted)
        }
      }
    permissionLauncher =
      activity.registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions(), permissionCallback)
    activityLauncher = activity.registerForActivityResult(
      ActivityResultContracts.StartActivityForResult()
    ) { result ->
      if (activityListener != null) {
        activityListener!!.onActivityResult(result)
      }
    }
  }

  /**
   * Render web content in `view`.
   *
   * Both this method and [.onHideCustomView] are required for
   * rendering web content in full screen.
   *
   * @see [](https://developer.android.com/reference/android/webkit/WebChromeClient.onShowCustomView
  ) */
  override fun onShowCustomView(view: View, callback: CustomViewCallback) {
    callback.onCustomViewHidden()
    super.onShowCustomView(view, callback)
  }

  /**
   * Render web content in the original Web View again.
   *
   * Do not remove this method--@see #onShowCustomView(View, CustomViewCallback).
   */
  override fun onHideCustomView() {
    super.onHideCustomView()
  }

  override fun onPermissionRequest(request: PermissionRequest) {
    val isRequestPermissionRequired = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
    val permissionList: MutableList<String> = ArrayList()
    if (listOf(*request.resources).contains("android.webkit.resource.VIDEO_CAPTURE")) {
      permissionList.add(Manifest.permission.CAMERA)
    }
    if (listOf(*request.resources).contains("android.webkit.resource.AUDIO_CAPTURE")) {
      permissionList.add(Manifest.permission.MODIFY_AUDIO_SETTINGS)
      permissionList.add(Manifest.permission.RECORD_AUDIO)
    }
    if (permissionList.isNotEmpty() && isRequestPermissionRequired) {
      val permissions = permissionList.toTypedArray()
      permissionListener = object : PermissionListener {
        override fun onPermissionSelect(isGranted: Boolean?) {
          if (isGranted == true) {
            request.grant(request.resources)
          } else {
            request.deny()
          }
        }
      }
      permissionLauncher.launch(permissions)
    } else {
      request.grant(request.resources)
    }
  }

  /**
   * Show the browser alert modal
   * @param view
   * @param url
   * @param message
   * @param result
   * @return
   */
  override fun onJsAlert(view: WebView, url: String, message: String, result: JsResult): Boolean {
    if (activity.isFinishing) {
      return true
    }
    val builder = AlertDialog.Builder(view.context)
    builder
      .setMessage(message)
      .setPositiveButton(
        "OK"
      ) { dialog: DialogInterface, _: Int ->
        dialog.dismiss()
        result.confirm()
      }
      .setOnCancelListener { dialog: DialogInterface ->
        dialog.dismiss()
        result.cancel()
      }
    val dialog = builder.create()
    dialog.show()
    return true
  }

  /**
   * Show the browser confirm modal
   * @param view
   * @param url
   * @param message
   * @param result
   * @return
   */
  override fun onJsConfirm(view: WebView, url: String, message: String, result: JsResult): Boolean {
    if (activity.isFinishing) {
      return true
    }
    val builder = AlertDialog.Builder(view.context)
    builder
      .setMessage(message)
      .setPositiveButton(
        "OK"
      ) { dialog: DialogInterface, _: Int ->
        dialog.dismiss()
        result.confirm()
      }
      .setNegativeButton(
        "Cancel"
      ) { dialog: DialogInterface, _: Int ->
        dialog.dismiss()
        result.cancel()
      }
      .setOnCancelListener { dialog: DialogInterface ->
        dialog.dismiss()
        result.cancel()
      }
    val dialog = builder.create()
    dialog.show()
    return true
  }

  /**
   * Show the browser prompt modal
   * @param view
   * @param url
   * @param message
   * @param defaultValue
   * @param result
   * @return
   */
  override fun onJsPrompt(
    view: WebView,
    url: String,
    message: String,
    defaultValue: String,
    result: JsPromptResult
  ): Boolean {
    if (activity.isFinishing) {
      return true
    }
    val builder = AlertDialog.Builder(view.context)
    val input = EditText(view.context)
    builder
      .setMessage(message)
      .setView(input)
      .setPositiveButton(
        "OK"
      ) { dialog: DialogInterface, _: Int ->
        dialog.dismiss()
        val inputText1 = input.text.toString().trim { it <= ' ' }
        result.confirm(inputText1)
      }
      .setNegativeButton(
        "Cancel"
      ) { dialog: DialogInterface, _: Int ->
        dialog.dismiss()
        result.cancel()
      }
      .setOnCancelListener { dialog: DialogInterface ->
        dialog.dismiss()
        result.cancel()
      }
    val dialog = builder.create()
    dialog.show()
    return true
  }

  /**
   * Handle the browser geolocation permission prompt
   * @param origin
   * @param callback
   */
  override fun onGeolocationPermissionsShowPrompt(
    origin: String,
    callback: GeolocationPermissions.Callback
  ) {
    super.onGeolocationPermissionsShowPrompt(origin, callback)
    Logger.debug("onGeolocationPermissionsShowPrompt: DOING IT HERE FOR ORIGIN: $origin")
    val geoPermissions =
      arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION)
    if (!PermissionHelper.hasPermissions(activity, geoPermissions)) {
      permissionListener = object : PermissionListener {
        override fun onPermissionSelect(isGranted: Boolean?) {
          if (isGranted == true) {
            callback.invoke(origin, true, false)
          } else {
            val coarsePermission =
              arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
              PermissionHelper.hasPermissions(activity, coarsePermission)
            ) {
              callback.invoke(origin, true, false)
            } else {
              callback.invoke(origin, false, false)
            }
          }
        }
      }
      permissionLauncher.launch(geoPermissions)
    } else {
      // permission is already granted
      callback.invoke(origin, true, false)
      Logger.debug("onGeolocationPermissionsShowPrompt: has required permission")
    }
  }

  override fun onShowFileChooser(
    webView: WebView,
    filePathCallback: ValueCallback<Array<Uri?>?>,
    fileChooserParams: FileChooserParams
  ): Boolean {
    val acceptTypes = listOf(*fileChooserParams.acceptTypes)
    val captureEnabled = fileChooserParams.isCaptureEnabled
    val capturePhoto = captureEnabled && acceptTypes.contains("image/*")
    val captureVideo = captureEnabled && acceptTypes.contains("video/*")
    if (capturePhoto || captureVideo) {
      if (isMediaCaptureSupported) {
        showMediaCaptureOrFilePicker(filePathCallback, fileChooserParams, captureVideo)
      } else {
        permissionListener = object : PermissionListener {
          override fun onPermissionSelect(isGranted: Boolean?) {
            if (isGranted == true) {
              showMediaCaptureOrFilePicker(filePathCallback, fileChooserParams, captureVideo)
            } else {
              Logger.warn(Logger.tags("FileChooser"), "Camera permission not granted")
              filePathCallback.onReceiveValue(null)
            }
          }
        }
        val camPermission = arrayOf(Manifest.permission.CAMERA)
        permissionLauncher.launch(camPermission)
      }
    } else {
      showFilePicker(filePathCallback, fileChooserParams)
    }
    return true
  }

  private val isMediaCaptureSupported: Boolean
    get() {
      val permissions = arrayOf(Manifest.permission.CAMERA)
      return PermissionHelper.hasPermissions(activity, permissions) ||
        !PermissionHelper.hasDefinedPermission(activity, Manifest.permission.CAMERA)
    }

  private fun showMediaCaptureOrFilePicker(
    filePathCallback: ValueCallback<Array<Uri?>?>,
    fileChooserParams: FileChooserParams,
    isVideo: Boolean
  ) {
    val isVideoCaptureSupported = true
    val shown = if (isVideo && isVideoCaptureSupported) {
      showVideoCapturePicker(filePathCallback)
    } else {
      showImageCapturePicker(filePathCallback)
    }
    if (!shown) {
      Logger.warn(
        Logger.tags("FileChooser"),
        "Media capture intent could not be launched. Falling back to default file picker."
      )
      showFilePicker(filePathCallback, fileChooserParams)
    }
  }

  private fun showImageCapturePicker(filePathCallback: ValueCallback<Array<Uri?>?>): Boolean {
    val takePictureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
    if (takePictureIntent.resolveActivity(activity.packageManager) == null) {
      return false
    }
    val imageFileUri: Uri = try {
      createImageFileUri()
    } catch (ex: Exception) {
      Logger.error("Unable to create temporary media capture file: " + ex.message)
      return false
    }
    takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, imageFileUri)
    activityListener = object : ActivityResultListener {
      override fun onActivityResult(result: ActivityResult?) {
        var res: Array<Uri?>? = null
        if (result?.resultCode == Activity.RESULT_OK) {
          res = arrayOf(imageFileUri)
        }
        filePathCallback.onReceiveValue(res)
      }
    }
    activityLauncher.launch(takePictureIntent)
    return true
  }

  private fun showVideoCapturePicker(filePathCallback: ValueCallback<Array<Uri?>?>): Boolean {
    val takeVideoIntent = Intent(MediaStore.ACTION_VIDEO_CAPTURE)
    if (takeVideoIntent.resolveActivity(activity.packageManager) == null) {
      return false
    }
    activityListener = object : ActivityResultListener {
      override fun onActivityResult(result: ActivityResult?) {
        var res: Array<Uri?>? = null
        if (result?.resultCode == Activity.RESULT_OK) {
          res = arrayOf(result.data!!.data)
        }
        filePathCallback.onReceiveValue(res)
      }
    }
    activityLauncher.launch(takeVideoIntent)
    return true
  }

  private fun showFilePicker(
    filePathCallback: ValueCallback<Array<Uri?>?>,
    fileChooserParams: FileChooserParams
  ) {
    val intent = fileChooserParams.createIntent()
    if (fileChooserParams.mode == FileChooserParams.MODE_OPEN_MULTIPLE) {
      intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
    }
    if (fileChooserParams.acceptTypes.size > 1 || intent.type!!.startsWith(".")) {
      val validTypes = getValidTypes(fileChooserParams.acceptTypes)
      intent.putExtra(Intent.EXTRA_MIME_TYPES, validTypes)
      if (intent.type!!.startsWith(".")) {
        intent.type = validTypes[0]
      }
    }
    try {
      activityListener = object : ActivityResultListener {
        override fun onActivityResult(result: ActivityResult?) {
          val res: Array<Uri?>?
          val resultIntent = result?.data
          if (result?.resultCode == Activity.RESULT_OK && resultIntent!!.clipData != null) {
            val numFiles = resultIntent.clipData!!.itemCount
            res = arrayOfNulls(numFiles)
            for (i in 0 until numFiles) {
              res[i] = resultIntent.clipData!!.getItemAt(i).uri
            }
          } else {
            res = FileChooserParams.parseResult(
              result?.resultCode ?: 0,
              resultIntent
            )
          }
          filePathCallback.onReceiveValue(res)
        }
      }
      activityLauncher.launch(intent)
    } catch (e: ActivityNotFoundException) {
      filePathCallback.onReceiveValue(null)
    }
  }

  private fun getValidTypes(currentTypes: Array<String>): Array<String> {
    val validTypes: MutableList<String> = ArrayList()
    val mtm = MimeTypeMap.getSingleton()
    for (mime in currentTypes) {
      if (mime.startsWith(".")) {
        val extension = mime.substring(1)
        val extensionMime = mtm.getMimeTypeFromExtension(extension)
        if (extensionMime != null && !validTypes.contains(extensionMime)) {
          validTypes.add(extensionMime)
        }
      } else if (!validTypes.contains(mime)) {
        validTypes.add(mime)
      }
    }
    val validObj: Array<Any> = validTypes.toTypedArray()
    return Arrays.copyOf(
      validObj, validObj.size,
      Array<String>::class.java
    )
  }

  override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
    val tag: String = Logger.tags("Console")
    if (consoleMessage.message() != null && isValidMsg(consoleMessage.message())) {
      val msg = String.format(
        "File: %s - Line %d - Msg: %s",
        consoleMessage.sourceId(),
        consoleMessage.lineNumber(),
        consoleMessage.message()
      )
      val level = consoleMessage.messageLevel().name
      if ("ERROR".equals(level, ignoreCase = true)) {
        Logger.error(tag, msg, null)
      } else if ("WARNING".equals(level, ignoreCase = true)) {
        Logger.warn(tag, msg)
      } else if ("TIP".equals(level, ignoreCase = true)) {
        Logger.debug(tag, msg)
      } else {
        Logger.info(tag, msg)
      }
    }
    return true
  }

  private fun isValidMsg(msg: String): Boolean {
    return !(msg.contains("%cresult %c") ||
      msg.contains("%cnative %c") ||
      msg.equals("[object Object]", ignoreCase = true) ||
      msg.equals("console.groupEnd", ignoreCase = true))
  }

  @Throws(IOException::class)
  private fun createImageFileUri(): Uri {
    val photoFile = createImageFile(activity)
    return FileProvider.getUriForFile(
      activity,
      activity.packageName.toString() + ".fileprovider",
      photoFile
    )
  }

  @Throws(IOException::class)
  private fun createImageFile(activity: Activity): File {
    // Create an image file name
    val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss").format(Date())
    val imageFileName = "JPEG_" + timeStamp + "_"
    val storageDir = activity.getExternalFilesDir(Environment.DIRECTORY_PICTURES)
    return File.createTempFile(imageFileName, ".jpg", storageDir)
  }

  override fun onReceivedTitle(
      view: WebView,
      title: String
  ) {
    handleReceivedTitle(view, title)
  }

  private external fun handleReceivedTitle(webview: WebView, title: String)
}
