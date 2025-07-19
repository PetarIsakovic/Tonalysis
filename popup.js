class VoiceTranscriber {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.transcriptionText = '';
    this.settings = {
      language: 'en-US',
      continuous: false,
      punctuation: true
    };
    
    this.initializeElements();
    this.loadSettings();
    this.setupEventListeners();
    this.initializeSpeechRecognition();
  }

  initializeElements() {
    try {
      this.startBtn = document.getElementById('startBtn');
      this.stopBtn = document.getElementById('stopBtn');
      this.statusText = document.getElementById('statusText');
      this.statusIndicator = document.getElementById('statusIndicator');
      this.transcriptionOutput = document.getElementById('transcriptionOutput');
      this.clearBtn = document.getElementById('clearBtn');
      this.copyBtn = document.getElementById('copyBtn');
      this.saveBtn = document.getElementById('saveBtn');
      this.languageSelect = document.getElementById('languageSelect');
      this.continuousMode = document.getElementById('continuousMode');
      this.punctuationMode = document.getElementById('punctuationMode');
    } catch (error) {
      console.error('Error initializing elements:', error);
    }
  }

  loadSettings() {
    chrome.storage.sync.get(['transcriber_settings'], (result) => {
      if (result.transcriber_settings) {
        this.settings = { ...this.settings, ...result.transcriber_settings };
        this.updateUI();
      }
    });
  }

  updateUI() {
    if (this.languageSelect) {
      this.languageSelect.value = this.settings.language;
    }
    if (this.continuousMode) {
      this.continuousMode.checked = this.settings.continuous;
    }
    if (this.punctuationMode) {
      this.punctuationMode.checked = this.settings.punctuation;
    }
  }

  saveSettings() {
    chrome.storage.sync.set({ transcriber_settings: this.settings });
  }

  setupEventListeners() {
    if (this.startBtn) {
      this.startBtn.addEventListener('click', () => this.startRecording());
    }
    if (this.stopBtn) {
      this.stopBtn.addEventListener('click', () => this.stopRecording());
    }
    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => this.clearTranscription());
    }
    if (this.copyBtn) {
      this.copyBtn.addEventListener('click', () => this.copyToClipboard());
    }
    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', () => this.saveTranscription());
    }
    
    if (this.languageSelect) {
      this.languageSelect.addEventListener('change', (e) => {
        this.settings.language = e.target.value;
        this.saveSettings();
        if (this.recognition) {
          this.recognition.lang = this.settings.language;
        }
      });
    }
    
    if (this.continuousMode) {
      this.continuousMode.addEventListener('change', (e) => {
        this.settings.continuous = e.target.checked;
        this.saveSettings();
        if (this.recognition) {
          this.recognition.continuous = this.settings.continuous;
        }
      });
    }
    
    if (this.punctuationMode) {
      this.punctuationMode.addEventListener('change', (e) => {
        this.settings.punctuation = e.target.checked;
        this.saveSettings();
      });
    }
  }

  initializeSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      this.showError('Speech recognition not supported in this browser');
      this.startBtn.disabled = true;
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = this.settings.continuous;
    this.recognition.interimResults = true;
    this.recognition.lang = this.settings.language;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isRecording = true;
      this.updateStatus('Recording...', 'recording');
      this.startBtn.disabled = true;
      this.stopBtn.disabled = false;
    };

    this.recognition.onresult = (event) => {
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
        this.addTranscription(finalTranscript);
      }

      this.updateTranscriptionDisplay(interimTranscript);
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      switch(event.error) {
        case 'no-speech':
          this.showError('No speech was detected. Please try again.');
          break;
        case 'audio-capture':
          this.showError('Audio capture failed. Please check your microphone.');
          break;
        case 'not-allowed':
          this.showError('Microphone access denied. Please allow microphone access.');
          break;
        case 'network':
          this.showError('Network error occurred. Please check your connection.');
          break;
        default:
          this.showError(`Speech recognition error: ${event.error}`);
      }
      
      this.stopRecording();
    };

    this.recognition.onend = () => {
      this.isRecording = false;
      this.updateStatus('Ready to transcribe', 'ready');
      this.startBtn.disabled = false;
      this.stopBtn.disabled = true;
      
      if (this.settings.continuous && this.shouldContinueRecording) {
        setTimeout(() => {
          if (this.shouldContinueRecording) {
            this.startRecording();
          }
        }, 100);
      }
    };
  }

  async startRecording() {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.shouldContinueRecording = this.settings.continuous;
      this.recognition.start();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      this.showError('Failed to access microphone. Please check permissions.');
    }
  }

  stopRecording() {
    if (this.recognition && this.isRecording) {
      this.shouldContinueRecording = false;
      this.recognition.stop();
    }
  }

  addTranscription(text) {
    if (!text.trim()) return;
    
    // Process text based on punctuation settings
    let processedText = text.trim();
    if (this.settings.punctuation) {
      processedText = this.addAutoPunctuation(processedText);
    }
    
    this.transcriptionText += (this.transcriptionText ? ' ' : '') + processedText;
    this.updateTranscriptionDisplay();
    
    // Save to storage
    this.saveToStorage();
    chrome.storage.local.set({
      last_transcription: this.transcriptionText,
      last_updated: Date.now()
    });
  }

  addAutoPunctuation(text) {
    // Simple auto-punctuation logic
    text = text.charAt(0).toUpperCase() + text.slice(1);
    
    // Add period if doesn't end with punctuation
    if (!/[.!?]$/.test(text)) {
      text += '.';
    }
    
    return text;
  }

  updateTranscriptionDisplay(interimText = '') {
    const output = this.transcriptionOutput;
    
    if (!this.transcriptionText && !interimText) {
      output.innerHTML = '<p class="placeholder">Your transcribed text will appear here...</p>';
      return;
    }
    
    let html = '';
    
    if (this.transcriptionText) {
      html += `<div class="transcription-text">${this.escapeHtml(this.transcriptionText)}</div>`;
    }
    
    if (interimText) {
      html += `<div class="interim-text">${this.escapeHtml(interimText)}</div>`;
    }
    
    output.innerHTML = html;
    output.scrollTop = output.scrollHeight;
  }

  clearTranscription() {
    this.transcriptionText = '';
    this.updateTranscriptionDisplay();
    this.saveToStorage();
  }

  async copyToClipboard() {
    if (!this.transcriptionText) {
      this.showError('No text to copy');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(this.transcriptionText);
      this.showSuccess('Text copied to clipboard');
    } catch (error) {
      console.error('Failed to copy text:', error);
      this.showError('Failed to copy text');
    }
  }

  saveTranscription() {
    if (!this.transcriptionText) {
      this.showError('No text to save');
      return;
    }
    
    const blob = new Blob([this.transcriptionText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showSuccess('Transcription saved');
  }

  saveToStorage() {
    chrome.storage.local.set({
      last_transcription: this.transcriptionText,
      last_updated: Date.now()
    });
  }

  loadFromStorage() {
    chrome.storage.local.get(['last_transcription'], (result) => {
      if (result.last_transcription) {
        this.transcriptionText = result.last_transcription;
        this.updateTranscriptionDisplay();
      }
    });
  }

  updateStatus(text, className = '') {
    this.statusText.textContent = text;
    this.statusIndicator.className = `status-indicator ${className}`;
  }

  showError(message) {
    this.updateStatus(message, 'error');
    setTimeout(() => {
      if (!this.isRecording) {
        this.updateStatus('Ready to transcribe', 'ready');
      }
    }, 3000);
  }

  showSuccess(message) {
    this.updateStatus(message, 'success');
    setTimeout(() => {
      if (!this.isRecording) {
        this.updateStatus('Ready to transcribe', 'ready');
      }
    }, 2000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}


function parseGeminiFeedback(rawText) {
  const sections = {
    summary: '',
    strengths: '',
    suggestions: '',
    score: ''
  };

  const summaryMatch = rawText.match(/(?:Summary|Message|Overview)[:\n]+([\s\S]*?)(?=(Strengths|Suggestions|Score|$))/i);
  const strengthsMatch = rawText.match(/(?:Strengths|Positives|Good)[:\n]+([\s\S]*?)(?=(Suggestions|Score|$))/i);
  const suggestionsMatch = rawText.match(/(?:Suggestions|Improvements|To improve)[:\n]+([\s\S]*?)(?=(Score|$))/i);
  const scoreMatch = rawText.match(/(?:Score|Communication score|Rating)[:\n ]+([0-9\.\/\- ]{1,6})/i);

  if (summaryMatch) sections.summary = summaryMatch[1].trim();
  if (strengthsMatch) sections.strengths = strengthsMatch[1].trim();
  if (suggestionsMatch) sections.suggestions = suggestionsMatch[1].trim();
  if (scoreMatch) sections.score = scoreMatch[1].trim();

  if (!sections.summary && !sections.strengths && !sections.suggestions && !sections.score) {
    sections.summary = rawText.trim();
  }

  return sections;
}

function renderFeedbackCard(sections) {
  const feedbackCard = document.getElementById('feedbackCard');
  feedbackCard.innerHTML = `
    <div style="margin-bottom: 10px;">
      <span style="font-size:1.1em; font-weight:600;">📋 Summary</span>
      <div style="margin-top:3px; color:#333; white-space:pre-line;">${sections.summary || '<em>No summary provided.</em>'}</div>
    </div>
    <div style="margin-bottom: 10px;">
      <span style="font-size:1.1em; font-weight:600;">✅ Strengths</span>
      <div style="margin-top:3px; color:#2e7d32; white-space:pre-line;">${sections.strengths || '<em>No strengths detected.</em>'}</div>
    </div>
    <div style="margin-bottom: 10px;">
      <span style="font-size:1.1em; font-weight:600;">🛠️ Suggestions</span>
      <div style="margin-top:3px; color:#b26a00; white-space:pre-line;">${sections.suggestions || '<em>No suggestions provided.</em>'}</div>
    </div>
    <div>
      <span style="font-size:1.1em; font-weight:600;">📈 Score</span>
      <div style="margin-top:3px; color:#1976d2; font-size:1.2em;">${sections.score || '<em>No score.</em>'}</div>
    </div>
  `;
}
function animateFeedbackCard() {
  const feedbackCard = document.getElementById('feedbackCard');
  feedbackCard.style.display = 'block';
  setTimeout(() => {
    feedbackCard.style.opacity = '1';
    feedbackCard.style.transform = 'translateY(0)';
  }, 10);
}


// Initialize the transcriber when popup loads
document.addEventListener('DOMContentLoaded', () => {
  const transcriber = new VoiceTranscriber();

  const getFeedbackBtn = document.getElementById('getFeedback');
  if (getFeedbackBtn) {
    getFeedbackBtn.addEventListener('click', () => {
      const context = document.getElementById('context').value;

      chrome.storage.local.get(['last_transcription'], (result) => {
        const text = result.last_transcription || '';
        if (!text.trim()) {
          document.getElementById('feedback').innerText = 'No transcription available.';
          return;
        }

        chrome.runtime.sendMessage(
          { action: 'getGeminiFeedback', text, context },
          (response) => {
            const sections = parseGeminiFeedback(response.feedback);
            renderFeedbackCard(sections);
            animateFeedbackCard();
          }
        );
      });
    });
  }
});
