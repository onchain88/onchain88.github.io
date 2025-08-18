// Image utilities for avatar processing

// Default avatar SVG (same as in the smart contract)
export const DEFAULT_AVATAR = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTAwIiBjeT0iODAiIHI9IjQwIiBmaWxsPSIjNjY3ZWVhIi8+PHBhdGggZD0iTTEwMCwxMzBjLTQwLDAuNS04MCwyMC04MCw1MHYyMGgxNjB2LTIwQzE4MCwxNTAsMTQwLDEzMC41LDEwMCwxMzB6IiBmaWxsPSIjNjY3ZWVhIi8+PC9zdmc+";

/**
 * Resize and compress image to base64
 * @param {File} file - The image file to process
 * @param {Object} options - Resize options
 * @param {number} options.maxWidth - Maximum width (default: 200)
 * @param {number} options.maxHeight - Maximum height (default: 200)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.8)
 * @returns {Promise<string>} Base64 encoded image
 */
export async function processImageToBase64(file, options = {}) {
  const {
    maxWidth = 200,
    maxHeight = 200,
    quality = 0.8
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round(height * maxWidth / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round(width * maxHeight / height);
            height = maxHeight;
          }
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target.result;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file
 * @param {File} file - The file to validate
 * @param {Object} options - Validation options
 * @param {number} options.maxSizeMB - Maximum file size in MB (default: 2)
 * @param {string[]} options.allowedTypes - Allowed MIME types
 * @returns {Object} Validation result {valid: boolean, error?: string}
 */
export function validateImageFile(file, options = {}) {
  const {
    maxSizeMB = 2,
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  } = options;
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    };
  }
  
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size too large. Maximum size: ${maxSizeMB}MB`
    };
  }
  
  return { valid: true };
}

/**
 * Create image preview element
 * @param {string} base64Image - Base64 encoded image
 * @param {string} altText - Alternative text for the image
 * @returns {HTMLImageElement} Image element
 */
export function createImagePreview(base64Image, altText = 'Avatar preview') {
  const img = document.createElement('img');
  img.src = base64Image || DEFAULT_AVATAR;
  img.alt = altText;
  img.style.width = '100px';
  img.style.height = '100px';
  img.style.borderRadius = '50%';
  img.style.objectFit = 'cover';
  return img;
}

/**
 * Get estimated size of base64 string in KB
 * @param {string} base64String - Base64 encoded string
 * @returns {number} Size in KB
 */
export function getBase64SizeKB(base64String) {
  // Remove data URI prefix if present
  const base64 = base64String.split(',')[1] || base64String;
  // Calculate size (base64 is ~33% larger than binary)
  const sizeInBytes = (base64.length * 3) / 4;
  return Math.round(sizeInBytes / 1024);
}

/**
 * Convert File to base64 without processing
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 encoded file
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}