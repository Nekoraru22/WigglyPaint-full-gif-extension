// ==UserScript==
// @name        Hook prove
// @namespace   Violentmonkey Scripts
// @match       https://wigglypaint.net/assets/content/wiggly_1_3_2.html*
// @grant       none
// @version     1.0
// @author      Nekoraru22 (https://github.com/Nekoraru22)
// @description 24/9/2025, 15:13:44
// ==/UserScript==

// Hooking of the writegif function
(function searchExistingObjects() {
    function deepSearch(obj, path = '', visited = new Set()) {
        if (!obj || visited.has(obj)) return;
        visited.add(obj);

        try {
            for (let key in obj) {
                if (key === 'writegif' && typeof obj[key] === 'function') {
                    window.writegif = obj[key];
                    console.log('✅ writegif found at:', path + '.' + key);
                    return true;
                }

                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    if (deepSearch(obj[key], path + '.' + key, visited)) {
                        return true;
                    }
                }
            }
        } catch { }
    }

    // Start search from globalThis
    deepSearch(globalThis, 'globalThis');
})();

// Check if writegif is available and hook it
function checkWritegif() {
    if (window.writegif) {
        console.log('✅ You can use it as: writegif(frames, delays)');
        const originalWritegif = window.writegif;

        writegif = (frames, delays) => {
            console.log('=== writegif called ===');
            console.log('Number of frames:', frames?.length);
            console.log('Frames data:', frames);
            console.log('Delays:', delays);
            console.log('========================');

            // Call original function with modified frames
            return originalWritegif(frames, delays);
        }
    } else {
        console.log('❌ writegif is not available');
        return false;
    }
}

// Execute initial check
setTimeout(checkWritegif, 1000);