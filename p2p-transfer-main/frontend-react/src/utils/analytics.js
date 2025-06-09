// Google Analytics tracking utilities
// This file provides functions to track user interactions and events

// Check if Google Analytics is loaded
const isGALoaded = () => {
  return typeof window !== 'undefined' && window.gtag;
};

// Track page views
export const trackPageView = (page_title, page_location) => {
  if (isGALoaded()) {
    window.gtag('config', 'G-WBY64ZSB8G', {
      page_title,
      page_location,
    });
  }
};

// Track custom events
export const trackEvent = (action, category = 'General', label = '', value = 0) => {
  if (isGALoaded()) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Track file upload events
export const trackFileUpload = (fileCount, totalSize, uploadMethod = 'unknown') => {
  if (isGALoaded()) {
    window.gtag('event', 'file_upload_started', {
      event_category: 'File Transfer',
      event_label: uploadMethod,
      custom_parameters: {
        file_count: fileCount,
        total_size_mb: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        upload_method: uploadMethod
      }
    });
  }
};

// Track successful file upload
export const trackFileUploadSuccess = (fileCount, downloadCode, uploadMethod = 'unknown') => {
  if (isGALoaded()) {
    window.gtag('event', 'file_upload_completed', {
      event_category: 'File Transfer',
      event_label: uploadMethod,
      custom_parameters: {
        file_count: fileCount,
        upload_method: uploadMethod,
        has_download_code: !!downloadCode
      }
    });
  }
};

// Track failed file upload
export const trackFileUploadError = (fileCount, errorMessage, uploadMethod = 'unknown') => {
  if (isGALoaded()) {
    window.gtag('event', 'file_upload_failed', {
      event_category: 'File Transfer',
      event_label: uploadMethod,
      custom_parameters: {
        file_count: fileCount,
        error_type: errorMessage,
        upload_method: uploadMethod
      }
    });
  }
};

// Track file download events
export const trackFileDownload = (downloadCode) => {
  if (isGALoaded()) {
    window.gtag('event', 'file_download_started', {
      event_category: 'File Transfer',
      event_label: 'download_attempt',
      custom_parameters: {
        has_code: !!downloadCode
      }
    });
  }
};

// Track successful file download
export const trackFileDownloadSuccess = (downloadCode, fileCount = 1, downloadMethod = 'unknown') => {
  if (isGALoaded()) {
    window.gtag('event', 'file_download_completed', {
      event_category: 'File Transfer',
      event_label: downloadMethod,
      custom_parameters: {
        file_count: fileCount,
        download_method: downloadMethod
      }
    });
  }
};

// Track failed file download
export const trackFileDownloadError = (downloadCode, errorMessage, downloadMethod = 'unknown') => {
  if (isGALoaded()) {
    window.gtag('event', 'file_download_failed', {
      event_category: 'File Transfer',
      event_label: downloadMethod,
      custom_parameters: {
        error_type: errorMessage,
        download_method: downloadMethod
      }
    });
  }
};

// Track file preview interactions
export const trackFilePreview = (fileName, fileType, fileSize) => {
  if (isGALoaded()) {
    window.gtag('event', 'file_preview', {
      event_category: 'User Interaction',
      event_label: fileType,
      custom_parameters: {
        file_type: fileType,
        file_size_mb: Math.round(fileSize / (1024 * 1024) * 100) / 100
      }
    });
  }
};

// Track user engagement events
export const trackUserEngagement = (action, details = {}) => {
  if (isGALoaded()) {
    window.gtag('event', action, {
      event_category: 'User Engagement',
      custom_parameters: details
    });
  }
};

// Track errors and exceptions
export const trackError = (errorMessage, errorType = 'javascript_error') => {
  if (isGALoaded()) {
    window.gtag('event', 'exception', {
      description: errorMessage,
      fatal: false,
      custom_parameters: {
        error_type: errorType
      }
    });
  }
};

// Track timing events (for performance monitoring)
export const trackTiming = (name, value, category = 'Performance') => {
  if (isGALoaded()) {
    window.gtag('event', 'timing_complete', {
      event_category: category,
      name: name,
      value: value
    });
  }
};

// Track conversion events (for goal tracking)
export const trackConversion = (conversionAction) => {
  if (isGALoaded()) {
    window.gtag('event', 'conversion', {
      event_category: 'Goal',
      event_label: conversionAction
    });
  }
};

export default {
  trackPageView,
  trackEvent,
  trackFileUpload,
  trackFileUploadSuccess,
  trackFileUploadError,
  trackFileDownload,
  trackFileDownloadSuccess,
  trackFileDownloadError,
  trackFilePreview,
  trackUserEngagement,
  trackError,
  trackTiming,
  trackConversion
};
