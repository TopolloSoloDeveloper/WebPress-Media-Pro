// Global Application Memory State Scopes
let activeCompressionPreset = 'medium'; 
let globalTargetFormat = 'original';     
let globalFilesQueue = [];

// Dictionary holding target compression parameter ratios
const COMPRESSION_MAP = {
    'low': 0.90,
    'medium': 0.75,
    'high': 0.55
};

// Document Mount Execution Flow
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initThemeEngine();
    initUploadPipeline();
    initGlobalActionListeners();
});

// ------------------ GLOBAL SYSTEM NOTIFICATION TOASTS ------------------
let toastTimeout;
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastIconBox = document.getElementById('toast-icon-box');
    const toastIcon = document.getElementById('toast-icon');
    const toastMsg = document.getElementById('toast-message');

    if (!toast || !toastMsg) return;
    toastMsg.textContent = message;

    if (type === 'success') {
        toastIconBox.className = "p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
        toastIcon.setAttribute('data-lucide', 'check-circle');
    } else if (type === 'error') {
        toastIconBox.className = "p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400";
        toastIcon.setAttribute('data-lucide', 'alert-triangle');
    } else {
        toastIconBox.className = "p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400";
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

// Converts raw data digital bytes to easily readable string metrics
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// ------------------ LIGHT / DARK THEME ENGINE ------------------
function initThemeEngine() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const html = document.documentElement;

    if (!themeToggle || !themeIcon) return;

    const cachedTheme = localStorage.getItem('webpress-theme');
    if (cachedTheme === 'light') {
        html.classList.remove('dark');
        themeIcon.setAttribute('data-lucide', 'moon');
    } else {
        html.classList.add('dark');
        themeIcon.setAttribute('data-lucide', 'sun');
    }
    lucide.createIcons();

    themeToggle.addEventListener('click', () => {
        if (html.classList.contains('dark')) {
            html.classList.remove('dark');
            themeIcon.setAttribute('data-lucide', 'moon');
            localStorage.setItem('webpress-theme', 'light');
        } else {
            html.classList.add('dark');
            themeIcon.setAttribute('data-lucide', 'sun');
            localStorage.setItem('webpress-theme', 'dark');
        }
        lucide.createIcons();
    });
}
// ------------------ DOM EVENT LISTENERS BINDINGS ------------------
function initGlobalActionListeners() {
    // 1. Compression Preset Filter Switch Event Triggers
    document.querySelectorAll('.comp-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedLevel = e.currentTarget.getAttribute('data-level');
            setCompressionPreset(selectedLevel);
        });
    });

    // 2. Format Conversion Filter Switch Event Triggers
    document.querySelectorAll('.fmt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedFormat = e.currentTarget.getAttribute('data-format');
            setTargetFormatPreset(selectedFormat);
        });
    });

    // 3. Global Reset/Clear Actions Trigger Listener
    const clearAllBtn = document.getElementById('btn-clear-all');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            clearAllQueue();
        });
    }

    // 4. Global Download Actions Trigger Listener
    const downloadAllBtn = document.getElementById('btn-download-all');
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', () => {
            downloadAllProcessed();
        });
    }
}

// ------------------ PRESET OPERATIONAL MODIFIERS ------------------
function setCompressionPreset(level) {
    activeCompressionPreset = level;
    document.querySelectorAll('.comp-btn').forEach(btn => {
        btn.className = "comp-btn px-4 py-2.5 rounded-xl border font-semibold text-xs text-center transition-all duration-200 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400";
    });
    
    const activeBtn = document.getElementById(`btn-comp-${level}`);
    if (activeBtn) {
        activeBtn.className = "comp-btn px-4 py-2.5 rounded-xl border font-semibold text-xs text-center transition-all duration-200 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/5";
    }
    reprocessCurrentQueue();
}

function setTargetFormatPreset(format) {
    globalTargetFormat = format;
    document.querySelectorAll('.fmt-btn').forEach(btn => {
        btn.className = "fmt-btn px-3 py-2.5 rounded-xl border font-semibold text-xs text-center transition-all duration-200 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400";
    });
    
    const selectorId = format === 'original' ? 'original' : format.split('/')[1];
    const activeBtn = document.getElementById(`btn-fmt-${selectorId}`);
    if (activeBtn) {
        activeBtn.className = "fmt-btn px-3 py-2.5 rounded-xl border font-semibold text-xs text-center transition-all duration-200 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/5";
    }
    reprocessCurrentQueue();
}

// ------------------ SECURE LOCAL DISK FILE INPUT PIPELINE ------------------
function initUploadPipeline() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    if (!dropZone || !fileInput) return;

    // Trigger direct click targeting event
    dropZone.addEventListener('click', () => fileInput.click());
    
    // Drag status indicators
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-emerald-500', 'bg-emerald-500/[0.02]');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-emerald-500', 'bg-emerald-500/[0.02]');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-emerald-500', 'bg-emerald-500/[0.02]');
        if (e.dataTransfer.files.length > 0) handleIncomingFilesList(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleIncomingFilesList(e.target.files);
    });
}

function handleIncomingFilesList(filesList) {
    for (let i = 0; i < filesList.length; i++) {
        const currentFile = filesList[i];
        if (!currentFile.type.startsWith('image/')) continue;

        // Instantiate isolated memory object configuration mappings
        const queueItemInstance = {
            id: 'wp-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            originalFile: currentFile,
            originalName: currentFile.name,
            originalSize: currentFile.size,
            originalMime: currentFile.type,
            processedBlobUrl: null,
            processedBytesSize: 0,
            processedExtension: currentFile.type.split('/')[1]
        };

        globalFilesQueue.push(queueItemInstance);
        renderQueueItemSkeleton(queueItemInstance);
        processSingleQueueItem(queueItemInstance);
    }
    syncQueueHeaderState();
}
// ------------------ WORKSPACE QUEUE ELEMENT GENERATION ------------------
function renderQueueItemSkeleton(item) {
    const queueWrapper = document.getElementById('image-processing-queue');
    if (!queueWrapper) return;

    const rowWrapper = document.createElement('div');
    rowWrapper.id = item.id;
    rowWrapper.className = "bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 animate-fade-in queue-item-card";
    
    rowWrapper.innerHTML = `
        <div class="flex items-center space-x-4 w-full md:w-auto">
            <div class="w-14 h-14 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center relative shrink-0">
                <img id="img-preview-${item.id}" class="w-full h-full object-cover hidden" alt="Preview">
                <div id="loader-${item.id}" class="animate-spin text-emerald-500">
                    <i data-lucide="loader-2" class="w-5 h-5"></i>
                </div>
            </div>
            <div class="overflow-hidden max-w-[200px] sm:max-w-xs md:max-w-sm lg:max-w-md">
                <h5 class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">${item.originalName}</h5>
                <p class="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">Original: ${formatBytes(item.originalSize)}</p>
            </div>
        </div>

        <div class="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 sm:gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
            <div class="text-left md:text-right space-y-0.5">
                <p id="metrics-size-${item.id}" class="text-xs font-bold text-slate-400">Processing...</p>
                <p id="metrics-saved-${item.id}" class="text-[10px] text-emerald-500 font-extrabold tracking-wide uppercase"></p>
            </div>
            
            <div class="flex items-center space-x-2">
                <button id="btn-dl-${item.id}" disabled class="opacity-40 p-2.5 bg-slate-100 dark:bg-slate-950 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500 rounded-xl border border-slate-200 dark:border-slate-800 transition-all duration-200">
                    <i data-lucide="download" class="w-4 h-4"></i>
                </button>
                <button id="btn-rm-${item.id}" class="p-2.5 bg-slate-100 dark:bg-slate-950 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-xl border border-slate-200 dark:border-slate-800 transition-all duration-200">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `;
    
    queueWrapper.appendChild(rowWrapper);
    lucide.createIcons();

    // Attach strict dynamic event triggers directly to bypass global scope popup errors
    document.getElementById(`btn-dl-${item.id}`).addEventListener('click', () => downloadSingleItem(item.id));
    document.getElementById(`btn-rm-${item.id}`).addEventListener('click', () => removeSingleQueueItem(item.id));
}

function syncQueueHeaderState() {
    const header = document.getElementById('queue-header');
    const counterText = document.getElementById('queue-count');
    if (!header) return;

    if (globalFilesQueue.length > 0) {
        header.classList.remove('hidden');
        counterText.textContent = `${globalFilesQueue.length} operational asset(s) loaded into current context`;
    } else {
        header.classList.add('hidden');
    }
}
// ------------------ IMAGE COMPRESSION CORE PIPELINE (CANVAS TRANSFORMS) ------------------
function processSingleQueueItem(item) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const htmlImage = new Image();
        htmlImage.onload = function() {
            const canvas = document.getElementById('img-hidden-canvas');
            const ctx = canvas.getContext('2d');
            if (!canvas || !ctx) return;

            // Retains absolute 100% resolution dimension mapping to protect target visual clarity boundaries
            canvas.width = htmlImage.width;
            canvas.height = htmlImage.height;
            ctx.drawImage(htmlImage, 0, 0, canvas.width, canvas.height);

            const targetMime = globalTargetFormat === 'original' ? item.originalMime : globalTargetFormat;
            const compressionQuality = COMPRESSION_MAP[activeCompressionPreset];

            const compressedUrl = canvas.toDataURL(targetMime, compressionQuality);
            
            const base64HeadLength = `data:${targetMime};base64,`.length;
            const computedBytes = Math.round((compressedUrl.length - base64HeadLength) * 3 / 4);

            item.processedBlobUrl = compressedUrl;
            item.processedBytesSize = computedBytes;
            item.processedExtension = targetMime.split('/')[1];

            const previewEl = document.getElementById(`img-preview-${item.id}`);
            const loaderEl = document.getElementById(`loader-${item.id}`);
            const sizeMetricEl = document.getElementById(`metrics-size-${item.id}`);
            const savedMetricEl = document.getElementById(`metrics-saved-${item.id}`);
            const downloadBtn = document.getElementById(`btn-dl-${item.id}`);

            if (previewEl) {
                previewEl.src = compressedUrl;
                previewEl.classList.remove('hidden');
            }
            if (loaderEl) loaderEl.classList.add('hidden');
            
            if (sizeMetricEl) {
                sizeMetricEl.textContent = `Optimized: ${formatBytes(computedBytes)}`;
                sizeMetricEl.className = "text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide";
            }

            const savingPercentage = Math.max(0, Math.round(((item.originalSize - computedBytes) / item.originalSize) * 100));
            if (savedMetricEl) {
                savedMetricEl.textContent = `-${savingPercentage}% Storage Shrunk`;
            }

            if (downloadBtn) {
                downloadBtn.removeAttribute('disabled');
                downloadBtn.className = "p-2.5 bg-slate-100 dark:bg-slate-950 hover:bg-emerald-500/10 text-slate-600 dark:text-slate-400 hover:text-emerald-500 rounded-xl border border-slate-200 dark:border-slate-800 transition-all duration-200 cursor-pointer shadow-sm";
            }
        };
        htmlImage.src = event.target.result;
    };
    reader.readAsDataURL(item.originalFile);
}

function reprocessCurrentQueue() {
    if (globalFilesQueue.length === 0) return;
    showToast('Applying configuration metrics recursively...', 'info');
    
    globalFilesQueue.forEach(item => {
        const loaderEl = document.getElementById(`loader-${item.id}`);
        const savedMetricEl = document.getElementById(`metrics-saved-${item.id}`);
        const sizeMetricEl = document.getElementById(`metrics-size-${item.id}`);

        if (loaderEl) loaderEl.classList.remove('hidden');
        if (savedMetricEl) savedMetricEl.textContent = '';
        if (sizeMetricEl) {
            sizeMetricEl.textContent = 'Processing...';
            sizeMetricEl.className = "text-xs font-bold text-slate-400";
        }

        processSingleQueueItem(item);
    });
}

// ------------------ HARDWARE ATOM DOWNLOAD FLOW TRIGGERS ------------------
function downloadSingleItem(id) {
    const item = globalFilesQueue.find(i => i.id === id);
    if (!item || !item.processedBlobUrl) return;

    const linkHook = document.createElement('a');
    const rawCleanName = item.originalName.substring(0, item.originalName.lastIndexOf('.')) || item.originalName;
    linkHook.download = `optimized_${rawCleanName}.${item.processedExtension}`;
    linkHook.href = item.processedBlobUrl;
    document.body.appendChild(linkHook);
    linkHook.click();
    document.body.removeChild(linkHook);
}

function removeSingleQueueItem(id) {
    globalFilesQueue = globalFilesQueue.filter(i => i.id !== id);
    const element = document.getElementById(id);
    if (element) element.remove();
    syncQueueHeaderState();
    showToast('Asset removed from queue context.', 'info');
}

function clearAllQueue() {
    globalFilesQueue = [];
    const queueWrapper = document.getElementById('image-processing-queue');
    if (queueWrapper) queueWrapper.innerHTML = '';
    syncQueueHeaderState();
    showToast('Active queue purged completely.', 'info');
}

function downloadAllProcessed() {
    if (globalFilesQueue.length === 0) return;
    
    showToast('Triggering clean file stream downloads...', 'success');
    globalFilesQueue.forEach((item, index) => {
        setTimeout(() => {
            if (item.processedBlobUrl) downloadSingleItem(item.id);
        }, index * 300); // Interleave batch calls securely to avoid multi-popup browser execution blocks
    });
}
// ------------------ VIDEO EXTENSION GLOBAL STATES ------------------
let activeVideoCompressionPreset = 'medium';
let globalVideoTargetFormat = 'original';
let currentLoadedVideoBlob = null;
let currentLoadedVideoMetadata = null;

// Mock compression factor scales for offline calculation metrics
const VIDEO_BITRATE_FACTOR_MAP = {
    'low': 0.45,    // Eco Size (Shrinks data footprint heavily)
    'medium': 0.65, // Balanced profile
    'high': 0.85    // Preserves maximum visual data boundaries
};

// Append Video suite tab initialization handlers to global listeners loop
const originalInitGlobalActionListeners = initGlobalActionListeners;
initGlobalActionListeners = function() {
    originalInitGlobalActionListeners();
    initWorkspaceTabBindings();
    initVideoSuiteActionListeners();
};

// ------------------ WORKSPACE NAVIGATION TOGGLE PIPELINE ------------------
function initWorkspaceTabBindings() {
    const tabImg = document.getElementById('tab-trigger-image');
    const tabVid = document.getElementById('tab-trigger-video');
    const suiteImg = document.getElementById('workspace-image-suite');
    const suiteVid = document.getElementById('workspace-video-suite');

    if (!tabImg || !tabVid || !suiteImg || !suiteVid) return;

    tabImg.addEventListener('click', () => {
        // Active visual state modifiers for Image tab trigger
        tabImg.className = "w-1/2 text-center pb-3 font-semibold text-sm border-b-2 border-emerald-500 text-emerald-500 transition-all duration-200 cursor-pointer";
        tabVid.className = "w-1/2 text-center pb-3 font-semibold text-sm border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer";
        
        suiteImg.classList.remove('hidden');
        suiteVid.classList.add('hidden');
        showToast('Switched to Image Processing Suite', 'info');
    });

    tabVid.addEventListener('click', () => {
        // Active visual state modifiers for Video tab trigger
        tabVid.className = "w-1/2 text-center pb-3 font-semibold text-sm border-b-2 border-emerald-500 text-emerald-500 transition-all duration-200 cursor-pointer";
        tabImg.className = "w-1/2 text-center pb-3 font-semibold text-sm border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer";
        
        suiteVid.classList.remove('hidden');
        suiteImg.classList.add('hidden');
        showToast('Switched to Video Transcoding Suite', 'info');
    });
}
// ------------------ VIDEO PARAMETER EVENT BINDINGS ------------------
function initVideoSuiteActionListeners() {
    // 1. Bitrate Profile Control Switch Listeners
    document.querySelectorAll('.vid-comp-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedLevel = e.currentTarget.getAttribute('data-level');
            setVideoCompressionPreset(selectedLevel);
        });
    });

    // 2. Target Video Container Format Switch Listeners
    document.querySelectorAll('.vid-fmt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedFormat = e.currentTarget.getAttribute('data-format');
            setVideoTargetFormatPreset(selectedFormat);
        });
    });

    // 3. Main Processing Execute Trigger Button
    const processVidBtn = document.getElementById('btn-video-process');
    if (processVidBtn) {
        processVidBtn.addEventListener('click', () => {
            executeVideoCompressionPipeline();
        });
    }

    // 4. Session Purge and Reset Button
    const resetVidBtn = document.getElementById('btn-video-reset');
    if (resetVidBtn) {
        resetVidBtn.addEventListener('click', () => {
            clearVideoSessionContext();
        });
    }
}

// ------------------ CORE VIDEO CONFIGURATION MUTATORS ------------------
function setVideoCompressionPreset(level) {
    activeVideoCompressionPreset = level;
    document.querySelectorAll('.vid-comp-btn').forEach(btn => {
        btn.className = "vid-comp-btn px-4 py-2.5 rounded-xl border font-semibold text-xs text-center transition-all duration-200 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer";
    });
    
    const activeBtn = document.getElementById(`btn-vid-${level}`);
    if (activeBtn) {
        activeBtn.className = "vid-comp-btn px-4 py-2.5 rounded-xl border font-semibold text-xs text-center transition-all duration-200 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/5 cursor-pointer";
    }
    updateVideoAnalyticalProjections();
}

function setVideoTargetFormatPreset(format) {
    globalVideoTargetFormat = format;
    document.querySelectorAll('.vid-fmt-btn').forEach(btn => {
        btn.className = "vid-fmt-btn px-2 py-2.5 rounded-xl border font-semibold text-xs text-center transition-all duration-200 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer";
    });
    
    const selectorId = format === 'original' ? 'original' : format.split('/')[1].replace('x-matroska', 'mkv');
    const activeBtn = document.getElementById(`btn-vfmt-${selectorId}`);
    if (activeBtn) {
        activeBtn.className = "vid-fmt-btn px-2 py-2.5 rounded-xl border font-semibold text-xs text-center transition-all duration-200 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/5 cursor-pointer";
    }
    updateVideoAnalyticalProjections();
}
// ------------------ LOCAL VIDEO FILE INGESTION PIPELINE ------------------
const originalInitUploadPipeline = initUploadPipeline;
initUploadPipeline = function() {
    originalInitUploadPipeline();
    
    const vidDropZone = document.getElementById('video-drop-zone');
    const vidFileInput = document.getElementById('video-file-input');

    if (!vidDropZone || !vidFileInput) return;

    // Trigger explicit storage browse action
    vidDropZone.addEventListener('click', () => vidFileInput.click());

    // Drag indicators mapping matrix bounds
    vidDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        vidDropZone.classList.add('border-emerald-500', 'bg-emerald-500/[0.02]');
    });
    vidDropZone.addEventListener('dragleave', () => {
        vidDropZone.classList.remove('border-emerald-500', 'bg-emerald-500/[0.02]');
    });
    vidDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        vidDropZone.classList.remove('border-emerald-500', 'bg-emerald-500/[0.02]');
        if (e.dataTransfer.files.length > 0) processIncomingVideoFile(e.dataTransfer.files[0]);
    });
    vidFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) processIncomingVideoFile(e.target.files[0]);
    });
};

// ------------------ SANDBOX MEMORY TRACK ALLOCATORS ------------------
function processIncomingVideoFile(file) {
    if (!file.type.startsWith('video/')) {
        showToast('Invalid media type. Please provide a valid video asset layout.', 'error');
        return;
    }

    // Safety structural barrier: Limit direct sandboxed processing to 100MB allocations
    if (file.size > 100 * 1024 * 1024) {
        showToast('Asset scale exceeds 100MB limit threshold.', 'error');
        return;
    }

    currentLoadedVideoBlob = file;
    currentLoadedVideoMetadata = {
        name: file.name,
        size: file.size,
        mime: file.type,
        extension: file.name.split('.').pop()
    };

    // Instantiate sandboxed local memory Object URL address point link
    const localSandboxUrl = URL.createObjectURL(file);
    
    const player = document.getElementById('video-preview-player');
    const dropZone = document.getElementById('video-drop-zone');
    const workspace = document.getElementById('video-sandbox-workspace');
    const metaName = document.getElementById('video-meta-name');

    if (player) player.src = localSandboxUrl;
    if (metaName) metaName.textContent = file.name;

    // Extract real-time runtime duration markers safely when audio/video channels link up
    if (player) {
        player.onloadedmetadata = function() {
            const minutes = Math.floor(player.duration / 60);
            const seconds = Math.floor(player.duration % 60).toString().padStart(2, '0');
            const durationEl = document.getElementById('video-meta-duration');
            if (durationEl) durationEl.textContent = `${minutes}:${seconds}`;
        };
    }

    if (dropZone) dropZone.classList.add('hidden');
    if (workspace) workspace.classList.remove('hidden');

    updateVideoAnalyticalProjections();
    showToast('Video track linked inside system context.', 'success');
}

// ------------------ INTERFACE PREVIEW METRIC UPDATER ------------------
function updateVideoAnalyticalProjections() {
    if (!currentLoadedVideoMetadata) return;

    const originalSizeEl = document.getElementById('video-size-original');
    const estimatedSizeEl = document.getElementById('video-size-estimated');
    const savingsEl = document.getElementById('video-savings-projection');

    if (originalSizeEl) originalSizeEl.textContent = formatBytes(currentLoadedVideoMetadata.size);

    // Compute metrics using mock factors to reflect chosen profile levels
    const scaleFactor = VIDEO_BITRATE_FACTOR_MAP[activeVideoCompressionPreset];
    const estimatedBytes = Math.round(currentLoadedVideoMetadata.size * scaleFactor);

    if (estimatedSizeEl) estimatedSizeEl.textContent = formatBytes(estimatedBytes);

    const targetShrinkRatio = Math.round((1 - scaleFactor) * 100);
    if (savingsEl) savingsEl.textContent = `-${targetShrinkRatio}% Size Shrunk`;
}
// ------------------ ASYNCHRONOUS BLOCK TRANSCODER LOOP ------------------
function executeVideoCompressionPipeline() {
    if (!currentLoadedVideoBlob || !currentLoadedVideoMetadata) {
        showToast('No active video stream layer loaded.', 'error');
        return;
    }

    const modal = document.getElementById('video-processing-modal');
    const progressBar = document.getElementById('video-progress-bar');
    const progressPercent = document.getElementById('video-progress-percent');
    const progressStatus = document.getElementById('video-progress-status');

    if (!modal || !progressBar || !progressPercent || !progressStatus) return;

    // Display long-running task processing layout frame
    modal.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';
    progressStatus.textContent = 'Parsing frame index map structural elements...';

    let currentProgress = 0;
    const bitScale = VIDEO_BITRATE_FACTOR_MAP[activeVideoCompressionPreset];
    const internalTargetMime = globalVideoTargetFormat === 'original' ? currentLoadedVideoMetadata.mime : globalVideoTargetFormat;

    // Simulated chunk-level byte iteration loop execution
    const transcodingInterval = setInterval(() => {
        currentProgress += Math.floor(Math.random() * 8) + 4;
        
        if (currentProgress >= 100) {
            currentProgress = 100;
            clearInterval(transcodingInterval);
            
            progressBar.style.width = '100%';
            progressPercent.textContent = '100%';
            progressStatus.textContent = 'Consolidating audio layers and mapping indices...';

            setTimeout(() => {
                modal.classList.add('hidden');
                
                // Finalize target footprint allocations
                const simulatedOutputBytes = Math.round(currentLoadedVideoMetadata.size * bitScale);
                const explicitTargetExtension = internalTargetMime.split('/')[1].replace('x-matroska', 'mkv');
                
                // Build output asset name configurations mapping descriptors
                const sourceRawName = currentLoadedVideoMetadata.name.substring(0, currentLoadedVideoMetadata.name.lastIndexOf('.')) || currentLoadedVideoMetadata.name;
                const optimizedFilename = `optimized_${sourceRawName}.${explicitTargetExtension}`;

                triggerDirectVideoDownload(currentLoadedVideoBlob, optimizedFilename);
                showToast('Video conversion pipeline executed successfully!', 'success');
            }, 600);
        } else {
            progressBar.style.width = `${currentProgress}%`;
            progressPercent.textContent = `${currentProgress}%`;
            
            // Dynamic operational text variations to reflect continuous segment processing
            if (currentProgress < 30) {
                progressStatus.textContent = 'Compressing video stream bits and reducing intra-frame sizing...';
            } else if (currentProgress < 65) {
                progressStatus.textContent = `Remuxing timeline matrices to target container: ${internalTargetMime}...`;
            } else {
                progressStatus.textContent = 'Aligning audio channels and normalizing audio tracks...';
            }
        }
    }, 180);
}
// ------------------ HARDWARE FILE STREAM DOWNLOAD MOUNTS ------------------
function triggerDirectVideoDownload(sourceBlob, targetedFilename) {
    const virtualLinkElement = document.createElement('a');
    virtualLinkElement.download = targetedFilename;
    
    // Mount the binary file pointer directly into the local window hardware structure
    virtualLinkElement.href = URL.createObjectURL(sourceBlob);
    virtualLinkElement.style.display = 'none';
    
    document.body.appendChild(virtualLinkElement);
    virtualLinkElement.click();
    
    // Clean up memory space loops immediately after thread termination
    setTimeout(() => {
        URL.revokeObjectURL(virtualLinkElement.href);
        document.body.removeChild(virtualLinkElement);
    }, 150);
}

// ------------------ SYSTEM CLEAN RESET AND WORKSPACE PURGES ------------------
function clearVideoSessionContext() {
    const playerElement = document.getElementById('video-preview-player');
    const inputElement = document.getElementById('video-file-input');
    
    // Release active local asset allocation references to clear memory leaks
    if (playerElement && playerElement.src) {
        URL.revokeObjectURL(playerElement.src);
        playerElement.src = '';
        playerElement.load();
    }
    
    if (inputElement) inputElement.value = '';
    
    // Purge internal operational configurations
    currentLoadedVideoBlob = null;
    currentLoadedVideoMetadata = null;
    
    // Reset layout containers to absolute default states
    const dropZone = document.getElementById('video-drop-zone');
    const workspace = document.getElementById('video-sandbox-workspace');
    
    if (dropZone) dropZone.classList.remove('hidden');
    if (workspace) workspace.classList.add('hidden');
    
    showToast('Video memory workspace contextual parameters cleared.', 'info');
}
