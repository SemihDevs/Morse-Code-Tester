const MORSE_CODE = {
    '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E', '..-.': 'F',
    '--.': 'G', '....': 'H', '..': 'I', '.---': 'J', '-.-': 'K', '.-..': 'L',
    '--': 'M', '-.': 'N', '---': 'O', '.--.': 'P', '--.-': 'Q', '.-.': 'R',
    '...': 'S', '-': 'T', '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X',
    '-.--': 'Y', '--..': 'Z', '-----': '0', '.----': '1', '..---': '2',
    '...--': '3', '....-': '4', '.....': '5', '-....': '6', '--...': '7',
    '---..': '8', '----.': '9'
};

let audioCtx = null;
let oscillator = null;
let gainNode = null;

const DOT_TIME = 50; // EXTREME PRO SPEED (50ms)
const DASH_TIME = DOT_TIME * 3;

let startTime = 0;
let lastReleaseTime = 0;
let currentMorse = "";
let fullText = "";

const key = document.getElementById('telegraphKey');
const lamp = document.getElementById('signalLamp');
const output = document.getElementById('output');
const buffer = document.getElementById('buffer');
const clearBtn = document.getElementById('clearBtn');
const refGrid = document.getElementById('refGrid');
const translateInput = document.getElementById('translateInput');
const playBtn = document.getElementById('playBtn');
const translatedMorse = document.getElementById('translatedMorse');

// Reverse Lookup
const TEXT_TO_MORSE = {};
Object.entries(MORSE_CODE).forEach(([m, c]) => { TEXT_TO_MORSE[c] = m; });

// Audio setup - Ultra Low Latency
function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    gainNode.gain.value = 0;
}

function startTone() {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    oscillator = audioCtx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator.connect(gainNode);
    oscillator.start();
    gainNode.gain.setTargetAtTime(0.15, audioCtx.currentTime, 0.005);
}

function stopTone() {
    if (gainNode) gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.005);
    if (oscillator) {
        const oscToStop = oscillator;
        setTimeout(() => { try { oscToStop.stop(); } catch(e){} }, 20);
    }
}

function handleDown() {
    if (startTime !== 0) return;
    startTime = performance.now();
    startTone();
    key.classList.add('active');
    lamp.classList.add('active');
}

function handleUp() {
    if (startTime === 0) return;
    const duration = performance.now() - startTime;
    startTime = 0;
    lastReleaseTime = performance.now();
    stopTone();
    key.classList.remove('active');
    lamp.classList.remove('active');

    currentMorse += (duration < DOT_TIME * 2) ? "." : "-";
    buffer.innerText = currentMorse;
}

// Main Loop - High Frequency (10ms)
setInterval(() => {
    if (lastReleaseTime === 0 || startTime !== 0) return;
    const idleTime = performance.now() - lastReleaseTime;

    // Character completion
    if (idleTime > DOT_TIME * 2.5 && currentMorse !== "") {
        const char = MORSE_CODE[currentMorse] || "?";
        fullText = (fullText === "_" || fullText === "" ? "" : fullText) + char;
        output.innerText = fullText;
        currentMorse = "";
        buffer.innerText = "";
    }

    // Word completion (Space)
    if (idleTime > DOT_TIME * 6 && fullText !== "" && !fullText.endsWith(" ")) {
        fullText += " ";
        output.innerText = fullText;
    }
}, 10);

function translateText(text) {
    return text.toUpperCase().split('').map(char => {
        if (char === ' ') return '/';
        return TEXT_TO_MORSE[char] || '?';
    }).join(' ');
}

translateInput.addEventListener('input', (e) => {
    translatedMorse.innerText = translateText(e.target.value);
});

async function playMorseSequence(sequence) {
    playBtn.disabled = true;
    playBtn.style.opacity = 0.5;
    
    const parts = sequence.split('');
    for (const p of parts) {
        if (p === '.') {
            handleDown(); await new Promise(r => setTimeout(r, DOT_TIME));
            handleUp(); await new Promise(r => setTimeout(r, DOT_TIME));
        } else if (p === '-') {
            handleDown(); await new Promise(r => setTimeout(r, DASH_TIME));
            handleUp(); await new Promise(r => setTimeout(r, DOT_TIME));
        } else if (p === ' ') {
            await new Promise(r => setTimeout(r, DOT_TIME * 1.5));
        } else if (p === '/') {
            await new Promise(r => setTimeout(r, DOT_TIME * 4));
        }
    }
    
    playBtn.disabled = false;
    playBtn.style.opacity = 1;
}

playBtn.onclick = () => {
    const seq = translatedMorse.innerText;
    if (seq) playMorseSequence(seq);
};

// Initial Load
// Ready for input

// Events
window.addEventListener('keydown', (e) => { 
    if(e.target.tagName === 'INPUT') return;
    if(e.code === 'Space') { e.preventDefault(); handleDown(); }
});
window.addEventListener('keyup', (e) => { 
    if(e.target.tagName === 'INPUT') return;
    if(e.code === 'Space') { handleUp(); }
});
key.addEventListener('mousedown', (e) => { e.preventDefault(); handleDown(); });
key.addEventListener('mouseup', handleUp);
key.addEventListener('touchstart', (e) => { e.preventDefault(); handleDown(); });
key.addEventListener('touchend', (e) => { e.preventDefault(); handleUp(); });

clearBtn.onclick = () => {
    fullText = ""; currentMorse = "";
    output.innerText = "_"; buffer.innerText = "";
};

Object.entries(MORSE_CODE).forEach(([m, c]) => {
    const item = document.createElement('div');
    item.className = 'grid-item';
    item.innerHTML = `<strong>${c}</strong><br>${m}`;
    refGrid.appendChild(item);
});
key.addEventListener('mousedown', handleDown);
key.addEventListener('mouseup', handleUp);
key.addEventListener('touchstart', (e) => { e.preventDefault(); handleDown(); });
key.addEventListener('touchend', (e) => { e.preventDefault(); handleUp(); });

clearBtn.onclick = () => {
    fullText = ""; currentMorse = "";
    output.innerText = "_"; buffer.innerText = "";
};

// Reference Grid
Object.entries(MORSE_CODE).forEach(([m, c]) => {
    const item = document.createElement('div');
    item.className = 'grid-item';
    item.innerHTML = `<strong>${c}</strong><br>${m}`;
    refGrid.appendChild(item);
});
