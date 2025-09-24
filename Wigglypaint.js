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

    class SimpleGIFEncoder {
        constructor(width, height, quality = 10) {
            this.width = width;
            this.height = height;
            this.quality = quality;
            this.frames = [];
        }

        addFrame(canvas, delay = 500) {
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // Add if is not the same as the saved ones
            if (!this.frames.some(frame => this.isSameFrame(frame.data, imageData))) {
                this.frames.push({
                    data: imageData,
                    delay: delay
                });
                return true;
            }
            return false;
        }

        isSameFrame(frameData, newData) {
            if (frameData.width !== newData.width || frameData.height !== newData.height) return false;

            const framePixels = frameData.data;
            const newPixels = newData.data;

            for (let i = 0; i < framePixels.length; i++) {
                if (framePixels[i] !== newPixels[i]) return false;
            }
            return true;
        }

        async renderAsAPNG() {
            if (this.frames.length === 0) return null;
            const zip = await this.createFrameZip();
            return zip;
        }

        // Create downloadable frames as individual images
        async createFrameZip() {
            const frames = [];
            for (let i = 0; i < this.frames.length; i++) {
                const canvas = document.createElement('canvas');
                canvas.width = this.width;
                canvas.height = this.height;
                const ctx = canvas.getContext('2d');
                ctx.putImageData(this.frames[i].data, 0, 0);

                const dataURL = canvas.toDataURL('image/png');
                frames.push({
                    name: `frame_${i + 1}.png`,
                    data: dataURL
                });
            }
            return frames;
        }
    }

    // Initialize when page loads
    window.addEventListener('load', function() {
        initGifCapture();
    });

    function initGifCapture() {
        const canvas = document.querySelector('iframe').contentDocument.body.querySelector("#display")
        console.log('Canvas found:', canvas);
        createControlPanel(canvas);
    }

    function createControlPanel(canvas) {
        // Create floating control panel
        const panel = document.createElement('div');
        panel.id = 'gif-capture-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            min-width: 250px;
        `;

        // Capture button
        const captureBtn = document.createElement('button');
        captureBtn.textContent = 'Save GIF';
        captureBtn.style.cssText = `
            width: 100%;
            padding: 10px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 10px;
            font-weight: bold;
        `;

        // Status display
        const status = document.createElement('div');
        status.style.cssText = `
            font-size: 12px;
            color: #ccc;
            min-height: 20px;
        `;
        status.textContent = 'Ready to capture';

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 10px;
            background: transparent;
            color: white;
            border: none;
            font-size: 18px;
            cursor: pointer;
            width: 20px;
            height: 20px;
        `;

        // Assemble panel
        panel.appendChild(closeBtn);
        panel.appendChild(document.createTextNode('Neko capturer 😺'));
        panel.appendChild(document.createElement('br'));
        panel.appendChild(document.createElement('br'));
        panel.appendChild(captureBtn);
        panel.appendChild(status);

        document.body.appendChild(panel);

        // Event listeners
        closeBtn.addEventListener('click', () => {
            panel.remove();
        });

        captureBtn.addEventListener('click', () => {
            captureAsGif(canvas, 300, status);
        });
    }

    // Create GIF
    function captureAsGif(canvas, frameDelay, statusElement) {
        const encoder = new SimpleGIFEncoder(canvas.width, canvas.height);
        let frameCount = 0;
        const totalFrames = 3;

        function captureFrame() {
            frameCount++;
            statusElement.textContent = `Capturing frame ${frameCount}/${totalFrames}...`;

            const result = encoder.addFrame(canvas, frameDelay);
            if (!result) {
                console.log(`Frame ${frameCount} is a duplicate and was skipped.`);
                frameCount--; // Don't count duplicate frames
            }

            if (frameCount < totalFrames) {
                setTimeout(captureFrame, frameDelay);
            } else {
                statusElement.textContent = 'Creating frame package...';
                encoder.renderAsAPNG().then(frames => {
                    frames.forEach((frame, index) => {
                        setTimeout(() => {
                            const link = document.createElement('a');
                            link.download = frame.name;
                            link.href = frame.data;
                            link.style.display = 'none';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }, index * 200);
                    });

                    statusElement.textContent = 'Frames saved! Combine with online tool.';
                    setTimeout(() => {
                        statusElement.textContent = 'Ready to capture';
                    }, 3000);
                });
            }
        }

        setTimeout(captureFrame, 100);
    }
})();