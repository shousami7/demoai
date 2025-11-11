// Editor Page Logic
document.addEventListener('DOMContentLoaded', function() {
  // State management
  const state = {
    frames: [],
    selectedFrameIndex: null,
    selectedVariation: null,
    editedFrames: new Set(),
    videoFile: null,
    videoLoaded: false,
    insertedVideos: [] // Track videos to be inserted before the main video
  };

  // DOM elements
  const framesGrid = document.getElementById('frames-grid');
  const chatContainer = document.getElementById('chat-container');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const pickFrameBtn = document.getElementById('pick-frame-btn');
  const exportBtn = document.getElementById('export-btn');
  const backBtn = document.getElementById('back-btn');

  // Video upload elements
  const uploadArea = document.getElementById('upload-area');
  const videoPlayerArea = document.getElementById('video-player-area');
  const videoInput = document.getElementById('video-input');
  const uploadBtn = document.getElementById('upload-btn');
  const videoElement = document.getElementById('video-element');
  const changeVideoBtn = document.getElementById('change-video-btn');
  const extractFramesBtn = document.getElementById('extract-frames-btn');

  // Video upload and loading functions
  function handleVideoUpload() {
    videoInput.click();
  }

  function loadVideo(file) {
    if (!file || !file.type.startsWith('video/')) {
      showNotification('Please select a valid video file');
      return;
    }

    state.videoFile = file;
    const videoURL = URL.createObjectURL(file);

    videoElement.src = videoURL;
    videoElement.load();

    videoElement.onloadedmetadata = () => {
      state.videoLoaded = true;
      uploadArea.classList.add('hidden');
      videoPlayerArea.classList.remove('hidden');

      showNotification('Video loaded successfully! Click "Extract Frames" to continue.');
    };

    videoElement.onerror = () => {
      showNotification('Error loading video. Please try another file.');
      state.videoLoaded = false;
    };
  }

  function changeVideo() {
    state.videoFile = null;
    state.videoLoaded = false;
    state.frames = [];
    state.selectedFrameIndex = null;

    videoElement.src = '';
    uploadArea.classList.remove('hidden');
    videoPlayerArea.classList.add('hidden');

    renderFrames();
    chatContainer.innerHTML = `
      <div class="text-center text-gray-500 py-8">
        <span class="material-symbols-outlined text-6xl mb-2">photo_library</span>
        <p class="text-sm">Select a frame to start editing with AI</p>
      </div>
    `;

    chatInput.disabled = true;
    sendBtn.disabled = true;
    pickFrameBtn.disabled = true;
  }

  // Extract frames from video
  async function extractFrames() {
    if (!state.videoLoaded) {
      showNotification('Please load a video first');
      return;
    }

    showNotification('Extracting frames from video...');
    extractFramesBtn.disabled = true;
    extractFramesBtn.innerHTML = '<span class="loading-spinner"></span><span style="margin-left: 8px;">Extracting...</span>';

    state.frames = [];
    const duration = videoElement.duration;
    const numberOfFrames = 6;
    const interval = duration / (numberOfFrames + 1);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size to video dimensions
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 360;

    try {
      for (let i = 1; i <= numberOfFrames; i++) {
        const timestamp = interval * i;
        const frameData = await captureFrameAt(videoElement, canvas, ctx, timestamp);

        const minutes = Math.floor(timestamp / 60);
        const seconds = Math.floor(timestamp % 60);
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        state.frames.push({
          id: i - 1,
          url: frameData,
          timestamp: timeString,
          edited: false
        });
      }

      renderFrames();
      showNotification('Frames extracted successfully!');
      extractFramesBtn.disabled = false;
      extractFramesBtn.innerHTML = '<span class="material-symbols-outlined !text-xl">auto_awesome</span><span class="truncate">Extract Frames</span>';
    } catch (error) {
      console.error('Error extracting frames:', error);
      showNotification('Error extracting frames. Please try again.');
      extractFramesBtn.disabled = false;
      extractFramesBtn.innerHTML = '<span class="material-symbols-outlined !text-xl">auto_awesome</span><span class="truncate">Extract Frames</span>';
    }
  }

  // Capture a frame at a specific timestamp
  function captureFrameAt(video, canvas, ctx, timestamp) {
    return new Promise((resolve, reject) => {
      const seekHandler = () => {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frameData = canvas.toDataURL('image/jpeg', 0.8);
          video.removeEventListener('seeked', seekHandler);
          resolve(frameData);
        } catch (error) {
          video.removeEventListener('seeked', seekHandler);
          reject(error);
        }
      };

      video.addEventListener('seeked', seekHandler);
      video.currentTime = timestamp;
    });
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

      // Add video indicator if video is inserted
      if (frame.hasVideo) {
        const videoIndicator = document.createElement('div');
        videoIndicator.className = 'video-indicator';
        videoIndicator.innerHTML = '<span class="material-symbols-outlined">movie</span>';
        videoIndicator.title = 'Video clip will be inserted';
        frameCard.appendChild(videoIndicator);
      }

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

  // Generate variation URLs from actual images
  function generateVariations() {
    return [
      'images/correct.png',
      'images/sample.jpg',
      'images/sample2.jpg',
      'images/sample3.jpg'
    ];
  }

  // Apply selected variation to frame (inserts video before main video)
  function applyVariationToFrame() {
    if (state.selectedFrameIndex === null || !state.selectedVariation) return;

    const frame = state.frames[state.selectedFrameIndex];

    // Insert the generated video before the main video
    const videoClip = {
      path: 'videos/Mansion_Promotion_Video_Generated.mp4',
      frameIndex: state.selectedFrameIndex,
      timestamp: frame.timestamp,
      insertedAt: new Date().toISOString()
    };

    state.insertedVideos.push(videoClip);

    // Update frame to show it has a video inserted
    frame.url = 'images/correct.png';
    frame.edited = true;
    frame.hasVideo = true;

    state.editedFrames.add(state.selectedFrameIndex);

    renderFrames();
    showNotification(`Video clip inserted! ${state.insertedVideos.length} video(s) will be added before your main video.`);

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

  // Video upload event listeners
  uploadBtn.addEventListener('click', handleVideoUpload);

  videoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      loadVideo(file);
    }
  });

  changeVideoBtn.addEventListener('click', changeVideo);

  extractFramesBtn.addEventListener('click', extractFrames);

  // Drag and drop support for video upload
  const uploadAreaElement = uploadArea.querySelector('div');
  uploadAreaElement.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadAreaElement.style.borderColor = '#34D399';
  });

  uploadAreaElement.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadAreaElement.style.borderColor = '#374151';
  });

  uploadAreaElement.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadAreaElement.style.borderColor = '#374151';

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      loadVideo(file);
    } else {
      showNotification('Please drop a valid video file');
    }
  });
});
