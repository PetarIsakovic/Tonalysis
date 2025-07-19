document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const saveBtn = document.getElementById('saveKey');
    const status = document.getElementById('status');
  
    // Load saved API key
    chrome.storage.local.get(['apiKey'], (result) => {
      if (result.apiKey) {
        apiKeyInput.value = result.apiKey;
      }
    });
  
    // Save API key on button click
    saveBtn.addEventListener('click', () => {
      const key = apiKeyInput.value.trim();
  
      if (!key.startsWith('AI')) {
        status.textContent = '⚠️ That doesn’t look like a valid Gemini API key.';
        status.style.color = 'orange';
        return;
      }
  
      chrome.storage.local.set({ apiKey: key }, () => {
        status.textContent = '✅ API key saved successfully!';
        status.style.color = 'green';
        setTimeout(() => (status.textContent = ''), 3000);
      });
    });
  });
  