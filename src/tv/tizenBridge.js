/**
 * Tizen Smart TV Bridge
 * Handles remote control input keys and 1-click app launching on Samsung Tizen OS
 */

export const isTizen = typeof window !== 'undefined' && typeof window.tizen !== 'undefined';

export function showToast(message, durationMs = 3500) {
  let toast = document.getElementById('tvToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'tvToast';
    toast.className = 'tv-toast hidden';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('visible');

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('visible');
    toast.classList.add('hidden');
  }, durationMs);
}

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
 * Tests each known candidate ID on Samsung Tizen OS
 */
export function launchStreamingApp(provider, fallbackUrl) {
  if (!provider) return;

  const candidateIds = provider.candidateIds || (provider.tizenAppId ? [provider.tizenAppId] : []);

  if (isTizen && window.tizen && window.tizen.application && candidateIds.length > 0) {
    showToast(`Launching ${provider.name} on TV...`);

    let index = 0;
    function tryNext() {
      if (index >= candidateIds.length) {
        showToast(`Could not launch ${provider.name}. Please ensure the app is installed from the Samsung App Store.`);
        if (fallbackUrl || provider.webUrl) {
          window.open(fallbackUrl || provider.webUrl, '_blank');
        }
        return;
      }

      const appId = candidateIds[index++];
      console.log(`[TizenBridge] Trying to launch ${provider.name} with ID: ${appId}`);

      try {
        window.tizen.application.launch(
          appId,
          () => {
            console.log(`[TizenBridge] Successfully launched ${provider.name} (${appId})`);
            showToast(`Launched ${provider.name}!`);
          },
          (err) => {
            console.warn(`[TizenBridge] Failed to launch ${appId} via launch(), trying AppControl...`, err);
            try {
              const appControl = new window.tizen.ApplicationControl(
                "http://tizen.org/appcontrol/operation/default",
                null, null, null, null
              );
              window.tizen.application.launchAppControl(
                appControl,
                appId,
                () => {
                  console.log(`[TizenBridge] Successfully launched via launchAppControl: ${appId}`);
                  showToast(`Launched ${provider.name}!`);
                },
                () => {
                  tryNext();
                }
              );
            } catch (e2) {
              tryNext();
            }
          }
        );
      } catch (e) {
        tryNext();
      }
    }

    tryNext();
    return;
  }

  // Desktop or fallback browser behavior
  const targetUrl = fallbackUrl || provider.webUrl || 'https://www.google.com';
  console.log(`[TizenBridge] Opening web URL: ${targetUrl}`);
  window.open(targetUrl, '_blank');
}

/**
 * Launch native YouTube app on Samsung TV
 */
export function launchYouTubeApp(title, year) {
  const query = encodeURIComponent(`${title} ${year || ''} trailer`);
  const ytCandidates = ['9Ur5IzDKqV.TizenYouTube', 'com.samsung.tv.cobalt-yt', '111299001912'];

  if (isTizen && window.tizen && window.tizen.application) {
    showToast('Launching YouTube app on TV...');
    let index = 0;
    function tryYt() {
      if (index >= ytCandidates.length) {
        showToast('YouTube app not found on this TV.');
        return;
      }
      const ytId = ytCandidates[index++];
      try {
        window.tizen.application.launch(
          ytId,
          () => showToast('YouTube launched!'),
          () => tryYt()
        );
      } catch (e) {
        tryYt();
      }
    }
    tryYt();
    return;
  }

  window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
}

/**
 * Play trailer in built-in Trailer Theater modal
 */
export function playTrailer(title, year) {
  const event = new CustomEvent('open-trailer-theater', {
    detail: { title, year }
  });
  window.dispatchEvent(event);
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
