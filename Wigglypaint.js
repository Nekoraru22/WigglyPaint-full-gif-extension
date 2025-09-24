// ==UserScript==
// @name        GIF Capture Script for WigglyPaint
// @namespace   Violentmonkey Scripts
// @match       https://wigglypaint.net/es*
// @grant       none
// @version     1.0
// @author      Nekoraru22 (https://github.com/Nekoraru22)
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
            this.colorTable = [];
            this.globalColorTable = null;
        }

        addFrame(canvas, delay = 500) {
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, this.width, this.height);
            
            // Check if frame is duplicate
            if (!this.isDuplicateFrame(imageData)) {
                this.frames.push(imageData);
                this.delays.push(Math.max(10, Math.floor(delay / 10))); // GIF delay is in centiseconds
                return true;
            }
            return false;
        }

        isDuplicateFrame(newImageData) {
            if (this.frames.length === 0) return false;
            
            const lastFrame = this.frames[this.frames.length - 1];
            if (lastFrame.width !== newImageData.width || lastFrame.height !== newImageData.height) {
                return false;
            }

            const lastPixels = lastFrame.data;
            const newPixels = newImageData.data;

            for (let i = 0; i < lastPixels.length; i += 4) {
                if (lastPixels[i] !== newPixels[i] || 
                    lastPixels[i + 1] !== newPixels[i + 1] || 
                    lastPixels[i + 2] !== newPixels[i + 2] || 
                    lastPixels[i + 3] !== newPixels[i + 3]) {
                    return false;
                }
            }
            return true;
        }

        // Create GIF binary data
        createGIF() {
            console.log("TODO")
        }

        async renderGIF() {
            const gifData = this.createGIF();
            if (!gifData) return null;
            
            const blob = new Blob([gifData], { type: 'image/gif' });
            return URL.createObjectURL(blob);
        }
    }

    // Initialize when page loads
    window.addEventListener('load', function() {
        setTimeout(initGifCapture, 1000);
    });

    function initGifCapture() {
        try {
            const iframe = document.querySelector('iframe');
            if (!iframe || !iframe.contentDocument) {
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
            captureAsGif(canvas, 100, 3, status, progressBar, progressContainer, captureBtn);
        });
    }

    // Create actual GIF
    function captureAsGif(canvas, frameDelay, totalFrames, statusElement, progressBar, progressContainer, captureBtn) {
        const encoder = new GIFEncoder(canvas.width, canvas.height);
        let frameCount = 0;
        let capturedFrames = 0;

        captureBtn.disabled = true;
        captureBtn.style.opacity = '0.6';
        captureBtn.style.cursor = 'not-allowed';
        progressContainer.style.display = 'block';

        function captureFrame() {
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
            }

            if (frameCount < totalFrames) {
                setTimeout(captureFrame, frameDelay);
            } else {
                progressBar.style.width = '95%';
                statusElement.textContent = '🎬 Creating GIF...';
                
                setTimeout(async () => {
                    try {
                        const gifUrl = await encoder.renderGIF();
                        if (gifUrl && capturedFrames > 0) {
                            // Create download link
                            const link = document.createElement('a');
                            link.download = `wigglypaint-animation-${new Date().getTime()}.gif`;
                            link.href = gifUrl;
                            link.style.display = 'none';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            
                            progressBar.style.width = '100%';
                            statusElement.textContent = `🎉 GIF saved! (${capturedFrames} frames)`;
                            
                            // Clean up URL
                            setTimeout(() => URL.revokeObjectURL(gifUrl), 5000);
                        } else {
                            statusElement.textContent = '❌ No frames captured or error occurred';
                        }
                    } catch (error) {
                        console.error('Error creating GIF:', error);
                        statusElement.textContent = '❌ Error creating GIF';
                    }
                    
                    // Reset UI
                    setTimeout(() => {
                        progressContainer.style.display = 'none';
                        progressBar.style.width = '0%';
                        statusElement.textContent = 'Ready to capture ✨';
                        captureBtn.disabled = false;
                        captureBtn.style.opacity = '1';
                        captureBtn.style.cursor = 'pointer';
                    }, 3000);
                }, 500);
            }
        }

        statusElement.textContent = '⏳ Starting capture in 1 second...';
        setTimeout(captureFrame, 1000);
    }
})();