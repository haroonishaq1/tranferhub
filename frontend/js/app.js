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
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            if (reason !== 'io client disconnect') {
                this.showToast('Connection lost. Attempting to reconnect...', 'warning');
            }
        });        this.socket.on('reconnect', () => {
            console.log('Reconnected to server');
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
    }    setupEventListeners() {
        // File selection
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });

        // Generate code button
        document.getElementById('generate-code-btn').addEventListener('click', () => {
            this.generateCode();
        });

        // Copy code button
        document.getElementById('copy-code-btn').addEventListener('click', () => {
            this.copyCode();
        });

        // Receive button
        document.getElementById('receive-btn').addEventListener('click', () => {
            this.joinTransfer();
        });

        // Receive code input
        const codeInput = document.getElementById('receive-code-input');
        codeInput.addEventListener('input', (e) => {
            // Filter to digits only and limit length
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
            
            // Visual cue when 6 digits are entered
            if (e.target.value.length === 6) {
                e.target.style.borderColor = '#4CAF50';
                document.getElementById('receive-btn').classList.add('bounce-in');
            } else {
                e.target.style.borderColor = '';
                document.getElementById('receive-btn').classList.remove('bounce-in');
            }
        });
        
        // Input focus effects
        codeInput.addEventListener('focus', () => {
            codeInput.parentElement.classList.add('focused');
        });
        
        codeInput.addEventListener('blur', () => {
            codeInput.parentElement.classList.remove('focused');
        });

        // QR Scanner in Receive Section
        document.getElementById('scan-qr-btn').addEventListener('click', () => {
            this.startQRScanner();
        });

        document.getElementById('stop-camera-btn').addEventListener('click', () => {
            this.stopQRScanner();
        });

        // Cancel/Reset buttons
        document.getElementById('cancel-transfer-btn').addEventListener('click', () => {
            this.cancelTransfer();
        });

        document.getElementById('reset-transfer-btn').addEventListener('click', () => {
            this.resetTransfer();
        });

        document.getElementById('cancel-receive-btn').addEventListener('click', () => {
            this.cancelReceive();
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
                console.log('Next page button clicked');
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
        }          // Determine file type and show appropriate preview
        const mimeType = currentFile.type?.toLowerCase();
        const fileName = currentFile.name.toLowerCase();
          if (mimeType?.includes('image/')) {
            this.showImagePreview(currentFile);
        } else if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
            this.showPDFPreview(currentFile);
        } else if (mimeType?.includes('video/')) {
            this.showVideoPreview(currentFile);
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
    }    showPDFPreview(file) {
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

    showVideoPreview(file) {
        const container = document.getElementById('preview-content');
        if (!container) return;
        
        const url = URL.createObjectURL(file);
        container.innerHTML = `
            <video class="video-preview" controls preload="metadata">
                <source src="${url}" type="${file.type}">
                Your browser does not support the video tag.
            </video>
        `;
        
        // Reset page navigation for video
        this.totalPages = 1;
        this.currentPageIndex = 0;
        this.updatePageNavigation();
        
        // Show fullscreen button
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) fullscreenBtn.classList.remove('hidden');
    }    async updatePagePreview() {
        if (!this.previewData) {
            console.error('No PDF data available for rendering');
            return;
        }

        const canvas = document.getElementById('pdf-canvas');
        const previewContent = document.getElementById('preview-content');
        
        if (!canvas || !previewContent || !this.previewData) {
            console.error('Canvas or preview content not found');
            return;
        }
        
        try {
            console.log('Rendering PDF page', this.currentPageIndex + 1, 'of', this.totalPages);
            const page = await this.previewData.getPage(this.currentPageIndex + 1);
              // Calculate scale to fit container width while maintaining aspect ratio
            const containerWidth = previewContent.clientWidth || 600;
            const viewport = page.getViewport({ scale: 1 });
            const scale = Math.min(containerWidth / viewport.width, 0.8); // Reduced max scale to 0.8 for smaller PDF
            const scaledViewport = page.getViewport({ scale });
            
            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;
            canvas.style.maxWidth = '100%';
            canvas.style.height = 'auto';
            
            const context = canvas.getContext('2d');
            const renderContext = {
                canvasContext: context,
                viewport: scaledViewport
            };
            
            // Hide loading message
            const loadingDiv = document.querySelector('.pdf-loading');
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
            
            // Show canvas
            canvas.style.display = 'block';
            
            await page.render(renderContext).promise;
            console.log('PDF page rendered successfully:', this.currentPageIndex + 1);
            
        } catch (error) {
            console.error('Error rendering PDF page:', error);
            const container = document.getElementById('preview-content');
            if (container) {
                container.innerHTML = '<div class="preview-error">Error rendering PDF page.</div>';
            }
        }
    }

    showGenericFilePreview(file) {
        const container = document.getElementById('preview-content');
        if (!container) return;
        
        // For text files, try to show content
        if (file.type.includes('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const truncatedContent = content.length > 1000 ? content.substring(0, 1000) + '...' : content;
                
                container.innerHTML = `
                    <div class="text-preview">
                        <div class="text-content">
                            <pre>${truncatedContent}</pre>
                        </div>
                        ${content.length > 1000 ? '<div class="text-info">Content truncated for preview</div>' : ''}
                    </div>
                `;
            };
            reader.readAsText(file);
        } else {
            // Show file icon and info
            let documentType, iconClass, documentInfo;
            
            if (file.type.includes('application/msword') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
                documentType = 'Word Document';
                iconClass = 'fa-file-word';
                documentInfo = 'Word processing document';
            } else if (file.type.includes('application/vnd.ms-excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
                documentType = 'Excel Spreadsheet';
                iconClass = 'fa-file-excel';
                documentInfo = 'Spreadsheet with data and formulas';
            } else if (file.type.includes('application/vnd.ms-powerpoint') || file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) {
                documentType = 'PowerPoint Presentation';
                iconClass = 'fa-file-powerpoint';
                documentInfo = 'Presentation slides';
            } else {
                documentType = 'File';
                iconClass = 'fa-file';
                
                if (file.type.includes('audio/')) {
                    iconClass = 'fa-file-audio';
                    documentType = 'Audio File';
                }
                else if (file.type.includes('archive') || file.name.match(/\.(zip|rar|7z|tar|gz)$/)) {
                    iconClass = 'fa-file-archive';
                    documentType = 'Archive';
                }
            }
            
            container.innerHTML = `
                <div class="generic-file-preview">
                    <i class="fas ${iconClass} file-icon"></i>
                    <h3>${file.name}</h3>
                    <p class="file-type">${documentType}</p>
                    <p class="file-size">${this.formatFileSize(file.size)}</p>
                    ${documentInfo ? `<p class="file-info">${documentInfo}</p>` : ''}
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
        const pageControls = document.getElementById('page-nav-controls');
        
        // Show/hide page navigation based on number of pages
        if (pageControls) {
            if (this.totalPages > 1) {
                pageControls.classList.remove('hidden'); // Remove hidden class
                pageControls.style.display = 'flex';
                pageControls.classList.add('nav-pulse'); // Add entrance animation
                setTimeout(() => pageControls.classList.remove('nav-pulse'), 600);
            } else {
                pageControls.classList.add('hidden'); // Add hidden class
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
    }    navigateToPage(index) {
        if (index < 0 || index >= this.totalPages) return;
        
        // Add loading state
        const pageControls = document.getElementById('page-nav-controls');
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
        
        console.log('Transfer reset completed');    }

    // ====== MISSING CORE FILE TRANSFER METHODS ======
    
    async createZipFile() {
        // Only create ZIP if there are multiple files or if specifically requested
        if (this.selectedFiles.length <= 1) {
            return null;
        }

        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
            console.warn('JSZip not available, sending files individually');
            return null;
        }

        try {
            const zip = new JSZip();
            
            // Add each file to the ZIP
            for (let i = 0; i < this.selectedFiles.length; i++) {
                const file = this.selectedFiles[i];
                console.log(`Adding file to ZIP: ${file.name}`);
                
                // Read file as array buffer
                const arrayBuffer = await this.readFileAsArrayBuffer(file);
                zip.file(file.name, arrayBuffer);
            }

            // Generate the ZIP file
            console.log('Generating ZIP file...');
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 6
                }
            });

            // Create a new File object from the blob
            const zipFile = new File([zipBlob], `files_${Date.now()}.zip`, {
                type: 'application/zip'
            });

            console.log(`ZIP file created: ${zipFile.name}, size: ${this.formatFileSize(zipFile.size)}`);
            return zipFile;

        } catch (error) {
            console.error('Error creating ZIP file:', error);
            this.showToast('Failed to create ZIP file, sending files individually', 'warning');
            return null;
        }
    }

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    }

    copyCode() {
        if (this.currentCode) {
            navigator.clipboard.writeText(this.currentCode)
                .then(() => {
                    // Visual feedback
                    const btn = document.getElementById('copy-code-btn');
                    if (!btn) return;
                    
                    const originalText = btn.innerHTML;
                    
                    // Change button appearance
                    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    btn.style.background = '#4CAF50';
                    btn.style.color = 'white';
                      // Show toast
                    
                    // Reset the button after a delay
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.style.background = '';
                        btn.style.color = '';
                    }, 2000);
                })
                .catch(err => {
                    console.error('Could not copy text: ', err);
                    this.showToast('Failed to copy code', 'error');
                });
        }
    }

    joinTransfer() {
        const codeInput = document.getElementById('receive-code-input');
        if (!codeInput) return;
        
        const code = codeInput.value;
        
        if (code.length !== 6) {
            this.showToast('Please enter a 6-digit code', 'warning');
            return;
        }        // For self-transfer, the files are already shown in the main UI
        // No need to show redundant preview

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
            // Self-connection: simulate local transfer
            this.simulateLocalTransfer();
        } else {
            console.log(`Initiating P2P connection to receiver: ${data.receiverSocketId}`);            // Initialize peer connection as initiator (sender)
            this.initPeerConnection(true, data.receiverSocketId);
        }
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
            // Self-connection: simulate local transfer
            this.simulateLocalTransfer();
        } else {
            console.log(`Initiating P2P connection to sender: ${data.senderSocketId}`);            // Initialize peer connection as non-initiator (receiver)
            this.initPeerConnection(false, data.senderSocketId);
        }
    }

    initPeerConnection(initiator, targetSocketId) {
        console.log(`Initializing peer connection - Initiator: ${initiator}, Target: ${targetSocketId}, My ID: ${this.socket.id}`);
        
        this.peer = new SimplePeer({
            initiator: initiator,
            trickle: false
        });

        this.peer.on('signal', (signal) => {
            console.log(`Sending signal to ${targetSocketId}`);
            this.socket.emit('signal', {
                to: targetSocketId,
                signal: signal
            });
        });        this.peer.on('connect', () => {
            console.log('P2P connection established with', targetSocketId);
            
            if (initiator) {
                // Sender: start sending files
                console.log('Starting file transfer as sender');
                this.sendFiles();
            } else {
                console.log('Ready to receive files');
            }
        });

        this.peer.on('data', (data) => {
            this.handleIncomingData(data);
        });

        this.peer.on('error', (err) => {
            console.error('Peer connection error:', err);
            this.showToast('Connection failed. Please try again.', 'error');
        });
    }

    handleSignal(data) {
        console.log(`Received signal from ${data.from}`);
        if (this.peer) {
            this.peer.signal(data.signal);
        } else {
            console.warn('Received signal but no peer connection exists');
        }
    }

    async sendFiles() {
        if (!this.peer || !this.selectedFiles.length) return;

        const statusMessage = document.getElementById('status-message');
        const progressBar = document.getElementById('progress-bar');
        
        if (statusMessage) {
            statusMessage.textContent = 'Sending files...';
            statusMessage.className = 'status-transferring';
        }
        
        if (progressBar) {
            progressBar.classList.remove('hidden');
        }

        let fileIndex = 0;
        let totalSize = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
        let sentSize = 0;

        // Check if we need to create a ZIP file
        const zipFile = await this.createZipFile();
        if (zipFile) {
            // Send ZIP file metadata
            this.peer.send(JSON.stringify({
                type: 'file-start',
                name: zipFile.name,
                size: zipFile.size,
                type: zipFile.type
            }));

            // Read and send ZIP file in chunks
            const chunkSize = 16384; // 16KB chunks
            let offset = 0;

            const sendChunk = () => {
                const reader = new FileReader();
                const slice = zipFile.slice(offset, offset + chunkSize);

                reader.onload = (e) => {
                    this.peer.send(e.target.result);
                    offset += chunkSize;
                    sentSize += Math.min(chunkSize, zipFile.size - (offset - chunkSize));

                    // Update progress
                    const progress = (sentSize / totalSize) * 100;
                    const progressFill = document.querySelector('.progress-fill');
                    if (progressFill) {
                        progressFill.style.width = progress + '%';
                    }

                    if (offset < zipFile.size) {
                        sendChunk();
                    } else {
                        // ZIP file sent, now send individual files
                        fileIndex = 0;
                        sendNextFile();
                    }
                };

                reader.readAsArrayBuffer(slice);
            };

            sendChunk();
        } else {
            // No ZIP file created, send files individually
            sendNextFile();
        }

        const sendNextFile = () => {
            if (fileIndex >= this.selectedFiles.length) {
                // All files sent
                this.peer.send(JSON.stringify({ type: 'complete' }));
                this.handleTransferComplete();
                return;
            }

            const file = this.selectedFiles[fileIndex];
            const chunkSize = 16384; // 16KB chunks
            let offset = 0;

            // Send file metadata
            this.peer.send(JSON.stringify({
                type: 'file-start',
                name: file.name,
                size: file.size,
                type: file.type
            }));

            const sendChunk = () => {
                const reader = new FileReader();
                const slice = file.slice(offset, offset + chunkSize);

                reader.onload = (e) => {
                    this.peer.send(e.target.result);
                    offset += chunkSize;
                    sentSize += Math.min(chunkSize, file.size - (offset - chunkSize));

                    // Update progress
                    const progress = (sentSize / totalSize) * 100;
                    const progressFill = document.querySelector('.progress-fill');
                    if (progressFill) {
                        progressFill.style.width = progress + '%';
                    }

                    if (offset < file.size) {
                        sendChunk();
                    } else {
                        // File complete
                        this.peer.send(JSON.stringify({ type: 'file-end' }));
                        fileIndex++;
                        sendNextFile();
                    }
                };

                reader.readAsArrayBuffer(slice);
            };

            sendChunk();
        };
    }

    handleIncomingData(data) {
        try {
            // Try to parse as JSON (metadata)
            const message = JSON.parse(data);
            
            const receiveMessage = document.getElementById('receive-message');
            const receiveProgressBar = document.getElementById('receive-progress-bar');
            
            switch (message.type) {
                case 'file-start':
                    this.currentReceivingFile = {
                        name: message.name,
                        size: message.size,
                        type: message.type,
                        chunks: []
                    };
                    
                    if (receiveMessage) {
                        receiveMessage.textContent = `Receiving: ${message.name}`;
                        receiveMessage.className = 'status-transferring';
                    }
                    
                    if (receiveProgressBar) {
                        receiveProgressBar.classList.remove('hidden');
                    }
                    break;
                
                case 'file-end':
                    this.completeFileReceive();
                    break;
                
                case 'complete':
                    this.handleReceiveComplete();
                    break;
            }
        } catch (e) {
            // Binary data (file chunk)
            if (this.currentReceivingFile) {
                this.currentReceivingFile.chunks.push(data);
                
                // Update progress
                const received = this.currentReceivingFile.chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
                const progress = (received / this.currentReceivingFile.size) * 100;
                
                const progressFill = document.querySelector('#receive-progress-bar .progress-fill');
                if (progressFill) {
                    progressFill.style.width = progress + '%';
                }
            }
        }
    }

    completeFileReceive() {
        if (!this.currentReceivingFile) return;

        // Combine all chunks
        const totalSize = this.currentReceivingFile.chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const combinedArray = new Uint8Array(totalSize);
        let offset = 0;

        this.currentReceivingFile.chunks.forEach(chunk => {
            combinedArray.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
        });

        // Create blob and download link
        const blob = new Blob([combinedArray], { type: this.currentReceivingFile.type });
        const file = {
            name: this.currentReceivingFile.name,
            size: this.currentReceivingFile.size,
            blob: blob,
            url: URL.createObjectURL(blob)
        };

        this.receivedFiles.push(file);
        this.displayReceivedFile(file);
        
        this.currentReceivingFile = null;
    }    displayReceivedFile(file) {
        const receivedFilesDiv = document.getElementById('received-files');
        const fileList = document.getElementById('received-file-list');
        
        if (!receivedFilesDiv || !fileList) return;
        
        // Check if file already exists in both the display and receivedFiles array
        const existsInArray = this.receivedFiles.some(existingFile => 
            existingFile.name === file.name && existingFile.size === file.size
        );
        
        const existsInDisplay = Array.from(fileList.querySelectorAll('.file-name'))
            .some(element => element.textContent === file.name);
        
        if (existsInArray && existsInDisplay) {
            console.log('File already displayed:', file.name);
            return; // File already displayed, don't add again
        }
        
        // Show the received files section with better animation
        receivedFilesDiv.classList.remove('hidden');
        receivedFilesDiv.style.animation = 'fadeIn 0.3s ease-in-out';
        
        // Create file item with improved styling
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item received-file-item';
        fileItem.style.animation = 'slideInUp 0.3s ease-out';
        
        // Determine file icon based on type
        let fileIcon = 'fa-file';
        if (file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)) {
            fileIcon = 'fa-file-image';
        } else if (file.name.toLowerCase().match(/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/)) {
            fileIcon = 'fa-file-video';
        } else if (file.name.toLowerCase().match(/\.(mp3|wav|flac|aac|ogg)$/)) {
            fileIcon = 'fa-file-audio';
        } else if (file.name.toLowerCase().match(/\.(pdf)$/)) {
            fileIcon = 'fa-file-pdf';
        } else if (file.name.toLowerCase().match(/\.(doc|docx)$/)) {
            fileIcon = 'fa-file-word';
        } else if (file.name.toLowerCase().match(/\.(xls|xlsx)$/)) {
            fileIcon = 'fa-file-excel';
        } else if (file.name.toLowerCase().match(/\.(ppt|pptx)$/)) {
            fileIcon = 'fa-file-powerpoint';
        } else if (file.name.toLowerCase().match(/\.(zip|rar|7z|tar|gz)$/)) {
            fileIcon = 'fa-file-archive';
        }
        
        fileItem.innerHTML = `
            <div class="file-info">
                <i class="fas ${fileIcon}" style="color: #4a90e2; margin-right: 8px;"></i>
                <div class="file-details">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${this.formatFileSize(file.size)}</span>
                </div>
            </div>
            <a href="${file.url}" download="${file.name}" class="btn btn-primary download-btn">
                <i class="fas fa-download"></i> Download
            </a>
        `;
        fileList.appendChild(fileItem);
          // Show download all button if there are multiple files
        const downloadAllBtn = document.getElementById('download-all-btn');
        if (this.receivedFiles.length > 1 && downloadAllBtn) {
            downloadAllBtn.classList.remove('hidden');
            downloadAllBtn.style.animation = 'fadeIn 0.3s ease-in-out';
        }
    }handleTransferComplete() {
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = 'Transfer completed successfully!';
            statusMessage.className = 'status-completed';
        }
        
        // Log transfer stats
        const totalSize = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
        fetch('http://localhost:5000/api/files/log-transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: this.currentCode,
                fileCount: this.selectedFiles.length,
                totalSize: totalSize
            })
        }).catch(console.error);
    }    handleReceiveComplete() {
        const receiveMessage = document.getElementById('receive-message');
        if (receiveMessage) {
            receiveMessage.textContent = 'All files received successfully!';
            receiveMessage.className = 'status-completed';
        }
    }

    simulateLocalTransfer() {
        // For self-connections, directly transfer files locally
        if (!this.selectedFiles || this.selectedFiles.length === 0) {
            this.showToast('No files selected for transfer', 'error');
            return;
        }

        // Clear any existing received files to prevent duplicates
        this.clearReceivedFiles();

        const statusMessage = document.getElementById('status-message');
        const progressBar = document.getElementById('progress-bar');
        const receiveMessage = document.getElementById('receive-message');
        const receiveProgressBar = document.getElementById('receive-progress-bar');
        
        if (statusMessage) {
            statusMessage.textContent = 'Transferring files locally...';
            statusMessage.className = 'status-transferring';
        }
        
        if (progressBar) {
            progressBar.classList.remove('hidden');
        }
        
        if (receiveMessage) {
            receiveMessage.textContent = 'Receiving files...';
            receiveMessage.className = 'status-transferring';
        }
        
        if (receiveProgressBar) {
            receiveProgressBar.classList.remove('hidden');
        }

        // Simulate transfer with progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            
            const progressFill = document.querySelector('.progress-fill');
            const receiveProgressFill = document.querySelector('#receive-progress-bar .progress-fill');
            
            if (progressFill) {
                progressFill.style.width = progress + '%';
            }
            
            if (receiveProgressFill) {
                receiveProgressFill.style.width = progress + '%';
            }

            if (progress >= 100) {
                clearInterval(interval);
                
                // Process each file only once
                this.selectedFiles.forEach(file => {
                    const fileObj = {
                        name: file.name,
                        size: file.size,
                        blob: file,
                        url: URL.createObjectURL(file)
                    };
                    
                    // Add to receivedFiles array only if not already present
                    const exists = this.receivedFiles.some(existingFile => 
                        existingFile.name === file.name && existingFile.size === file.size
                    );
                    
                    if (!exists) {
                        this.receivedFiles.push(fileObj);
                    }
                    
                    // Display the file (displayReceivedFile will handle duplicates)
                    this.displayReceivedFile(fileObj);
                });

                // Complete the transfer
                this.handleTransferComplete();
                this.handleReceiveComplete();
            }
        }, 200);
    }

    resetTransfer() {
        // Clear received files display
        this.clearReceivedFiles();
        
        // Show upload area again and hide file details
        const uploadArea = document.getElementById('upload-area');
        const selectedFilesSection = document.getElementById('selected-files-section');
        const dropZone = document.getElementById('file-drop-zone');
        
        if (uploadArea) {
            uploadArea.classList.remove('hidden');
            uploadArea.style.display = 'block';
            uploadArea.style.animation = 'fadeIn 0.4s ease-out';
        }
        
        if (dropZone) {
            // Reset drop zone appearance
            dropZone.classList.remove('drag-over');
        }
        
        if (selectedFilesSection) {
            selectedFilesSection.classList.add('hidden');
            selectedFilesSection.style.display = 'none';
        }
        
        // Clear inline file display from drop zone area
        const inlineFileContainer = document.getElementById('selected-files-in-dropzone');
        if (inlineFileContainer) {
            inlineFileContainer.remove();
        }
        
        // Reset old UI elements (keeping them hidden)
        const elements = [
            'selected-files', 'transfer-code', 'receive-status', 
            'progress-bar', 'receive-progress-bar', 'transfer-actions', 
            'cancel-receive-btn', 'download-all-btn', 'reset-actions'
        ];
        
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.classList.add('hidden');
        });
        
        // Clear data
        this.selectedFiles = [];
        this.currentCode = null;
        this.receivedFiles = [];
        this.currentReceivingFile = null;
        
        // Reset inputs
        const fileInput = document.getElementById('file-input');
        const receiveCodeInput = document.getElementById('receive-code-input');
        
        if (fileInput) fileInput.value = '';
        if (receiveCodeInput) receiveCodeInput.value = '';
        
        // Reset the upload button text back to "Upload Files" (default state)
        const uploadBtn = document.getElementById('generate-code-btn');
        if (uploadBtn) {
            uploadBtn.textContent = 'Upload Files';
        }
          // Reset progress bars
        document.querySelectorAll('.progress-fill').forEach(bar => {
            bar.style.width = '0%';
        });
    }

    clearReceivedFiles() {
        // Clear the received files list UI
        const fileList = document.getElementById('received-file-list');
        if (fileList) {
            fileList.innerHTML = '';
        }
        
        // Hide received files section
        const receivedFiles = document.getElementById('received-files');
        const downloadAllBtn = document.getElementById('download-all-btn');
        
        if (receivedFiles) receivedFiles.classList.add('hidden');
        if (downloadAllBtn) downloadAllBtn.classList.add('hidden');
        
        // Revoke object URLs to free memory
        this.receivedFiles.forEach(file => {
            if (file.url) {
                URL.revokeObjectURL(file.url);
            }
        });
        
        // Clear the array
        this.receivedFiles = [];
    }

    cancelTransfer() {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        
        // Update status
        const statusMessage = document.getElementById('status-message');
        const transferActions = document.getElementById('transfer-actions');
        
        if (statusMessage) {
            statusMessage.textContent = 'Transfer cancelled';
            statusMessage.className = 'status-error';
        }
          // Show reset option
        if (transferActions) {
            transferActions.classList.remove('hidden');
        }
    }

    cancelReceive() {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
          // Update status
        const receiveMessage = document.getElementById('receive-message');
        if (receiveMessage) {
            receiveMessage.textContent = 'Receive cancelled';
            receiveMessage.className = 'status-error';
        }
        
        this.clearReceivedFiles();
    }async downloadAllFiles() {
        if (this.receivedFiles.length === 0) {
            this.showToast('No files to download', 'warning');
            return;
        }
        
        // If only one file, download it directly
        if (this.receivedFiles.length === 1) {
            const file = this.receivedFiles[0];            const link = document.createElement('a');
            link.href = file.url;
            link.download = file.name;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }
        
        // For multiple files, create and download as ZIP
        try {
            const zipBlob = await this.createDownloadZip();
            if (zipBlob) {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(zipBlob);
                link.download = `downloaded_files_${Date.now()}.zip`;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                  // Clean up the blob URL
                URL.revokeObjectURL(link.href);
                
            } else {
                // Fallback to individual downloads if ZIP creation fails
                this.downloadFilesIndividually();
            }
        } catch (error) {
            console.error('Error creating ZIP for download:', error);
            this.showToast('Failed to create ZIP, downloading files individually', 'warning');
            this.downloadFilesIndividually();
        }    }

    // Helper method to create ZIP file from received files
    async createDownloadZip() {
        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
            console.warn('JSZip not available, cannot create ZIP');
            return null;
        }

        try {
            const zip = new JSZip();
            
            // Add each received file to the ZIP
            for (let i = 0; i < this.receivedFiles.length; i++) {
                const file = this.receivedFiles[i];
                console.log(`Adding file to ZIP: ${file.name}`);
                
                // Fetch the blob data from the URL
                const response = await fetch(file.url);
                const arrayBuffer = await response.arrayBuffer();
                
                zip.file(file.name, arrayBuffer);
            }

            // Generate the ZIP file
            console.log('Generating ZIP file for download...');
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 6
                }
            });

            console.log(`ZIP file created for download, size: ${this.formatFileSize(zipBlob.size)}`);
            return zipBlob;

        } catch (error) {
            console.error('Error creating ZIP file for download:', error);
            return null;
        }
    }

    // Fallback method to download files individually
    downloadFilesIndividually() {        this.receivedFiles.forEach(file => {
            const link = document.createElement('a');
            link.href = file.url;
            link.download = file.name;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // QR Code Scanner
    startQRScanner() {
        const video = document.getElementById('camera-video');
        const canvas = document.getElementById('camera-canvas');
        const cameraSection = document.getElementById('camera-section');
        
        if (!video || !canvas || !cameraSection) return;
        
        const context = canvas.getContext('2d');
        
        cameraSection.classList.remove('hidden');
        
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                video.srcObject = stream;
                this.scanQRCode(video, canvas, context);
            })
            .catch(err => {
                console.error('Error accessing camera:', err);
                this.showToast('Unable to access camera', 'error');
            });
    }

    scanQRCode(video, canvas, context) {
        const scan = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                
                if (code) {
                    // Extract code from URL
                    const match = code.data.match(/\/receive\/(\d{6})/);
                    if (match) {
                        const receiveCodeInput = document.getElementById('receive-code-input');
                        if (receiveCodeInput) {
                            receiveCodeInput.value = match[1];
                        }
                        this.stopQRScanner();
                        this.showToast('QR code scanned successfully!', 'success');
                        return;
                    }
                }
            }
            
            const cameraSection = document.getElementById('camera-section');
            if (cameraSection && !cameraSection.classList.contains('hidden')) {
                requestAnimationFrame(scan);
            }
        };
        
        scan();
    }

    stopQRScanner() {
        const video = document.getElementById('camera-video');
        const cameraSection = document.getElementById('camera-section');
        
        if (!video || !cameraSection) return;
        
        const stream = video.srcObject;
        
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        cameraSection.classList.add('hidden');
    }

    // Utility functions
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }    // Removed showFilePreview() function as it created redundant UI elements
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
