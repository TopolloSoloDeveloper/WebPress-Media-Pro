// Global State Scopes
let activeCompressionPreset = 'medium'; 
let globalTargetFormat = 'original';     
let globalFilesQueue = [];

const COMPRESSION_MAP = {
    'low': 0.90,
    'medium': 0.75,
    'high': 0.55
};

// Document Mount Initialization Setup
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initThemeEngine();
    initUploadPipeline();
    initGlobalActionListeners();
});

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
    // 1. Compression Button Preset Listeners
    document.querySelectorAll('.comp-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedLevel = e.currentTarget.getAttribute('data-level');
            setCompressionPreset(selectedLevel);
        });
    });

    // 2. Target Format Extension Selector Listeners
    document.querySelectorAll('.fmt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedFormat = e.currentTarget.getAttribute('data-format');
            setTargetFormatPreset(selectedFormat);
        });
    });

    // 3. Clear Queue Global Trigger Action Listener
    const clearAllBtn = document.getElementById('btn-clear-all');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            clearAllQueue();
        });
    }

    // 4. Download Queue Global Trigger Action Listener
    const downloadAllBtn = document.getElementById('btn-download-all');
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', () => {
            downloadAllProcessed();
        });
    }
}

// ------------------ CORE STATE MANIPULATION MUTATORS ------------------
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

// ------------------ FILE UPLOAD SUB-ROUTINES ------------------
function initUploadPipeline() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());
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
    rowWrapper.className = "bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 animate-fade-in";
    
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

    // Attach explicit element listeners dynamically to bypass HTML inline execution issues
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
