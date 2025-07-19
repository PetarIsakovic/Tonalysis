// Content script for Voice Transcriber Chrome Extension
// Runs on web pages to provide additional transcription capabilities

(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.voiceTranscriberInjected) {
    return;
  }
  window.voiceTranscriberInjected = true;

  let isTranscribing = false;
  let recognition = null;
  let transcriptionText = '';
  
  // Configuration
  const config = {
    showNotifications: true,
    overlayEnabled: true,
    keyboardShortcuts: true
  };

  // Initialize the content script
  function init() {
    console.log('Voice Transcriber content script loaded');
    
    setupMessageListener();
    setupKeyboardShortcuts();
    createTranscriptionOverlay();
    detectPageAudio();
  }

  // Listen for messages from background script
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'startTranscription':
          startPageTranscription();
          sendResponse({ success: true });
          break;
          
        case 'stopTranscription':
          stopPageTranscription();
          sendResponse({ success: true });
          break;
          
        case 'getPageText':
          sendResponse({ text: getPageText() });
          break;
          
        case 'injectTranscriptionUI':
          createTranscriptionOverlay();
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
    });
  }

  // Setup keyboard shortcuts for page-level control
  function setupKeyboardShortcuts() {
    if (!config.keyboardShortcuts) return;
    
    document.addEventListener('keydown', (event) => {
      // Ctrl+Shift+T to toggle transcription
      if (event.ctrlKey && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        toggleTranscription();
      }
      
      // Ctrl+Shift+C to copy transcription
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        copyTranscriptionToClipboard();
      }
    });
  }

  // Create floating transcription overlay
  function createTranscriptionOverlay() {
    if (!config.overlayEnabled || document.getElementById('voice-transcriber-overlay')) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'voice-transcriber-overlay';
    overlay.innerHTML = `
      <div class="vt-overlay-header">
        <span class="vt-title">🎤 Transcribing...</span>
        <button class="vt-close" title="Close">×</button>
      </div>
      <div class="vt-content">
        <div class="vt-status">Ready</div>
        <div class="vt-text" placeholder="Transcribed text will appear here..."></div>
      </div>
      <div class="vt-controls">
        <button class="vt-btn vt-start">Start</button>
        <button class="vt-btn vt-stop" disabled>Stop</button>
        <button class="vt-btn vt-copy">Copy</button>
      </div>
    `;

    // Add styles
    const styles = `
      #voice-transcriber-overlay {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 300px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 2147483647;
        display: none;
      }
      
      .vt-overlay-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 10px 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 8px 8px 0 0;
      }
      
      .vt-title {
        font-weight: 500;
        font-size: 13px;
      }
      
      .vt-close {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .vt-content {
        padding: 15px;
      }
      
      .vt-status {
        font-size: 12px;
        color: #666;
        margin-bottom: 10px;
      }
      
      .vt-text {
        min-height: 60px;
        max-height: 120px;
        overflow-y: auto;
        padding: 8px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        background: #fafafa;
        font-size: 13px;
        line-height: 1.4;
      }
      
      .vt-text:empty:before {
        content: attr(placeholder);
        color: #999;
        font-style: italic;
      }
      
      .vt-controls {
        padding: 10px 15px;
        border-top: 1px solid #f0f0f0;
        display: flex;
        gap: 8px;
      }
      
      .vt-btn {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        font-weight: 500;
      }
      
      .vt-start {
        background: #4CAF50;
        color: white;
      }
      
      .vt-stop {
        background: #f44336;
        color: white;
      }
      
      .vt-copy {
        background: #f0f0f0;
        color: #333;
      }
      
      .vt-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .vt-recording .vt-status {
        color: #f44336;
        font-weight: 500;
      }
      
      .vt-recording .vt-status:before {
        content: "🔴 ";
        animation: blink 1s infinite;
      }
      
      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0.3; }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    document.body.appendChild(overlay);
    setupOverlayEvents(overlay);
  }

  // Setup overlay event handlers
  function setupOverlayEvents(overlay) {
    const startBtn = overlay.querySelector('.vt-start');
    const stopBtn = overlay.querySelector('.vt-stop');
    const copyBtn = overlay.querySelector('.vt-copy');
    const closeBtn = overlay.querySelector('.vt-close');

    startBtn.addEventListener('click', () => startPageTranscription());
    stopBtn.addEventListener('click', () => stopPageTranscription());
    copyBtn.addEventListener('click', () => copyTranscriptionToClipboard());
    closeBtn.addEventListener('click', () => hideOverlay());

    // Make overlay draggable
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    overlay.querySelector('.vt-overlay-header').addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = overlay.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      overlay.style.left = (startLeft + deltaX) + 'px';
      overlay.style.top = (startTop + deltaY) + 'px';
      overlay.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  // Start transcription on the current page
  function startPageTranscription() {
    if (isTranscribing) return;

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showNotification('Speech recognition not supported', 'error');
        return;
      }

      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isTranscribing = true;
        updateOverlayStatus('Recording...', true);
        showNotification('Voice transcription started');
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          transcriptionText += finalTranscript;
          updateOverlayText(transcriptionText);
        }

        // Show interim results
        updateOverlayText(transcriptionText + (interimTranscript ? ' ' + interimTranscript : ''));
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        showNotification(`Error: ${event.error}`, 'error');
        stopPageTranscription();
      };

      recognition.onend = () => {
        isTranscribing = false;
        updateOverlayStatus('Stopped', false);
      };

      recognition.start();
    } catch (error) {
      console.error('Failed to start transcription:', error);
      showNotification('Failed to start transcription', 'error');
    }
  }

  // Stop transcription
  function stopPageTranscription() {
    if (recognition && isTranscribing) {
      recognition.stop();
      isTranscribing = false;
      updateOverlayStatus('Stopped', false);
      showNotification('Voice transcription stopped');
    }
  }

  // Toggle transcription
  function toggleTranscription() {
    if (isTranscribing) {
      stopPageTranscription();
    } else {
      startPageTranscription();
    }
  }

  // Update overlay status
  function updateOverlayStatus(status, recording = false) {
    const overlay = document.getElementById('voice-transcriber-overlay');
    if (!overlay) return;

    const statusEl = overlay.querySelector('.vt-status');
    const startBtn = overlay.querySelector('.vt-start');
    const stopBtn = overlay.querySelector('.vt-stop');

    statusEl.textContent = status;
    overlay.classList.toggle('vt-recording', recording);
    
    startBtn.disabled = recording;
    stopBtn.disabled = !recording;
  }

  // Update overlay text content
  function updateOverlayText(text) {
    const overlay = document.getElementById('voice-transcriber-overlay');
    if (!overlay) return;

    const textEl = overlay.querySelector('.vt-text');
    textEl.textContent = text;
    textEl.scrollTop = textEl.scrollHeight;
  }

  // Show overlay
  function showOverlay() {
    const overlay = document.getElementById('voice-transcriber-overlay');
    if (overlay) {
      overlay.style.display = 'block';
    }
  }

  // Hide overlay
  function hideOverlay() {
    const overlay = document.getElementById('voice-transcriber-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  // Copy transcription to clipboard
  async function copyTranscriptionToClipboard() {
    if (!transcriptionText) {
      showNotification('No text to copy', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(transcriptionText);
      showNotification('Text copied to clipboard');
    } catch (error) {
      console.error('Failed to copy text:', error);
      showNotification('Failed to copy text', 'error');
    }
  }

  // Get visible text from the page
  function getPageText() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let text = '';
    let node;
    while (node = walker.nextNode()) {
      text += node.textContent + ' ';
    }

    return text.trim();
  }

  // Detect if page has audio/video elements
  function detectPageAudio() {
    const audioElements = document.querySelectorAll('audio, video');
    if (audioElements.length > 0) {
      console.log('Found audio/video elements on page:', audioElements.length);
      // Could potentially integrate with media elements in the future
    }
  }

  // Show notifications
  function showNotification(message, type = 'info') {
    if (!config.showNotifications) return;

    // Simple notification system
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'error' ? '#f44336' : '#4CAF50'};
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 2147483647;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  // Show transcription overlay when extension is activated
  function activateExtension() {
    createTranscriptionOverlay();
    showOverlay();
  }

  // Listen for extension activation from page context
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    if (event.data.type === 'VOICE_TRANSCRIBER_ACTIVATE') {
      activateExtension();
    }
  });

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(); 