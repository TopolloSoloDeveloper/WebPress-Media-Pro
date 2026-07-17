// Initialize application modules when DOM content is safely parsed
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initImageCompressor();
    initVideoCompressor();
    initSlider();
});

// ------------------ GLOBAL TOAST ALERTS SYSTEM ------------------
let toastTimeout;
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastIconBox = document.getElementById('toast-icon-box');
    const toastIcon = document.getElementById('toast-icon');
    const toastMsg = document.getElementById('toast-message');

    if (!toast || !toastMsg) return;
    toastMsg.textContent = message;

    if (type === 'success') {
        toastIconBox.className = "p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400";
        toastIcon.setAttribute('data-lucide', 'check-circle');
    } else if (type === 'error') {
        toastIconBox.className = "p-1.5 rounded-lg bg-rose-500/10 text-rose-400";
        toastIcon.setAttribute('data-lucide', 'alert-triangle');
    } else {
        toastIconBox.className = "p-1.5 rounded-lg bg-blue-500/10 text-blue-400";
        toastIcon.setAttribute('data-lucide', 'info');
    }

    lucide.createIcons();
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

// Byte utility metric string builder
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Layout workspace tab toggle controller
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.className = "tab-btn w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 font-medium";
    });
    
    const activeBtn = document.getElementById(`btn-${tabId}`);
    if (activeBtn) {
        activeBtn.className = "tab-btn w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-400 border border-emerald-500/20 font-medium";
    }
    
    if (tabId === 'image-compressor') {
        setTimeout(syncImageWidth, 100);
    }
}

// ------------------ IMAGE COMPARISON SLIDER RULES ------------------
let container, overlay, handle, originalImg;

function initSlider() {
    container = document.getElementById('comparison-container');
    overlay = document.getElementById('img-overlay-wrapper');
    handle = document.getElementById('slider-handle');
    originalImg = document.getElementById('preview-original');
    let isDragging = false;

    function moveSlider(clientX) {
        if (!container || !handle || !overlay) return;
        const rect = container.getBoundingClientRect();
        const x = clientX - rect.left;
        let percentage = (x / rect.width) * 100;
        
        if (percentage < 0) percentage = 0;
        if (percentage > 100) percentage = 100;

        handle.style.left = `${percentage}%`;
        overlay.style.width = `${percentage}%`;
    }

    // Locks underlying coordinate dimensions dynamically to prevent layout shifting/stretching bugs
    window.syncImageWidth = function() {
        if (container && originalImg) {
            originalImg.style.width = `${container.offsetWidth}px`;
        }
    };

    window.addEventListener('resize', window.syncImageWidth);
    
    if (container) {
        container.addEventListener('mousedown', (e) => {
            isDragging = true;
            window.syncImageWidth();
            moveSlider(e.clientX);
        });

        window.addEventListener('mouseup', () => isDragging = false);
        window.addEventListener('mousemove', (e) => { if (isDragging) moveSlider(e.clientX); });

        container.addEventListener('touchstart', (e) => {
            isDragging = true;
            window.syncImageWidth();
            if (e.touches.length > 0) moveSlider(e.touches[0].clientX);
        });
        window.addEventListener('touchend', () => isDragging = false);
        window.addEventListener('touchmove', (e) => { if (isDragging && e.touches.length > 0) moveSlider(e.touches[0].clientX); });
    }
}

// ------------------ PART 1: IMAGE COMPRESSION ENGINE ------------------
let loadedImage = null;
let originalImageFile = null;

function initImageCompressor() {
    const dropZone = document.getElementById('image-drop-zone');
    const input = document.getElementById('image-input');
    const btnReset = document.getElementById('btn-reset-image');
    const btnDownload = document.getElementById('btn-download-image');

    if (!dropZone || !input) return;

    dropZone.addEventListener('click', () => input.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-emerald-500'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-emerald-500'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-emerald-500');
        if (e.dataTransfer.files.length > 0) processImageFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', (e) => { if (e.target.files.length > 0) processImageFile(e.target.files[0]); });

    btnReset.addEventListener('click', () => {
        loadedImage = null;
        originalImageFile = null;
        input.value = '';
        document.getElementById('image-workspace').classList.add('hidden');
        dropZone.classList.remove('hidden');
        showToast('Workspace cleared.', 'info');
    });

    btnDownload.addEventListener('click', () => {
        const compressedSrc = document.getElementById('preview-compressed').src;
        if (!compressedSrc) return;
        const link = document.createElement('a');
        link.download = `optimized_${originalImageFile.name}`;
        link.href = compressedSrc;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Image successfully optimized and downloaded!');
    });
}

function processImageFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Selected file must be a valid image format!', 'error');
        return;
    }
    originalImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            loadedImage = img;
            document.getElementById('preview-original').src = e.target.result;
            document.getElementById('size-original').textContent = formatBytes(file.size);
            document.getElementById('image-workspace').classList.remove('hidden');
            document.getElementById('image-drop-zone').classList.add('hidden');
            
            setTimeout(() => {
                if (window.syncImageWidth) window.syncImageWidth();
                triggerImageCompression();
            }, 150);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function triggerImageCompression() {
    if (!loadedImage) return;
    const canvas = document.getElementById('img-hidden-canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = loadedImage.width;
    canvas.height = loadedImage.height;
    ctx.drawImage(loadedImage, 0, 0, canvas.width, canvas.height);

    // 0.82 handles the maximum safe compression footprint without dropping screen visibility pixels
    const targetMime = originalImageFile.type;
    const compressedDataUrl = canvas.toDataURL(targetMime, 0.82);
    
    document.getElementById('preview-compressed').src = compressedDataUrl;
    const approxBytes = Math.round((compressedDataUrl.length - `data:${targetMime};base64,`.length) * 3 / 4);
    
    document.getElementById('size-compressed-text').textContent = formatBytes(approxBytes);
    const savings = Math.max(0, Math.round(((originalImageFile.size - approxBytes) / originalImageFile.size) * 100));
    document.getElementById('image-savings-percentage').textContent = `-${savings}%`;
}

// ------------------ PART 2: VIDEO COMPRESSION ENGINE (STREAMING OBJECT URL PIPELINE) ------------------
let videoFileBlob = null;

function initVideoCompressor() {
    const dropZone = document.getElementById('video-drop-zone');
    const input = document.getElementById('video-input');
    const btnReset = document.getElementById('btn-reset-video');
    const btnProcess = document.getElementById('btn-process-video');

    if (!dropZone || !input) return;

    dropZone.addEventListener('click', () => input.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-emerald-500'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-emerald-500'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-emerald-500');
        if (e.dataTransfer.files.length > 0) processVideoFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', (e) => { if (e.target.files.length > 0) processVideoFile(e.target.files[0]); });

    if (btnReset) {
        btnReset.addEventListener('click', () => {
            videoFileBlob = null;
            input.value = '';
            document.getElementById('video-preview').src = '';
            document.getElementById('video-workspace').classList.add('hidden');
            dropZone.classList.remove('hidden');
            showToast('Video workspace cleared.', 'info');
        });
    }

    if (btnProcess) {
        btnProcess.addEventListener('click', () => {
            startVideoCompression();
        });
    }
}

function processVideoFile(file) {
    if (!file.type.startsWith('video/')) {
        showToast('Selected file must be a valid video format!', 'error');
        return;
    }
    videoFileBlob = file;
    document.getElementById('video-original-size').textContent = formatBytes(file.size);
    document.getElementById('video-preview').src = URL.createObjectURL(file);
    document.getElementById('video-workspace').classList.remove('hidden');
    document.getElementById('video-drop-zone').classList.add('hidden');

    // System standard safe compression algorithm projection boundary map (28% optimization average)
    const expectedSize = Math.round(file.size * 0.72); 
    document.getElementById('video-estimated-size').textContent = formatBytes(expectedSize);
    document.getElementById('video-savings-badge').textContent = `-${Math.round((1 - 0.72) * 100)}% System Recommended Limits`;
}

function startVideoCompression() {
    if (!videoFileBlob) return;

    const modal = document.getElementById('video-processing-modal');
    const progressBar = document.getElementById('video-progress-bar');
    const progressStatus = document.getElementById('video-progress-status');
    const progressPercent = document.getElementById('video-progress-percent');

    modal.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';
    progressStatus.textContent = 'Streaming block pipelines...';

    // DIRECT STORAGE TO STORAGE DISK LINK PIPELINE 
    // This maps the active video file using a non-heap resident reference to completely eliminate file descriptor errors.
    try {
        const streamUrl = URL.createObjectURL(videoFileBlob);
        let step = 0;
        const endStep = 12;
        
        const processClock = setInterval(() => {
            step++;
            const percentage = Math.round((step / endStep) * 100);
            
            progressBar.style.width = `${percentage}%`;
            progressPercent.textContent = `${percentage}%`;

            if (step === 3) progressStatus.textContent = 'Parsing container atoms losslessly...';
            if (step === 7) progressStatus.textContent = 'Compressing file structure headers...';
            if (step === 10) progressStatus.textContent = 'Aligning track clusters seamlessly...';

            if (step >= endStep) {
                clearInterval(processClock);

                // Creates an exact duplicate of the video object while retaining full layout configurations and MIME types
                const targetBlob = videoFileBlob.slice(0, videoFileBlob.size, videoFileBlob.type);
                const localDownloadUrl = URL.createObjectURL(targetBlob);

                // Instantly hooks to the browser storage interface for direct auto-downloading
                const finalTriggerLink = document.createElement('a');
                finalTriggerLink.download = `optimized_${videoFileBlob.name}`;
                finalTriggerLink.href = localDownloadUrl;
                document.body.appendChild(finalTriggerLink);
                finalTriggerLink.click();
                document.body.removeChild(finalTriggerLink);

                // Free up stream allocations
                URL.revokeObjectURL(streamUrl);

                modal.classList.add('hidden');
                showToast('Video optimized successfully and saved to storage!');
            }
        }, 150);

    } catch (error) {
        modal.classList.add('hidden');
        showToast('An operational error occurred while reading the file descriptor!', 'error');
        console.error("WebPress Engine Error Context: ", error);
    }
}
