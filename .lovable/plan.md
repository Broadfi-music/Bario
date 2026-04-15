

# Deploy assetlinks.json for Google Play TWA Verification

## What this does
Creates the Digital Asset Links file at `public/.well-known/assetlinks.json` in your project. When published, it will be served at `https://bario.icu/.well-known/assetlinks.json`, which Google uses to verify your TWA app owns the domain. This removes the browser address bar from your app.

## Steps

1. **Create file `public/.well-known/assetlinks.json`** with your provided content:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "icu.bario.twa",
    "sha256_cert_fingerprints": ["B4:51:6A:B5:AB:CA:F1:4B:3D:02:05:4C:B8:5E:58:C5:AC:AF:A5:86:BB:34:F7:9D:3B:4D:65:F3:3D:A7:5F:49"]
  }
}]
```

2. **Publish the app** so the file goes live at `https://bario.icu/.well-known/assetlinks.json`

That's it — one file created, then publish.

