/**
 * V20 - THE DIVINE EDITION SCRIPT
 * Features: JSON Data Fetching, PWA, Background Sync Chat, A11y, Animations, Cookies
 */

// --- KONFİGÜRASYON ---
// Render'dan aldığın backend linki
const API_URL = "https://portfolio-backend-hu1r.onrender.com/chat";

// Global Değişkenler
let currentLang = 'en';
let translations = {};
let repoStatus = {};
let locationsData = [];
let deferredPrompt; // PWA Install event
let animationsEnabled = localStorage.getItem('animations') !== 'off';
let prevFocusElement = null; // A11y Focus Restoration

const THINKING_PHRASES = [
    "Consulting the Oracle...", 
    "Brewing Genius...", 
    "Aligning Stars...", 
    "Parsing the Matrix...",
    "Almost there..."
];

// --- 1. BAŞLANGIÇ & VERİ YÜKLEME ---
document.addEventListener('DOMContentLoaded', async () => {
    // Yıl Güncelleme
    document.getElementById('year').textContent = new Date().getFullYear();

    // Çerez Kontrolü
    checkCookies();

    // Verileri Çek (JSON)
    try {
        // Cache-busting için ?v=20 ekledik
        const [trans, locs, repos, exp, edu] = await Promise.all([
            fetch('data/translations.json?v=20').then(r => r.json()),
            fetch('data/locations.json?v=20').then(r => r.json()),
            fetch('data/repos.json?v=20').then(r => r.json()),
            fetch('data/experience.json?v=20').then(r => r.json()),
            fetch('data/education.json?v=20').then(r => r.json())
        ]);

        translations = trans;
        locationsData = locs;
        repoStatus = repos;

        // İçeriği Render Et
        renderLists('exp-list', exp);
        renderLists('edu-list', edu);
        
        // Dil Ayarı (Tarayıcı diline göre)
        const userLang = navigator.language || navigator.userLanguage;
        const initialLang = (userLang.startsWith('tr')) ? 'tr' : (userLang.startsWith('sr') ? 'sr' : 'en');
        setLanguage(initialLang);

        // Animasyon Butonu Durumu
        updateAnimButton();

        // Harita (Lazy Load - Görünür olunca yükle)
        initMapObserver();

    } catch (e) {
        console.error("Data Load Error:", e);
        showToast("Offline mode: Some content might be limited.", "error");
    }
});

// --- 2. PWA & SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Divine SW Registered 🛡️'))
        .catch(err => console.error('SW Fail:', err));
}

// Install Prompt Yakalama
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('pwa-install-btn');
    if(btn) btn.style.display = 'block';
});

window.triggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        document.getElementById('pwa-install-btn').style.display = 'none';
    }
    deferredPrompt = null;
};

window.addEventListener('appinstalled', () => {
    showToast("You are now immortal – App installed eternally! ⚡", "divine");
    triggerConfetti(20);
});

// --- 3. UI FONKSİYONLARI (COOKIES & MENU) ---

// Çerez Mantığı
function checkCookies() {
    const banner = document.getElementById('cookie-banner');
    if (!localStorage.getItem('cookieConsent')) {
        setTimeout(() => banner.classList.add('show'), 2000);
    }
    
    document.getElementById('cookie-accept').onclick = () => {
        localStorage.setItem('cookieConsent', 'true');
        banner.classList.remove('show');
    };
    
    document.getElementById('cookie-reject').onclick = () => {
        localStorage.setItem('cookieConsent', 'false');
        banner.classList.remove('show');
    };
}

window.reopenCookieBanner = () => {
    const banner = document.getElementById('cookie-banner');
    banner.classList.add('show');
};

// Mobil Menü
window.toggleMobileMenu = () => {
    // Basit bir toggle mantığı, CSS'de .active class'ı ile kontrol edilebilir
    // Şimdilik sadece toast mesajı ile placeholder yapıyoruz, 
    // CSS'inizde mobil menü tasarımı varsa buraya 'classList.toggle' eklenir.
    const menu = document.querySelector('.header-actions');
    // menu.classList.toggle('active'); // CSS'de mobil menü varsa açar
    console.log("Mobile menu toggled");
};

// --- 4. CHATBOT ---

function toggleChat() {
    const chatWindow = document.getElementById('chat-window');
    const isOpen = chatWindow.style.display === 'flex';
    chatWindow.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen) {
        document.getElementById('chat-input').focus();
    }
}

function handleChatKey(e) {
    if (e.key === 'Enter') sendMessage();
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        const url = URL.createObjectURL(input.files[0]);
        const imgDiv = document.getElementById('chat-img-preview');
        imgDiv.innerHTML = `<img src="${url}" alt="Preview" style="max-height:60px; border-radius:5px; border:1px solid var(--accent-gold);">`;
        imgDiv.style.display = 'block';
    }
}

// Yardımcı: Mesaj Ekleme
function appendMessage(text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = text; 
    document.getElementById('chat-messages').appendChild(div);
    const container = document.getElementById('chat-messages');
    container.scrollTop = container.scrollHeight;
    return div;
}

// Chat Gönderme
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const fileInput = document.getElementById('chat-file');
    
    const msg = input.value.trim();
    const file = fileInput.files[0];

    if (!msg && !file) return;

    appendMessage(msg, 'user');
    input.value = ''; 
    
    const loading = document.createElement('div');
    loading.className = 'message bot typing';
    loading.innerHTML = '<span id="think-txt">Thinking...</span> <span class="dot"></span><span class="dot"></span>';
    document.getElementById('chat-messages').appendChild(loading);

    let phase = 0;
    const interval = setInterval(() => {
        const txtElement = document.getElementById('think-txt');
        if(txtElement) txtElement.innerText = THINKING_PHRASES[phase++ % THINKING_PHRASES.length];
    }, 1500);

    try {
        const formData = new FormData();
        formData.append('message', msg);
        if (file) formData.append('image', file);

        const res = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
        
        clearInterval(interval);
        loading.remove();
        
        if (!res.ok && !navigator.onLine) throw new Error("Offline"); 
        
        const data = await res.json();
        appendMessage(data.reply, 'bot');
        
        // Temizlik
        document.getElementById('chat-img-preview').style.display = 'none';
        document.getElementById('chat-img-preview').innerHTML = '';
        fileInput.value = '';

    } catch (e) {
        clearInterval(interval);
        loading.remove();
        
        if (!navigator.onLine) {
            showToast("Offline: Message queued! 📨", "info");
            appendMessage("Message queued...", "system");
        } else {
            console.error(e);
            appendMessage("Connection weak. <button onclick='sendMessage()'>Retry</button>", 'bot');
        }
    }
}

// --- 5. DİĞER UI ÖZELLİKLERİ ---

function renderLists(elementId, dataArray) {
    const container = document.getElementById(elementId);
    if (!container) return;
    container.innerHTML = dataArray.map(item => {
        const tTitle = translations[currentLang][item.key + 'Title'] || item.company;
        const tDesc = translations[currentLang][item.key + 'Desc'] || "";
        const isEdu = elementId === 'edu-list';
        return `
            <div class="list-item ${isEdu ? 'edu' : ''}" data-category="${item.cat}">
                <h4>${tTitle}</h4>
                <span class="company">${item.company}</span>
                <div class="meta"><span>${item.loc}</span> <span>${item.date}</span></div>
                ${item.subtext ? `<div style="font-size:0.8rem; margin-bottom:5px; opacity:0.8"><i>${item.subtext}</i></div>` : ''}
                <ul>${tDesc}</ul>
            </div>
        `;
    }).join('');
}

function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) el.innerHTML = translations[lang][key];
    });
    document.querySelectorAll('input[name="name"]').forEach(el => el.placeholder = translations[lang].formName);
    document.querySelectorAll('input[name="email"]').forEach(el => el.placeholder = translations[lang].formEmail);
    document.querySelectorAll('textarea[name="message"]').forEach(el => el.placeholder = translations[lang].formMsg);
    
    if(window.globalExpData && window.globalEduData) {
        renderLists('exp-list', window.globalExpData);
        renderLists('edu-list', window.globalEduData);
    } else {
       // İlk yüklemede veriler fetch'ten gelir, sonrakilerde buradan
    }
    
    document.getElementById('lang-toggle').innerText = lang.toUpperCase();
    if (window.mapControl && window.map) {
        window.map.removeControl(window.mapControl);
        window.addMapControl(lang);
    }
}

function toggleLanguage() {
    if (currentLang === 'en') setLanguage('tr');
    else if (currentLang === 'tr') setLanguage('sr');
    else setLanguage('en');
}

function toggleAnimations() {
    animationsEnabled = !animationsEnabled;
    localStorage.setItem('animations', animationsEnabled ? 'on' : 'off');
    updateAnimButton();
    if(animationsEnabled) triggerConfetti(10);
    showToast(`Animations: ${animationsEnabled ? 'ON' : 'OFF'}`, "info");
}

function updateAnimButton() {
    const btn = document.getElementById('anim-toggle');
    if(btn) {
        btn.innerText = `Anim: ${animationsEnabled ? 'On' : 'Off'}`;
        btn.setAttribute('aria-pressed', animationsEnabled);
        btn.classList.toggle('off', !animationsEnabled);
    }
}

function triggerConfetti(amount = 15) {
    if (!animationsEnabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.getElementById('confetti-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    const colors = ['#fbbf24', '#38bdf8', '#2ecc71', '#e74c3c', '#f1c40f'];
    for(let i=0; i<amount; i++) {
        particles.push({
            x: Math.random() * canvas.width, y: -10, r: Math.random() * 5 + 2, d: Math.random() * amount,
            c: colors[Math.floor(Math.random() * colors.length)], vx: Math.random() * 2 - 1, vy: Math.random() * 2 + 2
        });
    }
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = 0;
        particles.forEach(p => {
            if(p.y < canvas.height) {
                active++;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.c; ctx.fill();
                p.x += p.vx; p.y += p.vy;
            }
        });
        if(active > 0) requestAnimationFrame(draw);
    }
    draw();
}

// Toast Gösterimi
function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    if (type === 'divine') toast.style.borderColor = '#a855f7';
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
}

// Harita ve Modallar (Önceki kodun aynısı)
let map, tileLayer;
function initMapObserver() {
    const mapEl = document.getElementById('map');
    if(!mapEl) return;
    const observer = new IntersectionObserver(entry => {
        if(entry[0].isIntersecting) { initMap(); observer.disconnect(); }
    }, { threshold: 0.1 });
    observer.observe(mapEl);
}

function initMap() {
    if(typeof L === 'undefined') return;
    map = L.map('map').setView([41.0082, 28.9784], 3);
    const isLight = document.body.classList.contains('light-mode');
    const tileUrl = isLight ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    tileLayer = L.tileLayer(tileUrl, { attribution: '&copy; CARTO' }).addTo(map);
    
    const workLayer = L.layerGroup().addTo(map);
    const eduLayer = L.layerGroup().addTo(map);
    const tenderLayer = L.layerGroup().addTo(map);
    
    const iconUrl = (c) => `https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-${c}.png`;
    const shadow = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png';
    const createIcon = (color) => new L.Icon({ iconUrl: iconUrl(color), shadowUrl: shadow, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
    const icons = { blue: createIcon('blue'), green: createIcon('green'), gold: createIcon('
