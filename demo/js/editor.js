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
    insertedVideos: [], // Track videos to be inserted before the main video
    uploadedImage: null, // NEW: Track uploaded image
    generatedVideoUrl: null, // NEW: Track generated video URL
    generatedThumbnailUrl: null
  };

  // DOM elements
  const framesGrid = document.getElementById('frames-grid');
  const chatContainer = document.getElementById('chat-container');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const pickFrameBtn = document.getElementById('pick-frame-btn');
  const exportBtn = document.getElementById('export-btn');
  const backBtn = document.getElementById('back-btn');
  const chatPanel = document.getElementById('chat-panel');

  // Video upload elements
  const uploadArea = document.getElementById('upload-area');
  const videoPlayerArea = document.getElementById('video-player-area');
  const videoInput = document.getElementById('video-input');
  const uploadBtn = document.getElementById('upload-btn');
  const videoElement = document.getElementById('video-element');
  const changeVideoBtn = document.getElementById('change-video-btn');

  // NEW: Image upload elements
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const imagePreview = document.getElementById('image-preview');
  const removeImageBtn = document.getElementById('remove-image-btn');
  const imageUploadInput = document.getElementById('image-upload-input'); // Declare here
  const attachFileBtn = document.getElementById('attach-file-btn');

  // NEW: Check for uploaded video from main page
  const uploadedVideoDataURL = sessionStorage.getItem('uploadedVideoDataURL');
  const uploadedVideoType = sessionStorage.getItem('uploadedVideoType');

  if (uploadedVideoDataURL && uploadedVideoType) {
    // Create a File object from the Data URL
    // This is a simplified approach; for large files, consider other methods
    const videoFile = new File([dataURLtoBlob(uploadedVideoDataURL, uploadedVideoType)], 'uploaded_video.mp4', { type: uploadedVideoType });
    loadVideo(videoFile, true); // Pass true for fromSessionStorage
  }

  // Helper function to convert Data URL to Blob
  function dataURLtoBlob(dataurl, type) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  // ==================== NEW: Image Upload Handling ====================
  
  function handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      state.uploadedImage = file;
      imagePreview.src = e.target.result;
      imagePreviewContainer.classList.remove('hidden');
      
      // Add user message showing uploaded image
      addUserMessage(`<img src="${e.target.result}" class="rounded-lg" style="max-width: 100%; max-height: 200px; object-fit: contain;" />`);
    };
    reader.readAsDataURL(file);
  }

  removeImageBtn.addEventListener('click', () => {
    state.uploadedImage = null;
    imagePreviewContainer.classList.add('hidden');
    imagePreview.src = '';
    imageUploadInput.value = '';
  });

  // ==================== Video Upload and Loading ====================
  
  function handleVideoUpload() {
    videoInput.click();
  }

  function loadVideo(file, fromSessionStorage = false) {
    if (!file || !file.type.startsWith('video/')) {
      showNotification('Please select a valid video file');
      return;
    }

    state.videoFile = file;
    const videoURL = URL.createObjectURL(file);

    videoElement.src = videoURL;
    videoElement.load();

    videoElement.onloadedmetadata = async () => {
      state.videoLoaded = true;
      uploadArea.classList.add('hidden');
      videoPlayerArea.classList.remove('hidden');
      chatPanel.classList.remove('hidden');

      await extractFrames();

      if (fromSessionStorage) {
        sessionStorage.removeItem('uploadedVideoDataURL');
        sessionStorage.removeItem('uploadedVideoType');
      }
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
    chatPanel.classList.add('hidden');

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

  // ==================== Frame Extraction ====================
  
  async function extractFrames() {
    if (!state.videoLoaded) {
      showNotification('Please load a video first');
      return;
    }

    showNotification('Extracting frames from video...');

    state.frames = [];
    const duration = videoElement.duration;
    const numberOfFrames = 6;
    const interval = duration / (numberOfFrames + 1);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

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
          edited: false,
          hasVideo: false
        });
      }

      renderFrames();
      showNotification('Frames extracted successfully!');
    } catch (error) {
      console.error('Error extracting frames:', error);
      showNotification('Error extracting frames. Please try again.');
    }
  }

  function captureFrameAt(video, canvas, ctx, timestamp) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Frame capture timed out'));
      }, 3000); // 3-second timeout

      const seekHandler = () => {
        clearTimeout(timeout);
        // A small delay to allow the frame to be painted
        setTimeout(() => {
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frameData = canvas.toDataURL('image/jpeg', 0.8);
            resolve(frameData);
          } catch (error) {
            reject(error);
          }
        }, 50); // 50ms delay
      };

      video.addEventListener('seeked', seekHandler, { once: true });
      video.currentTime = timestamp;
    });
  }

  function generateThumbnailFromVideo(videoUrl, timestamp) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.src = videoUrl;
        video.muted = true;
        video.crossOrigin = "anonymous"; // Important for cross-origin videos if applicable

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        video.onloadedmetadata = () => {
            video.currentTime = timestamp;
        };

        video.onseeked = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frameData = canvas.toDataURL('image/jpeg', 0.8);
            // Cleanup
            video.remove();
            canvas.remove();
            resolve(frameData);
        };

        video.onerror = (err) => {
            console.error("Error loading video for thumbnail generation:", err);
            // Cleanup
            video.remove();
            canvas.remove();
            reject(new Error('Could not generate thumbnail from video.'));
        };
    });
  }

  // ==================== Render Frames Grid ====================
  
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
        videoIndicator.innerHTML = '<span class="material-symbols-outlined">movie</span> Video';
        videoIndicator.title = 'Video clip will be inserted';
        frameCard.appendChild(videoIndicator);
      }

      frameCard.addEventListener('click', () => selectFrame(index));

      framesGrid.appendChild(frameCard);
    });
  }

  // ==================== Select Frame ====================
  
  function selectFrame(index) {
    state.selectedFrameIndex = index;
    state.selectedVariation = null;

    renderFrames();
    updateChatUI({ resetChat: true });

    chatInput.disabled = false;
    sendBtn.disabled = false;
    pickFrameBtn.disabled = false;

    showNotification(`Frame ${index + 1} selected`);
  }

  function updateChatUI(options = {}) {
    if (state.selectedFrameIndex === null) return;

    const frame = state.frames[state.selectedFrameIndex];
    if (!frame) return;

    const { resetChat = false } = options;
    let indicator = chatContainer.querySelector('.selected-frame-indicator');

    if (resetChat) {
      chatContainer.innerHTML = '';
      indicator = null;
    }

    const indicatorHTML = `
      <div class="selected-frame-thumbnail" style="background-image: url('${frame.url}')"></div>
      <div class="selected-frame-info">
        <div class="selected-frame-title">Editing Frame ${state.selectedFrameIndex + 1}</div>
        <div class="selected-frame-timestamp">Timestamp: ${frame.timestamp}</div>
      </div>
    `;

    if (!indicator) {
      if (!resetChat) {
        const placeholder = chatContainer.querySelector('.text-center');
        if (placeholder && placeholder.textContent?.includes('Select a frame')) {
          placeholder.remove();
        }
      }

      indicator = document.createElement('div');
      indicator.className = 'selected-frame-indicator';
      indicator.innerHTML = indicatorHTML;
      chatContainer.insertBefore(indicator, chatContainer.firstChild);
      return;
    }

    const thumbnail = indicator.querySelector('.selected-frame-thumbnail');
    const title = indicator.querySelector('.selected-frame-title');
    const timestamp = indicator.querySelector('.selected-frame-timestamp');

    if (thumbnail) {
      thumbnail.style.backgroundImage = `url('${frame.url}')`;
    } else {
      indicator.innerHTML = indicatorHTML;
    }

    if (title) {
      title.textContent = `Editing Frame ${state.selectedFrameIndex + 1}`;
    }

    if (timestamp) {
      timestamp.textContent = `Timestamp: ${frame.timestamp}`;
    }
  }

  // ==================== MODIFIED: Send Message ====================
  
  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || state.selectedFrameIndex === null) return;

    // Add user message
    addUserMessage(escapeHtml(message));

    // Clear input
    chatInput.value = '';

    // Show loading message with 7-second delay
    const loadingId = addAILoadingMessage('Generating video...');
    
    // Disable input during generation
    chatInput.disabled = true;
    sendBtn.disabled = true;

    // Simulate 7-second video generation
    setTimeout(async () => {
      // Remove loading message
      removeMessage(loadingId);
      
      // Set generated video URL (pre-saved demo video)
      state.generatedVideoUrl = 'videos/demo2.mp4';
      
      try {
        const thumbnailUrl = await generateThumbnailFromVideo(state.generatedVideoUrl, 1); // Get frame at 1 second
        state.generatedThumbnailUrl = thumbnailUrl;
      } catch (error) {
        console.error('Error generating thumbnail:', error);
        state.generatedThumbnailUrl = 'images/pic4.png'; // Fallback
      }
      
      // Show video preview with Apply button
      addAIVideoResponse(state.generatedVideoUrl);
      
      // Re-enable input
      chatInput.disabled = false;
      sendBtn.disabled = false;
      
      // Reset uploaded image
      state.uploadedImage = null;
      imagePreviewContainer.classList.add('hidden');
      imageUploadInput.value = '';
      
    }, 7000); // 7 seconds
  }

  // ==================== NEW: Add AI Loading Message ====================
  
  function addAILoadingMessage(text) {
    const messageId = 'loading-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.className = 'ai-message chat-message';
    messageDiv.innerHTML = `
      <div class="ai-avatar">
        <span class="material-symbols-outlined !text-xl text-black">auto_awesome</span>
      </div>
      <div class="ai-message-content">
        <p>${text}<span class="loading-dots"></span></p>
      </div>
    `;
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
    return messageId;
  }

  // ==================== NEW: Add AI Video Response ====================
  
  function addAIVideoResponse(videoUrl) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message chat-message';
    messageDiv.innerHTML = `
      <div class="ai-avatar">
        <span class="material-symbols-outlined !text-xl text-black">auto_awesome</span>
      </div>
      <div class="ai-message-content">
        <p style="margin-bottom: 12px;">Video generated! Please check the preview.</p>
        <video controls class="w-full rounded-lg mb-3" style="max-height: 300px;">
          <source src="${videoUrl}" type="video/mp4">
        </video>
        <button class="apply-btn" id="apply-video-btn">Apply to Frame</button>
      </div>
    `;

    chatContainer.appendChild(messageDiv);
    scrollToBottom();

    // Apply button handler
    const applyBtn = messageDiv.querySelector('#apply-video-btn');
    applyBtn.addEventListener('click', () => {
      applyVideoToFrame();
    });
  }

  // ==================== NEW: Apply Video to Frame ====================
  
  function applyVideoToFrame() {
    if (state.selectedFrameIndex === null) return;
    if (!state.generatedVideoUrl) {
      showNotification('Generate a clip before applying it to a frame');
      return;
    }

    const frame = state.frames[state.selectedFrameIndex];

    // Always display the combined output video in the main player
    const combinedVideoPath = 'videos/output.mp4';

    // Insert the generated video
    const videoClip = {
      path: combinedVideoPath,
      frameIndex: state.selectedFrameIndex,
      timestamp: frame.timestamp,
      insertedAt: new Date().toISOString()
    };

    state.insertedVideos.push(videoClip);

    // Update frame to show it has a video inserted
    frame.url = state.generatedThumbnailUrl || 'images/pic4.png'; // Use the new thumbnail
    frame.edited = true;
    frame.hasVideo = true;

    state.editedFrames.add(state.selectedFrameIndex);

    renderFrames();
    updateChatUI();
    showNotification(`✓ Video clip will be inserted at frame ${state.selectedFrameIndex + 1}`);

    // Ensure the player is visible before updating the src
    uploadArea.classList.add('hidden');
    videoPlayerArea.classList.remove('hidden');
    chatPanel.classList.remove('hidden');

    // Completely reset the video element
    console.log('Resetting video player...');
    videoElement.pause();
    videoElement.removeAttribute('src');
    videoElement.load();

    // Wait a moment before loading new video
    setTimeout(() => {
      // Display and play the combined video in the main player
      const videoUrl = combinedVideoPath + '?t=' + new Date().getTime();
      console.log('Loading video:', videoUrl);

      // Remove old event listeners
      videoElement.onerror = null;
      videoElement.onloadeddata = null;

      // Add error handler
      videoElement.onerror = (e) => {
        console.error('Video load error:', e);
        console.error('Video error code:', videoElement.error?.code);
        console.error('Video error message:', videoElement.error?.message);
        showNotification('Error loading video. Check console for details.');
      };

      // Add success handler
      videoElement.onloadeddata = () => {
        console.log('Video loaded successfully');
        console.log('Video duration:', videoElement.duration);
        console.log('Video dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);
      };

      // Set new source
      videoElement.src = videoUrl;
      videoElement.load();

      // Play with promise handling
      videoElement.onloadedmetadata = () => {
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Video playing successfully');
            })
            .catch(error => {
              console.error('Autoplay error:', error);
              showNotification('Click the video to play (autoplay blocked by browser)');
            });
        }
      };
    }, 100); // 100ms delay

    // Reset selection
    state.selectedVariation = null;
    state.generatedVideoUrl = null;
    state.generatedThumbnailUrl = null; // Reset the thumbnail
  }

  // ==================== Remove Message ====================
  
  function removeMessage(messageId) {
    const msg = document.getElementById(messageId);
    if (msg) msg.remove();
  }

  // ==================== Add User Message ====================
  
  function addUserMessage(content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message chat-message';
    messageDiv.innerHTML = `
      <div class="user-avatar"></div>
      <div class="user-message-content">${content}</div>
    `;
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
  }



  // ==================== Utility Functions ====================
  
  function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showNotification(message) {
    console.log('Notification:', message);
  }

  // ==================== Event Listeners ====================
  
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
    showNotification('Exporting video...');

    setTimeout(() => {
      const link = document.createElement('a');
      link.href = 'videos/output.mp4';
      link.download = 'output.mp4';
      link.click();

      showNotification('Video exported successfully!');
    }, 1500);
  });

  backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  uploadBtn.addEventListener('click', handleVideoUpload);

  videoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      loadVideo(file);
    }
  });

  if (changeVideoBtn) {
    changeVideoBtn.addEventListener('click', changeVideo);
  }

  imageUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      // === ここから追加 ===
      // 添付ボタン（クリップアイコン）を取得
      const attachBtn = document.getElementById('attach-file-btn');
      if (attachBtn) {
        // アニメーション用のクラスを追加
        attachBtn.classList.add('attach-success');
        
        // 2秒後にクラスを削除してアニメーションをリセット
        setTimeout(() => {
          attachBtn.classList.remove('attach-success');
        }, 2000);
      }
      // === ここまで追加 ===

      handleImageUpload(file);
    }
  });

  if (attachFileBtn && imageUploadInput) {
    attachFileBtn.addEventListener('click', () => {
      imageUploadInput.click(); // Programmatically click the hidden file input
    });
  }



  // Drag and drop support
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
  }); // <--- Corrected closing bracket for drop event listener
}); // <--- Corrected closing bracket for DOMContentLoaded
