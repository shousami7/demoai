// Main Page Logic
document.addEventListener('DOMContentLoaded', function() {
  // State management
  const state = {
    uploadedFiles: new Set(),
    isGenerating: false
  };

  // DOM elements
  const uploadInputs = document.querySelectorAll('input[type="file"]');
  const uploadCards = document.querySelectorAll('.upload-card');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const generateBtn = document.getElementById('generate-btn');
  const btnText = document.getElementById('btn-text');
  const completionSection = document.getElementById('completion-section');
  const downloadBtn = document.getElementById('download-btn');
  const editFramesBtn = document.getElementById('edit-frames-btn');
  const editNowBtn = document.getElementById('edit-now-btn');

  // Initialize file upload handlers
  uploadInputs.forEach((input, index) => {
    input.addEventListener('change', handleFileSelect);

    // Add drag and drop support
    const card = input.closest('.upload-card');

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');

      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        input.files = files;
        handleFileSelect({ target: input });
      }
    });
  });

  // Handle file selection
  function handleFileSelect(e) {
    const input = e.target;
    const file = input.files[0];

    if (!file) return;

    const card = input.closest('.upload-card');
    const uploadId = card.dataset.uploadId;
    const filenameDisplay = card.querySelector('.upload-filename');

    // Display filename
    filenameDisplay.textContent = file.name;

    // Mark as uploaded
    card.classList.add('uploaded');
    state.uploadedFiles.add(uploadId);

    // Update progress
    updateProgress();

    // Show success message briefly
    // showNotification(`${file.name} uploaded successfully!`);
  }

  // Update progress bar
  function updateProgress() {
    const progress = (state.uploadedFiles.size / 3) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${Math.round(progress)}%`;

    // Enable generate button when all files uploaded
    if (state.uploadedFiles.size === 3) {
      generateBtn.disabled = false;
      generateBtn.classList.add('pulse-animation');
      setTimeout(() => {
        generateBtn.classList.remove('pulse-animation');
      }, 2000);
    }
  }

  // Generate button handler
  generateBtn.addEventListener('click', function() {
    if (state.isGenerating) return;

    state.isGenerating = true;
    generateBtn.disabled = true;
    generateBtn.classList.add('btn-loading');
    btnText.textContent = 'Generating...';
    
    // ゲージを0%にリセット
    progressBar.style.width = '0%';
    progressText.textContent = '0%';

    const duration = 6000; // 6秒間 (6000ミリ秒)
    let startTime = null;

    function animateProgress(timestamp) {
      if (!startTime) startTime = timestamp; // 最初のフレームで開始時間を記録
      
      const elapsedTime = timestamp - startTime; // 経過時間
      
      if (elapsedTime >= duration) {
        // 6秒経過したら 100% にして終了
        progressBar.style.width = '100%';
        progressText.textContent = '100%';
        onGenerationComplete();
        return;
      }

      // イーズイン（加速）の計算 (t^2)
      // progress は 0.0 から 1.0 の値
      const progress = (elapsedTime / duration) ** 2; 

      // 実際のパーセンテージ（0から100）
      const generationProgress = Math.min(Math.floor(progress * 100), 100);

      progressBar.style.width = `${generationProgress}%`;
      progressText.textContent = `${generationProgress}%`;

      // 次のフレームを要求
      requestAnimationFrame(animateProgress);
    }

    // アニメーションを開始
    requestAnimationFrame(animateProgress);
  });

  // On generation complete
  function onGenerationComplete() {
    generateBtn.classList.remove('btn-loading');
    btnText.textContent = 'Generation Complete!';

    // Show completion section
    setTimeout(() => {
      completionSection.classList.remove('hidden');
      completionSection.classList.add('slide-in');

      // Hide generate button
      generateBtn.style.display = 'none';
      editNowBtn.style.display = 'none';
    }, 500);
  }

  // Download button handler
  downloadBtn.addEventListener('click', function() {
    showNotification('Video download started! (Mock download)');

    // Simulate download
    const link = document.createElement('a');
    link.href = 'data:text/plain,Mock Video File';
    link.download = 'luxury-property-video.mp4';
    link.click();
  });

  // Edit frames button handler
  editFramesBtn.addEventListener('click', function() {
    // Save state to sessionStorage for editor page
    sessionStorage.setItem('videoGenerated', 'true');
    sessionStorage.setItem('uploadedFiles', JSON.stringify(Array.from(state.uploadedFiles)));

    // Navigate to editor
    window.location.href = 'editor.html';
  });

  // Show notification helper
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-primary text-black px-6 py-3 rounded-lg shadow-lg font-semibold z-50 slide-in';
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // ★★★ リフレッシュで状態を復元する処理は、ここから削除されています ★★★

});