# 🎤 Voice Transcriber Chrome Extension

A powerful Chrome extension that provides real-time audio transcription using the Web Speech API. Capture, transcribe, and manage your voice recordings directly in your browser.

## ✨ Features

- **Real-time transcription** using browser's built-in speech recognition
- **Multiple language support** (English, Spanish, French, German, etc.)
- **Continuous mode** for long-form transcription
- **Auto punctuation** for better readability
- **Copy to clipboard** functionality
- **Save transcriptions** as text files
- **Floating overlay** for page-level transcription
- **Keyboard shortcuts** for quick access
- **Persistent storage** to save your transcriptions
- **Modern, responsive UI** with professional styling

## 🚀 Installation

### Method 1: Load Unpacked Extension (Recommended for Development)

1. **Download the Extension Files**
   - Clone or download all files to a local directory
   - Ensure you have all these files:
     ```
     voice-transcriber/
     ├── manifest.json
     ├── popup.html
     ├── popup.js
     ├── styles.css
     ├── background.js
     ├── content.js
     └── README.md
     ```

2. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Or click the three dots menu → More tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**
   - Click "Load unpacked" button
   - Select the folder containing your extension files
   - The extension should appear in your extensions list

5. **Pin the Extension** (Optional)
   - Click the puzzle piece icon in Chrome's toolbar
   - Find "Voice Transcriber" and click the pin icon
   - The extension icon will now appear in your toolbar

### Method 2: Chrome Web Store (Future)

*This extension will be available on the Chrome Web Store after review and approval.*

## 🎯 How to Use

### Basic Usage

1. **Click the Extension Icon**
   - Click the Voice Transcriber icon in your toolbar
   - The popup interface will open

2. **Grant Microphone Permission**
   - On first use, Chrome will ask for microphone permission
   - Click "Allow" to enable voice transcription

3. **Start Recording**
   - Click the "Start Recording" button
   - Speak clearly into your microphone
   - Your speech will be transcribed in real-time

4. **Stop Recording**
   - Click "Stop Recording" when finished
   - Your transcription will be saved automatically

### Advanced Features

#### Language Selection
- Open the Settings panel in the popup
- Choose from 10+ supported languages
- Settings are automatically saved

#### Continuous Mode
- Enable "Continuous mode" in settings
- Recording will continue until manually stopped
- Perfect for long lectures or meetings

#### Auto Punctuation
- Enable "Auto punctuation" for better readability
- Automatically adds periods and capitalizes sentences

#### Copy & Save
- **Copy**: Click "Copy" to copy text to clipboard
- **Save**: Click "Save" to download as a text file
- **Clear**: Click "Clear" to reset the transcription

### Page-Level Transcription

#### Floating Overlay
- The extension can inject a floating overlay on any webpage
- Use for transcribing while browsing or watching videos

#### Keyboard Shortcuts
- **Ctrl+Shift+T**: Toggle transcription on/off
- **Ctrl+Shift+C**: Copy transcription to clipboard

## ⚙️ Configuration

### Settings Options

| Setting | Description | Default |
|---------|-------------|---------|
| Language | Speech recognition language | English (US) |
| Continuous Mode | Keep recording until manually stopped | Off |
| Auto Punctuation | Automatically add punctuation | On |

### Stored Data

The extension stores:
- **User settings** (language, preferences)
- **Recent transcriptions** (locally, for 7 days)
- **No personal data** is sent to external servers

## 🔧 Troubleshooting

### Common Issues

#### "Speech recognition not supported"
- **Solution**: Use Google Chrome (required for Web Speech API)
- **Alternative**: Try Chrome Canary or Chrome Dev

#### "Microphone access denied"
- **Solution**: 
  1. Click the microphone icon in Chrome's address bar
  2. Select "Always allow" for the extension
  3. Refresh the page and try again

#### Poor transcription quality
- **Solutions**:
  - Speak clearly and at moderate pace
  - Use a quality microphone or headset
  - Reduce background noise
  - Check microphone settings in Chrome

#### Extension not working
- **Solutions**:
  1. Refresh the page
  2. Disable and re-enable the extension
  3. Check for extension updates
  4. Restart Chrome

### Advanced Troubleshooting

#### Check Extension Console
1. Go to `chrome://extensions/`
2. Find Voice Transcriber
3. Click "Inspect views: background page"
4. Check for error messages in the console

#### Reset Extension Data
1. Go to `chrome://extensions/`
2. Find Voice Transcriber
3. Click "Remove"
4. Re-install following the installation steps

## 🌐 Browser Compatibility

### Supported Browsers
- ✅ **Google Chrome** (v25+)
- ✅ **Chrome Canary**
- ✅ **Chrome Dev**
- ✅ **Microsoft Edge** (Chromium-based)
- ❌ Firefox (Web Speech API not supported)
- ❌ Safari (Web Speech API not supported)

### Supported Languages
- English (US/UK)
- Spanish (Spain)
- French (France)
- German (Germany)
- Italian (Italy)
- Portuguese (Brazil)
- Chinese (Simplified)
- Japanese
- Korean
- And more...

## 🔒 Privacy & Security

### Data Handling
- **Speech processing**: Done locally by Chrome's Web Speech API
- **No external servers**: No audio data is sent to external services
- **Local storage**: Transcriptions stored locally in Chrome
- **Auto cleanup**: Old transcriptions deleted after 7 days

### Permissions Explained
- **activeTab**: Access current tab for page-level features
- **storage**: Save settings and transcriptions locally
- **scripting**: Inject content scripts for overlay functionality

## 🛠️ Development

### Building from Source

```bash
# Clone the repository
git clone [repository-url]
cd voice-transcriber

# No build process required - pure HTML/JS/CSS
# Just load in Chrome as unpacked extension
```

### File Structure

```
voice-transcriber/
├── manifest.json         # Extension configuration
├── popup.html            # Main popup interface
├── popup.js              # Popup functionality
├── styles.css            # UI styling
├── background.js         # Background service worker
├── content.js            # Page content script
└── README.md             # This file
```

### Key Technologies
- **Manifest V3** (latest Chrome extension format)
- **Web Speech API** (for speech recognition)
- **Chrome Storage API** (for persistence)
- **Modern JavaScript** (ES6+, async/await)
- **CSS Grid/Flexbox** (responsive layouts)

## 📝 Changelog

### Version 1.0.0
- Initial release
- Real-time speech transcription
- Multiple language support
- Continuous recording mode
- Auto punctuation
- Copy/save functionality
- Floating page overlay
- Keyboard shortcuts
- Persistent storage

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Search existing issues in the repository
3. Create a new issue with detailed information
4. Include Chrome version and OS details

## 🙏 Acknowledgments

- Built using Chrome's Web Speech API
- UI inspired by Google Material Design principles

---

**Note**: This extension requires microphone access and only works in Chromium-based browsers due to Web Speech API limitations. 