// PWA App JavaScript

// DOM Elements
const profileBtn = document.getElementById('profileBtn');
const profileModal = document.getElementById('profileModal');
const modalClose = document.getElementById('modalClose');
const telegramBtn = document.getElementById('telegramBtn');
const installPrompt = document.getElementById('installPrompt');
const installBtn = document.getElementById('installBtn');
const promptDismiss = document.getElementById('promptDismiss');
const navItems = document.querySelectorAll('.nav-item');

// Action Buttons
const rateCarBtn = document.getElementById('rateCarBtn');
const checkVinBtn = document.getElementById('checkVinBtn');
const askAiBtn = document.getElementById('askAiBtn');

// Service Cards
const mfoLink = document.getElementById('mfoLink');
const presaleLink = document.getElementById('presaleLink');
const insuranceLink = document.getElementById('insuranceLink');

// Deferred Install Prompt
let deferredPrompt = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initProfileModal();
    initActionButtons();
    initServiceLinks();
    registerServiceWorker();
    checkInstallPrompt();
});

// Navigation
function initNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            if (page === 'profile') {
                openProfileModal();
                // Reset to home after modal closes
                setTimeout(() => {
                    navItems.forEach(nav => nav.classList.remove('active'));
                    navItems[0].classList.add('active');
                }, 100);
            }
        });
    });
}

// Profile Modal
function initProfileModal() {
    profileBtn.addEventListener('click', openProfileModal);
    modalClose.addEventListener('click', closeProfileModal);
    profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) {
            closeProfileModal();
        }
    });
}

function openProfileModal() {
    profileModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProfileModal() {
    profileModal.classList.remove('active');
    document.body.style.overflow = '';
}

// Action Buttons
function initActionButtons() {
    rateCarBtn.addEventListener('click', () => {
        // Navigate to rate car page or open modal
        showToast('🚗 Відкрито оцінку авто');
    });
    
    checkVinBtn.addEventListener('click', () => {
        // Navigate to VIN check page
        showToast('🔍 Відкрито перевірку VIN');
    });
    
    askAiBtn.addEventListener('click', () => {
        // Open AI chat interface
        showToast('🤖 Cyber-Match готовий до діалогу');
    });
}

// Service Links (Monetization)
function initServiceLinks() {
    // MFO Link - configure your partner URL
    mfoLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Replace with your MFO partner URL
        const mfoUrl = 'https://your-mfo-partner.com';
        window.open(mfoUrl, '_blank');
        trackClick('mfo');
    });
    
    // Pre-sale Preparation Link
    presaleLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Replace with your pre-sale partner URL
        const presaleUrl = 'https://your-presale-partner.com';
        window.open(presaleUrl, '_blank');
        trackClick('presale');
    });
    
    // Insurance Link (Hotline.finance)
    insuranceLink.addEventListener('click', () => {
        trackClick('insurance');
    });
}

// Track clicks for analytics
function trackClick(type) {
    // Implement your analytics here
    console.log(`Click tracked: ${type}`);
    // Example: gtag('event', 'click', { event_category: 'monetization', event_label: type });
}

// Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    }
}

// Install Prompt
function checkInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        // Show install prompt after a delay
        setTimeout(() => {
            const hasDismissed = localStorage.getItem('installPromptDismissed');
            if (!hasDismissed) {
                installPrompt.classList.add('active');
            }
        }, 3000);
    });

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to install prompt: ${outcome}`);
            deferredPrompt = null;
            installPrompt.classList.remove('active');
        }
    });

    promptDismiss.addEventListener('click', () => {
        installPrompt.classList.remove('active');
        localStorage.setItem('installPromptDismissed', 'true');
    });
}

// Toast Notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-card);
        color: var(--text-primary);
        padding: 12px 24px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.1);
        z-index: 2000;
        animation: slideDown 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Add CSS animation for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
`;
document.head.appendChild(style);

// Online/Offline Status
window.addEventListener('online', () => {
    showToast('🌐 З\'єднання відновлено');
});

window.addEventListener('offline', () => {
    showToast('⚠️ Немає з\'єднання. Працюємо офлайн.');
});

// Check if app is running as PWA
function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
}

if (isStandalone()) {
    console.log('Running as PWA');
    document.body.classList.add('standalone');
}

// Handle Telegram Auth (if implemented)
function handleTelegramAuth(userData) {
    if (userData) {
        // Save user data
        localStorage.setItem('telegramUser', JSON.stringify(userData));
        // Update UI
        updateProfileUI(userData);
    }
}

function updateProfileUI(userData) {
    const avatar = document.querySelector('.profile-avatar');
    if (userData.username) {
        avatar.textContent = userData.username.charAt(0).toUpperCase();
    }
}

// Analytics - Page View
function trackPageView(page) {
    // Implement your page view tracking
    console.log(`Page view: ${page}`);
}

// Initialize analytics
trackPageView('home');
