/**
 * Tizen Smart TV Bridge
 * Handles remote control input keys and 1-click app launching on Samsung Tizen OS
 */

export const isTizen = typeof window !== 'undefined' && typeof window.tizen !== 'undefined';

export function initTizenRemoteKeys() {
  if (!isTizen) {
    console.log('[TizenBridge] Running in standard browser environment (Desktop/Mac mode)');
    return;
  }

  try {
    const keysToRegister = [
      'ColorF0Red',
      'ColorF1Green',
      'ColorF2Yellow',
      'ColorF3Blue',
      'MediaPlayPause',
      'MediaPlay',
      'MediaPause'
    ];

    for (const key of keysToRegister) {
      try {
        window.tizen.tvinputdevice.registerKey(key);
      } catch (e) {
        console.warn(`[TizenBridge] Failed to register key ${key}:`, e);
      }
    }
    console.log('[TizenBridge] Tizen TV remote control keys registered successfully.');
  } catch (err) {
    console.error('[TizenBridge] Error initializing Tizen input devices:', err);
  }
}

/**
 * Launch an installed streaming application on the Samsung QN95
 * Falls back to web URL when testing on a PC/Mac
 */
export function launchStreamingApp(provider, fallbackUrl) {
  if (isTizen && provider && provider.tizenAppId) {
    try {
      console.log(`[TizenBridge] Launching Tizen app: ${provider.name} (${provider.tizenAppId})`);
      window.tizen.application.launch(
        provider.tizenAppId,
        () => {
          console.log(`[TizenBridge] App ${provider.name} launched successfully.`);
        },
        (err) => {
          console.warn(`[TizenBridge] Could not direct-launch ${provider.tizenAppId}, attempting fallback:`, err);
          if (fallbackUrl || provider.webUrl) {
            window.open(fallbackUrl || provider.webUrl, '_blank');
          }
        }
      );
      return;
    } catch (e) {
      console.error(`[TizenBridge] Error in tizen.application.launch:`, e);
    }
  }

  // Desktop or fallback browser behavior
  const targetUrl = fallbackUrl || (provider && provider.webUrl) || 'https://www.google.com';
  console.log(`[TizenBridge] Opening web URL: ${targetUrl}`);
  window.open(targetUrl, '_blank');
}

/**
 * Launch YouTube or TizenTube to search and play a movie trailer
 */
export function playTrailer(title, year) {
  const query = encodeURIComponent(`${title} ${year || ''} trailer`);
  const youtubeUrl = `https://www.youtube.com/results?search_query=${query}`;

  if (isTizen) {
    // Try launching TizenBrew / TizenTube if installed
    const tizenBrewAppId = 'xvvl3S1bvH.TizenBrewStandalone';
    try {
      window.tizen.application.launch(
        tizenBrewAppId,
        () => console.log('[TizenBridge] Launched TizenBrew for trailer'),
        () => window.open(youtubeUrl, '_blank')
      );
      return;
    } catch (e) {
      // ignore
    }
  }

  window.open(youtubeUrl, '_blank');
}

/**
 * Exit application back to Samsung Smart Hub
 */
export function exitTizenApp() {
  if (isTizen && window.tizen?.application) {
    try {
      window.tizen.application.getCurrentApplication().exit();
    } catch (e) {
      console.warn('[TizenBridge] exit() error:', e);
    }
  }
}
