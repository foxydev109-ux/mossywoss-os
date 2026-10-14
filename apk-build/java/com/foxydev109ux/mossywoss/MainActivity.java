package com.foxydev109ux.mossywoss;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;

import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends Activity {

    private static final int REQUEST_CODE_FILE_CHOOSER = 1001;
    private static final int REQUEST_CODE_PERMISSIONS = 1002;

    private WebView mWebView;
    private FrameLayout mCustomViewContainer;
    private View mCustomView;
    private WebChromeClient.CustomViewCallback mCustomViewCallback;

    private ValueCallback<Uri[]> mFilePathCallback;
    private PermissionRequest mPendingPermissionRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Fullscreen layout setup
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        FrameLayout rootLayout = new FrameLayout(this);
        rootLayout.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        mWebView = new WebView(this);
        mWebView.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        mCustomViewContainer = new FrameLayout(this);
        mCustomViewContainer.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        mCustomViewContainer.setVisibility(View.GONE);

        rootLayout.addView(mWebView);
        rootLayout.addView(mCustomViewContainer);
        setContentView(rootLayout);

        // Configure WebSettings
        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // Configure WebViewAssetLoader for secure origin (https://appassets.androidplatform.net/)
        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            @Deprecated
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return assetLoader.shouldInterceptRequest(Uri.parse(url));
            }
        });

        mWebView.setWebChromeClient(new WebChromeClient() {

            // File Chooser for Publish Studio import / general file selection
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                }
                mFilePathCallback = filePathCallback;

                Intent intent = null;
                if (fileChooserParams != null) {
                    intent = fileChooserParams.createIntent();
                }
                if (intent == null) {
                    intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                }
                try {
                    startActivityForResult(Intent.createChooser(intent, "Select File"), REQUEST_CODE_FILE_CHOOSER);
                } catch (Exception e) {
                    mFilePathCallback = null;
                    return false;
                }
                return true;
            }

            // JavaScript alert dialog
            @Override
            public boolean onJsAlert(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                    .setTitle("MossyWoss OS")
                    .setMessage(message)
                    .setPositiveButton(android.R.string.ok, new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            result.confirm();
                        }
                    })
                    .setOnCancelListener(new DialogInterface.OnCancelListener() {
                        @Override
                        public void onCancel(DialogInterface dialog) {
                            result.cancel();
                        }
                    })
                    .show();
                return true;
            }

            // JavaScript confirm dialog
            @Override
            public boolean onJsConfirm(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                    .setTitle("MossyWoss OS")
                    .setMessage(message)
                    .setPositiveButton(android.R.string.ok, new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            result.confirm();
                        }
                    })
                    .setNegativeButton(android.R.string.cancel, new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            result.cancel();
                        }
                    })
                    .setOnCancelListener(new DialogInterface.OnCancelListener() {
                        @Override
                        public void onCancel(DialogInterface dialog) {
                            result.cancel();
                        }
                    })
                    .show();
                return true;
            }

            // JavaScript prompt dialog
            @Override
            public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, final JsPromptResult result) {
                final EditText input = new EditText(MainActivity.this);
                if (defaultValue != null) {
                    input.setText(defaultValue);
                }
                new AlertDialog.Builder(MainActivity.this)
                    .setTitle("MossyWoss OS")
                    .setMessage(message)
                    .setView(input)
                    .setPositiveButton(android.R.string.ok, new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            result.confirm(input.getText().toString());
                        }
                    })
                    .setNegativeButton(android.R.string.cancel, new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            result.cancel();
                        }
                    })
                    .setOnCancelListener(new DialogInterface.OnCancelListener() {
                        @Override
                        public void onCancel(DialogInterface dialog) {
                            result.cancel();
                        }
                    })
                    .show();
                return true;
            }

            // Camera / Microphone runtime permission request from web app
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                mPendingPermissionRequest = request;
                String[] requestedResources = request.getResources();
                boolean needsCamera = false;
                boolean needsAudio = false;

                for (String res : requestedResources) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)) {
                        needsCamera = true;
                    } else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)) {
                        needsAudio = true;
                    }
                }

                boolean cameraGranted = !needsCamera || checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
                boolean audioGranted = !needsAudio || checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;

                if (cameraGranted && audioGranted) {
                    request.grant(requestedResources);
                    mPendingPermissionRequest = null;
                } else {
                    java.util.ArrayList<String> perms = new java.util.ArrayList<>();
                    if (needsCamera && !cameraGranted) perms.add(Manifest.permission.CAMERA);
                    if (needsAudio && !audioGranted) perms.add(Manifest.permission.RECORD_AUDIO);
                    requestPermissions(perms.toArray(new String[0]), REQUEST_CODE_PERMISSIONS);
                }
            }

            // Fullscreen video
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (mCustomView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                mCustomView = view;
                mCustomViewCallback = callback;
                mWebView.setVisibility(View.GONE);
                mCustomViewContainer.addView(view);
                mCustomViewContainer.setVisibility(View.VISIBLE);
            }

            @Override
            public void onHideCustomView() {
                hideCustomViewInternal();
            }
        });

        mWebView.loadUrl("https://appassets.androidplatform.net/assets/mossywoss_os.html");
    }

    private void hideCustomViewInternal() {
        if (mCustomView == null) return;
        mCustomViewContainer.removeView(mCustomView);
        mCustomViewContainer.setVisibility(View.GONE);
        mCustomView = null;
        if (mCustomViewCallback != null) {
            mCustomViewCallback.onCustomViewHidden();
            mCustomViewCallback = null;
        }
        mWebView.setVisibility(View.VISIBLE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQUEST_CODE_FILE_CHOOSER) {
            if (mFilePathCallback != null) {
                Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                mFilePathCallback.onReceiveValue(results);
                mFilePathCallback = null;
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == REQUEST_CODE_PERMISSIONS) {
            if (mPendingPermissionRequest != null) {
                boolean allGranted = grantResults.length > 0;
                for (int res : grantResults) {
                    if (res != PackageManager.PERMISSION_GRANTED) {
                        allGranted = false;
                        break;
                    }
                }
                if (allGranted) {
                    mPendingPermissionRequest.grant(mPendingPermissionRequest.getResources());
                } else {
                    mPendingPermissionRequest.deny();
                }
                mPendingPermissionRequest = null;
            }
        } else {
            super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        }
    }

    @Override
    public void onBackPressed() {
        if (mCustomView != null) {
            hideCustomViewInternal();
        } else if (mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
        } else {
            moveTaskToBack(true);
        }
    }

    @Override
    protected void onDestroy() {
        if (mWebView != null) {
            mWebView.destroy();
        }
        super.onDestroy();
    }
}
