import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useDropzone } from 'react-dropzone';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  FiUploadCloud, 
  FiDownloadCloud, 
  FiFile, 
  FiTrash2, 
  FiChevronLeft, 
  FiChevronRight, 
  FiArrowLeft,
  FiMaximize,
  FiVideo,
  FiImage,
  FiFileText,
  FiFilePlus
} from 'react-icons/fi';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './FileTransfer.css';

import ErrorBoundary from '../ui/ErrorBoundary';
import FileShareAPI from '../../services/api';
import P2PFileShareAPI from '../../services/api-p2p';
import InstantFileShare from '../../services/instant-file-share';
import ChunkedUploadService from '../../services/chunked-upload';

// Set up PDF.js worker - using CDN for better compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Main container for the file transfer component
const FileTransferContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  background-color: transparent;
`;

// Container for the two sections (send and receive)
const TransferBoxesContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  margin-top: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

// Base styles for each transfer box
const TransferBox = styled.div`
  background: #FFFFFF;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  border: 1px solid #E5E7EB;
  
  @media (max-width: 480px) {
    padding: 1.5rem;
  }
`;

const BoxTitle = styled.h2`
  font-size: 1.5rem;
  color: #000000;
  margin-bottom: 0.5rem;
  text-align: center;
`;

const BoxSubtitle = styled.p`
  font-size: 1rem;
  color: #4B5563;
  opacity: 0.9;
  margin-bottom: 2rem;
  text-align: center;
`;

const SendFilesBox = styled(TransferBox)`
  align-items: center;
`;

const ReceiveFilesBox = styled(TransferBox)`
  align-items: center;
`;

// Upload container
const UploadContainer = styled.div`
  width: 100%;
`;

// Dropzone container
const DropzoneContainer = styled.div`
  border: 2px dashed ${props => props.isDragActive ? '#111111' : '#000000'};  
  background: ${props => props.isDragActive ? 'rgba(17, 17, 17, 0.03)' : '#FFFFFF'};
  border-radius: 20px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.2, 0, 0.2, 1);
  margin-bottom: 1.5rem;
  position: relative;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 2.5rem 1.5rem;
  }
  
  @media (max-width: 480px) {
    padding: 2rem 1rem;
    margin-bottom: 1rem;  }    &:hover {
    border-color: #111111;
    background: rgba(17, 17, 17, 0.03);
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
  }
`;

const UploadIcon = styled.div`
  font-size: 3rem;
  color: #000000;
  margin-bottom: 1rem;
`;

const UploadText = styled.p`
  font-size: 1.1rem;
  color: var(--text-color, #111827);
  margin-bottom: 0.5rem;
  
  @media (max-width: 480px) {
    font-size: 1rem;
  }
`;

const UploadSubtext = styled.p`
  font-size: 0.9rem;
  color: var(--muted-text, #4B5563);
  opacity: 0.7;
  
  @media (max-width: 480px) {
    font-size: 0.8rem;
  }
`;

const FileList = styled.div`
  margin-top: 2rem;
  width: 100%;
  
  @media (max-width: 480px) {
    margin-top: 1.5rem;
  }
`;

const FileItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 10px;
  margin-bottom: 0.5rem;  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;    
  &:hover {
    background: rgba(17, 17, 17, 0.03);
  }
  &.selected {
    border-color: #111111;
    background: rgba(17, 17, 17, 0.03);
  }
    .delete-button {
    color: #4B5563;
    opacity: 0.7;
    margin-left: 10px;
    transition: all 0.2s ease;
    padding: 5px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
      opacity: 1;
      transform: scale(1.1);
      background-color: rgba(75, 85, 99, 0.1);
    }
  }
  
  @media (max-width: 480px) {
    padding: 0.6rem 0.8rem;
    flex-direction: column;
    align-items: flex-start;
  }
`;

const FileName = styled.span`
  font-size: 0.9rem;
  color: #4B5563;
  
  @media (max-width: 480px) {
    font-size: 0.85rem;
    margin-bottom: 0.3rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
`;

const FileSize = styled.span`
  font-size: 0.8rem;
  color: #4B5563;
  opacity: 0.7;
  
  @media (max-width: 480px) {
    font-size: 0.75rem;
  }
`;

const SendButton = styled.button`
  background: #000000;
  color: white;
  font-weight: 600;
  padding: 1rem 3rem;
  border-radius: 50px;
  font-size: 1.1rem;
  transition: all 0.3s ease;  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
  margin-top: 1rem;
  border: none;
  cursor: pointer;
  
  @media (max-width: 768px) {
    padding: 0.9rem 2.5rem;
    font-size: 1rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.8rem 2rem;
    font-size: 0.95rem;
    width: 100%;  }    &:hover {
    transform: translateY(-2px);
    background: #1F2937;
    box-shadow: 0 7px 20px rgba(0, 0, 0, 0.1);
  }
    &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`;

// Progress bar components (kept for download progress)
const ProgressBarContainer = styled.div`
  width: 100%;
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(17, 17, 17, 0.03);
  border-radius: 10px;
  border: 1px solid #E5E7EB;
`;

const ProgressBarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const ProgressFileName = styled.div`
  font-size: 0.9rem;
  color: #000000;
  font-weight: 500;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  flex: 1;
  margin-right: 1rem;
`;

const ProgressPercentage = styled.div`
  font-size: 0.9rem;
  color: #000000;
  font-weight: 600;
  min-width: 40px;
  text-align: right;
`;

const ProgressBarTrack = styled.div`
  width: 100%;
  height: 8px;
  background: #E5E7EB;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
`;

const ProgressBarFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #000000 0%, #1F2937 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
  width: ${props => props.progress}%;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const ProgressFileInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #4B5563;
`;

// Status message components
const StatusMessage = styled.div`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
  transition: all 0.3s ease;
  background: ${props => 
    props.type === 'error' ? 'rgba(255, 107, 107, 0.1)' :
    props.type === 'success' ? 'rgba(76, 175, 80, 0.1)' :
    'rgba(33, 150, 243, 0.1)'
  };
  color: ${props => 
    props.type === 'error' ? '#ff6b6b' :
    props.type === 'success' ? '#4caf50' :
    '#2196f3'
  };
  border: 1px solid ${props => 
    props.type === 'error' ? 'rgba(255, 107, 107, 0.2)' :
    props.type === 'success' ? 'rgba(76, 175, 80, 0.2)' :
    'rgba(33, 150, 243, 0.2)'
  };
`;

// Download section components
const DownloadIcon = styled.div`
  font-size: 3.5rem;
  color: #4B5563;
  margin-bottom: 1rem;
`;

const DownloadInputContainer = styled.div`
  width: 100%;
  margin-bottom: 2rem;
  
  @media (max-width: 480px) {
    margin-bottom: 1.5rem;
  }
`;

const InputLabel = styled.p`
  font-size: 1rem;
  color: #4B5563;
  text-align: left;
  margin-bottom: 0.5rem;
  font-weight: 500;
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
    margin-bottom: 0.4rem;
  }
`;

const DownloadInput = styled.div`
  display: flex;
  width: 100%;
  border: 2px solid var(--light-gray, #e0e0e0);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.2, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  @media (max-width: 480px) {
    flex-direction: column;
    border-radius: 8px;
  }  &:focus-within {
    border-color: var(--secondary-color);
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
  }
`;

const StyledInput = styled.input`
  flex: 1;
  padding: 1rem;
  border: none;  font-size: 1rem;
  color: #000000;
  transition: background-color 0.3s ease;
  background: white;
  border-radius: 8px 0 0 8px;
  
  @media (max-width: 480px) {
    padding: 0.8rem;
    font-size: 0.9rem;
    border-radius: 8px 8px 0 0;
  }
  
  &:focus {
    outline: none;
    background: white;
  }
  
  &::placeholder {
    color: #9e9e9e;
  }
`;

const InputButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000000;
  color: white;
  border: none;
  border-radius: 0 8px 8px 0;
  padding: 0 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  
  @media (max-width: 480px) {
    padding: 0.8rem;
    width: 100%;
    border-radius: 0 0 8px 8px;
  }
    &:hover:not(:disabled) {
    background: #1F2937;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const OrDivider = styled.div`
  width: 100%;
  text-align: center;
  position: relative;
  margin: 1.5rem 0;
  
  @media (max-width: 480px) {
    margin: 1.2rem 0;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: #E5E7EB;
  }
    span {
    position: relative;
    background: white;
    padding: 0.2rem 1rem;
    color: #4B5563;
    font-size: 0.9rem;
    border-radius: 20px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    
    @media (max-width: 480px) {
      font-size: 0.85rem;
      padding: 0.2rem 0.8rem;
    }
  }
`;

// File Preview Components
const PreviewContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const PreviewHeader = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  background: transparent;
  color: #000000;
  padding: 0.5rem;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(17, 17, 17, 0.05);
  }
`;

const PreviewTitle = styled.h3`
  font-size: 1.2rem;
  color: #000000;
  margin: 0;
  flex: 1;
  text-align: center;
  
  @media (max-width: 480px) {
    font-size: 1rem;
  }
`;

const FullscreenButton = styled.button`
  background: transparent;
  color: #000000;
  padding: 0.5rem;
  border: none;
  border-radius: 50%;  cursor: pointer;
  transition: all 0.2s ease;
    &:hover {
    background: rgba(17, 17, 17, 0.05);
  }
`;

const MediaPreviewContainer = styled.div`
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  background: #000;
  margin-bottom: 1.5rem;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
  
  /* Default aspect ratio for images and videos */
  aspect-ratio: 16 / 9;
  
  /* Remove aspect ratio constraints for PDFs to show full page */
  &:has(.pdf-preview) {
    aspect-ratio: unset;
    height: auto;
    background: #f8f8f8;
    /* Remove min-height to fit content exactly */
  }
    @media (max-width: 768px) {
    aspect-ratio: 4 / 3;
    
    &:has(.pdf-preview) {
      aspect-ratio: unset;
      height: auto;
      background: #FFFFFF;
      /* Remove min-height to fit content exactly */
    }
  }
`;

const VideoPreview = styled.video`
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
`;

const ImagePreview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #f8f8f8;
`;

const FilePreview = styled.div`
  width: 100%;
  height: 100%;
  background: #f8f8f8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: var(--dark-gray, #555);
`;

const FilePreviewIcon = styled.div`
  font-size: 4rem;
  color: #000000;
  margin-bottom: 1rem;
`;

// Unsupported video format components
const UnsupportedVideoContainer = styled.div`
  width: 100%;
  height: 100%;
  background: #f8f8f8;
  display: flex;
  align-items: center;  justify-content: center;
  flex-direction: column;
  color: #4B5563;
  text-align: center;
  padding: 2rem;
`;

const UnsupportedVideoIcon = styled.div`
  font-size: 4rem;
  color: #ff6b6b;
  margin-bottom: 1.5rem;
`;

const UnsupportedVideoTitle = styled.h3`
  font-size: 1.5rem;
  color: #000000;
  margin-bottom: 1rem;
`;

const UnsupportedVideoText = styled.p`
  font-size: 1rem;
  color: #4B5563;
  opacity: 0.9;
  line-height: 1.5;
  margin-bottom: 0.5rem;
`;

const UnsupportedVideoFormat = styled.span`
  font-weight: bold;
  color: #ff6b6b;
  text-transform: uppercase;
`;

// PDF Preview Components
const PDFContainer = styled.div`
  width: 100%;
  background: #f8f8f8;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  /* Remove height: 100% and justify-content: center to fit content */
`;

const PDFPageContainer = styled.div`
  width: 100%;
  /* Remove fixed height to let content determine size */
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  
  .react-pdf__Page {
    max-width: 100% !important;
    height: auto !important;
    margin: 0 !important;
  }
  
  .react-pdf__Page__canvas {
    max-width: 100% !important;
    height: auto !important;
    display: block;
  }
`;

const PDFNavigationControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 1rem 0;
  
  @media (max-width: 480px) {
    gap: 0.5rem;
    margin: 0.8rem 0;
  }
`;

const PDFNavButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.disabled ? '#f0f0f0' : 'white'};
  color: ${props => props.disabled ? '#aaa' : 'var(--primary-color, #000000)'};
  border: 2px solid ${props => props.disabled ? '#f0f0f0' : 'var(--primary-color, #000000)'};
  border-radius: 8px;
  padding: 0.5rem;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  min-width: 40px;
  height: 40px;
    &:hover:not(:disabled) {
    background: #1F2937;
    color: white;
  }
  
  svg {
    font-size: 1.2rem;
  }
  
  @media (max-width: 480px) {
    min-width: 36px;
    height: 36px;
    padding: 0.4rem;
    
    svg {
      font-size: 1rem;
    }
  }
`;

const PDFPageInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;  background: white;
  border: 2px solid var(--primary-color);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--primary-color, #000000);
  min-width: 120px;
  text-align: center;
  
  @media (max-width: 480px) {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    min-width: 100px;
  }
`;

const PDFControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 1rem 0;
  flex-wrap: wrap;
  
  @media (max-width: 480px) {
    gap: 0.5rem;
    margin: 0.8rem 0;
  }
`;

const PDFControlButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.disabled ? '#f0f0f0' : 'white'};
  color: ${props => props.disabled ? '#aaa' : 'var(--primary-color)'};
  border: 2px solid ${props => props.disabled ? '#f0f0f0' : 'var(--primary-color)'};
  border-radius: 8px;
  padding: 0.5rem;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  min-width: 40px;
  height: 40px;
    &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.05);
  }
  
  svg {
    font-size: 1.2rem;
  }
  
  @media (max-width: 480px) {
    min-width: 36px;
    height: 36px;
    padding: 0.4rem;
    
    svg {
      font-size: 1rem;
    }  }
`;

const PDFZoomInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;  background: white;
  border: 2px solid var(--secondary-color);
  border-radius: 8px;
  padding: 0.5rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--secondary-color, #4B5563);
  min-width: 80px;
  text-align: center;
  
  @media (max-width: 480px) {
    padding: 0.4rem 0.6rem;
    font-size: 0.75rem;
    min-width: 70px;
  }
`;

const PDFLoadingContainer = styled.div`
  width: 100%;
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border-radius: 8px;
  color: #4B5563;
`;

const PDFErrorContainer = styled.div`
  width: 100%;
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 107, 107, 0.05);
  border: 2px dashed #ff6b6b;
  border-radius: 8px;
  color: #ff6b6b;
  text-align: center;
  padding: 2rem;
`;

const FileInfoContainer = styled.div`
  width: 100%;
  padding: 1.5rem;
  background: white;
  border-radius: 10px;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
`;

const FileInfoTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const FileInfoRow = styled.tr`
  border-bottom: 1px solid #E5E7EB;
  
  &:last-child {
    border-bottom: none;
  }
`;

const FileInfoLabel = styled.td`
  padding: 0.8rem 0;
  font-size: 0.9rem;
  color: #000000;
  font-weight: 500;
  width: 40%;
  
  @media (max-width: 480px) {
    font-size: 0.85rem;
  }
`;

const FileInfoValue = styled.td`
  padding: 0.8rem 0;
  font-size: 0.9rem;
  color: #4B5563;
  
  @media (max-width: 480px) {
    font-size: 0.85rem;
  }
`;

const NavigationButtons = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin: 1rem 0 1.5rem;
`;

const NavigationButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.disabled ? '#f0f0f0' : 'white'};
  color: ${props => props.disabled ? '#aaa' : '#000000'};
  border: 2px solid ${props => props.disabled ? '#f0f0f0' : '#111111'};
  border-radius: 50px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
    &:hover:not(:disabled) {
    background: #1F2937;
    color: white;
    border-color: #1F2937;
  }
  
  svg {
    margin: ${props => props.prev ? '0 5px 0 0' : '0 0 0 5px'};
  }
`;

const VerificationCodeContainer = styled.div`
  width: 100%;
  text-align: center;
  margin: 1rem 0 2rem;
  padding: 1.5rem;
  border-radius: 10px;
  background: rgba(17, 17, 17, 0.03);
  border: 1px solid #E5E7EB;
`;

const VerificationCodeTitle = styled.p`
  font-size: 1rem;
  color: #4B5563;
  margin-bottom: 1rem;
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
  }
`;

const VerificationCode = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
`;

const VerificationDigit = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 50px;
  background: white;
  border-radius: 8px;
  font-size: 1.5rem;
  font-weight: 700;
  color: #000000;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  
  @media (max-width: 480px) {
    width: 30px;
    height: 40px;
    font-size: 1.2rem;
  }
`;

// Helper function to format file size
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Helper function to get file extension
const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
};

// Helper function to check if a video format is supported by the browser
const isVideoFormatSupported = (file) => {
  const videoElement = document.createElement('video');
  const extension = getFileExtension(file.name).toLowerCase();
  
  // Common formats with good browser support
  const wellSupportedFormats = ['mp4', 'webm', 'ogg'];
    // Formats with limited or no browser support
  const poorlySupportedFormats = ['wmv', 'flv', 'mkv', 'avi'];
  
  // If it's in our known well-supported list, return true
  if (wellSupportedFormats.includes(extension)) {
    return true;
  }
  
  // If it's in our known poorly-supported list, return false
  if (poorlySupportedFormats.includes(extension)) {
    return false;
  }
  
  // For other formats, try to detect support
  // This is not 100% reliable but can help with some formats
  try {
    return Boolean(videoElement.canPlayType(file.type));
  } catch (e) {
    return false;
  }
};

// Helper function to determine file type
const getFileType = (file) => {
  const extension = getFileExtension(file.name);
  
  // Image types
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
    return 'image';
  }
  
  // Video types
  if (['mp4', 'webm', 'ogg', 'mov', 'wmv', 'flv', 'mkv'].includes(extension)) {
    return 'video';
  }
  
  // Audio types
  if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(extension)) {
    return 'audio';
  }
    // Text/code files
  if (['txt', 'md', 'json', 'js', 'html', 'css', 'csv', 'xml', 'py', 'java', 'c', 'cpp'].includes(extension)) {
    return 'text';
  }
  
  // PDF files
  if (['pdf'].includes(extension)) {
    return 'pdf';
  }
  
  // Default: other/binary file
  return 'other';
};

const FileTransfer = () => {
  const [files, setFiles] = useState([]);
  const [downloadCode, setDownloadCode] = useState('');  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');
  const [uploadStatus, setUploadStatus] = useState(''); // For upload feedback
  const [downloadStatus, setDownloadStatus] = useState(''); // For download feedback
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
    // Download progress state
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentDownloadFileName, setCurrentDownloadFileName] = useState('');
  const [downloadFileIndex, setDownloadFileIndex] = useState(0);
  const [totalDownloadFiles, setTotalDownloadFiles] = useState(0);
  const [downloadMethod, setDownloadMethod] = useState('');
  
  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadFileName, setCurrentUploadFileName] = useState('');
  const [uploadFileIndex, setUploadFileIndex] = useState(0);
  const [totalUploadFiles, setTotalUploadFiles] = useState(0);
  const [uploadMethod, setUploadMethod] = useState('');
    const videoRef = useRef(null);
  const pdfUrlRef = useRef(null);
    // InstantFileShare service instance for P2P-first transfers
  const instantFileShare = useRef(new InstantFileShare()).current;
  
  // ChunkedUploadService instance for large file uploads
  const chunkedUploadService = useRef(new ChunkedUploadService()).current;
  
  // PDF-specific state
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [pdfNumPages, setPdfNumPages] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);  const [pdfError, setPdfError] = useState(null);
  const [pdfFileData, setPdfFileData] = useState(null);
  const [currentPdfFile, setCurrentPdfFile] = useState(null);
  
  // Note: Verification code is now set only after successful upload, not automatically// Create PDF data URL for PDF.js to avoid ArrayBuffer detachment issues
  const loadPDFFile = useCallback(async (file) => {
    try {
      setPdfLoading(true);
      setPdfError(null);
      
      // Create a blob URL instead of using ArrayBuffer directly
      // This prevents ArrayBuffer detachment issues
      const pdfUrl = URL.createObjectURL(file);
      
      // Store the URL for cleanup later
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
      pdfUrlRef.current = pdfUrl;
      
      setPdfFileData(pdfUrl);
      setCurrentPdfFile(file);
      return pdfUrl;
    } catch (error) {
      console.error('Error loading PDF file:', error);
      setPdfError('Failed to load PDF file');
      setPdfLoading(false);
      return null;
    }
  }, []);  // Cleanup PDF URL when component unmounts
  useEffect(() => {
    return () => {
      // Clean up PDF URL
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
    };
  }, []);    // Handle PDF loading when  file changes
  useEffect(() => {
    if (isPreviewMode && files.length > 0 && selectedFileIndex < files.length) {
      const currentFile = files[selectedFileIndex];
      const fileType = getFileType(currentFile);
      
      // Only load PDF if it's a PDF file and we haven't loaded this specific file yet
      if (fileType === 'pdf' && currentFile !== currentPdfFile && !pdfLoading) {
        loadPDFFile(currentFile);
      }
    }
  }, [isPreviewMode, selectedFileIndex, files]);

  // Handle file drop functionality
  const onDrop = useCallback(acceptedFiles => {
    // Append new files to existing files
    setFiles(prevFiles => [...prevFiles, ...acceptedFiles.map(file => 
      Object.assign(file, {
        preview: URL.createObjectURL(file)
      })
    )]);
  }, []);

  // Initialize useDropzone hook
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });
  // Delete file from list
  const handleDeleteFile = (index, e) => {
    e.stopPropagation(); // Prevent triggering other click events
    
    // Create a new array to avoid mutation
    const currentFiles = [...files];
    const deletedFile = currentFiles[index];
    
    // Clean up preview URL to prevent memory leaks
    if (deletedFile && deletedFile.preview) {
      URL.revokeObjectURL(deletedFile.preview);
    }
    
    // Remove the file from the array
    currentFiles.splice(index, 1);
    
    // If we're in preview mode and delete the current file, adjust accordingly
    if (isPreviewMode) {
      if (currentFiles.length === 0) {
        // If no files left, exit preview mode
        setIsPreviewMode(false);
      } else if (selectedFileIndex >= currentFiles.length) {
        // If the deleted file was the last one, select the new last file
        setSelectedFileIndex(currentFiles.length - 1);
      }
    }
    
    // Update files state
    setFiles([...currentFiles]);
  };  // Helper function to handle chunked upload for large files
  const handleChunkedUpload = async (largeFiles) => {
    console.log(`📤 Starting chunked upload for ${largeFiles.length} large file(s)...`);
    
    try {
      // Use batch upload for multiple files
      if (largeFiles.length > 1) {
        console.log(`📦 Using batch upload for ${largeFiles.length} files`);
        
        const result = await chunkedUploadService.uploadBatch(
          largeFiles,
          // Progress callback
          (progressUpdate) => {
            console.log('📊 Batch upload progress:', progressUpdate);
            setUploadProgress(Math.round(progressUpdate.percentage || 0));
            setCurrentUploadFileName(`File ${progressUpdate.fileIndex || 1}/${largeFiles.length}`);
            setUploadFileIndex(progressUpdate.fileIndex || 1);
            setTotalUploadFiles(largeFiles.length);
            setUploadMethod('chunked');
          },
          // Completion callback
          (completedUpdate) => {
            console.log('✅ Batch upload completed:', completedUpdate);
            setUploadStatus(`${largeFiles.length} files uploaded with code: ${completedUpdate.downloadCode}`);
          }
        );
        
        if (result.success) {
          // Set verification code from the successful batch upload
          setVerificationCode(result.downloadCode);
          setSelectedFileIndex(0);
          setIsPreviewMode(true);
          
          return [result]; // Return as array to maintain the expected return type
        }
        
        return [];
      } else {
        // Single file upload uses the original method
        const results = [];
        const file = largeFiles[0];
        
        console.log(`🔄 Uploading single large file: ${file.name} (${formatBytes(file.size)})`);
        
        const result = await chunkedUploadService.uploadFile(
          file,
          // Progress callback
          (progressUpdate) => {
            console.log('📊 Chunked upload progress:', progressUpdate);
            setUploadProgress(Math.round(progressUpdate.percentage || 0));
            setCurrentUploadFileName(progressUpdate.fileName || file.name);
            setUploadFileIndex(1);
            setTotalUploadFiles(1);
            setUploadMethod('chunked');
          },
          // Completion callback
          (completedUpdate) => {
            console.log('✅ Chunked upload completed:', completedUpdate);
            setUploadStatus(`File uploaded: ${file.name}`);
          }
        );
        
        if (result.success) {
          results.push(result);
          setVerificationCode(result.downloadCode);
          setSelectedFileIndex(0);
          setIsPreviewMode(true);
        }
        
        return results;
      }
    } catch (error) {
      console.error(`❌ Failed to upload file(s):`, error);
      throw error;
    }
  };

  // Helper function to handle standard upload for smaller files
  const handleStandardUpload = async (smallFiles) => {
    console.log(`📤 Starting standard P2P-first upload for ${smallFiles.length} file(s)...`);
    
    return await instantFileShare.generateCodeAndPrepareTransfer(
      smallFiles,
      // Status update callback
      (statusUpdate) => {
        console.log('📡 Status update:', statusUpdate);
        
        switch (statusUpdate.status) {
          case 'generating-code':
            setUploadStatus('Generating sharing code...');
            setUploadProgress(5);
            break;
          case 'ready':
            // Set the verification code immediately (SendAnywhere style)
            setVerificationCode(statusUpdate.code);
            setUploadStatus(`Code generated: ${statusUpdate.code} - Ready to share!`);
            setUploadProgress(15);
            // Show the code immediately
            setSelectedFileIndex(0);
            setIsPreviewMode(true);
            break;
          case 'peer-connected':
            setUploadStatus('Receiver connected! Starting P2P transfer...');
            setUploadProgress(20);
            setUploadMethod('p2p');
            break;
          case 'fallback':
            setUploadStatus('P2P timeout - Uploading to server...');
            setUploadMethod('server');
            break;
          case 'server-upload':
            setUploadStatus('Uploading files to server...');
            setUploadMethod('server');
            break;
          case 'complete':
            setUploadProgress(100);
            if (statusUpdate.method === 'p2p') {
              setUploadStatus(`Files shared via P2P! Use code: ${verificationCode}`);
            } else {
              setUploadStatus(`Files uploaded to server! Use code: ${verificationCode}`);
            }
            setTimeout(() => setUploadStatus(''), 5000);
            break;
          case 'error':
            setUploadStatus(`Error: ${statusUpdate.message}`);
            setTimeout(() => setUploadStatus(''), 5000);
            break;
        }
      },
      // Progress update callback
      (progressUpdate) => {
        console.log('📊 Progress update:', progressUpdate);
        setUploadProgress(Math.round(progressUpdate.percentage || 0));
        setCurrentUploadFileName(progressUpdate.fileName || 'Processing...');
        setUploadFileIndex(progressUpdate.index || 1);
        setUploadMethod(progressUpdate.type || 'preparing');
        setTotalUploadFiles(progressUpdate.total || smallFiles.length);
      }
    );
  };

  // Handle send files - Smart routing between chunked upload and P2P-first transfer
  const handleSendFiles = async () => {
    if (files.length === 0) return;
    
    console.log('📁 Files selected for smart upload routing:', files.length, 'file(s)...');
    setIsUploading(true);
    
    // Initialize upload progress state
    setUploadProgress(0);
    setCurrentUploadFileName('');
    setUploadFileIndex(0);
    setTotalUploadFiles(files.length);
    setUploadMethod('');    try {
      // ALL files now use chunked upload system for consistent progress tracking
      console.log(`📊 All files will use chunked upload system with progress tracking`);
      
      // Use chunked upload for ALL files (no size-based routing)
      setUploadStatus(`Uploading ${files.length} file(s) using chunked upload...`);
      await handleChunkedUpload(files);
      
      // Final completion
      setUploadProgress(100);
      setUploadStatus(`Upload completed! Files are ready to share.`);
      setTimeout(() => setUploadStatus(''), 5000);
      
      console.log('✅ Smart upload process completed successfully');
      
    } catch (error) {
      console.error('❌ Upload error:', error);
      setUploadStatus(`Upload failed: ${error.message}`);
      setTimeout(() => setUploadStatus(''), 5000);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        // Reset upload progress state
        setUploadProgress(0);
        setCurrentUploadFileName('');
        setUploadFileIndex(0);
        setTotalUploadFiles(0);
        setUploadMethod('');
      }, 1000); // Small delay to show completion
    }
  };// Handle file download - Using InstantFileShare for P2P-first downloads
  const handleDownload = async (e) => {
    e.preventDefault();
    
    if (!downloadCode || downloadCode.trim().length === 0) {
      setDownloadStatus('Please enter a code');
      setTimeout(() => setDownloadStatus(''), 3000);
      return;
    }
    
    if (downloadCode.length !== 6 || !/^\d{6}$/.test(downloadCode)) {
      setDownloadStatus('Please enter a valid 6-digit code');
      setTimeout(() => setDownloadStatus(''), 3000);
      return;
    }
    
    setIsDownloading(true);
    
    // Reset download progress state
    setDownloadProgress(0);
    setCurrentDownloadFileName('');
    setDownloadFileIndex(0);
    setTotalDownloadFiles(0);
    setDownloadMethod('');
    
    try {
      // Use InstantFileShare for P2P-first downloads with server fallback
      await instantFileShare.receiveFiles(
        downloadCode,
        // Progress update callback
        (progressUpdate) => {
          console.log('📊 Download progress:', progressUpdate);
          setDownloadProgress(Math.round(progressUpdate.percentage || 0));
          setCurrentDownloadFileName(progressUpdate.fileName || 'Downloading...');
          setDownloadFileIndex(progressUpdate.index || 1);
          setDownloadMethod(progressUpdate.type || 'checking');
          
          // Also update status text for additional context
          if (progressUpdate.type === 'p2p') {
            setDownloadStatus(`P2P Download: ${Math.round(progressUpdate.percentage)}% (${progressUpdate.fileName})`);
          } else if (progressUpdate.type === 'server') {
            setDownloadStatus(`Server Download: ${Math.round(progressUpdate.percentage)}% (${progressUpdate.fileName})`);
          }
        },
        // Status update callback
        (statusUpdate) => {
          console.log('📡 Download status:', statusUpdate);
          
          switch (statusUpdate.status) {
            case 'checking-code':
              setDownloadStatus('Validating code...');
              setDownloadProgress(5);
              break;
            case 'code-valid':
              setDownloadStatus(statusUpdate.message);
              setDownloadProgress(10);
              break;
            case 'connecting':
              setDownloadStatus('Connecting to sender...');
              setDownloadProgress(15);
              setDownloadMethod('p2p');
              break;
            case 'server-download':
              setDownloadStatus('Downloading from server...');
              setDownloadMethod('server');
              break;
            case 'complete':
              setDownloadProgress(100);
              if (statusUpdate.method === 'p2p') {
                setDownloadStatus('P2P download completed! Check your Downloads folder.');
              } else {
                setDownloadStatus('Download completed! Check your Downloads folder.');
              }
              setTimeout(() => setDownloadStatus(''), 5000);
              break;
            case 'error':
              setDownloadStatus(`Error: ${statusUpdate.message}`);
              setTimeout(() => setDownloadStatus(''), 5000);
              break;
          }
        }
      );
      
    } catch (error) {
      console.error('Download error:', error);
      setDownloadStatus(`Download failed: ${error.message}`);
      setTimeout(() => setDownloadStatus(''), 5000);
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        // Reset download progress state
        setDownloadProgress(0);
        setCurrentDownloadFileName('');
        setDownloadFileIndex(0);
        setTotalDownloadFiles(0);
        setDownloadMethod('');
      }, 1000);
    }
  };

  // Toggle fullscreen for media
  const toggleFullscreen = () => {
    const element = videoRef.current || document.querySelector('.media-preview');
    if (element) {
      if (!document.fullscreenElement) {
        element.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });      } else {
        document.exitFullscreen();
      }
    }
  };  // Check peer connection status - used for P2P transfers
  const checkPeerConnectionStatus = useCallback((p2pInstance, timeout = 5000) => {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (p2pInstance?.localConnection?.connectionState === 'connected') {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 500);
      
      // Timeout after specified time
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, timeout);
    });
  }, []);

  // Handle file selection for preview - memoized to prevent unnecessary re-renders
  const handleFileSelect = useCallback((index) => {
    // Clean up previous PDF URL
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }
    
    setSelectedFileIndex(index);
    setIsPreviewMode(true);
    // Reset PDF state when switching files
    setPdfPageNumber(1);
    setPdfNumPages(null);
    setPdfError(null);
    setPdfFileData(null);
    setCurrentPdfFile(null);
    
    // No need to manually load PDF here, useEffect will handle it
  }, []);

  // Handle navigation between files in preview mode - memoized
  const handlePrevFile = useCallback(() => {
    if (selectedFileIndex > 0) {
      // Clean up previous PDF URL
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
      }
      
      setSelectedFileIndex(prevIndex => prevIndex - 1);
      // Reset PDF state when switching files
      setPdfPageNumber(1);
      setPdfNumPages(null);
      setPdfError(null);
      setPdfFileData(null);
      setCurrentPdfFile(null);
    }
  }, [selectedFileIndex]);

  const handleNextFile = useCallback(() => {
    if (selectedFileIndex < files.length - 1) {
      // Clean up previous PDF URL
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
      }
      
      setSelectedFileIndex(prevIndex => prevIndex + 1);
      // Reset PDF state when switching files
      setPdfPageNumber(1);
      setPdfNumPages(null);
      setPdfError(null);
      setPdfFileData(null);
      setCurrentPdfFile(null);
    }
  }, [selectedFileIndex, files.length]);

  // Exit preview mode - memoized
  const handleBackToFiles = useCallback(() => {
    // Clean up PDF URL
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }
    
    setIsPreviewMode(false);
    // Reset PDF state
    setPdfNumPages(null);
    setPdfError(null);
    setPdfFileData(null);
    setCurrentPdfFile(null);
  }, []);

  // PDF options - memoized to prevent re-renders
  const pdfOptions = React.useMemo(() => ({
    disableWorker: false,
    verbosity: 0,
    isEvalSupported: false,
    disableStream: false,
    disableAutoFetch: false,
    disableFontFace: false,
    nativeImageDecoderSupport: 'display',
    useSystemFonts: true
  }), []);

// PDF-specific handlers - memoized to prevent unnecessary re-renders
  const handlePDFLoadSuccess = useCallback(({ numPages }) => {
    setPdfNumPages(numPages);
    setPdfLoading(false);
    setPdfError(null);
    // PDF loaded successfully - no need to log in production
  }, []);

  const handlePDFLoadError = useCallback((error) => {
    console.error('PDF Load Error:', error);
    setPdfLoading(false);
    let errorMessage = 'Failed to load PDF.';
    
    // More specific error handling
    if (error?.name === 'PasswordException') {
      errorMessage = 'This PDF is password-protected and cannot be previewed.';
    } else if (error?.name === 'InvalidPDFException') {
      errorMessage = 'The file is not a valid PDF or is corrupted.';
    } else if (error?.name === 'MissingPDFException') {
      errorMessage = 'PDF file could not be found or loaded.';
    } else if (error?.name === 'UnexpectedResponseException') {
      errorMessage = 'Unexpected response while loading PDF. Please try again.';
    } else if (error?.message?.includes('fetch')) {
      errorMessage = 'Unable to load PDF. Please check your internet connection.';
    } else if (error?.message?.includes('worker') || error?.message?.includes('sendWithPromise')) {
      errorMessage = 'PDF worker failed to load. Please refresh the page or try downloading the file instead.';
    } else if (error?.message?.includes('Cannot read properties of null')) {
      errorMessage = 'PDF viewer initialization failed. Please refresh the page and try again.';
    } else if (error?.message) {
      errorMessage = `PDF Error: ${error.message}`;
    } else {
      errorMessage = 'Failed to load PDF. The file might be corrupted or in an unsupported format.';
    }
    
    setPdfError(errorMessage);
  }, []);

  const handlePDFRenderError = useCallback((error) => {
    console.error('PDF Render Error:', error);
    setPdfError('Error rendering PDF page. Try refreshing or use a different PDF viewer.');
  }, []);

  const handlePDFPrevPage = useCallback(() => {
    setPdfPageNumber(prev => Math.max(prev - 1, 1));
  }, []);

  const handlePDFNextPage = useCallback(() => {
    setPdfPageNumber(prev => Math.min(prev + 1, pdfNumPages || 1));
  }, [pdfNumPages]);// Render file preview based on file type
  const renderFilePreview = () => {
    if (files.length === 0 || selectedFileIndex >= files.length) return null;
    
    const currentFile = files[selectedFileIndex];
    const fileType = getFileType(currentFile);
    
    console.log('🎬 renderFilePreview called for:', currentFile.name, 'type:', fileType);
    
    switch (fileType) {
      case 'image':
        return (
          <MediaPreviewContainer>
            <ImagePreview 
              src={currentFile.preview} 
              alt={currentFile.name} 
              className="media-preview" 
            />
          </MediaPreviewContainer>
        );      case 'video':
        // Check if video format is supported by the browser
        if (isVideoFormatSupported(currentFile)) {
          return (
            <MediaPreviewContainer>
              <VideoPreview
                ref={videoRef}
                src={currentFile.preview}
                controls
                autoPlay
                className="media-preview"
              />
            </MediaPreviewContainer>
          );
        } else {
          // Display message for unsupported video formats
          const fileExtension = getFileExtension(currentFile.name);
          return (
            <MediaPreviewContainer>
              <UnsupportedVideoContainer>
                <UnsupportedVideoIcon>
                  <FiVideo />
                </UnsupportedVideoIcon>
                <UnsupportedVideoTitle>Unsupported Video Format</UnsupportedVideoTitle>
                <UnsupportedVideoText>
                  The <UnsupportedVideoFormat>{fileExtension}</UnsupportedVideoFormat> format is not supported for 
                  preview in most web browsers. To view this video, please download and play it using a desktop media player.
                </UnsupportedVideoText>
                <UnsupportedVideoText>
                  For web compatibility, consider converting to MP4, WebM or OGG formats.
                </UnsupportedVideoText>
              </UnsupportedVideoContainer>            </MediaPreviewContainer>
          );
        }      case 'pdf':
        return (
          <MediaPreviewContainer>
            <PDFContainer className="pdf-preview">
              <ErrorBoundary>
                {pdfError ? (
                  <PDFErrorContainer>
                    <FiFileText size={48} />
                    <h3>PDF Preview Error</h3>
                    <p>{pdfError}</p>
                    <small>Try downloading the file to view it with a PDF reader.</small>
                  </PDFErrorContainer>
                ) : !pdfFileData ? (
                  <PDFLoadingContainer>
                    <FiFileText size={48} />
                    <p>Loading PDF...</p>
                  </PDFLoadingContainer>
              ) : (
                <>
                  <PDFNavigationControls>
                    <PDFNavButton
                      onClick={handlePDFPrevPage}
                      disabled={pdfPageNumber <= 1}
                      title="Previous Page"
                    >
                      <FiChevronLeft />
                    </PDFNavButton>
                    
                    <PDFPageInfo>
                      {pdfNumPages ? `${pdfPageNumber} / ${pdfNumPages}` : 'Loading...'}
                    </PDFPageInfo>
                    
                    <PDFNavButton
                      onClick={handlePDFNextPage}
                      disabled={pdfPageNumber >= (pdfNumPages || 1)}
                      title="Next Page"
                    >
                      <FiChevronRight />
                    </PDFNavButton>
                  </PDFNavigationControls>
                    <PDFPageContainer>                    <Document
                      file={pdfFileData}
                      onLoadSuccess={handlePDFLoadSuccess}
                      onLoadError={handlePDFLoadError}
                      loading={
                        <PDFLoadingContainer>
                          <FiFileText size={48} />
                          <p>Loading PDF...</p>
                        </PDFLoadingContainer>
                      }
                      error={
                        <PDFErrorContainer>
                          <FiFileText size={48} />
                          <h3>PDF Load Error</h3>
                          <p>Unable to load this PDF file.</p>
                          <small>Try downloading the file to view it with a PDF reader.</small>
                        </PDFErrorContainer>
                      }
                      options={pdfOptions}
                    >
                      <Page
                        pageNumber={pdfPageNumber}
                        width={undefined}
                        height={undefined}
                        onRenderError={handlePDFRenderError}
                        loading={
                          <PDFLoadingContainer>
                            <FiFileText size={48} />
                            <p>Loading page {pdfPageNumber}...</p>
                          </PDFLoadingContainer>
                        }
                        error={
                          <PDFErrorContainer>
                            <FiFileText size={48} />
                            <h3>Page Render Error</h3>
                            <p>Unable to render page {pdfPageNumber}.</p>
                          </PDFErrorContainer>
                        }
                      />
                    </Document>                  </PDFPageContainer>
                </>
              )}
              </ErrorBoundary>
            </PDFContainer>
          </MediaPreviewContainer>
        );
        
      default:        return (
          <MediaPreviewContainer>
            <FilePreview>
              <FilePreviewIcon>
                {fileType === 'audio' ? <FiFileText /> :
                 fileType === 'text' ? <FiFileText /> : 
                 fileType === 'pdf' ? <FiFileText /> : <FiFilePlus />}
              </FilePreviewIcon>
              <p>{currentFile.name}</p>
              {fileType === 'pdf' && (
                <small style={{ marginTop: '1rem', opacity: 0.7 }}>
                  PDF preview requires loading...
                </small>
              )}
            </FilePreview>
          </MediaPreviewContainer>
        );
    }
  };  // Render file information
  const renderFileInfo = () => {
    if (files.length === 0 || selectedFileIndex >= files.length) return null;
      const currentFile = files[selectedFileIndex];
    const fileType = getFileType(currentFile);
    const fileExtension = getFileExtension(currentFile.name);
    const lastModified = new Date(currentFile.lastModified).toLocaleString();
    
    // Check if it's a video with unsupported format
    const isUnsupportedVideo = fileType === 'video' && !isVideoFormatSupported(currentFile);
    
    return (
      <FileInfoContainer>
        <FileInfoTable>
          <tbody>
            <FileInfoRow>
              <FileInfoLabel>File name:</FileInfoLabel>
              <FileInfoValue>{currentFile.name}</FileInfoValue>
            </FileInfoRow>
            <FileInfoRow>
              <FileInfoLabel>Size:</FileInfoLabel>
              <FileInfoValue>{formatBytes(currentFile.size)}</FileInfoValue>
            </FileInfoRow>
            <FileInfoRow>
              <FileInfoLabel>Type:</FileInfoLabel>
              <FileInfoValue>
                {currentFile.type || `${fileType} file`}
                {isUnsupportedVideo && (
                  <span style={{ 
                    color: '#ff6b6b', 
                    fontSize: '0.8rem',
                    marginLeft: '5px',
                    display: 'inline-block' 
                  }}>
                    (unsupported format)
                  </span>
                )}
              </FileInfoValue>
            </FileInfoRow>            {fileType === 'pdf' && pdfNumPages && (
              <FileInfoRow>
                <FileInfoLabel>Pages:</FileInfoLabel>
                <FileInfoValue>{pdfNumPages} pages</FileInfoValue>
              </FileInfoRow>
            )}
            <FileInfoRow>
              <FileInfoLabel>Last modified:</FileInfoLabel>
              <FileInfoValue>{lastModified}</FileInfoValue>
            </FileInfoRow>
            {isUnsupportedVideo && (
              <FileInfoRow>
                <FileInfoLabel>Compatibility:</FileInfoLabel>
                <FileInfoValue style={{ color: '#ff6b6b' }}>
                  {fileExtension.toUpperCase()} format has limited browser support. 
                  Consider converting to MP4 for better compatibility.
                </FileInfoValue>
              </FileInfoRow>
            )}
          </tbody>
        </FileInfoTable>
      </FileInfoContainer>
    );  };
  
  // Debug: Track re-renders
  console.log('🔄 FileTransfer re-render - downloadCode:', downloadCode, 'verificationCode:', verificationCode, 'files:', files.length);  return (
    <FileTransferContainer>
      <TransferBoxesContainer>
        {isPreviewMode && files.length > 0 ? (
          <SendFilesBox>
            <BoxTitle>Selected Files</BoxTitle>
            
            <PreviewContainer>
              <PreviewHeader>
                <BackButton onClick={handleBackToFiles}>
                  <FiArrowLeft size={20} />
                </BackButton>
                <PreviewTitle>{files[selectedFileIndex]?.name || 'File Preview'}</PreviewTitle>
                <FullscreenButton onClick={toggleFullscreen}>
                  <FiMaximize size={20} />
                </FullscreenButton>
              </PreviewHeader>
              
              {renderFilePreview()}
              
              {files.length > 1 && (
                <NavigationButtons>
                  <NavigationButton 
                    prev
                    onClick={handlePrevFile}
                    disabled={selectedFileIndex === 0}
                  >
                    <FiChevronLeft />
                    Previous File
                  </NavigationButton>
                  
                  <NavigationButton 
                    onClick={handleNextFile}
                    disabled={selectedFileIndex === files.length - 1}
                  >
                    Next File
                    <FiChevronRight />
                  </NavigationButton>
                </NavigationButtons>
              )}
              
              {renderFileInfo()}              <VerificationCodeContainer>
                <VerificationCodeTitle>
                  {files.length === 1 ? 'Your 6-digit verification code:' : `Verification code for all ${files.length} files:`}
                </VerificationCodeTitle>
                <VerificationCode>
                  {verificationCode.split('').map((digit, index) => (
                    <VerificationDigit key={index}>{digit}</VerificationDigit>
                  ))}
                </VerificationCode>
                {files.length > 1 && (                  <p style={{ 
                    fontSize: '0.8rem', 
                    color: '#4B5563', 
                    marginTop: '1rem',
                    textAlign: 'center',
                    lineHeight: '1.4'
                  }}>
                    Use this single code to access all {files.length} files together.
                  </p>
                )}
              </VerificationCodeContainer>
            </PreviewContainer>
          </SendFilesBox>        ) : (
          <SendFilesBox>          <BoxTitle>Send Files</BoxTitle>
          <BoxSubtitle>Upload files and get download codes</BoxSubtitle>
            
            <UploadContainer>
              <DropzoneContainer {...getRootProps()} isDragActive={isDragActive}>
                <input {...getInputProps()} />
                <UploadIcon>
                  <FiUploadCloud />
                </UploadIcon>
                {isDragActive ? (
                  <UploadText>Drop the files here ...</UploadText>
                ) : (
                  <>
                    <UploadText>Drag & drop files here, or click to select files</UploadText>
                    <UploadSubtext>Supports videos, images, documents and other formats up to 50GB</UploadSubtext>
                  </>
                )}
              </DropzoneContainer>
              
              {files.length > 0 && (
                <FileList>
                  {files.map((file, index) => (
                    <FileItem 
                      key={index}
                      className={selectedFileIndex === index ? 'selected' : ''}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>                        <FiFile style={{ marginRight: '10px', color: '#000000' }} />
                        <FileName>{file.name}</FileName>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <FileSize>{formatBytes(file.size)}</FileSize>
                        <div 
                          className="delete-button" 
                          onClick={(e) => handleDeleteFile(index, e)}
                        >
                          <FiTrash2 size={16} />
                        </div>
                      </div>
                    </FileItem>
                  ))}
                </FileList>
              )}              <SendButton 
                disabled={files.length === 0 || isUploading}
                onClick={handleSendFiles}              >
                {isUploading ? 'Uploading...' : 'Upload Files'}
              </SendButton>
              
              {/* Upload Progress Bar - Show when uploading */}
              {isUploading && totalUploadFiles > 0 && (
                <ProgressBarContainer>
                  <ProgressBarHeader>
                    <ProgressFileName>
                      {currentUploadFileName || 'Uploading...'}
                    </ProgressFileName>
                    <ProgressPercentage>
                      {uploadProgress}%
                    </ProgressPercentage>
                  </ProgressBarHeader>
                  <ProgressBarTrack>
                    <ProgressBarFill progress={uploadProgress} />
                  </ProgressBarTrack>
                  <ProgressFileInfo>
                    <span>File {uploadFileIndex} of {totalUploadFiles}</span>
                    <span>
                      {uploadProgress === 100 ? 'Upload Complete!' : 
                       uploadMethod === 'p2p' ? 'P2P Upload...' : 'Server Upload...'}
                    </span>
                  </ProgressFileInfo>
                </ProgressBarContainer>
              )}
              
              {uploadStatus && (
                <StatusMessage type={uploadStatus.includes('failed') || uploadStatus.includes('Upload failed') ? 'error' : 'success'}>
                  {uploadStatus}
                </StatusMessage>
              )}
            </UploadContainer>
          </SendFilesBox>
        )}
          {/* Receive Files Box */}        <ReceiveFilesBox>
          <BoxTitle>Receive Files</BoxTitle>
          <BoxSubtitle>Enter 6-digit code to download files</BoxSubtitle>
          
          <DownloadIcon>
            <FiDownloadCloud />
          </DownloadIcon>
            <DownloadInputContainer>
            <InputLabel>Enter verification code(s)</InputLabel>            <p style={{ 
              fontSize: '0.85rem', 
              color: '#4B5563', 
              marginBottom: '1rem',
              lineHeight: '1.4'
            }}>
              Enter the 6-digit verification code to download files directly to your Downloads folder
            </p>
            <DownloadInput>              <StyledInput 
                type="text" 
                placeholder="e.g. 123456" 
                value={downloadCode}
                onChange={(e) => {
                  // Allow only numbers for single code
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setDownloadCode(value);
                }}
              />              <InputButton onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? 'Downloading...' : 'Download Files'}
              </InputButton>            </DownloadInput>
          </DownloadInputContainer>
          
          {/* Download Progress Bar - Show when downloading */}
          {isDownloading && totalDownloadFiles > 0 && (
            <ProgressBarContainer>
              <ProgressBarHeader>
                <ProgressFileName>
                  {currentDownloadFileName || 'Downloading...'}
                </ProgressFileName>
                <ProgressPercentage>
                  {downloadProgress}%
                </ProgressPercentage>
              </ProgressBarHeader>
              <ProgressBarTrack>
                <ProgressBarFill progress={downloadProgress} />
              </ProgressBarTrack>
              <ProgressFileInfo>
                <span>File {downloadFileIndex} of {totalDownloadFiles}</span>
                <span>
                  {downloadProgress === 100 ? 'Download Complete!' : 
                   downloadMethod === 'p2p' ? 'P2P Download...' : 'Server Download...'}
                </span>
              </ProgressFileInfo>
            </ProgressBarContainer>
          )}
          
          {downloadStatus && (
            <StatusMessage type={downloadStatus.includes('failed') || downloadStatus.includes('Please enter') ? 'error' : 'success'}>
              {downloadStatus}
            </StatusMessage>
          )}
          
          <OrDivider>
            <span>OR</span>
          </OrDivider>          <SendButton 
            style={{ 
              background: 'white', 
              color: '#000000',
              border: '2px solid #111111',
              boxShadow: 'none'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(17, 17, 17, 0.03)';
              e.currentTarget.style.color = '#1F2937';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.color = '#000000';
            }}
          >
            Scan QR Code
          </SendButton>
        </ReceiveFilesBox>
      </TransferBoxesContainer>
    </FileTransferContainer>
  );
};

export default FileTransfer;
