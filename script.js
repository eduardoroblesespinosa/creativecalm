import p5 from 'p5';

// --- DOM Elements ---
const introScreen = document.getElementById('intro-screen');
const introTitle = document.getElementById('intro-title');
const introSubtitle = document.getElementById('intro-subtitle');
const introTextContainer = document.getElementById('intro-text-container');
const startScreen = document.getElementById('start-screen');
const experienceScreen = document.getElementById('experience-screen');
const endScreen = document.getElementById('end-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const tripTypeRadios = document.querySelectorAll('input[name="trip-type"]');
const mainTitle = document.getElementById('main-title');
const mainSubtitle = document.getElementById('main-subtitle');

const tripInfo = {
    calm: {
        title: "Calma Creativa",
        subtitle: "Una simulación segura y recreativa de los efectos positivos percibidos del cannabis en el cerebro.<br>El objetivo es ayudarte a encontrar un espacio de relajación y creatividad, como una herramienta de apoyo para reducir o dejar el consumo.",
        background: "url('calm-background.png')",
        music: 'calm-music.mp3'
    },
    dopamine: {
        title: "Euforia Energética",
        subtitle: "Una experiencia estimulante para aumentar la motivación y la energía positiva.<br>Utiliza estímulos visuales y auditivos vibrantes para generar una sensación de recompensa y euforia, ideal para empezar el día o una tarea creativa.",
        background: "url('dopamine-background.png')",
        music: 'dopamine-music.mp3'
    },
    oxytocin: {
        title: "Conexión Empática",
        subtitle: "Fomenta sentimientos de amor, confianza y conexión social.<br>Una experiencia diseñada para evocar calidez y empatía, recordándote la belleza de las relaciones humanas y el afecto.",
        background: "url('oxytocin-background.png')",
        music: 'oxytocin-music.mp3'
    },
    psilocybin: {
        title: "Viaje Místico",
        subtitle: "Una exploración introspectiva y sensorial inspirada en los efectos de la psilocibina.<br>Diseñado para expandir la percepción, fomentar la creatividad y conectar con la naturaleza de la conciencia.",
        background: "url('psilocybin-background.png')",
        music: 'psilocybin-music.mp3'
    },
    caapi: {
        title: "Viaje de Introspección",
        subtitle: "Inspirado en la liana Banisteriopsis caapi, esta experiencia te guía hacia un profundo viaje interior.<br>Un espacio para la reflexión, la sanación y la conexión con las raíces de tu ser.",
        background: "url('caapi-background.png')",
        music: 'caapi-music.mp3'
    }
};

let introStep = 0;
const introOrder = ['calm', 'dopamine', 'oxytocin', 'psilocybin', 'caapi'];

function showIntroStep(step) {
    const tripKey = introOrder[step];
    const info = tripInfo[tripKey];
    
    document.body.style.backgroundImage = info.background;
    introTitle.innerText = info.title;
    introSubtitle.innerHTML = info.subtitle;

    introTextContainer.classList.remove('text-fade-out');
    introTextContainer.classList.add('text-fade-in');
}

function nextIntroStep() {
    introTextContainer.classList.remove('text-fade-in');
    introTextContainer.classList.add('text-fade-out');

    setTimeout(() => {
        introStep++;
        if (introStep < introOrder.length) {
            showIntroStep(introStep);
        } else {
            // End of intro
            introScreen.classList.add('screen-fade-out');
            setTimeout(() => {
                introScreen.classList.add('d-none');
                startScreen.classList.remove('d-none');
                startScreen.classList.add('screen-fade-in');
                 // Set the main screen to the default view
                document.getElementById('trip-calm').checked = true;
                updateTripInfo();
            }, 1000);
        }
    }, 1000); // Wait for fade out to finish
}

function updateTripInfo() {
    const selectedTrip = document.querySelector('input[name="trip-type"]:checked').value;
    mainTitle.innerText = tripInfo[selectedTrip].title;
    mainSubtitle.innerHTML = tripInfo[selectedTrip].subtitle;
    document.body.style.backgroundImage = tripInfo[selectedTrip].background;
}

// --- Audio Manager ---

const audioManager = {
    audioContext: null,
    soundBuffers: new Map(),
    musicSource: null,
    natureSource: null,
    binauralOscillators: [],
    masterGain: null,
    musicGain: null,
    natureGain: null,
    binauralGain: null,
    reverbNode: null,
    isInitialized: false,
    isPlaying: false,

    async init() {
        if (this.isInitialized) return;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.8;
        this.masterGain.connect(this.audioContext.destination);

        // Create reverb (3D Echo)
        this.reverbNode = this.audioContext.createConvolver();
        const reverbTime = 2;
        const decay = 1.5;
        const impulseBuffer = this._createImpulseResponse(reverbTime, decay);
        this.reverbNode.buffer = impulseBuffer;
        this.reverbNode.connect(this.masterGain);

        this.musicGain = this.audioContext.createGain();
        this.musicGain.gain.value = 0.6;
        this.musicGain.connect(this.reverbNode);

        this.natureGain = this.audioContext.createGain();
        this.natureGain.gain.value = 0.4;
        this.natureGain.connect(this.reverbNode);

        this.binauralGain = this.audioContext.createGain();
        this.binauralGain.gain.value = 0.1; // Binaural beats should be subtle
        this.binauralGain.connect(this.masterGain);

        await this._loadSounds();
        this.isInitialized = true;
    },

    async _loadSound(url) {
        if (this.soundBuffers.has(url)) {
            return this.soundBuffers.get(url);
        }
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.soundBuffers.set(url, audioBuffer);
            return audioBuffer;
        } catch (error) {
            console.error(`Error loading audio file: ${url}`, error);
            return null;
        }
    },

    async _loadSounds() {
        const soundFiles = [
            tripInfo.calm.music,
            tripInfo.dopamine.music,
            tripInfo.oxytocin.music,
            tripInfo.psilocybin.music,
            tripInfo.caapi.music,
            'nature-sounds.mp3'
        ];
        await Promise.all(soundFiles.map(file => this._loadSound(file)));
    },

    play(tripType, binauralOption) {
        if (!this.isInitialized || this.isPlaying) return;
        
        const trip = tripInfo[tripType];
        if (!trip || !trip.music) {
            console.error("Invalid trip type or music not defined:", tripType);
            return;
        }
        
        const musicBuffer = this.soundBuffers.get(trip.music);

        if (!musicBuffer) {
            console.error("Music buffer for the selected trip is not loaded.");
            return;
        }

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Play Music
        this.musicSource = this.audioContext.createBufferSource();
        this.musicSource.buffer = musicBuffer;
        this.musicSource.loop = true;
        this.musicSource.connect(this.musicGain);
        this.musicSource.start();
        
        // Play Nature Sounds (only for calm trip)
        if (tripType === 'calm') {
            const natureBuffer = this.soundBuffers.get('nature-sounds.mp3');
            if (natureBuffer) {
                this.natureSource = this.audioContext.createBufferSource();
                this.natureSource.buffer = natureBuffer;
                this.natureSource.loop = true;
                this.natureSource.connect(this.natureGain);
                this.natureSource.start();
            }
        }

        // Play Binaural Beats
        if (binauralOption !== 'none') {
            let baseFreq;
            if (tripType === 'dopamine') baseFreq = 140;
            else if (tripType === 'oxytocin') baseFreq = 100; // Lower, warmer base for connection
            else if (tripType === 'psilocybin') baseFreq = 80; // Deeper, for introspection
            else if (tripType === 'caapi') baseFreq = 60; // Even deeper, for introspection
            else baseFreq = 110;

            const beatFreq = binauralOption === 'alpha' ? 10 : 6; // Alpha: 10Hz, Theta: 6Hz

            const oscL = this.audioContext.createOscillator();
            oscL.type = 'sine';
            oscL.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);

            const oscR = this.audioContext.createOscillator();
            oscR.type = 'sine';
            oscR.frequency.setValueAtTime(baseFreq + beatFreq, this.audioContext.currentTime);

            const merger = this.audioContext.createChannelMerger(2);
            oscL.connect(merger, 0, 0); // Connect L to left channel
            oscR.connect(merger, 0, 1); // Connect R to right channel

            merger.connect(this.binauralGain);
            
            oscL.start();
            oscR.start();
            this.binauralOscillators = [oscL, oscR];
        }

        this.isPlaying = true;
    },

    stop() {
        if (!this.isPlaying) return;
        const fadeOutTime = this.audioContext.currentTime + 1.5;
        this.masterGain.gain.linearRampToValueAtTime(0, fadeOutTime);
        
        setTimeout(() => {
            this.musicSource?.stop();
            this.natureSource?.stop();
            this.binauralOscillators.forEach(osc => osc.stop());
            this.binauralOscillators = [];
            this.natureSource = null; // Clear nature source
            
            // Reset gain for next play
            this.masterGain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
            
            this.isPlaying = false;
        }, 1500);
    },
    
    _createImpulseResponse(duration, decay) {
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * duration;
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        const impulseL = impulse.getChannelData(0);
        const impulseR = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const n = length - i;
            impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
            impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        }
        return impulse;
    }
};

// --- p5.js Sketch ---
let sketchInstance;

const sketch = (p) => {
    let particles = [];
    p.tripType = 'calm'; // Default value

    class Particle {
        constructor(x, y) {
            this.pos = p.createVector(x, y);
            this.history = [];
            
            if (p.tripType === 'dopamine') {
                // Dopamine particle properties
                this.vel = p5.Vector.random2D().mult(p.random(2, 5));
                this.lifespan = 150;
                this.size = p.random(3, 10);
                this.hue = p.random(0, 60); // Warm colors: reds, oranges, yellows
                this.acc = p.createVector(0,0);
            } else if (p.tripType === 'oxytocin') {
                // Oxytocin particle properties
                this.vel = p5.Vector.random2D().mult(p.random(0.3, 1));
                this.lifespan = 220;
                this.size = p.random(20, 40);
                this.hue = p.random(330, 360); // Pinks, soft reds
                this.sat = p.random(50, 70);
            } else if (p.tripType === 'psilocybin') {
                this.vel = p5.Vector.random2D().mult(p.random(1, 3));
                this.lifespan = 255;
                this.size = p.random(2, 6);
                this.hue = p.random(150, 300); // Greens, blues, purples, pinks
                this.noiseOffset = p.createVector(p.random(1000), p.random(1000));
            } else if (p.tripType === 'caapi') {
                this.vel = p5.Vector.random2D().mult(p.random(0.5, 1.5));
                this.lifespan = 300;
                this.size = p.random(1, 4);
                this.hue = p.random(80, 160); // Earthy greens and yellows
                this.noiseOffset = p.createVector(p.random(1000), p.random(1000));
                this.history = [];
            } else {
                // Calm particle properties
                this.vel = p5.Vector.random2D().mult(p.random(0.5, 2));
                this.lifespan = 255;
                this.size = p.random(5, 15);
                this.hue = p.random(180, 280); // Cool colors: blues, purples
            }
        }

        update() {
            if (p.tripType === 'dopamine') {
                this.vel.add(this.acc);
                this.vel.limit(8);
                this.lifespan -= 2.5;
                this.hue = (this.hue + 1) % 360;
            } else if (p.tripType === 'oxytocin') {
                this.lifespan -= 1.2;
                this.hue = (this.hue + 0.1) % 360;
                // Add a gentle, flowing motion
                this.vel.x += p.sin(this.pos.y * 0.01) * 0.02;
                this.vel.y += p.cos(this.pos.x * 0.01) * 0.02;
                this.vel.limit(1);
            } else if (p.tripType === 'psilocybin') {
                let angle = p.noise(this.noiseOffset.x + p.frameCount * 0.005, this.noiseOffset.y + p.frameCount * 0.005) * p.TWO_PI * 4;
                let force = p5.Vector.fromAngle(angle);
                force.mult(0.1);
                this.vel.add(force);
                this.vel.limit(3);
                this.lifespan -= 1.0;
                this.hue = (this.hue + 0.3) % 360;
                this.history.push(this.pos.copy());
                if (this.history.length > 25) {
                    this.history.splice(0, 1);
                }
            } else if (p.tripType === 'caapi') {
                let angle = p.noise(this.noiseOffset.x + this.pos.x * 0.008, this.noiseOffset.y + this.pos.y * 0.008) * p.TWO_PI * 2;
                let force = p5.Vector.fromAngle(angle);
                force.mult(0.08);
                this.vel.add(force);
                this.vel.limit(2);
                this.lifespan -= 0.8;
                this.hue = (this.hue + 0.1) % 360;
                this.history.push(this.pos.copy());
                if (this.history.length > 40) {
                    this.history.splice(0, 1);
                }
            } else {
                this.lifespan -= 1.5;
                this.hue = (this.hue + 0.5) % 360; // Slowly shift color
            }
            this.pos.add(this.vel);
        }

        display() {
            p.noStroke();
            if (p.tripType === 'dopamine') {
                p.fill(this.hue, 100, 100, this.lifespan / 150);
                p.ellipse(this.pos.x, this.pos.y, this.size, this.size);
                // Add a little extra sparkle
                p.fill(this.hue, 50, 100, (this.lifespan / 150) * 0.5);
                p.ellipse(this.pos.x, this.pos.y, this.size * 1.5, this.size * 1.5);
            } else if (p.tripType === 'oxytocin') {
                // Soft, glowing effect
                p.fill(this.hue, this.sat - 20, 100, (this.lifespan / 220) * 0.2);
                p.ellipse(this.pos.x, this.pos.y, this.size * 1.5);
                p.fill(this.hue, this.sat, 100, (this.lifespan / 220) * 0.6);
                p.ellipse(this.pos.x, this.pos.y, this.size);
            } else if (p.tripType === 'psilocybin') {
                p.noFill();
                p.beginShape();
                for (let i = 0; i < this.history.length; i++) {
                    let point = this.history[i];
                    let alpha = p.map(i, 0, this.history.length, 0, this.lifespan / 255);
                    let currentHue = (this.hue + i * 0.5) % 360;
                    p.stroke(currentHue, 90, 90, alpha);
                    p.strokeWeight(p.map(i, 0, this.history.length, 1, this.size));
                    p.vertex(point.x, point.y);
                }
                p.endShape();
                p.noStroke();
                p.fill(this.hue, 90, 100, this.lifespan / 255);
                p.ellipse(this.pos.x, this.pos.y, this.size, this.size);
            } else if (p.tripType === 'caapi') {
                p.noFill();
                p.beginShape();
                for (let i = 0; i < this.history.length; i++) {
                    let point = this.history[i];
                    let alpha = p.map(i, 0, this.history.length, 0, (this.lifespan / 300) * 0.7);
                    let currentHue = (this.hue + i * 0.2);
                    p.stroke(currentHue, 60, 80, alpha);
                    p.strokeWeight(p.map(i, 0, this.history.length, 0.5, this.size));
                    p.vertex(point.x, point.y);
                }
                p.endShape();
                p.noStroke();
            } else {
                p.fill(this.hue, 90, 90, this.lifespan / 255);
                p.ellipse(this.pos.x, this.pos.y, this.size);
            }
        }

        isDead() {
            return this.lifespan < 0;
        }
    }

    p.setup = () => {
        let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent('canvas-container');
        p.colorMode(p.HSB, 360, 100, 100, 1);
        p.background(0, 0, 0, 0); // Transparent background
    };

    p.draw = () => {
        const bgFade = (p.tripType === 'dopamine' || p.tripType === 'caapi') ? 0.1 : 0.05;
        p.background(0, 0, 0, bgFade);

        if (p.mouseIsPressed || p.touches.length > 0) {
            let x = p.touches.length > 0 ? p.touches[0].x : p.mouseX;
            let y = p.touches.length > 0 ? p.touches[0].y : p.mouseY;
            const particleCount = (p.tripType === 'dopamine' || p.tripType === 'oxytocin' || p.tripType === 'psilocybin' || p.tripType === 'caapi') ? 2 : 2;
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle(x, y));
            }
        }
        
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].display();
            if (particles[i].isDead()) {
                particles.splice(i, 1);
            }
        }
    };
    
    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    };
};

// --- App Logic ---
let experienceTimeout;

async function startExperience() {
    startScreen.classList.add('screen-fade-out');

    // Initialize audio on user gesture
    await audioManager.init();

    setTimeout(() => {
        startScreen.classList.add('d-none');
        experienceScreen.classList.remove('d-none');
        experienceScreen.classList.add('screen-fade-in');
        
        const selectedTrip = document.querySelector('input[name="trip-type"]:checked').value;

        if (!sketchInstance) {
            sketchInstance = new p5(sketch);
        }
        sketchInstance.tripType = selectedTrip; // Pass trip type to sketch
        
        const selectedFrequency = document.querySelector('input[name="binaural"]:checked').value;
        audioManager.play(selectedTrip, selectedFrequency);

        // End the experience after 90 seconds
        experienceTimeout = setTimeout(endExperience, 90000);

    }, 1500);
}

function endExperience() {
    experienceScreen.classList.remove('screen-fade-in');
    experienceScreen.classList.add('screen-fade-out');
    audioManager.stop();

    setTimeout(() => {
        experienceScreen.classList.add('d-none');
        endScreen.classList.remove('d-none');
        endScreen.classList.add('screen-fade-in');
    }, 1500);
}

function restartExperience() {
    endScreen.classList.remove('screen-fade-in');
    endScreen.classList.add('screen-fade-out');
    clearTimeout(experienceTimeout);

    setTimeout(() => {
        endScreen.classList.add('d-none');
        startScreen.classList.remove('d-none', 'screen-fade-out');
        startScreen.classList.add('screen-fade-in');
        // Reset to default trip type view
        document.getElementById('trip-calm').checked = true;
        updateTripInfo();
    }, 1500);
}

// --- Event Listeners ---
introScreen.addEventListener('click', nextIntroStep);
startButton.addEventListener('click', startExperience);
restartButton.addEventListener('click', restartExperience);
tripTypeRadios.forEach(radio => radio.addEventListener('change', updateTripInfo));

// Initial setup
window.addEventListener('DOMContentLoaded', () => {
    // Start the intro sequence
    showIntroStep(0);
});