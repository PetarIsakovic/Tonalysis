class VoiceTranscriber {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.transcriptionText = '';
    this.settings = {
      language: 'en-US',
      continuous: true,
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
    
    this.recognition.continuous = true;
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
      // Only stop if user manually stopped or there was an error
      if (this.shouldContinueRecording && this.isRecording) {
        // Automatically restart recognition to maintain continuous recording
        setTimeout(() => {
          if (this.shouldContinueRecording && this.isRecording) {
            try {
              this.recognition.start();
            } catch (error) {
              console.log('Recognition restart failed:', error);
              this.stopRecording();
            }
          }
        }, 100);
      } else {
        // User manually stopped or error occurred
        this.isRecording = false;
        this.updateStatus('Ready to transcribe', 'ready');
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
      }
    };
  }

  async startRecording() {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.shouldContinueRecording = true; // Always continuous by default
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

// Replace renderFeedbackCard to only show tips as a list
function renderFeedbackCard(feedbackText) {
  const feedbackCard = document.getElementById('feedbackCard');
  if (feedbackCard) feedbackCard.style.display = 'none';
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

  // Remove Get Feedback button and its logic
  const getFeedbackBtn = document.getElementById('getFeedback');
  if (getFeedbackBtn) {
    getFeedbackBtn.remove();
  }
  const feedbackBtnText = document.getElementById('feedbackBtnText');
  if (feedbackBtnText) feedbackBtnText.remove();
  const feedbackSpinner = document.getElementById('feedbackSpinner');
  if (feedbackSpinner) feedbackSpinner.remove();

  // --- Real-time feedback logic ---
  async function requestAndRenderGeminiFeedback(text, context) {
    if (!text || !text.trim()) {
      renderFeedbackCard('');
      return;
    }
    chrome.runtime.sendMessage(
      { action: 'getGeminiFeedback', text, context, quickTips: true },
      (response) => {
        renderFeedbackCard(response.feedback);
        animateFeedbackCard();
      }
    );
  }

  // Hook into addTranscription for real-time feedback
  const origAddTranscription = VoiceTranscriber.prototype.addTranscription;
  VoiceTranscriber.prototype.addTranscription = function(text) {
    origAddTranscription.call(this, text);
  
    const cleaned = text.trim();
    if (!cleaned || cleaned.length < 3 || /^[.,!?-]+$/.test(cleaned)) return;
  
    const context = document.getElementById('context')?.value || 'professional';
  
    requestQuickTipsFeedback(this.transcriptionText, context).then(() => {
      chrome.runtime.sendMessage(
        {
          action: 'getGeminiFeedback',
          text: this.transcriptionText,
          context,
          quickTips: true
        },
        (response) => {
          if (response && response.feedback) {
            const tips = response.feedback
              .split(/\n|\u2022|\-/)
              .map(t => t.trim())
              .filter(t => t && !/^suggestion/i.test(t) && !/^tips?/i.test(t));
          }
        }
      );
    });
  };
  

  // Also update feedback if context changes
  const contextSelect = document.getElementById('context');
  if (contextSelect) {
    contextSelect.addEventListener('change', () => {
      chrome.storage.local.get(['last_transcription'], (result) => {
        const text = result.last_transcription || '';
        requestAndRenderGeminiFeedback(text, contextSelect.value);
      });
    });
  }

});

// --- Real-time Quick Tips Feedback ---
const quickTipsContainer = document.createElement('div');
quickTipsContainer.id = 'quickTipsContainer';
quickTipsContainer.style = 'margin-top: 10px; min-height: 32px; transition: opacity 0.4s cubic-bezier(.4,0,.2,1); opacity: 0;';

const quickTipsSpinner = document.createElement('span');
quickTipsSpinner.id = 'quickTipsSpinner';
quickTipsSpinner.innerHTML = `<svg width="18" height="18" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke="#555"><g fill="none" fill-rule="evenodd"><g transform="translate(1 1)" stroke-width="3"><circle stroke-opacity=".3" cx="18" cy="18" r="18"/><path d="M36 18c0-9.94-8.06-18-18-18"><animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="0.8s" repeatCount="indefinite"/></path></g></g></svg>`;
quickTipsSpinner.style.display = 'none';
quickTipsSpinner.style.verticalAlign = 'middle';
quickTipsSpinner.style.marginRight = '8px';

quickTipsContainer.appendChild(quickTipsSpinner);

const feedbackSection = document.querySelector('.feedback-section');
if (feedbackSection) {
  feedbackSection.insertBefore(quickTipsContainer, feedbackSection.firstChild.nextSibling);
}

function showQuickTipsLoading(isLoading) {
  quickTipsSpinner.style.display = isLoading ? '' : 'none';
  quickTipsContainer.style.opacity = isLoading ? '1' : quickTipsContainer.innerHTML.trim() ? '1' : '0';
}

function fadeInQuickTips() {
  quickTipsContainer.style.opacity = '1';
}
function renderQuickTips(tips) {
  if (quickTipsContainer.contains(quickTipsSpinner)) {
    quickTipsContainer.removeChild(quickTipsSpinner);
  }

  if (!tips || !tips.length) {
    quickTipsContainer.innerHTML = `
      <div style="text-align:center; font-weight:600; margin-bottom:8px;">💡 AI Speech Feedback</div>
      <div style="color:#888; font-size:0.98em;">No suggestions right now.</div>`;
    fadeInQuickTips();
    return;
  }

  quickTipsContainer.innerHTML = `
    <div style="text-align:center; font-weight:600; margin-bottom:14px;">💡 AI Speech Feedback</div>
    <div style="
      background: #f4f7fa;
      border-radius: 10px;
      padding: 14px 16px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
      font-size: 0.96em;
      color: #333;
      display: flex;
      flex-direction: column;
      gap: 10px;
    ">
      ${tips.map(tip => `
        <div style="
          background: #ffffff;
          border-left: 4px solid #0077cc;
          border-radius: 6px;
          padding: 10px 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          display: flex;
          align-items: flex-start;
        ">
          <span style="margin-right: 8px; font-weight: bold; color: #0077cc;">•</span>
          <span style="flex: 1;">${tip}</span>
        </div>
      `).join('')}
    </div>
  `;
  fadeInQuickTips();
}



async function requestQuickTipsFeedback(text, context) {
  showQuickTipsLoading(true);
  quickTipsContainer.innerHTML = '';
  quickTipsContainer.appendChild(quickTipsSpinner);
  quickTipsContainer.style.opacity = '1';
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'getGeminiFeedback',
      text,
      context,
      quickTips: true // flag for short, live-style tips
    }, (response) => {
      showQuickTipsLoading(false);
      let tips = [];
      if (response && response.feedback) {
        // Try to split feedback into tips (by line or bullet)
        tips = response.feedback
          .split(/\n|\u2022|\-/)
          .map(t => t.trim())
          .filter(t => t && !/^suggestion/i.test(t) && !/^tips?/i.test(t));
      }
      renderQuickTips(tips);
      resolve();
    });
  });
}

// --- Hook into addTranscription for real-time feedback ---
const origAddTranscription = VoiceTranscriber.prototype.addTranscription;
VoiceTranscriber.prototype.addTranscription = function(text) {
  origAddTranscription.call(this, text);
  const context = document.getElementById('context')?.value || 'professional';
  if (this.transcriptionText && this.transcriptionText.trim()) {
    requestQuickTipsFeedback(this.transcriptionText, context);
  }
};

chrome.storage.local.get(['last_transcription', 'last_updated'], (result) => {
  const text = result.last_transcription || '';
  const updated = result.last_updated || 0;

  const minutesAgo = (Date.now() - updated) / 60000;
  const context = document.getElementById('context')?.value || 'professional';

  if (text && text.trim() && minutesAgo < 2) {
    // Only trigger if transcript is fresh (within 2 minutes)
    requestQuickTipsFeedback(text, context);
  }
});
