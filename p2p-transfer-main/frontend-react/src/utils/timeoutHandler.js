/**
 * A more robust timeout handler that can be used to prevent infinite loading states
 * 
 * This module exports functions to help with handling timeouts in PDF rendering
 * and provides a way to display error messages when timeouts occur.
 */

/**
 * Creates a timeout promise that rejects after the specified timeout
 * @param {number} ms - Timeout in milliseconds
 * @param {string} message - Optional message for the timeout error
 * @returns {Promise} - Promise that rejects after timeout
 */
export const createTimeoutPromise = (ms, message = 'Operation timed out') => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
};

/**
 * Race a promise against a timeout
 * @param {Promise} promise - The promise to race
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} timeoutMessage - Optional message for timeout error
 * @returns {Promise} - Result of the race
 */
export const withTimeout = (promise, timeoutMs, timeoutMessage) => {
  const timeoutPromise = createTimeoutPromise(timeoutMs, timeoutMessage);
  return Promise.race([promise, timeoutPromise]);
};

/**
 * Create a function that will automatically clean up a timeout
 * @param {function} setTimeoutId - Function to set timeout ID
 * @returns {function} - Cleanup function
 */
export const createTimeoutCleaner = (setTimeoutId) => {
  return (timeoutId) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  };
};

/**
 * Creates a timeout controller with start, stop, and reset functions
 * @param {function} onTimeout - Function to call on timeout * @param {number} defaultTimeout - Default timeout in milliseconds
 * @returns {object} - Timeout controller object
 */
export const createTimeoutController = (onTimeout, defaultTimeout = 0) => {
  let timeoutId = null;
  
  const start = (ms = defaultTimeout) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      if (onTimeout && typeof onTimeout === 'function') {
        onTimeout();
      }
      timeoutId = null;
    }, ms);
    
    return timeoutId;
  };
  
  const stop = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  const reset = (ms = defaultTimeout) => {
    stop();
    return start(ms);
  };
  
  // Cleanup function for React useEffect
  const cleanup = () => {
    stop();
  };
  
  return {
    start,
    stop,
    reset,
    cleanup,
    isRunning: () => timeoutId !== null
  };
};

/**
 * Enhanced fetch with timeout specifically for Render.com hosting
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {number} retries - Number of retries
 * @param {number} retryDelayMs - Delay between retries in ms
 * @returns {Promise<Response>} - Fetch response
 */
export const fetchWithTimeoutAndRetry = async (url, options = {}, timeoutMs = 30000, retries = 3, retryDelayMs = 1000) => {
  // Function to perform one attempt
  const attempt = async (attemptNumber) => {
    // Create an AbortController for this attempt
    const controller = new AbortController();
    const { signal } = controller;
    
    // Create a timeout that will abort the fetch
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
    
    try {
      const fetchOptions = {
        ...options,
        signal,
      };
      
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Fetch timed out after ${timeoutMs}ms`);
      }
      
      // If we have retries left, try again after delay
      if (attemptNumber < retries) {
        console.log(`Fetch attempt ${attemptNumber} failed, retrying in ${retryDelayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        return attempt(attemptNumber + 1);
      }
      
      // No retries left, throw the error
      throw error;
    }
  };
  
  // Start with attempt 1
  return attempt(1);
};

/**
 * Parse JSON response with robust error handling
 * @param {Response} response - Fetch response object
 * @returns {Promise<Object>} - Parsed JSON or error
 */
export const parseJsonSafely = async (response) => {
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }
  
  try {
    return await response.json();
  } catch (error) {
    // Try to get the text and parse it manually
    const text = await response.text();
    
    try {
      return JSON.parse(text);
    } catch (jsonError) {
      // Try to extract useful info from partial response
      const matchDownloadCode = text.match(/"downloadCode"\s*:\s*"?(\d+)"?/);
      if (matchDownloadCode && matchDownloadCode[1]) {
        return {
          success: true,
          downloadCode: matchDownloadCode[1],
          _partialResponse: true
        };
      }
      
      throw new Error(`Failed to parse JSON: ${jsonError.message}. Response size: ${text.length} bytes`);
    }
  }
};

export default {
  createTimeoutPromise,
  withTimeout,
  createTimeoutCleaner,
  createTimeoutController,
  fetchWithTimeoutAndRetry,
  parseJsonSafely
};
