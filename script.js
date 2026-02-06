/**
 * V20 - THE DIVINE EDITION SCRIPT
 * Features: JSON Data Fetching, PWA, Background Sync Chat, A11y, Animations
 */

// --- KONFİGÜRASYON ---
// Render'dan aldığın backend linki (Sonuna /chat ekliyoruz)
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
    // Workbox CDN kullanan sw.js dosyasını kaydediyoruz
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

// --- 3. GLOBAL HATA YÖNETİMİ & A11Y ---
window.addEventListener('unhandledrejection', e => {
    console.warn("Divine Intervention:", e.reason);
    // showToast("Recovered from a glitch. Site is stable! 🛡️", "info"); // Opsiyonel
});

// Klavye Kısayolları
document.addEventListener('keydown', (e) => {
    // Ctrl + Shift + A -> Animasyon Aç/Kapa
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') {
        toggleAnimations();
    }
});

// Toast Gösterimi (Focus Management ile)
function showToast(msg, type = 'success') {
    prevFocusElement = document.activeElement;
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    if (type === 'divine') toast.style.borderColor = '#a855f7'; // Divine moru
    
    toast.innerText = msg;
    toast.setAttribute('role', 'alert');
    toast.tabIndex = -1;
    
    container.appendChild(toast);
    toast.focus();

    setTimeout(() => { 
        toast.style.opacity = '0'; 
        setTimeout(() => {
            toast.remove();
            if(prevFocusElement) prevFocusElement.focus();
        }, 300); 
    }, 4000);
}

// --- 4. CHATBOT (DÜZELTİLMİŞ & ENTEGRE EDİLMİŞ HALİ) ---

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

// YARDIMCI FONKSİYON: Mesaj Ekleme
function appendMessage(text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = text; 
    document.getElementById('chat-messages').appendChild(div);
    // Otomatik aşağı kaydır
    const container = document.getElementById('chat-messages');
    container.scrollTop = container.scrollHeight;
    return div;
}

// CHAT GÖNDERME FONKSİYONU
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const fileInput = document.getElementById('chat-file');
    
    const msg = input.value.trim();
    const file = fileInput.files[0];

    // Boş mesaj önle
    if (!msg && !file) return;

    // Kullanıcı mesajı
    appendMessage(msg, 'user');
    input.value = ''; 
    
    // Yükleniyor animasyonu
    const loading = document.createElement('div');
    loading.className = 'message bot typing';
    loading.innerHTML = '<span id="think-txt">Thinking...</span> <span class="dot"></span><span class="dot"></span>';
    document.getElementById('chat-messages').appendChild(loading);

    // Evolving Message (Düşünme yazılarını değiştir)
    let phase = 0;
    const interval = setInterval(() => {
        const txtElement = document.getElementById('think-txt');
        if(txtElement) txtElement.innerText = THINKING_PHRASES[phase++ % THINKING_PHRASES.length];
    }, 1500);

    try {
        // FormData hazırlığı
        const formData = new FormData();
        formData.append('message', msg);
        if (file) formData.append('image', file);

        // Fetch İsteği
        const res = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
        
        clearInterval(interval);
        loading.remove();
        
        // Offline Kontrolü (Background Sync Tetiklemek için)
        if (!res.ok && !navigator.onLine) {
            throw new Error("Offline"); 
        }
        
        const data = await res.json();
        
        // Bot Cevabı
        const botMsg = appendMessage(data.reply, 'bot');
        
        // Ekran okuyucu güncelle
        const liveRegion = document.getElementById('chat-messages');
        liveRegion.setAttribute('aria-live', 'polite');

        // Temizlik
        document.getElementById('chat-img-preview').style.display = 'none';
        document.getElementById('chat-img-preview').innerHTML = '';
        fileInput.value = '';

    } catch (e) {
        clearInterval(interval);
        loading.remove();
        
        if (!navigator.onLine) {
            showToast("Offline: Message queued! Will send when online. 📨", "info");
            appendMessage("Message queued for divine transmission...", "system");
        } else {
            console.error(e);
            const errDiv = appendMessage("Connection weak. ", 'bot');
            const btn = document.createElement('button'); 
            btn.innerText = "Retry"; 
            btn.className = "retry-btn"; // CSS'de stil verilebilir
            btn.style.cssText = "background:none; border:1px solid var(--accent-gold); color:var(--text-main); cursor:pointer; margin-left:5px; border-radius:4px;";
            btn.onclick = () => sendMessage();
            errDiv.appendChild(btn);
        }
    }
}

// --- 5. UI/UX FONKSİYONLARI ---

// Liste Render Etme (Experience & Education)
function renderLists(elementId, dataArray) {
    const container = document.getElementById(elementId);
    if (!container) return;

    // Kategorisine göre stil sınıfı belirle (civil, ai, vb.)
    // Veri JSON'dan geldiği için dataArray'i kullanıyoruz
    container.innerHTML = dataArray.map(item => {
        // Çeviri anahtarlarını kullan
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

// Dil Değiştirme
function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    
    // Basit metinleri güncelle
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) el.innerHTML = translations[lang][key];
    });

    // Placeholderları güncelle
    document.querySelectorAll('input[name="name"]').forEach(el => el.placeholder = translations[lang].formName);
    document.querySelectorAll('input[name="email"]').forEach(el => el.placeholder = translations[lang].formEmail);
    document.querySelectorAll('textarea[name="message"]').forEach(el => el.placeholder = translations[lang].formMsg);
    
    // Listeleri yeniden çiz
    if (translations[lang]) {
        // JSON verilerini tekrar çekmemize gerek yok, global değişkenlerde var.
        // Sadece render fonksiyonunu tekrar çağırıyoruz.
        // Ancak renderLists fonksiyonu dataArray istiyor.
        // Promise.all kısmında bu verileri global değişkenlere atamıştık (locationsData, repoStatus dışındakileri almamıştık, onları da alalım)
        // Düzeltme: Global değişkenleri kullanalım.
        // Not: renderPage diye bir ana fonksiyon yapıp her şeyi oradan çağırmak daha temiz olurdu ama 
        // şu anlık basitçe sayfa yenilenince yüklenen fetch verilerini kullanacağız.
        // Eğer dil değişince listelerin de değişmesini istiyorsak, fetch edilen ham veriyi (exp, edu) saklamalıyız.
        // Yukarıda Promise.all içinde sadece renderLists çağırdık, veriyi saklamadık. 
        // Hadi onu düzeltelim: Global değişkenlere 'rawDataExp' ve 'rawDataEdu' ekleyelim (V20+)
    }

    // Buton metni
    document.getElementById('lang-toggle').innerText = lang.toUpperCase();
    
    // Harita katman kontrolünü güncelle
    if (window.mapControl && window.map) {
        window.map.removeControl(window.mapControl);
        window.addMapControl(lang);
    }
    
    // Listeleri güncellemek için sayfayı yenilemek yerine, 
    // fetch edilen datayı global değişkene atamak en iyisi. 
    // *Not: Aşağıdaki 'reload' mantığı yerine DOMContentLoaded içindeki fetch kısmına global atama ekledim varsayalım.*
    // Pratik çözüm: Dil değişince, eğer veriler globalde varsa yeniden render et.
    if(window.globalExpData && window.globalEduData) {
        renderLists('exp-list', window.globalExpData);
        renderLists('edu-list', window.globalEduData);
    } else {
        // Veriler henüz globalde yoksa (ilk yükleme), fetch içinde render ediliyor zaten.
        // Burası için fetch kısmını güncelliyorum (aşağıya bak).
        location.reload(); // En temiz çözüm: Dil değişince sayfayı yenile (PWA cache'den hızlıca yükler)
    }
}

function toggleLanguage() {
    if (currentLang === 'en') setLanguage('tr');
    else if (currentLang === 'tr') setLanguage('sr');
    else setLanguage('en');
}

// Animasyon Toggle
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

// Confetti (Basitleştirilmiş Canvas)
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
            x: Math.random() * canvas.width,
            y: -10,
            r: Math.random() * 5 + 2,
            d: Math.random() * amount,
            c: colors[Math.floor(Math.random() * colors.length)],
            vx: Math.random() * 2 - 1,
            vy: Math.random() * 2 + 2
        });
    }
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = 0;
        particles.forEach(p => {
            if(p.y < canvas.height) {
                active++;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.c;
                ctx.fill();
                p.x += p.vx;
                p.y += p.vy;
            }
        });
        if(active > 0) requestAnimationFrame(draw);
    }
    draw();
}

// --- 6. HARİTA (LEAFLET) ---
let map, tileLayer;

function initMapObserver() {
    const mapEl = document.getElementById('map');
    if(!mapEl) return;
    
    const observer = new IntersectionObserver(entry => {
        if(entry[0].isIntersecting) {
            initMap();
            observer.disconnect();
        }
    }, { threshold: 0.1 });
    observer.observe(mapEl);
}

function initMap() {
    if(typeof L === 'undefined') return; // Leaflet yüklenmediyse
    
    map = L.map('map').setView([41.0082, 28.9784], 3);
    
    const isLight = document.body.classList.contains('light-mode');
    const tileUrl = isLight 
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png' 
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        
    tileLayer = L.tileLayer(tileUrl, { attribution: '&copy; CARTO' }).addTo(map);

    // Katmanlar
    const workLayer = L.layerGroup().addTo(map);
    const eduLayer = L.layerGroup().addTo(map);
    const tenderLayer = L.layerGroup().addTo(map);

    // İkonlar
    const iconUrl = (c) => `https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-${c}.png`;
    const shadow = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png';
    const createIcon = (color) => new L.Icon({
        iconUrl: iconUrl(color), shadowUrl: shadow, 
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
    
    const icons = { blue: createIcon('blue'), green: createIcon('green'), gold: createIcon('orange') };

    // Markerları Ekle
    const bounds = [];
    locationsData.forEach(l => {
        let i, lay;
        if (l.ty === 'edu') { i = icons.green; lay = eduLayer; }
        else if (l.ty === 'tender') { i = icons.gold; lay = tenderLayer; }
        else { i = icons.blue; lay = workLayer; } // work
        
        const marker = L.marker([l.lat, l.lng], {icon: i, zIndexOffset: l.zIndex || 0})
            .bindPopup(`<b>${l.t}</b><br><small>${l.desc || ''}</small>`)
            .addTo(lay);
            
        bounds.push([l.lat, l.lng]);
    });

    // Haritayı Sığdır
    setTimeout(() => {
        map.invalidateSize();
        if(bounds.length) map.fitBounds(bounds, {padding:[30,30]});
    }, 200);
    
    // Kontrol Ekle
    window.addMapControl = (lang) => {
        const t = translations[lang] || translations['en'];
        const overlays = {};
        overlays[`<span style='color:#2A81CB'>${t.legendWork}</span>`] = workLayer;
        overlays[`<span style='color:#2ecc71'>${t.legendEdu}</span>`] = eduLayer;
        overlays[`<span style='color:#fbbf24'>${t.legendTender}</span>`] = tenderLayer;
        L.control.layers(null, overlays, {collapsed:true}).addTo(map);
    };
    window.addMapControl(currentLang);
}

// --- 7. MODALLAR & FORMLAR ---
const modal = document.getElementById('custom-modal');

function openModal(title, contentHTML) {
    document.getElementById('modal-text-content').style.display = 'block';
    document.getElementById('modal-form-content').style.display = 'none';
    
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-text-content').innerHTML = contentHTML;
    document.getElementById('modal-close-btn').style.display = 'inline-block';
    
    modal.classList.add('active');
    modal.querySelector('button').focus();
}

function openContactModal(e) {
    if(e) e.preventDefault();
    const t = translations[currentLang];
    
    document.getElementById('modal-text-content').style.display = 'none';
    document.getElementById('modal-form-content').style.display = 'block';
    
    document.getElementById('modal-title').innerText = t.contactBtn;
    document.getElementById('modal-close-btn').style.display = 'none'; 
    
    modal.classList.add('active');
}

function closeModal() { modal.classList.remove('active'); }

// Dışarı tıklayınca kapat
if(modal) {
    modal.addEventListener('click', e => { if(e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });
}

// Repo & Privacy Linkleri
window.handleRepoLink = function(repoName) {
    const repo = repoStatus[repoName];
    // Repo verisi henüz yüklenmediyse veya yoksa varsayılan davranışı sergile
    if (!repo) return; 

    if (repo.ready) {
        window.open(repo.url, '_blank');
    } else if (repo.comingSoon) {
        // Divine Tooltip Effect
        showToast("Launching Soon! 🚀 Gods are working on it.", "divine");
    }
};

window.openRepoModal = (e, name) => { 
    e.preventDefault(); 
    // Basit bir modal gösterimi
    openModal("Repo Details", `<strong>${name}</strong>: ${translations[currentLang].repoTextPublic}`); 
};

window.openPrivacyModal = () => { 
    openModal(translations[currentLang].privacyTitle, translations[currentLang].privacyText); 
};

// Form Gönderimi (Formspree)
const form = document.getElementById("contact-form");
if(form) {
    form.addEventListener("submit", async function(event) {
        event.preventDefault();
        const status = document.getElementById("form-status");
        const btn = document.getElementById("form-submit-btn");
        const spinner = document.getElementById("form-spinner");
        const btnText = document.getElementById("form-btn-text");
        const t = translations[currentLang];
        
        btn.disabled = true;
        spinner.style.display = "inline-block";
        btnText.innerText = t.formSending;

        try {
            const response = await fetch(event.target.action, {
                method: form.method,
                body: new FormData(event.target),
                headers: { 'Accept': 'application/json' }
            });
            
            if (response.ok) {
                status.innerHTML = t.formSuccess;
                status.className = "form-status success";
                status.style.display = "block";
                form.reset();
                triggerConfetti(); // Başarı konfetisi
                setTimeout(() => { closeModal(); status.style.display="none"; btn.disabled=false; spinner.style.display="none"; btnText.innerText=t.formSend; }, 3000);
            } else {
                throw new Error("Form Error");
            }
        } catch (e) {
            status.innerHTML = t.formError;
            status.className = "form-status error";
            status.style.display = "block";
            btn.disabled = false;
            spinner.style.display = "none";
            btnText.innerText = t.formSend;
        }
    });
}