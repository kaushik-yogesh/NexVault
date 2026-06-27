/**
 * NexVault — PhishingDetector
 * 
 * Uses eth-phishing-detect to block known malicious domains.
 */

import checkForPhishing from 'eth-phishing-detect';

class PhishingDetector {
  /**
   * Check if a URL is a known phishing domain
   * @param {string} url - The URL to check
   * @returns {boolean} True if malicious
   */
  isPhishing(url) {
    try {
      const hostname = new URL(url).hostname;
      return checkForPhishing(hostname);
    } catch (e) {
      return false; // If URL parsing fails, ignore
    }
  }
}

const phishingDetector = new PhishingDetector();
export default phishingDetector;
