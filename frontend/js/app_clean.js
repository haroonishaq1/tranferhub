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
            }, 2000);        }
    }
    
    // Fallback method for backward compatibility
    getServerUrl() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '0.0.0.0') {
            return `${protocol}//${hostname}${port ? ':' + port : ''}`;
        } else {
            if (port === '8000') {
                return `http://${hostname}:4999`;
            }
            return `http://${hostname}:4999`;
        }
    }

    connectSocket() {
        // Use production-optimized server URL detection
        const serverUrl = window.ProductionConfig ? 
            window.ProductionConfig.getServerUrl() : 
            this.getServerUrl();
            
        // Get optimized socket configuration
        const socketConfig = window.ProductionConfig ? 
            window.ProductionConfig.getConnectionConfig().socketConfig : 
            {
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 10,
                timeout: 30000,
                forceNew: true,
                transports: ['websocket', 'polling'],
                upgrade: true,
                rememberUpgrade: true
            };
        
        const hostname = window.location.hostname;
        const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '0.0.0.0';
        
        console.log(`🌐 Environment: ${isProduction ? 'Production' : 'Development'}`);
        console.log(`🔗 Connecting to: ${serverUrl}`);
        console.log(`📱 User Agent: ${navigator.userAgent.substring(0, 50)}...`);
          this.socket = io(serverUrl, socketConfig);
        
        this.socket.on('connect', () => {
            console.log('✅ Connected to server with socket ID:', this.socket.id);
            this.showToast(`Connected! (${this.socket.id.substring(0, 8)}...)`, 'success');
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
        
        // Enhanced server relay event handlers for cross-device transfers
        this.socket.on('relay-file-upload-ack', (data) => {
            console.log('Server acknowledged file upload:', data.fileName);
        });
        
        this.socket.on('relay-upload-complete-ack', (data) => {
            console.log('Server acknowledged upload completion for code:', data.code);
            this.showToast('Files successfully stored on server!', 'success');
        });
        
        this.socket.on('relay-file-download', (data) => {
            console.log('Received file from server relay:', data.fileData.name);
            this.handleServerRelayedFile(data);
        });
        
        this.socket.on('relay-download-complete', (data) => {
            console.log('Server relay download completed');
            this.handleServerRelayComplete(data);
        });
        
        this.socket.on('relay-error', (data) => {
            console.error('Server relay error:', data.error);
            this.showToast('Server relay error: ' + data.error, 'error');
            
            // Update UI based on whether we're sender or receiver
            const statusMessage = document.getElementById('status-message');
            const receiveMessage = document.getElementById('receive-message');
            
            if (statusMessage && this.selectedFiles.length > 0) {
                statusMessage.textContent = 'Server transfer failed. Please try again.';
                statusMessage.className = 'status-error';
            }
            
            if (receiveMessage && !this.selectedFiles.length) {
                receiveMessage.textContent = 'Server download failed. Please try again.';
                receiveMessage.className = 'status-error';
            }
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
                    this.showToast('Code copied to clipboard!', 'success');
                    
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
    }    handleReceiverJoined(data) {
        console.log(`Receiver joined: ${data.receiverSocketId}, my socket ID: ${this.socket.id}`);
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = 'Receiver connected! Analyzing connection...';
            statusMessage.className = 'status-connected';
        }
        
        // Check if this is a self-connection (same socket)
        if (data.receiverSocketId === this.socket.id) {
            console.log('Self-connection detected, simulating local transfer');
            this.simulateLocalTransfer();
            return;
        }
        
        // Production optimization: Check if we should skip P2P for faster transfer
        const shouldSkipP2P = window.ProductionConfig ? 
            window.ProductionConfig.shouldSkipP2P() : 
            false;
            
        if (shouldSkipP2P) {
            console.log('🚀 Production optimization: Skipping P2P, using server relay directly');
            this.showToast('Using optimized server transfer...', 'info', 3000);
            setTimeout(() => {
                this.initiateServerRelayedTransfer();
            }, 1000);
        } else {
            // Smart connection detection - skip P2P if likely to fail
            this.determineConnectionMethod(true, data.receiverSocketId);
        }
        
        this.showToast('Receiver joined! Starting transfer...', 'success');
    }    handleJoinedRoom(data) {
        console.log(`Joined room with sender: ${data.senderSocketId}, my socket ID: ${this.socket.id}`);
        const receiveMessage = document.getElementById('receive-message');
        if (receiveMessage) {
            receiveMessage.textContent = 'Connected! Analyzing connection...';
            receiveMessage.className = 'status-connected';
        }
        
        // Store the current code for receiver
        this.currentCode = data.code;
        
        // Check if this is a self-connection (same socket)
        if (data.senderSocketId === this.socket.id) {
            console.log('Self-connection detected, simulating local transfer');
            this.simulateLocalTransfer();
            return;
        }
        
        // Production optimization: Check if we should skip P2P for faster transfer
        const shouldSkipP2P = window.ProductionConfig ? 
            window.ProductionConfig.shouldSkipP2P() : 
            false;
            
        if (shouldSkipP2P) {
            console.log('🚀 Production optimization: Skipping P2P, using server relay directly');
            this.showToast('Using optimized server transfer...', 'info', 3000);
            
            if (receiveMessage) {
                receiveMessage.textContent = 'Using server relay for reliable transfer...';
                receiveMessage.className = 'status-relay';
            }
            
            setTimeout(() => {
                this.requestFilesFromServer();
            }, 1000);
        } else {
            // Smart connection detection - skip P2P if likely to fail
            this.determineConnectionMethod(false, data.senderSocketId);
        }
        
        this.showToast('Connected to sender!', 'success');
    }

    // Smart connection method determination
    async determineConnectionMethod(initiator, targetSocketId) {
        console.log('🔍 Analyzing network conditions for optimal connection method...');
        
        // Quick network assessment
        const networkAssessment = await this.assessNetworkConditions();
        
        console.log('📊 Network Assessment:', networkAssessment);
        
        // Decision logic for connection method
        if (networkAssessment.shouldSkipP2P) {
            console.log('🚀 Network conditions indicate P2P will fail - using server relay directly');
            
            // Update UI to show server relay mode
            const statusMessage = document.getElementById('status-message');
            const receiveMessage = document.getElementById('receive-message');
            
            if (statusMessage) {
                statusMessage.textContent = 'Using server relay for reliable transfer...';
                statusMessage.className = 'status-relay';
            }
            
            if (receiveMessage) {
                receiveMessage.textContent = 'Using server relay for reliable transfer...';
                receiveMessage.className = 'status-relay';
            }
            
            this.showToast('Using server relay for cross-device transfer', 'info', 4000);
            
            // Skip P2P entirely and go straight to server relay
            setTimeout(() => {
                this.initiateServerRelayedTransfer();
            }, 1000);
            
        } else {
            console.log('🔗 Network conditions allow P2P attempt with fast fallback');
            this.showToast('Attempting direct connection...', 'info', 3000);
            
            // Try P2P with aggressive timeout
            this.initPeerConnectionWithFastFallback(initiator, targetSocketId);
        }
    }

    // Assess network conditions to determine if P2P is likely to succeed
    async assessNetworkConditions() {
        const assessment = {
            hasWebRTC: typeof SimplePeer !== 'undefined',
            relayCandidates: 0,
            srflxCandidates: 0,
            hostCandidates: 0,
            stunServersWorking: 0,
            shouldSkipP2P: false,
            reason: ''
        };

        try {
            // Quick ICE candidate test (3 seconds max)
            console.log('⚡ Quick network test (3 seconds)...');
            
            const testResult = await Promise.race([
                this.quickIceTest(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Quick test timeout')), 3000))
            ]);
            
            assessment.relayCandidates = testResult.relay;
            assessment.srflxCandidates = testResult.srflx;
            assessment.hostCandidates = testResult.host;
            assessment.stunServersWorking = testResult.stunWorking;
            
        } catch (error) {
            console.log('⚠️ Quick network test failed:', error.message);
            // If we can't even do a quick test, P2P is very unlikely to work
            assessment.shouldSkipP2P = true;
            assessment.reason = 'Network test failed - severe restrictions detected';
            return assessment;
        }

        // Decision logic
        if (assessment.relayCandidates === 0 && assessment.srflxCandidates === 0) {
            assessment.shouldSkipP2P = true;
            assessment.reason = 'No STUN/TURN connectivity - P2P impossible';
        } else if (assessment.relayCandidates === 0 && assessment.stunServersWorking < 2) {
            assessment.shouldSkipP2P = true;
            assessment.reason = 'Limited STUN access, no TURN - cross-device P2P unlikely';
        } else if (assessment.stunServersWorking === 0) {
            assessment.shouldSkipP2P = true;
            assessment.reason = 'No STUN servers accessible - NAT traversal impossible';
        }

        return assessment;
    }

    // Quick ICE candidate collection test
    quickIceTest() {
        return new Promise((resolve) => {
            const pc = new RTCPeerConnection({ 
                iceServers: this.getIceServersConfig().slice(0, 6) // Test only first 6 servers for speed
            });
            
            const candidates = { host: 0, srflx: 0, relay: 0, stunWorking: 0 };
            const stunServers = new Set();
            
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    candidates[event.candidate.type]++;
                    
                    // Track which STUN servers are working
                    if (event.candidate.type === 'srflx' || event.candidate.type === 'relay') {
                        stunServers.add(event.candidate.address);
                    }
                }
            };
            
            pc.onicegatheringstatechange = () => {
                if (pc.iceGatheringState === 'complete') {
                    candidates.stunWorking = stunServers.size;
                    pc.close();
                    resolve(candidates);
                }
            };
            
            // Trigger candidate gathering
            pc.createDataChannel('test');
            pc.createOffer().then(offer => pc.setLocalDescription(offer));
            
            // Ensure we don't hang
            setTimeout(() => {
                candidates.stunWorking = stunServers.size;
                pc.close();
                resolve(candidates);
            }, 2800);
        });
    }

    // P2P connection with very aggressive fallback
    initPeerConnectionWithFastFallback(initiator, targetSocketId) {
        console.log(`🚀 Attempting P2P with fast fallback - Initiator: ${initiator}, Target: ${targetSocketId}`);
        
        // Enhanced ICE server configuration
        const iceServers = this.getIceServersConfig();
        
        // Check if SimplePeer is available
        if (typeof SimplePeer === 'undefined') {
            console.error('SimplePeer not loaded, falling back to server relay immediately');
            this.handleConnectionFailure('WebRTC not available, using server relay');
            return;
        }

        this.peer = new SimplePeer({
            initiator: initiator,
            trickle: true,
            config: {
                iceServers: iceServers,
                iceCandidatePoolSize: 10,
                iceTransportPolicy: 'all',
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            },
            objectMode: true,
            allowHalfTrickle: false,
            iceCompleteTimeout: 5000, // Shorter timeout for faster detection
            offerOptions: {
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            }
        });
        
        // Very aggressive timeout - 5 seconds for cross-device
        this.connectionTimeout = setTimeout(() => {
            if (this.peer && !this.peer.connected) {
                console.log('⏰ Fast timeout triggered (5 seconds) - failing over to server relay');
                this.handleConnectionFailure('Fast P2P timeout - using server relay for reliability');
            }
        }, 5000);

        // Enhanced connection monitoring
        let connectionAttemptStarted = Date.now();
        let iceCandidatesReceived = 0;
        let iceGatheringComplete = false;

        this.peer.on('signal', (signal) => {
            console.log(`📤 Sending signal to ${targetSocketId}:`, signal.type);
            
            if (signal.type === 'candidate') {
                iceCandidatesReceived++;
                
                // If we haven't received relay candidates after 3 seconds, prepare for fallback
                if (Date.now() - connectionAttemptStarted > 3000 && iceCandidatesReceived > 5 && !iceGatheringComplete) {
                    console.log('⚠️ No relay candidates after 3 seconds, P2P unlikely to succeed');
                }
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
            
            this.showToast('Direct connection established! Starting transfer...', 'success');
            
            // Start connection heartbeat
            this.startConnectionHeartbeat();
            
            if (initiator) {
                console.log('Starting file transfer as sender');
                setTimeout(() => this.sendFiles(), 500);
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
            this.handleConnectionFailure(`P2P error: ${err.message || 'Connection failed'}`);
        });

        this.peer.on('close', () => {
            console.log('Peer connection closed');
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }
            
            this.stopConnectionHeartbeat();
            this.peer = null;
        });
        
        // Enhanced connection state monitoring
        if (this.peer._pc) {
            this.peer._pc.oniceconnectionstatechange = () => {
                const state = this.peer._pc.iceConnectionState;
                console.log('🔄 ICE connection state:', state);
                
                switch (state) {
                    case 'checking':
                        console.log('🔍 ICE checking - attempting connection...');
                        break;
                    case 'connected':
                        console.log('✅ ICE connected successfully');
                        break;
                    case 'completed':
                        console.log('✅ ICE completed');
                        break;
                    case 'failed':
                        console.error('❌ ICE connection failed - immediate fallback');
                        this.handleConnectionFailure('ICE connection failed - using server relay');
                        break;
                    case 'disconnected':
                        console.warn('⚠️ ICE disconnected');
                        break;
                    case 'closed':
                        console.log('🔒 ICE closed');
                        break;
                }
            };
            
            this.peer._pc.onicegatheringstatechange = () => {
                const state = this.peer._pc.iceGatheringState;
                console.log('🔄 ICE gathering state:', state);
                
                if (state === 'complete') {
                    iceGatheringComplete = true;
                    console.log('🎯 ICE gathering completed');
                    
                    // If gathering complete and no connection after 2 more seconds, fallback
                    setTimeout(() => {
                        if (this.peer && !this.peer.connected && this.peer._pc.iceConnectionState !== 'connected') {
                            console.log('⚠️ ICE gathering complete but no connection - triggering fallback');
                            this.handleConnectionFailure('ICE gathering complete but connection failed');
                        }
                    }, 2000);
                }
            };
        }
    }initPeerConnection(initiator, targetSocketId) {
        console.log(`Initializing peer connection - Initiator: ${initiator}, Target: ${targetSocketId}, My ID: ${this.socket.id}`);
          // Enhanced ICE server configuration with more reliable TURN servers
        const iceServers = this.getIceServersConfig();

        console.log('Using ICE servers:', iceServers.length, 'servers configured for cross-device connectivity');

        // Check if SimplePeer is available
        if (typeof SimplePeer === 'undefined') {
            console.error('SimplePeer not loaded, falling back to server relay');
            this.handleConnectionFailure('WebRTC not available, using server relay');
            return;
        }

        this.peer = new SimplePeer({
            initiator: initiator,
            trickle: true,
            config: {
                iceServers: iceServers,
                iceCandidatePoolSize: 15, // Increased for better connectivity
                iceTransportPolicy: 'all',
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            },
            objectMode: true,
            allowHalfTrickle: false,
            iceCompleteTimeout: 20000, // Extended for cross-device connections
            offerOptions: {
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            }
        });
          // Reduce timeout for cross-device connections to fail faster to server relay
        this.connectionTimeout = setTimeout(() => {
            if (this.peer && !this.peer.connected) {
                console.error('Connection timeout after 10 seconds - initiating fallback for cross-device transfer');
                console.log('Peer state:', {
                    connected: this.peer.connected,
                    connecting: this.peer.connecting,
                    destroyed: this.peer.destroyed
                });
                
                // Enhanced debugging for cross-device issues
                if (this.peer._pc) {
                    console.log('WebRTC states:', {
                        connectionState: this.peer._pc.connectionState,
                        iceConnectionState: this.peer._pc.iceConnectionState,
                        iceGatheringState: this.peer._pc.iceGatheringState,
                        signalingState: this.peer._pc.signalingState
                    });
                    
                    // Log ICE candidates for debugging NAT issues
                    this.peer._pc.getStats().then(stats => {
                        let candidatePairs = [];
                        stats.forEach(report => {
                            if (report.type === 'candidate-pair') {
                                candidatePairs.push(report);
                            }
                        });
                        console.log('ICE candidate pairs:', candidatePairs.length);
                    }).catch(e => console.log('Could not get WebRTC stats:', e));
                }
                
                this.handleConnectionFailure('Cross-device connection timeout - falling back to server relay');
            }
        }, 10000); // Reduced timeout for faster fallback to server relay

        this.peer.on('signal', (signal) => {
            console.log(`Sending signal to ${targetSocketId}:`, signal.type);
            
            // Enhanced ICE candidate logging for debugging
            if (signal.type === 'candidate' && signal.candidate) {
                console.log('Sending ICE candidate:', {
                    type: signal.candidate.type,
                    protocol: signal.candidate.protocol,
                    address: signal.candidate.address,
                    port: signal.candidate.port,
                    foundation: signal.candidate.foundation
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
                setTimeout(() => this.sendFiles(), 500);
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
            console.log('Error details:', {
                message: err.message,
                code: err.code,
                stack: err.stack
            });
            this.handleConnectionFailure(err.message || 'Connection error');
        });

        this.peer.on('close', () => {
            console.log('Peer connection closed');
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }
            
            this.stopConnectionHeartbeat();
            this.peer = null;
        });
        
        // Enhanced ICE connection monitoring for cross-device debugging
        if (this.peer._pc) {
            this.peer._pc.oniceconnectionstatechange = () => {
                const state = this.peer._pc.iceConnectionState;
                console.log('🔄 ICE connection state changed to:', state);
                
                switch (state) {                    case 'checking':
                        console.log('🔍 ICE checking - attempting to establish connection...');
                        this.showToast('Establishing connection...', 'info', 3000);
                        break;
                    case 'connected':
                        console.log('✅ ICE connected - peer connection established');
                        break;
                    case 'completed':
                        console.log('✅ ICE completed - connection is stable');
                        break;
                    case 'failed':
                        console.error('❌ ICE connection failed - NAT/firewall issues detected');
                        console.log('This usually indicates NAT traversal problems between different networks');
                        
                        // Log detailed failure information
                        if (this.peer._pc) {
                            this.peer._pc.getStats().then(stats => {
                                let failureReasons = [];
                                stats.forEach(report => {
                                    if (report.type === 'candidate-pair' && report.state === 'failed') {
                                        failureReasons.push(`Failed pair: ${report.localCandidateId} -> ${report.remoteCandidateId}`);
                                    }
                                });
                                console.log('📊 Failed candidate pairs:', failureReasons);
                            });
                        }
                        
                        this.handleConnectionFailure('Network connection failed - devices are on different networks that cannot connect directly. Using server relay...');
                        break;
                    case 'disconnected':
                        console.warn('⚠️ ICE disconnected - connection lost');
                        this.showToast('Connection unstable...', 'warning', 2000);
                        break;
                    case 'closed':
                        console.log('🔒 ICE closed - connection terminated');
                        break;
                }
            };
            
            this.peer._pc.onconnectionstatechange = () => {
                const state = this.peer._pc.connectionState;
                console.log('🔄 Peer connection state changed to:', state);
                
                switch (state) {
                    case 'connecting':
                        console.log('🔗 WebRTC connecting...');
                        break;
                    case 'connected':
                        console.log('✅ WebRTC connected successfully');
                        break;
                    case 'disconnected':
                        console.warn('⚠️ WebRTC disconnected');
                        break;
                    case 'failed':
                        console.error('❌ WebRTC connection failed');
                        this.handleConnectionFailure('WebRTC connection failed - using server relay');
                        break;
                    case 'closed':
                        console.log('🔒 WebRTC connection closed');
                        break;
                }
            };
            
            // Enhanced ICE candidate logging for debugging NAT issues
            this.peer._pc.onicecandidate = (event) => {
                if (event.candidate) {
                    const candidate = event.candidate;
                    console.log('🧊 ICE candidate generated:', {
                        type: candidate.type,
                        protocol: candidate.protocol,
                        address: candidate.address,
                        port: candidate.port,
                        priority: candidate.priority,
                        foundation: candidate.foundation
                    });
                    
                    // Log candidate types to help debug connectivity
                    if (candidate.type === 'host') {
                        console.log('📍 Host candidate (local IP)');
                    } else if (candidate.type === 'srflx') {
                        console.log('🌐 Server reflexive candidate (public IP via STUN)');
                    } else if (candidate.type === 'relay') {
                        console.log('🔄 Relay candidate (via TURN server)');
                    }
                } else {
                    console.log('🧊 ICE candidate gathering completed');
                }
            };
            
            // Monitor ICE gathering state
            this.peer._pc.onicegatheringstatechange = () => {
                const state = this.peer._pc.iceGatheringState;
                console.log('🔄 ICE gathering state:', state);
                
                if (state === 'complete') {
                    console.log('🎯 ICE gathering completed - all candidates collected');
                    
                    // Log final candidate count for debugging
                    setTimeout(() => {
                        this.peer._pc.getStats().then(stats => {
                            let hostCandidates = 0, srflxCandidates = 0, relayCandidates = 0;
                            stats.forEach(report => {
                                if (report.type === 'local-candidate') {
                                    switch (report.candidateType) {
                                        case 'host': hostCandidates++; break;
                                        case 'srflx': srflxCandidates++; break;
                                        case 'relay': relayCandidates++; break;
                                    }
                                }
                            });
                            console.log('📊 ICE candidates summary:', {
                                host: hostCandidates,
                                serverReflexive: srflxCandidates,
                                relay: relayCandidates
                            });
                            
                            // If no relay candidates, warn about potential NAT issues
                            if (relayCandidates === 0) {
                                console.warn('⚠️ No TURN relay candidates - may have issues with cross-network connections');
                            }
                        }).catch(e => console.log('Could not analyze ICE candidates:', e));
                    }, 1000);
                }
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
        console.error('Connection failure:', message);
        
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
        
        // Enhanced fallback for cross-device connections
        console.log('Attempting server-relayed transfer as fallback for cross-device connection');
        this.showToast('Direct connection failed. Using server relay...', 'info', 3000);
        
        // Update UI to show fallback mode
        const statusMessage = document.getElementById('status-message');
        const receiveMessage = document.getElementById('receive-message');
        
        if (statusMessage) {
            statusMessage.textContent = 'Using server relay for transfer...';
            statusMessage.className = 'status-fallback';
        }
        
        if (receiveMessage) {
            receiveMessage.textContent = 'Using server relay for transfer...';
            receiveMessage.className = 'status-fallback';
        }
        
        // Use server-relayed transfer as fallback
        setTimeout(() => {
            this.initiateServerRelayedTransfer();
        }, 2000);
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
    }    initiateServerRelayedTransfer() {
        console.log('Starting server-relayed transfer');
        
        if (this.selectedFiles && this.selectedFiles.length > 0) {
            // Sender side - upload files to server
            console.log('Acting as sender - uploading files to server');
            this.sendFilesViaServer();
        } else {
            // Receiver side - request files from server
            console.log('Acting as receiver - requesting files from server');
            this.requestFilesFromServer();
        }
    }    async sendFilesViaServer() {
        if (!this.selectedFiles.length || !this.currentCode) {
            console.error('No files or code available for server relay');
            this.showToast('No files selected or no transfer code available', 'error');
            return;
        }
        
        console.log('🚀 Starting server relay upload for', this.selectedFiles.length, 'files');
        
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = 'Uploading files to server...';
            statusMessage.className = 'status-uploading';
        }
        
        // Add timeout and error handling for server relay
        let uploadTimeout = setTimeout(() => {
            console.error('Server relay upload timeout');
            this.showToast('Upload timeout. Please try again.', 'error');
            if (statusMessage) {
                statusMessage.textContent = 'Upload timeout. Please try again.';
                statusMessage.className = 'status-error';
            }
        }, 30000); // 30 second timeout
        
        try {
            // Listen for upload acknowledgments with timeout
            const uploadPromises = [];
            
            for (let i = 0; i < this.selectedFiles.length; i++) {
                const file = this.selectedFiles[i];
                console.log(`📤 Uploading file ${i + 1}/${this.selectedFiles.length}: ${file.name}`);
                
                // Update progress
                if (statusMessage) {
                    statusMessage.textContent = `Uploading ${file.name} (${i + 1}/${this.selectedFiles.length})...`;
                }
                
                // Create upload promise for this file
                const uploadPromise = new Promise((resolve, reject) => {
                    const uploadTimeout = setTimeout(() => {
                        reject(new Error(`Upload timeout for file: ${file.name}`));
                    }, 10000);
                    
                    // Listen for this specific file upload acknowledgment
                    const ackHandler = (data) => {
                        if (data.fileIndex === i) {
                            clearTimeout(uploadTimeout);
                            this.socket.off('relay-file-upload-ack', ackHandler);
                            resolve(data);
                        }
                    };
                    
                    this.socket.on('relay-file-upload-ack', ackHandler);
                    
                    // Also listen for errors
                    const errorHandler = (error) => {
                        clearTimeout(uploadTimeout);
                        this.socket.off('relay-file-upload-ack', ackHandler);
                        this.socket.off('relay-error', errorHandler);
                        reject(new Error(error.error || 'Upload failed'));
                    };
                    
                    this.socket.on('relay-error', errorHandler);
                });
                  try {
                    console.log(`🔄 Processing file ${i + 1}/${this.selectedFiles.length}: ${file.name}`);
                    const fileData = await this.fileToBase64(file);
                    
                    console.log(`📋 File converted to base64: ${file.name} (${fileData.data.length} chars)`);
                    
                    // Validate file data before sending
                    if (!fileData.data || fileData.data.length === 0) {
                        throw new Error(`File conversion failed for: ${file.name}`);
                    }
                    
                    console.log(`📤 Sending file to server: ${file.name}`);
                    
                    // Send file to server with transfer code
                    this.socket.emit('relay-file-upload', {
                        code: this.currentCode,
                        fileData: {
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            lastModified: file.lastModified || Date.now(),
                            data: fileData.data
                        },
                        fileIndex: i,
                        totalFiles: this.selectedFiles.length
                    });
                    
                    console.log(`⏳ Waiting for upload acknowledgment for: ${file.name}`);
                    uploadPromises.push(uploadPromise);
                    
                } catch (fileError) {
                    console.error(`Error processing file ${file.name}:`, fileError);
                    throw new Error(`Failed to process file: ${file.name}`);
                }
                
                // Small delay to prevent overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Wait for all uploads to be acknowledged
            console.log('⏳ Waiting for all file uploads to be acknowledged...');
            await Promise.all(uploadPromises);
            
            // Send completion signal and wait for acknowledgment
            console.log('📋 Sending upload completion signal...');
            const completionPromise = new Promise((resolve, reject) => {
                const completionTimeout = setTimeout(() => {
                    reject(new Error('Upload completion timeout'));
                }, 5000);
                
                const completionHandler = (data) => {
                    if (data.code === this.currentCode) {
                        clearTimeout(completionTimeout);
                        this.socket.off('relay-upload-complete-ack', completionHandler);
                        resolve(data);
                    }
                };
                
                this.socket.on('relay-upload-complete-ack', completionHandler);
            });
            
            this.socket.emit('relay-upload-complete', {
                code: this.currentCode,
                totalFiles: this.selectedFiles.length
            });
            
            await completionPromise;
            
            clearTimeout(uploadTimeout);
            
            console.log('✅ All files uploaded successfully via server relay');
            
            if (statusMessage) {
                statusMessage.textContent = 'Files uploaded! Ready for download.';
                statusMessage.className = 'status-completed';
            }
            
            this.showToast('Files uploaded successfully! Ready for download.', 'success');
            
        } catch (error) {
            clearTimeout(uploadTimeout);
            console.error('❌ Error uploading files to server:', error);
            this.showToast('Upload failed: ' + error.message, 'error');
            
            if (statusMessage) {
                statusMessage.textContent = 'Upload failed. Please try again.';
                statusMessage.className = 'status-error';
            }
            
            // Clean up any event listeners
            this.socket.off('relay-file-upload-ack');
            this.socket.off('relay-upload-complete-ack');
            this.socket.off('relay-error');
        }
    }    requestFilesFromServer() {
        if (!this.currentCode) {
            console.error('No transfer code available for requesting files');
            this.showToast('No transfer code available', 'error');
            return;
        }
        
        console.log('🔽 Requesting files from server for code:', this.currentCode);
        
        const receiveMessage = document.getElementById('receive-message');
        if (receiveMessage) {
            receiveMessage.textContent = 'Connecting to server...';
            receiveMessage.className = 'status-connecting';
        }
        
        // Set up timeout for download request
        const downloadTimeout = setTimeout(() => {
            console.error('Server relay download timeout');
            this.showToast('Download timeout. Please try again.', 'error');
            if (receiveMessage) {
                receiveMessage.textContent = 'Download timeout. Please try again.';
                receiveMessage.className = 'status-error';
            }
        }, 30000); // 30 second timeout
        
        // Clear any existing event listeners to prevent duplicates
        this.socket.off('relay-file-download');
        this.socket.off('relay-download-complete');
        this.socket.off('relay-error');
        
        // Set up one-time event listeners for this download session
        let filesReceived = 0;
        let totalFilesExpected = 0;
        
        // Listen for individual file downloads
        this.socket.on('relay-file-download', (data) => {
            console.log(`📥 Receiving file from server: ${data.fileData.name} (${data.fileIndex + 1}/${data.totalFiles})`);
            
            if (totalFilesExpected === 0) {
                totalFilesExpected = data.totalFiles;
            }
            
            if (receiveMessage) {
                receiveMessage.textContent = `Downloading ${data.fileData.name} (${data.fileIndex + 1}/${data.totalFiles})...`;
                receiveMessage.className = 'status-downloading';
            }
            
            try {
                this.handleServerRelayedFile(data);
                filesReceived++;
                
                // Show progress
                const progress = (filesReceived / totalFilesExpected) * 100;
                this.showToast(`Downloaded ${data.fileData.name} (${filesReceived}/${totalFilesExpected})`, 'info', 2000);
                
            } catch (error) {
                console.error('Error processing downloaded file:', error);
                this.showToast(`Error processing ${data.fileData.name}`, 'error');
            }
        });
        
        // Listen for download completion
        this.socket.on('relay-download-complete', (data) => {
            clearTimeout(downloadTimeout);
            console.log('✅ Server relay download completed successfully');
            
            // Clean up event listeners
            this.socket.off('relay-file-download');
            this.socket.off('relay-download-complete');
            this.socket.off('relay-error');
            
            this.handleServerRelayComplete(data);
        });
        
        // Listen for errors
        this.socket.on('relay-error', (data) => {
            clearTimeout(downloadTimeout);
            console.error('❌ Server relay error:', data.error);
            
            // Clean up event listeners
            this.socket.off('relay-file-download');
            this.socket.off('relay-download-complete');
            this.socket.off('relay-error');
            
            this.showToast('Download failed: ' + data.error, 'error');
            
            if (receiveMessage) {
                receiveMessage.textContent = 'Download failed. Please try again.';
                receiveMessage.className = 'status-error';
            }
        });
        
        // Request files from server
        console.log('📨 Sending file request to server...');
        if (receiveMessage) {
            receiveMessage.textContent = 'Requesting files from server...';
            receiveMessage.className = 'status-requesting';
        }
        
        this.socket.emit('relay-file-request', {
            code: this.currentCode
        });
    }    handleServerRelayedFile(data) {
        const { fileData, fileIndex, totalFiles } = data;
        
        console.log(`📋 Processing relayed file ${fileIndex + 1}/${totalFiles}: ${fileData.name} (${this.formatFileSize(fileData.size)})`);
        
        try {
            // Validate file data
            if (!fileData.name || !fileData.data) {
                throw new Error('Invalid file data received from server');
            }
            
            // Convert base64 data to blob
            let blob;
            if (fileData.data.startsWith('data:')) {
                // Data URL format
                const response = fetch(fileData.data);
                blob = response.then(r => r.blob());
            } else {
                // Raw base64 - convert to blob
                try {
                    const binaryString = atob(fileData.data.split(',')[1] || fileData.data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    blob = new Blob([bytes], { type: fileData.type || 'application/octet-stream' });
                } catch (base64Error) {
                    console.error('Error decoding base64 data:', base64Error);
                    throw new Error('Failed to decode file data');
                }
            }
            
            // Store the file data for download
            if (!this.receivedFiles) {
                this.receivedFiles = [];
            }
            
            const fileObj = {
                name: fileData.name,
                size: fileData.size,
                type: fileData.type || 'application/octet-stream',
                blob: blob,
                url: blob instanceof Promise ? null : URL.createObjectURL(blob),
                data: fileData.data // Keep original data for backup
            };
            
            // Handle blob promise if needed
            if (blob instanceof Promise) {
                blob.then(resolvedBlob => {
                    fileObj.blob = resolvedBlob;
                    fileObj.url = URL.createObjectURL(resolvedBlob);
                    
                    // Add to received files array
                    this.receivedFiles.push(fileObj);
                    
                    console.log(`✅ File processed successfully: ${fileData.name}`);
                }).catch(error => {
                    console.error('Error processing blob promise:', error);
                    // Fallback: store without blob
                    this.receivedFiles.push(fileObj);
                });
            } else {
                // Add to received files array
                this.receivedFiles.push(fileObj);
                console.log(`✅ File processed successfully: ${fileData.name}`);
            }
            
        } catch (error) {
            console.error(`❌ Error processing file ${fileData.name}:`, error);
            // Still try to store the file for manual processing
            if (!this.receivedFiles) {
                this.receivedFiles = [];
            }
            this.receivedFiles.push({
                name: fileData.name,
                size: fileData.size,
                type: fileData.type,
                error: error.message,
                data: fileData.data
            });
            throw error; // Re-throw to trigger error handling in caller
        }
    }    handleServerRelayComplete(data) {
        console.log('✅ Server relay transfer completed successfully');
        
        const receiveMessage = document.getElementById('receive-message');
        if (receiveMessage) {
            receiveMessage.textContent = `${this.receivedFiles.length} files downloaded successfully!`;
            receiveMessage.className = 'status-complete';
        }
        
        // Show download interface
        this.showServerRelayedFiles();
        this.showToast(`Transfer complete! ${this.receivedFiles.length} files received.`, 'success');
    }

    showServerRelayedFiles() {
        if (!this.receivedFiles || this.receivedFiles.length === 0) {
            console.warn('No files to display');
            return;
        }

        console.log('📁 Displaying', this.receivedFiles.length, 'received files');
        
        const receivedFilesDiv = document.getElementById('received-files');
        let fileList = document.getElementById('received-file-list');
        
        if (!receivedFilesDiv) {
            console.error('received-files element not found');
            return;
        }

        // Create file list if it doesn't exist
        if (!fileList) {
            fileList = document.createElement('div');
            fileList.id = 'received-file-list';
            receivedFilesDiv.appendChild(fileList);
        }

        // Clear existing files to avoid duplicates
        fileList.innerHTML = '';
        
        // Show the section
        receivedFilesDiv.classList.remove('hidden');
        receivedFilesDiv.style.display = 'block';

        this.receivedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item received-file-item';
            fileItem.style.animation = 'slideInUp 0.3s ease-out';
            
            // Determine file icon
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
            } else if (file.name.toLowerCase().match(/\.(txt)$/)) {
                fileIcon = 'fa-file-alt';
            }
            
            // Create download functionality
            let downloadButton;
            if (file.url && !file.error) {
                // Direct blob download
                downloadButton = `
                    <a href="${file.url}" download="${file.name}" class="btn btn-primary download-btn">
                        <i class="fas fa-download"></i> Download
                    </a>
                `;
            } else if (file.data && !file.error) {
                // Create download from data
                downloadButton = `
                    <button onclick="app.downloadFileFromData(${index})" class="btn btn-primary download-btn">
                        <i class="fas fa-download"></i> Download
                    </button>
                `;
            } else {
                // Error case
                downloadButton = `
                    <button disabled class="btn btn-secondary download-btn">
                        <i class="fas fa-exclamation-triangle"></i> Error
                    </button>
                `;
            }

            fileItem.innerHTML = `
                <div class="file-info">
                    <i class="fas ${fileIcon}"></i>
                    <div class="file-details">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">(${this.formatFileSize(file.size)})</span>
                        ${file.error ? `<span class="file-error">Error: ${file.error}</span>` : ''}
                    </div>
                </div>
                ${downloadButton}
            `;
            
            fileList.appendChild(fileItem);
        });

        // Show download all button if there are multiple files without errors
        const validFiles = this.receivedFiles.filter(f => !f.error);
        if (validFiles.length > 1) {
            const downloadAllBtn = document.getElementById('download-all-btn');
            if (downloadAllBtn) {
                downloadAllBtn.classList.remove('hidden');
                downloadAllBtn.style.animation = 'fadeIn 0.3s ease-in-out';
            }
        }
    }

    downloadFileFromData(fileIndex) {
        const file = this.receivedFiles[fileIndex];
        if (!file || !file.data) {
            this.showToast('File data not available', 'error');
            return;
        }

        try {
            // Convert data URL or base64 to blob
            let blob;
            if (file.data.startsWith('data:')) {
                // Data URL - convert to blob
                fetch(file.data)
                    .then(res => res.blob())
                    .then(blob => {
                        this.triggerDownload(blob, file.name);
                    })
                    .catch(error => {
                        console.error('Error converting data URL to blob:', error);
                        this.showToast('Download failed', 'error');
                    });
            } else {
                // Base64 - convert to blob
                const binaryString = atob(file.data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                blob = new Blob([bytes], { type: file.type || 'application/octet-stream' });
                this.triggerDownload(blob, file.name);
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            this.showToast('Download failed: ' + error.message, 'error');
        }
    }

    triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    async sendFilesViaServer() {
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
            }, 100);        };

        reader.readAsDataURL(file);
    }
    
    handleIncomingData(data) {
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
            link.click();        document.body.removeChild(link);
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
        this.currentCode = code; // Store the code for server relay fallback
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
    
    // Test P2P connectivity without file transfer
    async testP2PConnectivity() {
        console.log('🧪 Testing P2P Connectivity...');
        
        if (typeof SimplePeer === 'undefined') {
            console.error('❌ SimplePeer not available');
            this.showToast('SimplePeer library not loaded', 'error');
            return;
        }
        
        console.log('📊 Testing with ICE servers:', this.getIceServersConfig().length, 'servers');
        
        try {
            // Create two peer connections for local testing
            const peer1 = new SimplePeer({
                initiator: true,
                trickle: true,
                config: {
                    iceServers: this.getIceServersConfig(),
                    iceCandidatePoolSize: 15,
                    iceTransportPolicy: 'all',
                    bundlePolicy: 'max-bundle',
                    rtcpMuxPolicy: 'require'
                }
            });
            
            const peer2 = new SimplePeer({
                initiator: false,
                trickle: true,
                config: {
                    iceServers: this.getIceServersConfig(),
                    iceCandidatePoolSize: 15,
                    iceTransportPolicy: 'all',
                    bundlePolicy: 'max-bundle',
                    rtcpMuxPolicy: 'require'
                }
            });
            
            // Log ICE candidates
            const logCandidates = (peer, name) => {
                if (peer._pc) {
                    peer._pc.onicecandidate = (event) => {
                        if (event.candidate) {
                            console.log(`🧊 ${name} ICE candidate:`, {
                                type: event.candidate.type,
                                protocol: event.candidate.protocol,
                                address: event.candidate.address,
                                port: event.candidate.port
                            });
                        }
                    };
                }
            };
            
            logCandidates(peer1, 'Peer1');
            logCandidates(peer2, 'Peer2');
            
            // Set up connection
            peer1.on('signal', data => {
                console.log('📤 Peer1 signal:', data.type);
                peer2.signal(data);
            });
            
            peer2.on('signal', data => {
                console.log('📤 Peer2 signal:', data.type);
                peer1.signal(data);
            });
            
            // Test connection success
            const testPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('P2P test timeout after 15 seconds'));
                }, 15000);
                
                peer1.on('connect', () => {
                    console.log('✅ P2P Connection successful!');
                    clearTimeout(timeout);
                    
                    // Test data transfer
                    peer1.send('Hello from peer1!');
                });
                
                peer2.on('data', (data) => {
                    console.log('📥 Received data:', data.toString());
                    peer2.send('Hello back from peer2!');
                });
                
                peer1.on('data', (data) => {
                    console.log('📥 Received data:', data.toString());
                    resolve('P2P test successful!');
                });
                
                peer1.on('error', reject);
                peer2.on('error', reject);
            });
            
            const result = await testPromise;
            console.log('🎉', result);
            this.showToast(result, 'success');
            
            // Cleanup
            peer1.destroy();
            peer2.destroy();
            
        } catch (error) {
            console.error('❌ P2P test failed:', error.message);
            this.showToast(`P2P test failed: ${error.message}`, 'warning');
            
            console.log('💡 This is normal for cross-device scenarios. Server relay will be used instead.');
        }
    }
    
    // Get ICE servers configuration
    getIceServersConfig() {
        return [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun.stunprotocol.org:3478' },
            { urls: 'stun:stun.voiparound.com' },
            { urls: 'stun:stun.voipbuster.com' },
            { urls: 'stun:stun.voipstunt.com' },
            { urls: 'stun:stun.voxgratia.org' },
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
            {
                urls: ['turn:relay1.expressturn.com:3478'],
                username: 'efJBIBVP6ETOFD3XKX',
                credential: 'WmtzanB3ZnpERzRYVw'
            },
            {
                urls: 'turn:numb.viagenie.ca',
                username: 'webrtc@live.com',
                credential: 'muazkh'
            },
            {
                urls: ['turn:turn.bistri.com:80'],
                username: 'homeo',
                credential: 'homeo'
            },
            {
                urls: ['turn:turn.anyfirewall.com:443?transport=tcp'],
                username: 'webrtc',
                credential: 'webrtc'
            }
        ];
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
