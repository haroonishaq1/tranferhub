// SendAnywhere Clone - Frontend JavaScript
class SendAnywhereApp {
    constructor() {
        this.socket = null;
        this.peer = null;
        this.selectedFiles = [];
        this.currentCode = null;
        this.isReceiver = false;
        this.receivedFiles = [];
        
        // Preview system properties
        this.currentFileIndex = 0;
        this.currentPageIndex = 0;
        this.totalPages = 1;
        this.previewData = null;
        
        this.init();
    }

    init() {
        this.connectSocket();
        this.setupEventListeners();
        this.setupFileHandling();
        this.checkPDFJSAvailability();
    }
    
    checkPDFJSAvailability() {
        // Check if PDF.js is available
        if (typeof pdfjsLib !== 'undefined') {
            console.log('✓ PDF.js loaded successfully, version:', pdfjsLib.version);
        } else {
            console.error('✗ PDF.js not available');
            // Show a warning toast
            setTimeout(() => {
                this.showToast('PDF preview may not work properly - PDF.js library not loaded', 'warning');
            }, 2000);
        }
    }

    connectSocket() {
        // Dynamically determine the server URL based on current location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.hostname;
        let port = window.location.port;
          // If we're on port 8000 (frontend), connect to backend on 4999
        // If we're on port 4999 (backend serving frontend), connect to same port
        let serverUrl;
        if (port === '8000') {
            serverUrl = `http://${hostname}:4999`;
        } else if (port === '4999' || !port) {
            serverUrl = `http://${hostname}:4999`;
        } else {
            // Default fallback
            serverUrl = 'http://localhost:4999';
        }
        
        console.log(`Connecting to socket server at: ${serverUrl}`);
        
        this.socket = io(serverUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            timeout: 20000,
            forceNew: true
        });        
        
        this.socket.on('connect', () => {
            console.log('Connected to server with socket ID:', this.socket.id);
            this.showToast(`Connected to server (ID: ${this.socket.id.substring(0, 8)}...)`, 'success');
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            if (reason !== 'io client disconnect') {
                this.showToast('Connection lost. Attempting to reconnect...', 'warning');
            }
        });

        this.socket.on('reconnect', () => {
            console.log('Reconnected to server');
            this.showToast('Reconnected to server', 'success');
        });

        this.socket.on('reconnect_failed', () => {
            console.log('Failed to reconnect to server');
            this.showToast('Connection failed. Please try again.', 'error');
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showToast('Connection error: ' + (error.message || error), 'error');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.showToast('Failed to connect to server', 'error');
        });

        this.socket.on('code-generated', (data) => {
            this.handleCodeGenerated(data);
        });

        this.socket.on('receiver-joined', (data) => {
            this.handleReceiverJoined(data);
        });

        this.socket.on('joined-room', (data) => {
            this.handleJoinedRoom(data);
        });

        this.socket.on('signal', (data) => {
            this.handleSignal(data);
        });
    }

    setupEventListeners() {
        // Cancel/Reset buttons
        document.getElementById('cancel-transfer-btn').addEventListener('click', () => {
            this.resetTransfer();
        });

        document.getElementById('reset-transfer-btn').addEventListener('click', () => {
            this.resetTransfer();
        });

        document.getElementById('cancel-receive-btn').addEventListener('click', () => {
            this.resetTransfer();
        });

        document.getElementById('download-all-btn').addEventListener('click', () => {
            this.downloadAllFiles();
        });

        document.getElementById('new-transfer-btn').addEventListener('click', () => {
            this.resetTransfer();
        });
        
        // Preview navigation event listeners
        this.setupPreviewEventListeners();
    }
    
    setupPreviewEventListeners() {
        // File navigation buttons
        const prevFileBtn = document.getElementById('prev-file-btn');
        const nextFileBtn = document.getElementById('next-file-btn');
        
        if (prevFileBtn) {
            prevFileBtn.addEventListener('click', () => {
                this.navigateToFile(this.currentFileIndex - 1);
            });
        }
        
        if (nextFileBtn) {
            nextFileBtn.addEventListener('click', () => {
                this.navigateToFile(this.currentFileIndex + 1);
            });
        }
        
        // Page/slide navigation buttons
        const prevPageBtn = document.getElementById('prev-page-btn');
        const nextPageBtn = document.getElementById('next-page-btn');
        
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                this.navigateToPage(this.currentPageIndex - 1);
            });
        }
          if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                this.navigateToPage(this.currentPageIndex + 1);
            });
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            // Only handle keyboard navigation when preview is visible
            if (!this.isPreviewVisible()) return;
            
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    if (e.shiftKey) {
                        // Shift + Left: Previous file
                        this.navigateToFile(this.currentFileIndex - 1);
                    } else {
                        // Left: Previous page
                        this.navigateToPage(this.currentPageIndex - 1);
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (e.shiftKey) {
                        // Shift + Right: Next file
                        this.navigateToFile(this.currentFileIndex + 1);
                    } else {
                        // Right: Next page
                        this.navigateToPage(this.currentPageIndex + 1);
                    }
                    break;
                case 'Home':
                    e.preventDefault();
                    if (e.ctrlKey) {
                        // Ctrl + Home: First file
                        this.navigateToFile(0);
                    } else {
                        // Home: First page
                        this.navigateToPage(0);
                    }
                    break;                case 'End':
                    e.preventDefault();
                    if (e.ctrlKey) {
                        // Ctrl + End: Last file
                        this.navigateToFile(this.selectedFiles.length - 1);
                    } else {
                        // End: Last page
                        this.navigateToPage(this.totalPages - 1);
                    }
                    break;
                case 'Escape':
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    }
                    break;
            }
        });
        
        // Initialize enhanced navigation feedback
        this.addPageNavigationFeedback();
    }
    
    isPreviewVisible() {
        const selectedFilesSection = document.getElementById('selected-files-section');
        return selectedFilesSection && !selectedFilesSection.classList.contains('hidden');
    }

    setupFileHandling() {
        const dropZone = document.getElementById('file-drop-zone');
        const fileInput = document.getElementById('file-input');

        console.log('Setting up file handling:', { dropZone, fileInput });

        if (!dropZone || !fileInput) {
            console.error('Missing DOM elements:', { dropZone, fileInput });
            return;
        }

        // Click to select files
        dropZone.addEventListener('click', () => {
            console.log('Drop zone clicked, opening file input');
            fileInput.click();
        });

        // File input change event
        fileInput.addEventListener('change', (e) => {
            console.log('File input changed, files selected:', e.target.files.length);
            if (e.target.files.length > 0) {
                this.handleFileSelection(e.target.files);
            }
        });

        // Drag and drop functionality
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            console.log('Drag over detected');
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            console.log('Drag leave detected');
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            console.log('Files dropped:', e.dataTransfer.files.length);
            dropZone.classList.remove('drag-over');
            this.handleFileSelection(e.dataTransfer.files);
        });
    }

    handleFileSelection(files) {
        if (files.length === 0) return;
        
        console.log('Handling file selection:', files.length, 'files');
        
        try {
            this.selectedFiles = Array.from(files);
            console.log('Files processed:', this.selectedFiles.map(f => f.name));
            
            // Show selected files directly under the drop zone within the upload area
            this.showSelectedFilesInDropZone();
            
            // Update the button text to "Upload Files"
            const uploadBtn = document.getElementById('generate-code-btn');
            if (uploadBtn) {
                uploadBtn.textContent = 'Upload Files';
                uploadBtn.classList.add('bounce-in');
                setTimeout(() => uploadBtn.classList.remove('bounce-in'), 500);
            }
            
            // Make sure verification section stays hidden until upload
            const selectedFilesSection = document.getElementById('selected-files-section');
            if (selectedFilesSection) {
                selectedFilesSection.classList.add('hidden');
            }
            
            // Show visual confirmation
            this.showToast(`${files.length} file(s) selected successfully`, 'success');
        } catch (error) {
            console.error('Error in file selection:', error);
            this.showToast('Error processing files: ' + error.message, 'error');
        }
    }

    showSelectedFilesInDropZone() {
        const uploadArea = document.getElementById('upload-area');
        if (!uploadArea) return;

        // Check if file list already exists, if not create it
        let fileListContainer = document.getElementById('selected-files-in-dropzone');
        if (!fileListContainer) {
            fileListContainer = document.createElement('div');
            fileListContainer.id = 'selected-files-in-dropzone';
            fileListContainer.className = 'selected-files-in-dropzone';
            
            // Insert after the file drop zone
            const dropZone = document.getElementById('file-drop-zone');
            if (dropZone && dropZone.parentNode) {
                dropZone.parentNode.insertBefore(fileListContainer, dropZone.nextSibling);
            }
        }

        // Clear existing content
        fileListContainer.innerHTML = '';

        // Add header
        const header = document.createElement('div');
        header.className = 'files-header';
        header.innerHTML = `<h4>Selected Files (${this.selectedFiles.length}):</h4>`;
        fileListContainer.appendChild(header);

        // Add file items
        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item-inline';
            fileItem.innerHTML = `
                <div class="file-info-inline">
                    <i class="fas fa-file-alt"></i>
                    <span class="file-name-inline">${file.name}</span>
                    <span class="file-size-inline">${this.formatFileSize(file.size)}</span>
                </div>
                <button class="remove-file-inline" onclick="app.removeFile(${index})" title="Remove file">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileListContainer.appendChild(fileItem);
        });
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        
        if (this.selectedFiles.length === 0) {
            // No files left, remove the file list and reset button text
            const fileListContainer = document.getElementById('selected-files-in-dropzone');
            if (fileListContainer) {
                fileListContainer.remove();
            }
            
            const uploadBtn = document.getElementById('generate-code-btn');
            if (uploadBtn) {
                uploadBtn.textContent = 'Upload Files';
            }
        } else {
            // Still have files, refresh the file display
            this.showSelectedFilesInDropZone();
        }
    }

    generateCode() {
        if (this.selectedFiles.length === 0) {
            this.showToast('Please select files first', 'warning');
            return;
        }

        this.socket.emit('generate-code');
        const generateButton = document.getElementById('generate-code-btn');
        if (generateButton) {
            generateButton.disabled = true;
            generateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        }
    }

    handleCodeGenerated(data) {
        this.currentCode = data.code;
        
        // Hide the file list section and upload area
        const uploadArea = document.getElementById('upload-area');
        const selectedFiles = document.getElementById('selected-files');
        const selectedFilesSection = document.getElementById('selected-files-section');
        
        if (uploadArea) {
            uploadArea.classList.add('hidden');
            uploadArea.style.display = 'none';
        }
        
        if (selectedFiles) {
            selectedFiles.classList.add('hidden');
        }
        
        if (selectedFilesSection) {
            selectedFilesSection.classList.remove('hidden');
            selectedFilesSection.style.display = 'block';
            // Add a fade-in effect
            selectedFilesSection.style.animation = 'fadeIn 0.3s ease-in-out forwards';
        }
        
        // Update status message
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = 'Waiting for receiver...';
            statusMessage.className = 'status-waiting';
        }
        
        // Update the modern verification display with individual digits
        this.displayVerificationCode(data.code);
        
        // Show the selected files details
        this.showSelectedFileDetails();
        
        // Reset button
        const generateButton = document.getElementById('generate-code-btn');
        if (generateButton) {
            generateButton.disabled = false;
            generateButton.innerHTML = 'Upload Files';
        }
        
        this.showToast('Code generated successfully!', 'success');
    }

    displayVerificationCode(code) {
        // Show the modern selected files section with the verification code
        const selectedFilesSection = document.getElementById('selected-files-section');
        if (selectedFilesSection) {
            selectedFilesSection.classList.remove('hidden');
        }
        
        // Get the verification code display element
        const codeDigitsContainer = document.getElementById('code-digits');
        
        if (codeDigitsContainer) {
            // Clear any existing digits
            codeDigitsContainer.innerHTML = '';
            
            // Create individual digit elements
            for (let i = 0; i < code.length; i++) {
                const digitElement = document.createElement('div');
                digitElement.className = 'code-digit';
                digitElement.textContent = code[i];
                codeDigitsContainer.appendChild(digitElement);
                
                // Add subtle animation
                digitElement.style.animation = `fadeIn 0.3s ease-in-out ${i * 0.1}s both`;
            }
        }
    }

    showSelectedFileDetails() {
        console.log('Showing selected file details for', this.selectedFiles.length, 'files');
        
        // Show the selected files section
        const selectedFilesSection = document.getElementById('selected-files-section');
        if (!selectedFilesSection) {
            console.error('Selected files section element not found');
            return;
        }
        
        selectedFilesSection.classList.remove('hidden');
        console.log('Selected files section is now visible');
        
        // Initialize preview system
        this.currentFileIndex = 0;
        this.updateFilePreview();
        this.updateFileNavigation();
        this.addNavigationTooltips();
        
        // Update file details based on selection
        if (this.selectedFiles.length > 0) {
            // Primary file (first selected)
            const primaryFile = this.selectedFiles[0];
            console.log('Primary file:', primaryFile.name);
            
            let fileNameDisplay = primaryFile.name;
            let fileSizeTotal = primaryFile.size;
            
            // If multiple files, show count and calculate total size
            if (this.selectedFiles.length > 1) {
                fileNameDisplay = `${primaryFile.name} and ${this.selectedFiles.length - 1} more`;
                fileSizeTotal = this.selectedFiles.reduce((total, file) => total + file.size, 0);
            }
            
            // Determine primary file type or "Multiple" for mixed files
            let fileTypeDisplay = primaryFile.type || 'Unknown';
            if (this.selectedFiles.length > 1) {
                const uniqueTypes = new Set(this.selectedFiles.map(file => file.type || 'Unknown'));
                fileTypeDisplay = uniqueTypes.size > 1 ? 'Multiple formats' : fileTypeDisplay;
            }
            
            console.log('File details:', { fileNameDisplay, fileSizeTotal, fileTypeDisplay });
            
            // Update the file details
            const fileDetailName = document.getElementById('file-detail-name');
            const fileDetailSize = document.getElementById('file-detail-size');
            const fileDetailType = document.getElementById('file-detail-type');
            
            console.log('File detail elements:', { fileDetailName, fileDetailSize, fileDetailType });
            
            if (fileDetailName) {
                fileDetailName.textContent = fileNameDisplay;
                console.log('Updated file name:', fileNameDisplay);
            } else {
                console.error('File detail name element not found');
            }
            
            if (fileDetailSize) {
                fileDetailSize.textContent = this.formatFileSize(fileSizeTotal);
                console.log('Updated file size:', this.formatFileSize(fileSizeTotal));
            } else {
                console.error('File detail size element not found');
            }
            
            if (fileDetailType) {
                fileDetailType.textContent = fileTypeDisplay;
                console.log('Updated file type:', fileTypeDisplay);
            } else {
                console.error('File detail type element not found');
            }
        } else {
            console.warn('No selected files to display');
        }
    }

    // PDF Preview and Navigation Methods
    updateFilePreview() {
        console.log('Updating file preview for file index:', this.currentFileIndex);
        console.log('Selected files count:', this.selectedFiles.length);
        
        if (!this.selectedFiles || this.selectedFiles.length === 0) {
            console.warn('No files to preview');
            return;
        }
        
        if (this.currentFileIndex < 0 || this.currentFileIndex >= this.selectedFiles.length) {
            console.warn('Invalid file index:', this.currentFileIndex);
            return;
        }
        
        const currentFile = this.selectedFiles[this.currentFileIndex];
        if (!currentFile) return;
        
        console.log('Previewing file:', currentFile.name, 'Type:', currentFile.type);
        
        // Update preview type info
        const previewTypeInfo = document.getElementById('preview-type-info');
        if (previewTypeInfo) {
            previewTypeInfo.textContent = `${this.currentFileIndex + 1} of ${this.selectedFiles.length}`;
        }
          // Determine file type and show appropriate preview
        const mimeType = currentFile.type?.toLowerCase();
        const fileName = currentFile.name.toLowerCase();
        
        if (mimeType?.includes('image/')) {
            this.showImagePreview(currentFile);
        } else if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
            this.showPDFPreview(currentFile);
        } else {
            this.showGenericFilePreview(currentFile);
        }
        
        // Update navigation after preview loads
        this.updateFileNavigation();
    }

    showImagePreview(file) {
        const container = document.getElementById('preview-content');
        if (!container) return;
        
        const url = URL.createObjectURL(file);
        container.innerHTML = `<img src="${url}" class="image-preview" alt="${file.name}">`;
        
        // Reset page navigation for single image
        this.totalPages = 1;
        this.currentPageIndex = 0;
        this.updatePageNavigation();
    }

    showPDFPreview(file) {
        const container = document.getElementById('preview-content');
        if (!container) return;
        
        container.innerHTML = `
            <div id="pdf-preview-container">
                <canvas id="pdf-canvas"></canvas>
                <div class="pdf-loading">Loading PDF...</div>
            </div>
        `;
        
        // Check if PDF.js is available
        console.log('PDF.js available:', typeof pdfjsLib !== 'undefined');
        if (typeof pdfjsLib === 'undefined') {
            container.innerHTML = '<div class="preview-error">PDF.js library not loaded. Cannot preview PDF files.</div>';
            return;
        }
        
        const url = URL.createObjectURL(file);
        
        // Load PDF
        pdfjsLib.getDocument(url).promise.then((pdf) => {
            this.previewData = pdf;
            this.totalPages = pdf.numPages;
            this.currentPageIndex = 0;
            console.log('PDF loaded with', this.totalPages, 'pages');
            
            this.updatePagePreview();
            this.updatePageNavigation();
        }).catch((error) => {
            console.error('Error loading PDF:', error);
            container.innerHTML = '<div class="preview-error">Error loading PDF file.</div>';
        });
    }

    async updatePagePreview() {
        if (!this.previewData) {
            console.error('No PDF data available for rendering');
            return;
        }

        const canvas = document.getElementById('pdf-canvas');
        const previewContent = document.getElementById('preview-content');
        
        if (!previewContent || !this.previewData) return;
        
        try {
            const page = await this.previewData.getPage(this.currentPageIndex + 1);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const context = canvas.getContext('2d');
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            // Hide loading message
            const loadingDiv = document.querySelector('.pdf-loading');
            if (loadingDiv) loadingDiv.style.display = 'none';
            
            await page.render(renderContext).promise;
            console.log('PDF page rendered:', this.currentPageIndex + 1);
            
        } catch (error) {
            console.error('Error rendering PDF page:', error);
        }
    }

    showGenericFilePreview(file) {
        const container = document.getElementById('preview-content');
        if (!container) return;
        
        // For text files, try to show content
        if (file.type.includes('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                container.innerHTML = `<pre class="text-preview">${e.target.result}</pre>`;
            };
            reader.readAsText(file);
        } else {
            // Show file icon and info
            let documentType, iconClass, documentInfo;
            
            if (file.type.includes('application/msword') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
                documentType = 'Word Document';
                iconClass = 'fa-file-word';
            } else if (file.type.includes('application/vnd.ms-excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
                documentType = 'Excel Spreadsheet';
                iconClass = 'fa-file-excel';
            } else if (file.type.includes('application/vnd.ms-powerpoint') || file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) {
                documentType = 'PowerPoint Presentation';
                iconClass = 'fa-file-powerpoint';
            } else {
                documentType = 'File';
                let iconClass = 'fa-file';
                
                if (file.type.includes('video/')) iconClass = 'fa-file-video';
                else if (file.type.includes('audio/')) iconClass = 'fa-file-audio';
                else if (file.type.includes('archive') || file.name.match(/\.(zip|rar|7z|tar|gz)$/)) iconClass = 'fa-file-archive';
            }
            
            container.innerHTML = `
                <div class="generic-file-preview">
                    <i class="fas ${iconClass} file-icon"></i>
                    <h3>${file.name}</h3>
                    <p class="file-type">${documentType}</p>
                    <p class="file-size">${this.formatFileSize(file.size)}</p>
                </div>
            `;
        }
        
        // Reset page navigation for non-paginated content
        this.totalPages = 1;
        this.currentPageIndex = 0;
        this.updatePageNavigation();
    }    updateFileNavigation() {
        const prevFileBtn = document.getElementById('prev-file-btn');
        const nextFileBtn = document.getElementById('next-file-btn');
        const fileInfo = document.getElementById('current-file-info');
        
        if (prevFileBtn) {
            prevFileBtn.disabled = this.currentFileIndex <= 0;
        }
        
        if (nextFileBtn) {
            nextFileBtn.disabled = this.currentFileIndex >= this.selectedFiles.length - 1;
        }
        
        if (fileInfo) {
            fileInfo.textContent = `File ${this.currentFileIndex + 1} of ${this.selectedFiles.length}`;
        }
    }

    updatePageNavigation() {
        const previewContainer = document.getElementById('preview-container');
        if (!previewContainer) return;
        
        const prevPageBtn = document.getElementById('prev-page-btn');
        const nextPageBtn = document.getElementById('next-page-btn');
        const pageInfo = document.getElementById('page-info');
        const pageControls = document.querySelector('.page-nav-controls');
        
        // Show/hide page navigation based on number of pages
        if (pageControls) {
            if (this.totalPages > 1) {
                pageControls.style.display = 'flex';
                pageControls.classList.add('nav-pulse'); // Add entrance animation
                setTimeout(() => pageControls.classList.remove('nav-pulse'), 600);
            } else {
                pageControls.style.display = 'none';
            }
        }
        
        // Update page info
        if (pageInfo) {
            pageInfo.textContent = `${this.currentPageIndex + 1} of ${this.totalPages}`;
        }
        
        // Update button states with enhanced feedback
        if (prevPageBtn) {
            const isDisabled = this.currentPageIndex <= 0;
            prevPageBtn.disabled = isDisabled;
            prevPageBtn.classList.toggle('nav-disabled', isDisabled);
        }
        
        if (nextPageBtn) {
            const isDisabled = this.currentPageIndex >= this.totalPages - 1;
            nextPageBtn.disabled = isDisabled;
            nextPageBtn.classList.toggle('nav-disabled', isDisabled);
        }
    }

    navigateToFile(index) {
        if (index < 0 || index >= this.selectedFiles.length) return;
        
        this.currentFileIndex = index;
        this.currentPageIndex = 0; // Reset to first page when switching files
        this.updateFilePreview();
        this.triggerNavigationFeedback('file');
    }

    navigateToPage(index) {
        if (index < 0 || index >= this.totalPages) return;
        
        // Add loading state
        const pageControls = document.querySelector('.page-nav-controls');
        if (pageControls) pageControls.classList.add('nav-loading');
        
        this.currentPageIndex = index;
        
        if (this.previewData) {
            this.updatePagePreview().then(() => {
                // Remove loading state
                if (pageControls) pageControls.classList.remove('nav-loading');
                this.updatePageNavigation();
                this.triggerNavigationFeedback('page');
            });
        } else {
            // Remove loading state immediately for non-PDF files
            if (pageControls) pageControls.classList.remove('nav-loading');
            this.updatePageNavigation();
            this.triggerNavigationFeedback('page');
        }
    }

    addPageNavigationFeedback() {
        // Add haptic feedback for navigation
        const addFeedback = (element, type) => {
            if (!element) return;
            
            element.addEventListener('click', () => {
                // Haptic feedback (if supported)
                if ('vibrate' in navigator) {
                    navigator.vibrate(50);
                }
                
                // Visual feedback
                element.classList.add('nav-click-feedback');
                setTimeout(() => element.classList.remove('nav-click-feedback'), 150);
            });
        };
        
        addFeedback(document.getElementById('prev-page-btn'), 'page');
        addFeedback(document.getElementById('next-page-btn'), 'page');
        addFeedback(document.getElementById('prev-file-btn'), 'file');
        addFeedback(document.getElementById('next-file-btn'), 'file');
    }

    triggerNavigationFeedback(type) {
        // Screen reader announcement
        let announcement = document.getElementById('page-announcement');
        if (!announcement) {
            announcement = document.createElement('div');
            announcement.id = 'page-announcement';
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.style.position = 'absolute';
            announcement.style.left = '-10000px';
            announcement.style.width = '1px';
            announcement.style.height = '1px';
            announcement.style.overflow = 'hidden';
            document.body.appendChild(announcement);
        }
        
        const text = type === 'page' 
            ? `Page ${this.currentPageIndex + 1} of ${this.totalPages}`
            : `File ${this.currentFileIndex + 1} of ${this.selectedFiles.length}`;
        
        announcement.textContent = text;
    }    addNavigationTooltips() {
        // Enhanced tooltips with keyboard shortcuts
        const tooltips = {
            'prev-file-btn': 'Previous file (Shift + ←)',
            'next-file-btn': 'Next file (Shift + →)',
            'prev-page-btn': 'Previous page (←)',
            'next-page-btn': 'Next page (→)'
        };
        
        Object.entries(tooltips).forEach(([id, tooltip]) => {
            const element = document.getElementById(id);
            if (element) {
                element.setAttribute('title', tooltip);
                element.setAttribute('aria-label', tooltip);
            }
        });
    }    showDocumentInfo() {
        const file = this.selectedFiles[this.currentFileIndex];
        if (!file) return;
        
        const createdDate = file.lastModified ? new Date(file.lastModified).toLocaleString() : 'Unknown';
        
        const infoHtml = `
            <div class="document-info-modal">
                <h4>File Properties</h4>
                <div class="info-row"><strong>Name:</strong> ${file.name}</div>
                <div class="info-row"><strong>Size:</strong> ${this.formatFileSize(file.size)}</div>
                <div class="info-row"><strong>Type:</strong> ${file.type || 'Unknown'}</div>
                <div class="info-row"><strong>Last Modified:</strong> ${createdDate}</div>
            </div>
        `;
        
        this.showToast(infoHtml, 'info', 5000);
    }

    // Other existing methods...
    handleReceiverJoined(data) {
        console.log(`Receiver joined: ${data.receiverSocketId}, my socket ID: ${this.socket.id}`);
        // Implementation continues...
    }

    handleJoinedRoom(data) {
        console.log(`Joined room with sender: ${data.senderSocketId}, my socket ID: ${this.socket.id}`);
        // Implementation continues...
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showToast(message, type = 'info', duration = 3000) {
        const toastContainer = document.getElementById('toast-container') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = typeof message === 'string' ? message : message;
        
        toastContainer.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    resetTransfer() {
        // Reset all state
        this.selectedFiles = [];
        this.currentCode = null;
        this.isReceiver = false;
        this.receivedFiles = [];
        this.currentFileIndex = 0;
        this.currentPageIndex = 0;
        this.totalPages = 1;
        this.previewData = null;
        
        // Show upload area, hide other sections
        const uploadArea = document.getElementById('upload-area');
        const selectedFilesSection = document.getElementById('selected-files-section');
        const receiveStatus = document.getElementById('receive-status');
        
        if (uploadArea) {
            uploadArea.classList.remove('hidden');
            uploadArea.style.display = 'block';
        }
        
        if (selectedFilesSection) {
            selectedFilesSection.classList.add('hidden');
        }
        
        if (receiveStatus) {
            receiveStatus.classList.add('hidden');
        }
        
        // Clear file list in drop zone
        const fileListContainer = document.getElementById('selected-files-in-dropzone');
        if (fileListContainer) {
            fileListContainer.remove();
        }
        
        // Reset button text
        const uploadBtn = document.getElementById('generate-code-btn');
        if (uploadBtn) {
            uploadBtn.textContent = 'Upload Files';
            uploadBtn.disabled = false;
        }
        
        // Clear receive input
        const receiveInput = document.getElementById('receive-code-input');
        if (receiveInput) {
            receiveInput.value = '';
        }
        
        // Disconnect peer if exists
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        
        console.log('Transfer reset completed');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SendAnywhereApp();
    
    // Add debug keyboard shortcut (Ctrl+D)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            window.app.debugFileSelection();
        }
    });
});
