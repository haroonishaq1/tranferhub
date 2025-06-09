// SendAnywhere Clone - Frontend JavaScript
class SendAnywhereApp {    constructor() {
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
        
        // Connection monitoring properties
        this.connectionTimeout = null;
        this.heartbeatInterval = null;
        this.heartbeatTimeoutChecker = null;
        this.heartbeatTimestamp = null;
        
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
    }    connectSocket() {
        // Dynamically determine the server URL based on current environment
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        let port = window.location.port;
        
        let serverUrl;
        
        // Production environment (any non-localhost hostname)
        if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '0.0.0.0') {
            // In production, the frontend is served by the same server
            serverUrl = `${protocol}//${hostname}${port ? ':' + port : ''}`;
        } 
        // Local development
        else {
            if (port === '8000') {
                // Frontend dev server on 8000, backend on 4999
                serverUrl = `http://${hostname}:4999`;
            } else if (port === '4999' || !port) {
                // Backend serving frontend on 4999
                serverUrl = `http://${hostname}:4999`;
            } else {
                // Default fallback for local development
                serverUrl = 'http://localhost:4999';
            }
        }
        
        console.log(`Environment: ${hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '0.0.0.0' ? 'Production' : 'Development'}`);
        console.log(`Current hostname: ${hostname}, port: ${port}`);
        console.log(`Connecting to socket server at: ${serverUrl}`);
          this.socket = io(serverUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
            timeout: 30000,
            forceNew: true,
            transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
            upgrade: true,
            rememberUpgrade: true
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
        });        this.socket.on('signal', (data) => {
            this.handleSignal(data);
        });
        
        // Add missing socket event handlers for production
        this.socket.on('peer-disconnected', (data) => {
            this.handlePeerDisconnected(data);
        });
        
        this.socket.on('code-expired', (data) => {
            this.showToast('Transfer code expired', 'warning');
            this.resetTransfer();
        });
        
        this.socket.on('relay-transfer', (data) => {
            this.handleRelayTransfer(data);
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
    }    // Other existing methods...
    handleReceiverJoined(data) {
        console.log(`Receiver joined: ${data.receiverSocketId}, my socket ID: ${this.socket.id}`);
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = 'Receiver connected! Establishing connection...';
            statusMessage.className = 'status-connected';
        }
        
        // Check if this is a self-connection (same socket)
        if (data.receiverSocketId === this.socket.id) {
            console.log('Self-connection detected, simulating local transfer');
            this.simulateLocalTransfer();
        } else {
            console.log(`Initiating P2P connection to receiver: ${data.receiverSocketId}`);
            this.initPeerConnection(true, data.receiverSocketId);
        }
        
        this.showToast('Receiver joined! Starting transfer...', 'success');
    }

    handleJoinedRoom(data) {
        console.log(`Joined room with sender: ${data.senderSocketId}, my socket ID: ${this.socket.id}`);
        const receiveMessage = document.getElementById('receive-message');
        if (receiveMessage) {
            receiveMessage.textContent = 'Connected! Waiting for files...';
            receiveMessage.className = 'status-connected';
        }
        
        // Check if this is a self-connection (same socket)
        if (data.senderSocketId === this.socket.id) {
            console.log('Self-connection detected, simulating local transfer');
            this.simulateLocalTransfer();
        } else {
            console.log(`Initiating P2P connection to sender: ${data.senderSocketId}`);
            this.initPeerConnection(false, data.senderSocketId);
        }
        
        this.showToast('Connected to sender!', 'success');
    }    initPeerConnection(initiator, targetSocketId) {
        console.log(`Initializing peer connection - Initiator: ${initiator}, Target: ${targetSocketId}, My ID: ${this.socket.id}`);
        
        // Enhanced ICE server configuration with multiple reliable TURN servers
        const iceServers = [
            // Google STUN servers (multiple for redundancy)
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            
            // Additional STUN servers for better connectivity
            { urls: 'stun:stun.stunprotocol.org:3478' },
            { urls: 'stun:stun.voiparound.com' },
            { urls: 'stun:stun.voipbuster.com' },
            
            // Multiple TURN servers for NAT traversal (production-ready)
            {
                urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            // Additional TURN servers for better reliability
            {
                urls: ['turn:relay1.expressturn.com:3478'],
                username: 'efJBIBVP6ETOFD3XKX',
                credential: 'WmtzanB3ZnpERzRYVw'
            },
            // Backup TURN servers
            {
                urls: 'turn:numb.viagenie.ca',
                username: 'webrtc@live.com',
                credential: 'muazkh'
            }
        ];

        console.log('Using ICE servers:', iceServers.length, 'servers configured');

        // Check if SimplePeer is available
        if (typeof SimplePeer === 'undefined') {
            console.error('SimplePeer not loaded, falling back to server relay');
            this.handleConnectionFailure('WebRTC not available, using server relay');
            return;
        }

        this.peer = new SimplePeer({
            initiator: initiator,
            trickle: true, // Enable trickle ICE for faster connection
            config: {
                iceServers: iceServers,
                iceCandidatePoolSize: 10, // Increase candidate pool
                iceTransportPolicy: 'all', // Use all transport types
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            },
            objectMode: true,
            allowHalfTrickle: false, // Wait for all candidates for better reliability
            iceCompleteTimeout: 15000, // Shorter timeout to fail faster
            offerOptions: {
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            }
        });
        
        // Shorter connection timeout - fail fast and fallback
        this.connectionTimeout = setTimeout(() => {
            if (this.peer && !this.peer.connected) {
                console.error('Connection timeout after 15 seconds - initiating fallback');
                console.log('Peer state:', {
                    connected: this.peer.connected,
                    connecting: this.peer.connecting,
                    destroyed: this.peer.destroyed
                });
                
                // Try to get more detailed connection info
                if (this.peer._pc) {
                    console.log('WebRTC states:', {
                        connectionState: this.peer._pc.connectionState,
                        iceConnectionState: this.peer._pc.iceConnectionState,
                        iceGatheringState: this.peer._pc.iceGatheringState
                    });
                }
                
                this.handleConnectionFailure('Connection timeout - peer connection could not be established');
            }
        }, 15000); // Reduced from 30 seconds to 15 seconds

        this.peer.on('signal', (signal) => {
            console.log(`Sending signal to ${targetSocketId}:`, signal.type);
            
            // Log ICE candidates for debugging
            if (signal.type === 'candidate' && signal.candidate) {
                console.log('Sending ICE candidate:', {
                    type: signal.candidate.type,
                    protocol: signal.candidate.protocol,
                    address: signal.candidate.address
                });
            }
            
            this.socket.emit('signal', {
                to: targetSocketId,
                signal: signal
            });
        });

        this.peer.on('connect', () => {
            console.log('🎉 P2P connection established successfully with', targetSocketId);
            
            // Clear connection timeout
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }
            
            this.showToast('Connected! Starting transfer...', 'success');
            
            // Start connection heartbeat to monitor connection health
            this.startConnectionHeartbeat();
            
            if (initiator) {
                // Sender: start sending files
                console.log('Starting file transfer as sender');
                setTimeout(() => this.sendFiles(), 500); // Small delay to ensure connection is stable
            } else {
                console.log('Ready to receive files');
                this.showToast('Ready to receive files...', 'info');
            }
        });

        this.peer.on('data', (data) => {
            this.handleIncomingData(data);
        });

        this.peer.on('error', (err) => {
            console.error('❌ Peer connection error:', err);
            this.handleConnectionFailure(err.message || 'Connection error');
        });

        this.peer.on('close', () => {
            console.log('Peer connection closed');
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }
            
            // Stop heartbeat
            this.stopConnectionHeartbeat();
            
            this.peer = null;
        });
        
        // Enhanced ICE connection monitoring
        if (this.peer._pc) {
            this.peer._pc.oniceconnectionstatechange = () => {
                const state = this.peer._pc.iceConnectionState;
                console.log('🔄 ICE connection state changed to:', state);
                
                if (state === 'failed') {
                    console.error('❌ ICE connection failed - NAT/firewall issues detected');
                    this.handleConnectionFailure('Network connection failed - NAT/firewall may be blocking connection');
                } else if (state === 'disconnected') {
                    console.warn('⚠️ ICE connection disconnected - connection may be unstable');
                    // Give it time to reconnect before failing
                    setTimeout(() => {
                        if (this.peer && this.peer._pc && this.peer._pc.iceConnectionState === 'disconnected') {
                            this.handleConnectionFailure('Network connection lost');
                        }
                    }, 5000);
                } else if (state === 'connected' || state === 'completed') {
                    console.log('✅ ICE connection established successfully');
                } else if (state === 'checking') {
                    console.log('🔍 ICE connection checking...');
                }
            };
            
            this.peer._pc.onconnectionstatechange = () => {
                const state = this.peer._pc.connectionState;
                console.log('🔄 Peer connection state changed to:', state);
                
                if (state === 'failed') {
                    console.error('❌ Peer connection failed');
                    this.handleConnectionFailure('Peer connection failed');
                } else if (state === 'connected') {
                    console.log('✅ Peer connection fully established');
                }
            };
            
            // Enhanced ICE candidate logging
            this.peer._pc.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('📤 Generated ICE candidate:', {
                        type: event.candidate.type,
                        protocol: event.candidate.protocol,
                        address: event.candidate.address || 'hidden'
                    });
                } else {
                    console.log('✅ ICE candidate gathering complete');
                }
            };
            
            // Monitor ICE gathering state
            this.peer._pc.onicegatheringstatechange = () => {
                console.log('🔄 ICE gathering state:', this.peer._pc.iceGatheringState);
            };
        }
    }

    handleSignal(data) {
        console.log(`Received signal from ${data.from}:`, data.signal.type);
        if (this.peer) {
            try {
                this.peer.signal(data.signal);
                console.log('Signal processed successfully');
            } catch (error) {
                console.error('Error processing signal:', error);
                this.handleConnectionFailure('Signal processing failed');
            }
        } else {
            console.warn('Received signal but no peer connection exists');
            this.showToast('Connection lost. Please try again.', 'warning');
        }
    }    handleConnectionFailure(message) {
        console.error('🚨 Connection failure:', message);
        
        // Clear timeout
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        
        // Stop heartbeat
        this.stopConnectionHeartbeat();
        
        // Clean up peer
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        
        // Always try server relay as fallback for cross-device transfers
        console.log('🔄 Attempting server-relayed transfer as fallback');
        this.showToast('WebRTC failed, using server relay...', 'info', 3000);
        
        // Update UI to show fallback mode
        const statusMessage = document.getElementById('status-message');
        const receiveMessage = document.getElementById('receive-message');
        
        if (statusMessage) {
            statusMessage.textContent = 'Using fallback transfer method...';
            statusMessage.className = 'status-transferring';
        }
        
        if (receiveMessage) {
            receiveMessage.textContent = 'Waiting for files via server...';
            receiveMessage.className = 'status-waiting';
        }
        
        // Immediate fallback - don't wait
        setTimeout(() => {
            this.initiateServerRelayedTransfer();
        }, 1000);
    }
    
    startConnectionHeartbeat() {
        // Send periodic heartbeat messages to check connection health
        this.heartbeatInterval = setInterval(() => {
            if (this.peer && this.peer.connected) {
                try {
                    this.heartbeatTimestamp = Date.now();
                    this.peer.send(JSON.stringify({ type: 'heartbeat', timestamp: this.heartbeatTimestamp }));
                } catch (error) {
                    console.warn('Heartbeat failed:', error);
                    this.handleConnectionFailure('Connection lost during heartbeat');
                }
            } else {
                this.stopConnectionHeartbeat();
            }
        }, 10000); // Send heartbeat every 10 seconds
        
        // Set up heartbeat timeout checker
        this.heartbeatTimeoutChecker = setInterval(() => {
            if (this.heartbeatTimestamp && (Date.now() - this.heartbeatTimestamp) > 30000) {
                console.warn('Heartbeat timeout - no response received');
                this.handleConnectionFailure('Connection timeout - no heartbeat response');
            }
        }, 15000); // Check every 15 seconds
    }
    
    stopConnectionHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        if (this.heartbeatTimeoutChecker) {
            clearInterval(this.heartbeatTimeoutChecker);
            this.heartbeatTimeoutChecker = null;
        }
        
        this.heartbeatTimestamp = null;
    }

    initiateServerRelayedTransfer() {
        console.log('Starting server-relayed transfer');
        
        if (this.selectedFiles && this.selectedFiles.length > 0) {
            this.showToast('Using server relay for transfer...', 'info');
            this.sendFilesViaServer();
        } else {
            this.showToast('Waiting for files via server...', 'info');
        }
    }    async sendFilesViaServer() {
        if (!this.selectedFiles.length || !this.currentCode) {
            console.error('Cannot send files via server: no files or no code');
            return;
        }
        
        console.log('Sending files via server relay');
        
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = 'Using fallback transfer method...';
            statusMessage.className = 'status-transferring';
        }
        
        try {
            // Convert files to base64 and send via socket
            const fileData = [];
            
            for (const file of this.selectedFiles) {
                const arrayBuffer = await this.readFileAsArrayBuffer(file);
                const base64 = this.arrayBufferToBase64(arrayBuffer);
                
                fileData.push({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    data: base64
                });
            }
            
            // Send files via socket
            this.socket.emit('relay-transfer', {
                code: this.currentCode,
                files: fileData
            });
            
            this.showToast('Files sent via server relay!', 'success');
            
            // Update status
            if (statusMessage) {
                statusMessage.textContent = 'Files sent successfully!';
                statusMessage.className = 'status-completed';
            }
            
        } catch (error) {
            console.error('Error sending files via server:', error);
            this.showToast('Failed to send files via server relay', 'error');
            
            if (statusMessage) {
                statusMessage.textContent = 'Transfer failed. Please try again.';
                statusMessage.className = 'status-error';
            }
        }
    }
    
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
    
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return 'data:application/octet-stream;base64,' + btoa(binary);
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    data: reader.result
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    simulateLocalTransfer() {
        console.log('Simulating local transfer for self-connection');
        this.showToast('Local transfer mode activated', 'info');
        
        setTimeout(() => {
            if (this.selectedFiles.length > 0) {
                this.receivedFiles = [...this.selectedFiles];
                this.showReceivedFiles();
                this.showToast('Local transfer completed!', 'success');
            }
        }, 1000);
    }

    sendFiles() {
        if (!this.peer || !this.selectedFiles.length) {
            console.error('Cannot send files: no peer connection or no files selected');
            return;
        }

        console.log('Starting file transfer via P2P');
        
        const fileMetadata = this.selectedFiles.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type
        }));

        this.peer.send(JSON.stringify({
            type: 'metadata',
            files: fileMetadata,
            totalFiles: this.selectedFiles.length
        }));

        this.sendFileAtIndex(0);
    }

    sendFileAtIndex(index) {
        if (index >= this.selectedFiles.length) {
            console.log('All files sent successfully');
            this.peer.send(JSON.stringify({ type: 'complete' }));
            this.showToast('All files sent successfully!', 'success');
            return;
        }

        const file = this.selectedFiles[index];
        console.log(`Sending file ${index + 1}/${this.selectedFiles.length}: ${file.name}`);

        const reader = new FileReader();
        reader.onload = () => {
            const fileData = {
                type: 'file',
                index: index,
                name: file.name,
                size: file.size,
                data: reader.result
            };

            this.peer.send(JSON.stringify(fileData));
            
            setTimeout(() => {
                this.sendFileAtIndex(index + 1);
            }, 100);
        };

        reader.readAsDataURL(file);
    }    handleIncomingData(data) {
        try {
            // Try to parse as JSON (metadata)
            const message = JSON.parse(data);
            
            const receiveMessage = document.getElementById('receive-message');
            const receiveProgressBar = document.getElementById('receive-progress-bar');
            
            switch (message.type) {
                case 'heartbeat':
                    // Respond to heartbeat to confirm connection is alive
                    if (this.peer && this.peer.connected) {
                        try {
                            this.peer.send(JSON.stringify({ type: 'heartbeat-response', timestamp: Date.now() }));
                        } catch (error) {
                            console.warn('Failed to respond to heartbeat:', error);
                        }
                    }
                    break;
                    
                case 'heartbeat-response':
                    // Connection is alive, reset heartbeat timestamp
                    console.log('Heartbeat response received, connection is healthy');
                    this.heartbeatTimestamp = null; // Reset timeout tracker
                    break;
                    
                case 'metadata':
                    console.log('Received file metadata:', message.files);
                    this.receivedFiles = [];
                    this.expectedFiles = message.files;
                    this.showToast(`Receiving ${message.totalFiles} file(s)...`, 'info');
                    break;
                    
                case 'file':
                    console.log(`Received file: ${message.name}`);
                    this.receivedFiles.push({
                        name: message.name,
                        size: message.size,
                        data: message.data
                    });
                    
                    this.showToast(`Received: ${message.name}`, 'success');
                    break;
                    
                case 'complete':
                    console.log('Transfer completed');
                    this.showReceivedFiles();
                    this.showToast('All files received!', 'success');
                    break;
                    
                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error processing incoming data:', error);
        }
    }

    showReceivedFiles() {
        console.log('Showing received files:', this.receivedFiles.length);
        
        const receiveStatus = document.getElementById('receive-status');
        const selectedFilesSection = document.getElementById('selected-files-section');
        
        if (receiveStatus) receiveStatus.classList.add('hidden');
        if (selectedFilesSection) selectedFilesSection.classList.remove('hidden');
        
        this.selectedFiles = this.receivedFiles.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream'
        }));
        
        this.showSelectedFileDetails();
        
        const downloadBtn = document.getElementById('download-all-btn');
        if (downloadBtn) {
            downloadBtn.classList.remove('hidden');
            downloadBtn.style.display = 'block';
        }
    }

    downloadAllFiles() {
        console.log('Downloading all received files');
        
        this.receivedFiles.forEach(file => {
            const link = document.createElement('a');
            link.href = file.data;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
        
        this.showToast('Files downloaded!', 'success');
    }

    joinTransfer() {
        const codeInput = document.getElementById('receive-code-input');
        if (!codeInput) return;
        
        const code = codeInput.value.trim();
        
        if (code.length !== 6) {
            this.showToast('Please enter a 6-digit code', 'warning');
            return;
        }

        this.isReceiver = true;
        this.socket.emit('join-room', { code });
        
        const receiveStatus = document.getElementById('receive-status');
        const receiveMessage = document.getElementById('receive-message');
        
        if (receiveStatus) receiveStatus.classList.remove('hidden');
        if (receiveMessage) {
            receiveMessage.textContent = 'Connecting...';
            receiveMessage.className = 'status-waiting';
        }
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
    
    // Additional production-specific methods
    handlePeerDisconnected(data) {
        console.warn('Peer disconnected:', data.socketId);
        
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        
        this.showToast('The other user disconnected. Please try again.', 'warning', 5000);
        
        const statusMessage = document.getElementById('status-message');
        const receiveMessage = document.getElementById('receive-message');
        
        if (statusMessage) {
            statusMessage.textContent = 'Connection lost. Please try again.';
            statusMessage.className = 'status-error';
        }
        
        if (receiveMessage) {
            receiveMessage.textContent = 'Connection lost. Please try again.';
            receiveMessage.className = 'status-error';
        }
    }
      handleRelayTransfer(data) {
        console.log('Received relay transfer:', data);
        
        if (data.files && data.files.length > 0) {
            // Convert the received files to the proper format
            this.receivedFiles = data.files.map(file => ({
                name: file.name,
                size: file.size,
                type: file.type || 'application/octet-stream',
                data: file.data
            }));
            
            // Update UI to show received files
            this.showReceivedFiles();
            this.showToast('Files received via server relay!', 'success');
            
            // Update receiver status
            const receiveMessage = document.getElementById('receive-message');
            if (receiveMessage) {
                receiveMessage.textContent = 'Files received successfully!';
                receiveMessage.className = 'status-completed';
            }
        } else {
            console.warn('No files in relay transfer data');
            this.showToast('No files received in server relay', 'warning');
        }
    }
    
    // Add debug method for testing
    debugFileSelection() {
        console.log('=== DEBUG FILE SELECTION ===');
        console.log('Selected Files:', this.selectedFiles);
        console.log('Current Code:', this.currentCode);
        console.log('Is Receiver:', this.isReceiver);
        console.log('Socket Connected:', this.socket?.connected);
        console.log('Peer Connected:', this.peer?.connected);
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
