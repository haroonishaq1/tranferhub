
/**
 * Utility for handling API errors, specifically JSON parsing errors
 * This helps mitigate "Unexpected end of JSON input" errors on Render.com
 */

class ApiErrorHandler {
  /**
   * Safely handle fetch responses with fallback parsing
   * @param {Response} response - The fetch response object
   * @returns {Promise<Object>} Parsed JSON response
   */
  static async handleResponse(response) {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`);
    }
    
    try {
      // First attempt: standard json parsing
      return await response.json();
    } catch (jsonError) {
      console.error("JSON parsing error:", jsonError);
      
      // Get response as text for manual parsing attempt
      const responseText = await response.text();
      console.log("Response received:", responseText.substring(0, 500) + '...');
      
      try {
        // Second attempt: manual JSON parsing
        return JSON.parse(responseText);
      } catch (error) {
        console.error("Failed second parsing attempt:", error);
        
        // Third attempt: Try to extract key information using regex
        try {
          // Extract downloadCode if present
          const downloadCodeMatch = responseText.match(/"downloadCode"\s*:\s*"?(\d+)"?/);
          if (downloadCodeMatch && downloadCodeMatch[1]) {
            const downloadCode = downloadCodeMatch[1];
            console.log("Successfully extracted download code:", downloadCode);
            
            return {
              success: true,
              downloadCode: downloadCode,
              _recovered: true,
              _partial: true
            };
          }
        } catch (extractError) {
          console.error("Extraction attempt failed:", extractError);
        }
        
        // If all attempts fail, throw the original error
        throw new Error(`Failed to parse API response: ${jsonError.message}. Response length: ${responseText.length}`);
      }
    }
  }
  
  /**
   * Perform a fetch operation with automatic retries and error handling
   * @param {string} url - The URL to fetch
   * @param {Object} options - Fetch options
   * @param {number} retries - Number of retries (default: 3)
   * @param {number} delay - Delay between retries in ms (default: 1000)
   * @returns {Promise<Object>} Parsed response
   */
  static async fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
    try {
      const response = await fetch(url, options);
      return await this.handleResponse(response);
    } catch (error) {
      if (retries <= 0) throw error;
      
      console.log(`Operation failed, retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
  }
}

export default ApiErrorHandler;
