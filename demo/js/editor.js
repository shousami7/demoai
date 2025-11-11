// Editor Page Logic
document.addEventListener('DOMContentLoaded', function() {
  // State management
  const state = {
    frames: [],
    selectedFrameIndex: null,
    selectedVariation: null,
    editedFrames: new Set()
  };

  // DOM elements
  const framesGrid = document.getElementById('frames-grid');
  const chatContainer = document.getElementById('chat-container');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const pickFrameBtn = document.getElementById('pick-frame-btn');
  const exportBtn = document.getElementById('export-btn');
  const backBtn = document.getElementById('back-btn');
  const playBtn = document.getElementById('play-btn');
  const videoPreview = document.getElementById('video-preview');

  // Initialize frames
  function initializeFrames() {
    const frameColors = ['1a1a1a', '2a2a2a', '1a2a2a', '2a1a2a', '1a2a1a', '2a2a1a'];
    const frameTimes = ['0:00', '0:15', '0:30', '0:45', '1:00', '1:15'];

    for (let i = 0; i < 6; i++) {
      const frame = {
        id: i,
        url: `https://placehold.co/640x360/${frameColors[i]}/34D399?text=Frame+${i + 1}`,
        timestamp: frameTimes[i],
        edited: false
      };
      state.frames.push(frame);
    }

    renderFrames();
  }

  // Render frames grid
  function renderFrames() {
    framesGrid.innerHTML = '';

    state.frames.forEach((frame, index) => {
      const frameCard = document.createElement('div');
      frameCard.className = `frame-card ${state.selectedFrameIndex === index ? 'selected' : ''} ${frame.edited ? 'edited' : ''}`;
      frameCard.style.backgroundImage = `url('${frame.url}')`;
      frameCard.dataset.frameIndex = index;

      const frameNumber = document.createElement('div');
      frameNumber.className = 'frame-number';
      frameNumber.textContent = frame.timestamp;
      frameCard.appendChild(frameNumber);

      frameCard.addEventListener('click', () => selectFrame(index));

      framesGrid.appendChild(frameCard);
    });
  }

  // Select frame
  function selectFrame(index) {
    state.selectedFrameIndex = index;
    state.selectedVariation = null;

    renderFrames();
    updateChatUI();

    // Enable input and button
    chatInput.disabled = false;
    sendBtn.disabled = false;
    pickFrameBtn.disabled = false;

    showNotification(`Frame ${index + 1} selected`);
  }

  // Update chat UI with selected frame
  function updateChatUI() {
    if (state.selectedFrameIndex === null) return;

    const frame = state.frames[state.selectedFrameIndex];

    chatContainer.innerHTML = `
      <div class="selected-frame-indicator">
        <div class="selected-frame-thumbnail" style="background-image: url('${frame.url}')"></div>
        <div class="selected-frame-info">
          <div class="selected-frame-title">Editing Frame ${state.selectedFrameIndex + 1}</div>
          <div class="selected-frame-timestamp">Timestamp: ${frame.timestamp}</div>
        </div>
      </div>
    `;
  }

  // Send chat message
  function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || state.selectedFrameIndex === null) return;

    // Add user message
    addUserMessage(message);

    // Clear input
    chatInput.value = '';

    // Show loading
    addLoadingMessage();

    // Simulate AI response after 2 seconds
    setTimeout(() => {
      removeLoadingMessage();
      addAIResponse();
    }, 2000);
  }

  // Add user message to chat
  function addUserMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message chat-message';
    messageDiv.innerHTML = `
      <div class="user-avatar"></div>
      <div class="user-message-content">${escapeHtml(message)}</div>
    `;
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
  }

  // Add loading message
  function addLoadingMessage() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'ai-message chat-message loading-message';
    loadingDiv.id = 'loading-message';
    loadingDiv.innerHTML = `
      <div class="ai-avatar">
        <span class="material-symbols-outlined !text-xl text-black">auto_awesome</span>
      </div>
      <div>
        <span class="loading-spinner"></span>
        <span style="margin-left: 8px;">Generating variations...</span>
      </div>
    `;
    chatContainer.appendChild(loadingDiv);
    scrollToBottom();
  }

  // Remove loading message
  function removeLoadingMessage() {
    const loadingMsg = document.getElementById('loading-message');
    if (loadingMsg) loadingMsg.remove();
  }

  // Add AI response with image variations
  function addAIResponse() {
    const variations = generateVariations();

    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message chat-message';
    messageDiv.innerHTML = `
      <div class="ai-avatar">
        <span class="material-symbols-outlined !text-xl text-black">auto_awesome</span>
      </div>
      <div class="ai-message-content">
        <p style="margin-bottom: 12px;">Here are a few options based on your request:</p>
        <div class="variations-grid" id="current-variations">
          ${variations.map((url, i) => `
            <div class="variation-card" data-variation-index="${i}" style="background-image: url('${url}')"></div>
          `).join('')}
        </div>
        <button class="apply-btn" id="apply-variation-btn" disabled>Apply to Frame</button>
      </div>
    `;

    chatContainer.appendChild(messageDiv);
    scrollToBottom();

    // Add variation selection handlers
    const variationCards = messageDiv.querySelectorAll('.variation-card');
    const applyBtn = messageDiv.querySelector('#apply-variation-btn');

    variationCards.forEach((card, index) => {
      card.addEventListener('click', () => {
        // Remove previous selection
        variationCards.forEach(c => c.classList.remove('selected-variation'));

        // Select this variation
        card.classList.add('selected-variation');
        state.selectedVariation = variations[index];

        // Enable apply button
        applyBtn.disabled = false;
      });
    });

    // Apply button handler
    applyBtn.addEventListener('click', () => {
      applyVariationToFrame();
    });
  }

  // Generate dummy variation URLs
  function generateVariations() {
    const colors = ['34D399', '10B981', '059669', '047857'];
    return colors.map((color, i) =>
      `https://placehold.co/640x360/1a1a1a/${color}?text=Variation+${i + 1}`
    );
  }

  // Apply selected variation to frame
  function applyVariationToFrame() {
    if (state.selectedFrameIndex === null || !state.selectedVariation) return;

    const frame = state.frames[state.selectedFrameIndex];
    frame.url = state.selectedVariation;
    frame.edited = true;

    state.editedFrames.add(state.selectedFrameIndex);

    renderFrames();
    showNotification('Frame updated successfully!');

    // Reset selection
    state.selectedVariation = null;
  }

  // Scroll chat to bottom
  function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Show notification
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Event listeners
  sendBtn.addEventListener('click', sendMessage);

  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  pickFrameBtn.addEventListener('click', () => {
    if (state.selectedFrameIndex !== null) {
      showNotification('Select a different frame from the grid below');
    }
  });

  exportBtn.addEventListener('click', () => {
    showNotification('Exporting video... (Mock export)');

    setTimeout(() => {
      const link = document.createElement('a');
      link.href = 'data:text/plain,Mock Edited Video File';
      link.download = 'edited-luxury-property-video.mp4';
      link.click();

      showNotification('Video exported successfully!');
    }, 1500);
  });

  backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  playBtn.addEventListener('click', () => {
    showNotification('Video playback (Mock - no actual video)');

    // Simulate playing by changing the button
    playBtn.innerHTML = '<span class="material-symbols-outlined !text-4xl">pause</span>';

    setTimeout(() => {
      playBtn.innerHTML = '<span class="material-symbols-outlined !text-4xl">play_arrow</span>';
    }, 3000);
  });

  // Initialize
  initializeFrames();
});
