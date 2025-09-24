// ==UserScript==
// @name        GIF Capture Script for WigglyPaint
// @namespace   Violentmonkey Scripts
// @match       https://wigglypaint.net/es*
// @grant       none
// @grant       GM_getResourceURL
// @require     https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js
// @resource    gifWorker https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js
// @version     1.0
// @author      Nekoraru22 (https://github.com/Nekoraru22)
// @description 24/9/2025, 19:45:58
// ==/UserScript==

(function() {
    'use strict';

    class GIFEncoder {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            this.frames = [];
            this.delays = [];
            this.frameHashes = [];
            this.colorTable = [];
            this.globalColorTable = null;
        }

        addFrame(canvas, delay) {
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, this.width, this.height);
            
            // Check if frame is duplicate
            if (!this.isDuplicateFrame(imageData)) {
                this.frames.push(imageData);
                this.delays.push(delay);
                
                // Store hash if using hash method
                this.frameHashes.push(this.generateFrameHash(imageData));
                return true;
            } else {
                console.log('Duplicate frame skipped');
                return false;
            }
        }

        generateFrameHash(imageData) {
            const pixels = imageData.data;
            let hash1 = 0;
            let hash2 = 0;
            
            const step = Math.max(1, Math.floor(pixels.length / 1000));
            
            for (let i = 0; i < pixels.length; i += step * 4) {
                hash1 = ((hash1 << 5) - hash1 + pixels[i] + (pixels[i + 1] << 8)) & 0xffffffff;
                hash2 = ((hash2 << 3) - hash2 + pixels[i + 2] + (pixels[i + 3] << 8)) & 0xffffffff;
            }
            
            return `${hash1}-${hash2}`;
        }

        isDuplicateFrame(newImageData) {
            if (this.frames.length === 0) return false;
            
            const newHash = this.generateFrameHash(newImageData);
            
            for (let i = 0; i < this.frameHashes.length; i++) {
                if (this.frameHashes[i] === newHash) {
                    if (this.areFramesActuallyIdentical(newImageData, this.frames[i])) {
                        console.log(`Frame is duplicate of frame ${i} (verified)`);
                        return true;
                    } else {
                        console.log(`Hash collision detected for frame ${i}, but frames are different`);
                    }
                }
            }
            
            return false;
        }

        areFramesActuallyIdentical(imageData1, imageData2, tolerance = 3) {
            const pixels1 = imageData1.data;
            const pixels2 = imageData2.data;
            
            if (pixels1.length !== pixels2.length) return false;
            
            let differentPixels = 0;
            const maxDifferentPixels = Math.floor(pixels1.length / 4 * 0.001); // 0.1% tolerance
            
            // Check every 4th pixel for performance (still very accurate)
            for (let i = 0; i < pixels1.length; i += 16) { // Sample every 4th pixel
                const rDiff = Math.abs(pixels1[i] - pixels2[i]);
                const gDiff = Math.abs(pixels1[i + 1] - pixels2[i + 1]);
                const bDiff = Math.abs(pixels1[i + 2] - pixels2[i + 2]);
                const aDiff = Math.abs(pixels1[i + 3] - pixels2[i + 3]);
                
                if (rDiff > tolerance || gDiff > tolerance || bDiff > tolerance || aDiff > tolerance) {
                    differentPixels++;
                    if (differentPixels > maxDifferentPixels) {
                        return false;
                    }
                }
            }
            
            return true;
        }

        async renderGIF() {
            try {
                const gifBlob = await this.createGIF();
                if (!gifBlob) return null;
                
                return URL.createObjectURL(gifBlob);
            } catch (error) {
                console.error('Error rendering GIF:', error);
                return null;
            }
        }

        async createGIF() {
            if (this.frames.length === 0) {
                console.log('No frames to encode');
                return null;
            }
            console.log(`Creating GIF with ${this.frames.length} frames...`);
            
            // Get the URL for the local worker script
            const workerScriptUrl = GM_getResourceURL('gifWorker');

            return new Promise((resolve, reject) => {
                // Create new GIF instance
                const gif = new GIF({
                    workers: 1,
                    quality: 10,
                    width: this.width,
                    height: this.height,
                    workerScript: workerScriptUrl
                });

                // Add all captured frames to the GIF
                for (let i = 0; i < this.frames.length; i++) {
                    // Create a temporary canvas to draw the ImageData
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = this.width;
                    tempCanvas.height = this.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    // Put the ImageData onto the temporary canvas
                    tempCtx.putImageData(this.frames[i], 0, 0);
                    
                    // Add frame to GIF with corresponding delay
                    gif.addFrame(tempCanvas, {
                        delay: this.delays[i]
                    });
                }

                // Set up event listeners
                gif.on('finished', (blob) => {
                    console.log('GIF creation completed successfully');
                    resolve(blob);
                });

                gif.on('progress', (progress) => {
                    console.log(`GIF encoding progress: ${Math.round(progress * 100)}%`);
                });

                gif.on('abort', () => {
                    console.log('GIF creation aborted');
                    reject(new Error('GIF creation was aborted'));
                });

                // Start rendering the GIF
                gif.render();
            });
        }
    }

    // Initialize when page loads
    window.addEventListener('load', function() {
        setTimeout(initGifCapture, 1000);
    });

    function initGifCapture() {
        try {
            const iframe = document.querySelector('iframe');
            if (!iframe?.contentDocument) {
                console.log('Iframe not found, retrying...');
                setTimeout(initGifCapture, 1000);
                return;
            }
            
            const canvas = iframe.contentDocument.body.querySelector("#display");
            if (!canvas) {
                console.log('Canvas not found, retrying...');
                setTimeout(initGifCapture, 1000);
                return;
            }
            
            console.log('Canvas found:', canvas);
            createControlPanel(canvas);
        } catch (error) {
            console.log('Error accessing iframe content, retrying...', error);
            setTimeout(initGifCapture, 1000);
        }
    }

    function createControlPanel(canvas) {
        // Remove existing panel if any
        const existingPanel = document.getElementById('gif-capture-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        // Create floating control panel
        const panel = document.createElement('div');
        panel.id = 'gif-capture-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            min-width: 280px;
            backdrop-filter: blur(10px);
        `;

        // Title
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        title.innerHTML = '🎬 Neko GIF Capturer';

        // Capture button
        const captureBtn = document.createElement('button');
        captureBtn.textContent = '🎥 Capture GIF';
        captureBtn.style.cssText = `
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #ff6b6b, #ee5a52);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 10px;
            font-weight: bold;
            font-size: 14px;
            transition: all 0.2s ease;
        `;

        captureBtn.addEventListener('mouseenter', () => {
            captureBtn.style.transform = 'translateY(-2px)';
            captureBtn.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.4)';
        });

        captureBtn.addEventListener('mouseleave', () => {
            captureBtn.style.transform = 'translateY(0)';
            captureBtn.style.boxShadow = 'none';
        });

        // Progress bar
        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = `
            width: 100%;
            height: 4px;
            background: rgba(255,255,255,0.2);
            border-radius: 2px;
            margin-bottom: 10px;
            overflow: hidden;
            display: none;
        `;

        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            height: 100%;
            background: linear-gradient(90deg, #4facfe, #00f2fe);
            width: 0%;
            transition: width 0.3s ease;
        `;
        progressContainer.appendChild(progressBar);

        // Status display
        const status = document.createElement('div');
        status.style.cssText = `
            font-size: 12px;
            color: rgba(255,255,255,0.8);
            min-height: 20px;
            text-align: center;
        `;
        status.textContent = 'Ready to capture ✨';

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 8px;
            right: 12px;
            background: transparent;
            color: rgba(255,255,255,0.7);
            border: none;
            font-size: 20px;
            cursor: pointer;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        `;

        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'rgba(255,255,255,0.2)';
            closeBtn.style.color = 'white';
        });

        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'transparent';
            closeBtn.style.color = 'rgba(255,255,255,0.7)';
        });

        // Assemble panel
        panel.appendChild(closeBtn);
        panel.appendChild(title);
        panel.appendChild(captureBtn);
        panel.appendChild(progressContainer);
        panel.appendChild(status);

        document.body.appendChild(panel);

        // Event listeners
        closeBtn.addEventListener('click', () => {
            panel.remove();
        });

        captureBtn.addEventListener('click', () => {
            startGifCapture(canvas, 10, 3, status, progressBar, progressContainer, captureBtn);
        });
    }

    // Function to handle the entire GIF capture process
    function startGifCapture(canvas, frameDelay, totalFrames, statusElement, progressBar, progressContainer, captureBtn) {
        // Prepare UI and state for capture
        setupCaptureUI(statusElement, progressBar, progressContainer, captureBtn);
        const encoder = new GIFEncoder(canvas.width, canvas.height);

        // Start capturing frames
        setTimeout(() => {
            captureFrameLoop(
                encoder, 
                canvas, 
                frameDelay, 
                totalFrames, 
                statusElement, 
                progressBar
            ).then((capturedFrames) => {
                // Once frames are captured, render the GIF
                renderAndDownloadGIF(
                    encoder, 
                    statusElement, 
                    progressBar, 
                    progressContainer, 
                    captureBtn, 
                    capturedFrames
                );
            });
        }, 1000);
    }

    // Function to set up the UI state before capture begins
    function setupCaptureUI(statusElement, progressBar, progressContainer, captureBtn) {
        captureBtn.disabled = true;
        captureBtn.style.opacity = '0.6';
        captureBtn.style.cursor = 'not-allowed';
        progressContainer.style.display = 'block';
        statusElement.textContent = '⏳ Starting capture in 1 second...';
        progressBar.style.width = '0%'; // Reset progress bar
    }

    // Function to handle the recursive frame capturing loop
    async function captureFrameLoop(encoder, canvas, frameDelay, totalFrames, statusElement, progressBar) {
        let capturedFrames = 0;
        
        return new Promise(resolve => {
            let frameCount = 0;
            function capture() {
                frameCount++;
                const progress = (frameCount / totalFrames) * 100;
                progressBar.style.width = `${Math.min(progress, 90)}%`;
                statusElement.textContent = `📸 Capturing frame ${frameCount}/${totalFrames}...`;

                const result = encoder.addFrame(canvas, frameDelay);
                if (result) {
                    capturedFrames++;
                    console.log(`Frame ${frameCount} captured successfully`);
                } else {
                    console.log(`Frame ${frameCount} was a duplicate and skipped`);
                    frameCount--;
                }

                if (frameCount < totalFrames) {
                    setTimeout(capture, frameDelay);
                } else {
                    resolve(capturedFrames);
                }
            }
            capture();
        });
    }

    // Function to handle the final rendering, downloading, and UI reset
    async function renderAndDownloadGIF(encoder, statusElement, progressBar, progressContainer, captureBtn, capturedFrames) {
        progressBar.style.width = '95%';
        statusElement.textContent = '🎬 Creating GIF...';

        try {
            const gifUrl = await encoder.renderGIF();

            if (gifUrl && capturedFrames > 0) {
                // Create and trigger download
                const link = document.createElement('a');
                link.download = `wigglypaint-animation-${new Date().getTime()}.gif`;
                link.href = gifUrl;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                progressBar.style.width = '100%';
                statusElement.textContent = `🎉 GIF saved! (${capturedFrames} frames)`;
                setTimeout(() => URL.revokeObjectURL(gifUrl), 5000); // Clean up
            } else {
                statusElement.textContent = '❌ No frames captured or error occurred';
            }
        } catch (error) {
            console.error('Error creating GIF:', error);
            statusElement.textContent = '❌ Error creating GIF';
        } finally {
            // Reset UI regardless of success or failure
            setTimeout(() => {
                progressContainer.style.display = 'none';
                progressBar.style.width = '0%';
                statusElement.textContent = 'Ready to capture ✨';
                captureBtn.disabled = false;
                captureBtn.style.opacity = '1';
                captureBtn.style.cursor = 'pointer';
            }, 3000);
        }
    }
})();