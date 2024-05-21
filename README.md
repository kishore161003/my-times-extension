# My Times Extension

This is a browser extension that allows users to set restrictions and timeouts on specific websites. It communicates with a backend Ruby on Rails server to store and manage the data.

## Table of Contents

- [Installation](##installation)
- [Usage](##usage)
- [Configuration](##configuration)
  - [manifest.json](##manifestjson)
- [Contributing](##contributing)
  

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kishore161003/my-times-extension.git
   cd my-times-extension
   ```
2. Load the extension in your browser:
   
        - Open your browser's extensions page (usually found in chrome://extensions for Chrome or about:debugging for Firefox).
   
        - Enable "Developer mode" if it is not already enabled.
   
        - Click "Load unpacked" and select the directory where you cloned this repository

![extesnsion_helper](https://github.com/kishore161003/my-times-extension/assets/116169099/81fe4a7e-a85b-4f34-9126-1f55e9f21f19)

## Usage

Once installed, you can use the extension to set restrictions and timeouts for any website you visit. The extension icon will appear in the browser toolbar. Click the icon to open the extension's interface and manage your website restrictions and timeouts.

During the Registration , website will be asking For Your Extension Id , DONT FORGET TO USE YOUR EXTENSION ID, you can refer from the above image

## Configuration

# manifest.json

The manifest.json file contains the metadata for the browser extension. Here is an example configuration:

```bash
{
  "name": "My times",
  "version": "1.0",
  "manifest_version": 3,
  "action": {
    "default_popup": "./popup.html"
  },
  "permissions": [
    "storage",
    "activeTab",
    "tabs",
    "webNavigation",
    "webRequest",
    "cookies",
    "alarms",
    "notifications",
    "scripting"
  ],

  "externally_connectable": {
    "matches": ["<all_urls>"]
  },
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "./background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["./content.js"]
    }
  ]
}
```
## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have any improvements or bug fixes.
