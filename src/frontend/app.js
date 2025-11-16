/**
 * Frontend Application Logic
 *
 * Handles:
 * - Form submission and validation
 * - File upload with drag-and-drop
 * - API communication
 * - Progress tracking
 * - Audio playback
 */

const API_BASE = '/api';

// DOM Elements
const convertForm = document.getElementById('convertForm');
const textInput = document.getElementById('text');
const charCount = document.getElementById('charCount');
const fileInput = document.getElementById('fileInput');
const fileUpload = document.getElementById('fileUpload');
const fileSelected = document.getElementById('fileSelected');
const fileName = document.getElementById('fileName');
const clearFile = document.getElementById('clearFile');
const submitBtn = document.getElementById('submitBtn');
const submitText = document.getElementById('submitText');
const submitSpinner = document.getElementById('submitSpinner');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultSection = document.getElementById('resultSection');
const audioPlayer = document.getElementById('audioPlayer');
const downloadBtn = document.getElementById('downloadBtn');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');

// State
let currentConversionId = null;
let currentFile = null;
let statusCheckInterval = null;

// ==================== Event Listeners ====================

document.addEventListener('DOMContentLoaded', () => {
  // Character counter
  textInput.addEventListener('input', updateCharCount);

  // File upload
  fileInput.addEventListener('change', handleFileSelect);
  clearFile.addEventListener('click', clearFileSelection);

  // Drag and drop
  fileUpload.addEventListener('dragover', handleDragOver);
  fileUpload.addEventListener('dragleave', handleDragLeave);
  fileUpload.addEventListener('drop', handleFileDrop);

  // Form submission
  convertForm.addEventListener('submit', handleSubmit);

  // Download button
  downloadBtn.addEventListener('click', handleDownload);

  // Initial character count
  updateCharCount();
});

// ==================== Character Counter ====================

function updateCharCount() {
  const count = textInput.value.length;
  charCount.textContent = count.toLocaleString();

  // Color coding based on length
  if (count > 10000) {
    charCount.style.color = 'var(--color-warning)';
  } else if (count > 5000) {
    charCount.style.color = 'var(--color-accent)';
  } else {
    charCount.style.color = 'var(--color-text-secondary)';
  }
}

// ==================== File Upload ====================

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    setSelectedFile(file);
  }
}

function handleDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  fileUpload.classList.add('dragover');
}

function handleDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  fileUpload.classList.remove('dragover');
}

function handleFileDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  fileUpload.classList.remove('dragover');

  const file = event.dataTransfer.files[0];
  if (file) {
    setSelectedFile(file);
    // Update the file input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
  }
}

function setSelectedFile(file) {
  currentFile = file;
  fileName.textContent = `${file.name} (${formatFileSize(file.size)})`;
  fileSelected.classList.remove('hidden');
  fileUpload.style.display = 'none';
}

function clearFileSelection() {
  currentFile = null;
  fileInput.value = '';
  fileSelected.classList.add('hidden');
  fileUpload.style.display = 'block';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ==================== Form Submission ====================

async function handleSubmit(event) {
  event.preventDefault();

  // Hide previous results/errors
  hideSection(resultSection);
  hideSection(errorSection);

  // Validate
  const title = document.getElementById('title').value.trim();
  const text = textInput.value.trim();
  const provider = document.getElementById('provider').value;

  if (!title) {
    showError('Please enter a title');
    return;
  }

  if (!text && !currentFile) {
    showError('Please enter text or upload a file');
    return;
  }

  // Prepare form data
  const formData = new FormData();
  formData.append('title', title);
  formData.append('provider', provider);

  if (currentFile) {
    formData.append('file', currentFile);
  } else {
    formData.append('text', text);
  }

  // Show loading state
  setLoading(true);
  showSection(progressSection);

  try {
    // Submit conversion
    const response = await fetch(`${API_BASE}/convert`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Conversion failed');
    }

    currentConversionId = data.id;

    // Start polling for status
    startStatusPolling(data.id);
  } catch (error) {
    console.error('Submission error:', error);
    showError(error.message);
    hideSection(progressSection);
    setLoading(false);
  }
}

// ==================== Status Polling ====================

function startStatusPolling(conversionId) {
  // Clear any existing interval
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
  }

  // Check status immediately
  checkStatus(conversionId);

  // Then poll every 2 seconds
  statusCheckInterval = setInterval(() => {
    checkStatus(conversionId);
  }, 2000);
}

async function checkStatus(conversionId) {
  try {
    const response = await fetch(`${API_BASE}/status/${conversionId}`);
    const data = await response.json();

    // Update progress
    updateProgress(data);

    // Check if completed
    if (data.status === 'completed') {
      clearInterval(statusCheckInterval);
      handleConversionComplete(conversionId);
    } else if (data.status === 'failed') {
      clearInterval(statusCheckInterval);
      handleConversionFailed(data.error);
    }
  } catch (error) {
    console.error('Status check error:', error);
  }
}

function updateProgress(status) {
  const progress = status.progress || 0;
  progressFill.style.width = `${progress}%`;

  if (status.totalChunks > 0) {
    progressText.textContent = `Processing chunk ${status.currentChunk} of ${status.totalChunks}... (${progress}%)`;
  } else {
    progressText.textContent = `Processing... (${progress}%)`;
  }
}

// ==================== Conversion Complete ====================

async function handleConversionComplete(conversionId) {
  setLoading(false);
  hideSection(progressSection);

  // Load the audio
  audioPlayer.src = `${API_BASE}/conversions/${conversionId}/audio`;

  // Show result section
  showSection(resultSection);

  // Smooth scroll to result
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function handleConversionFailed(error) {
  setLoading(false);
  hideSection(progressSection);
  showError(error || 'Conversion failed. Please try again.');
}

// ==================== Download ====================

function handleDownload() {
  if (!currentConversionId) return;

  const title = document.getElementById('title').value.trim() || 'audio';
  const link = document.createElement('a');
  link.href = `${API_BASE}/conversions/${currentConversionId}/audio`;
  link.download = `${title}.mp3`;
  link.click();
}

// ==================== UI Helpers ====================

function setLoading(loading) {
  submitBtn.disabled = loading;

  if (loading) {
    submitText.textContent = 'Processing...';
    submitSpinner.classList.remove('hidden');
  } else {
    submitText.textContent = 'Generate Audio';
    submitSpinner.classList.add('hidden');
  }
}

function showSection(element) {
  element.classList.remove('hidden');
  element.classList.add('fade-in');
}

function hideSection(element) {
  element.classList.add('hidden');
  element.classList.remove('fade-in');
}

function showError(message) {
  errorMessage.textContent = message;
  showSection(errorSection);
  errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==================== Form Reset ====================

function resetForm() {
  convertForm.reset();
  clearFileSelection();
  updateCharCount();
  hideSection(progressSection);
  hideSection(resultSection);
  hideSection(errorSection);
  currentConversionId = null;

  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
  }
}

// Optional: Add reset button listener if you add one
// document.getElementById('resetBtn')?.addEventListener('click', resetForm);
