/* =============================================
   SCRAP. — SPILLS — FIREBASE EDITION
   Auth + Firestore + Storage
   ============================================= */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js';
import {
    getAuth, signInWithEmailAndPassword, signOut,
    onAuthStateChanged, createUserWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js';
import {
    getFirestore, collection, addDoc, deleteDoc, doc,
    onSnapshot, query, orderBy, limit, getDoc, setDoc, getDocs
} from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
// (Firebase Storage not used — images handled by Cloudinary)

// ==================== CLOUDINARY CONFIG ====================
const CLOUDINARY_CLOUD = 'dog5gehwk';
const CLOUDINARY_PRESET = 'scrap_uploads';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;

async function uploadToCloudinary(blob) {
    const form = new FormData();
    form.append('file', blob);
    form.append('upload_preset', CLOUDINARY_PRESET);
    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return data.secure_url; // permanent CDN URL
}

// ==================== FIREBASE INIT ====================
const firebaseConfig = {
    apiKey: "AIzaSyDHG_s6NoIOeKuxQCybSWTE6u4VPl48kUY",
    authDomain: "scrap-portfolio.firebaseapp.com",
    projectId: "scrap-portfolio",
    storageBucket: "scrap-portfolio.firebasestorage.app",
    messagingSenderId: "123575101850",
    appId: "1:123575101850:web:d95e3dbea12cb209ebf223"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Secondary app instance — used to create users without signing out admin
const secondaryApp = initializeApp(firebaseConfig, 'secondary');
const secondaryAuth = getAuth(secondaryApp);

// ==================== CONSTANTS ====================
const MAX_POSTS = 50;
const MAX_CHARS = 1500;
const ADMIN_USERNAME = 'adharshravi';
const ADMIN_EMAIL = 'adharshravi@scrap.local';
const ADMIN_PASS = 'Adharsh@1996';
const EMAIL_DOMAIN = '@scrap.local';

// ==================== STATE ====================
let currentUser = null;
let unsubscribePosts = null;
let postsCache = []; // local copy, updated by onSnapshot — avoids extra Firestore reads
let selectedMood = '';
let selectedColor = '#7EB8DA';
let uploadedBlob = null;
let uploadedPreviewUrl = null;

// ==================== DOM ====================
const grid = document.getElementById('scrapGrid');
const emptyState = document.getElementById('emptyState');
const gridBgBlur = document.getElementById('gridBgBlur');
const loginOverlay = document.getElementById('loginOverlay');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginClose = document.getElementById('loginClose');
const navLoginBtn = document.getElementById('navLoginBtn');
const navLogoutBtn = document.getElementById('navLogoutBtn');
const userStatus = document.getElementById('userStatus');
const adminOverlay = document.getElementById('adminOverlay');
const adminClose = document.getElementById('adminClose');
const adminPanelBtn = document.getElementById('adminPanelBtn');
const addUserForm = document.getElementById('addUserForm');
const adminUserList = document.getElementById('adminUserList');
const postCreator = document.getElementById('postCreator');
const postForm = document.getElementById('postForm');
const postTitleInput = document.getElementById('postTitle');
const postBodyInput = document.getElementById('postBody');
const postImageInput = document.getElementById('postImage');
const imageUploadArea = document.getElementById('imageUploadArea');
const imagePreview = document.getElementById('imagePreview');
const uploadLabel = document.getElementById('uploadLabel');
const charCounter = document.getElementById('charCounter');

// ==================== BOOTSTRAP ADMIN ====================
async function bootstrapAdmin() {
    try {
        const cfgDoc = await getDoc(doc(db, 'config', 'initialized'));
        if (!cfgDoc.exists()) {
            const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS);
            await setDoc(doc(db, 'users', cred.user.uid), {
                username: ADMIN_USERNAME, email: ADMIN_EMAIL,
                role: 'admin', createdAt: Date.now()
            });
            await setDoc(doc(db, 'config', 'initialized'), { done: true });
            await signOut(auth);
        }
    } catch (e) {
        if (e.code !== 'auth/email-already-in-use') console.warn('Bootstrap:', e.message);
    }
}

// ==================== AUTH STATE ====================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const uDoc = await getDoc(doc(db, 'users', user.uid));
            if (uDoc.exists()) {
                const d = uDoc.data();
                currentUser = { uid: user.uid, username: d.username, role: d.role };
                onLoginUI();
            } else {
                await signOut(auth);
            }
        } catch (e) { await signOut(auth); }
    } else {
        currentUser = null;
        onLogoutUI();
    }
});

// ==================== LOGIN ====================
navLoginBtn.addEventListener('click', () => {
    loginOverlay.classList.add('active');
    setTimeout(() => document.getElementById('loginUser').focus(), 300);
});

loginClose.addEventListener('click', () => {
    loginOverlay.classList.remove('active');
    loginError.textContent = '';
    loginForm.reset();
});

loginOverlay.addEventListener('click', (e) => {
    if (e.target === loginOverlay) {
        loginOverlay.classList.remove('active');
        loginError.textContent = '';
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUser').value.trim().toLowerCase();
    const password = document.getElementById('loginPass').value;
    const btn = loginForm.querySelector('.login-submit');
    btn.textContent = 'checking...';
    btn.disabled = true;
    try {
        await signInWithEmailAndPassword(auth, `${username}${EMAIL_DOMAIN}`, password);
        loginOverlay.classList.remove('active');
        loginForm.reset();
        loginError.textContent = '';
    } catch {
        loginError.textContent = '✕ invalid credentials. access denied.';
        document.getElementById('loginPass').value = '';
    }
    btn.textContent = 'enter →';
    btn.disabled = false;
});

navLogoutBtn.addEventListener('click', () => signOut(auth));

function onLoginUI() {
    navLoginBtn.style.display = 'none';
    navLogoutBtn.style.display = 'inline-flex';
    postCreator.style.display = 'block';
    postCreator.style.opacity = '0';
    postCreator.style.transform = 'translateY(20px)';
    requestAnimationFrame(() => {
        postCreator.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        postCreator.style.opacity = '1';
        postCreator.style.transform = 'translateY(0)';
    });
    userStatus.textContent = `logged in as ${currentUser.username}`;
    userStatus.style.color = '#7EB8DA';
    adminPanelBtn.style.display = currentUser.role === 'admin' ? 'inline-flex' : 'none';
    setupPostsListener();
}

function onLogoutUI() {
    navLoginBtn.style.display = 'inline-flex';
    navLogoutBtn.style.display = 'none';
    postCreator.style.display = 'none';
    userStatus.textContent = 'viewing as guest';
    userStatus.style.color = '#555';
    adminPanelBtn.style.display = 'none';
    setupPostsListener();
}

const isAdmin = () => currentUser?.role === 'admin';
const isLoggedIn = () => currentUser !== null;

// ==================== ADMIN PANEL ====================
adminPanelBtn.addEventListener('click', () => {
    if (!isAdmin()) return;
    renderAdminUserList();
    adminOverlay.classList.add('active');
});
adminClose.addEventListener('click', () => adminOverlay.classList.remove('active'));
adminOverlay.addEventListener('click', (e) => {
    if (e.target === adminOverlay) adminOverlay.classList.remove('active');
});

addUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isAdmin()) return;
    const username = document.getElementById('newUsername').value.trim().toLowerCase();
    const password = document.getElementById('newPassword').value.trim();
    if (!username || !password) return;
    const btn = addUserForm.querySelector('.login-submit');
    btn.textContent = 'creating...';
    btn.disabled = true;
    try {
        const cred = await createUserWithEmailAndPassword(
            secondaryAuth, `${username}${EMAIL_DOMAIN}`, password
        );
        await setDoc(doc(db, 'users', cred.user.uid), {
            username, email: `${username}${EMAIL_DOMAIN}`,
            role: 'user', createdAt: Date.now()
        });
        await signOut(secondaryAuth);
        addUserForm.reset();
        renderAdminUserList();
    } catch (err) {
        alert(err.code === 'auth/email-already-in-use' ? 'Username already exists.' : err.message);
    }
    btn.textContent = '+ add user';
    btn.disabled = false;
});

async function renderAdminUserList() {
    adminUserList.innerHTML = '<p style="color:#555;font-size:0.75rem;letter-spacing:1px">loading...</p>';
    try {
        const snap = await getDocs(collection(db, 'users'));
        adminUserList.innerHTML = '';
        snap.forEach(uDoc => {
            const u = uDoc.data();
            const item = document.createElement('div');
            item.className = 'admin-user-item';
            item.innerHTML = `
                <span class="user-name">${escapeHTML(u.username)}</span>
                <span class="user-role ${u.role === 'admin' ? 'admin' : ''}">${u.role}</span>
                ${u.role !== 'admin'
                    ? `<button class="admin-user-delete" data-uid="${uDoc.id}">remove</button>`
                    : '<span style="width:60px"></span>'}
            `;
            adminUserList.appendChild(item);
        });
        adminUserList.querySelectorAll('.admin-user-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Remove this user?')) {
                    await deleteDoc(doc(db, 'users', btn.dataset.uid));
                    renderAdminUserList();
                }
            });
        });
    } catch { adminUserList.innerHTML = '<p style="color:#FF4444">error loading users</p>'; }
}

// ==================== POSTS LISTENER ====================
// Timeout helper — detects hanging Firebase promises
const withTimeout = (promise, ms, label) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s. Check Firestore/Storage rules in Firebase Console.`)), ms))
]);

function setupPostsListener() {
    if (unsubscribePosts) unsubscribePosts();
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'), limit(MAX_POSTS));
    unsubscribePosts = onSnapshot(q, (snap) => {
        grid.innerHTML = '';
        postsCache = []; // reset cache
        if (snap.empty) {
            emptyState.classList.add('show');
            updateGridBackground([]);
            return;
        }
        emptyState.classList.remove('show');
        const posts = [];
        snap.forEach((d) => {
            const post = { id: d.id, ...d.data() };
            posts.push(post);
            postsCache.push({ id: post.id, timestamp: post.timestamp || 0 });
            grid.appendChild(createPostElement(post, true, posts.length - 1));
        });
        // Sort cache oldest-first so postsCache[0] = oldest (for limit enforcement)
        postsCache.sort((a, b) => a.timestamp - b.timestamp);
        updateGridBackground(posts);
        setTimeout(observeGridItems, 100);
    }, (err) => {
        console.error('Snapshot error:', err.code, err.message);
    });
}

// ==================== POST CARD ====================
function createPostElement(postData, animate = false, index = 0) {
    const article = document.createElement('article');
    article.className = 'scrap-post';
    if (animate) {
        article.classList.add('grid-animate');
        article.style.animationDelay = `${0.05 * index}s`;
    } else {
        article.style.opacity = '1';
    }
    article.style.setProperty('--post-accent', postData.color || '#7EB8DA');

    const imageHTML = postData.imageUrl
        ? `<div class="post-image-wrapper"><img src="${postData.imageUrl}" alt="spill image" loading="lazy"></div>`
        : '';
    const titleHTML = postData.title ? `<h3 class="post-title">${escapeHTML(postData.title)}</h3>` : '';
    const canDelete = isLoggedIn() && (isAdmin() || currentUser?.uid === postData.authorUid);
    const deleteHTML = canDelete ? `<button class="post-delete" title="delete spill">×</button>` : '';

    article.innerHTML = `
        ${deleteHTML}
        <div class="post-meta">
            <span class="post-date">${postData.date}</span>
            <span class="post-mood">${escapeHTML(postData.mood || '✦')}</span>
        </div>
        <div class="post-author">by ${escapeHTML(postData.author || 'anonymous')}</div>
        ${imageHTML}
        <div class="post-body">${titleHTML}<p class="post-text">${escapeHTML(postData.text)}</p></div>
        <div class="post-footer"><span class="post-tag"># spill</span></div>
    `;

    article.querySelector('.post-delete')?.addEventListener('click', async () => {
        article.style.transition = 'all 0.45s ease';
        article.style.opacity = '0';
        article.style.transform = 'scale(0.9) translateY(10px)';
        try {
            await deleteDoc(doc(db, 'posts', postData.id));
        } catch {
            article.style.opacity = '1';
            article.style.transform = '';
        }
    });

    return article;
}

// ==================== IMAGE UPLOAD ====================
imageUploadArea.addEventListener('click', () => postImageInput.click());
imageUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); imageUploadArea.style.borderColor = '#7EB8DA'; });
imageUploadArea.addEventListener('dragleave', () => { imageUploadArea.style.borderColor = ''; });
imageUploadArea.addEventListener('drop', (e) => {
    e.preventDefault(); imageUploadArea.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) processImage(file);
});
postImageInput.addEventListener('change', (e) => { if (e.target.files[0]) processImage(e.target.files[0]); });

function processImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = Math.min(1, 1200 / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            uploadedPreviewUrl = canvas.toDataURL('image/jpeg', 0.85);
            imagePreview.src = uploadedPreviewUrl;
            imagePreview.style.display = 'block';
            uploadLabel.textContent = 'image added ✓ click to change';
            canvas.toBlob((blob) => { uploadedBlob = blob; }, 'image/jpeg', 0.85);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ==================== POST SUBMIT ====================
postBodyInput.addEventListener('input', () => {
    const len = postBodyInput.value.length;
    charCounter.textContent = `${len} / ${MAX_CHARS}`;
    charCounter.classList.remove('near-limit', 'at-limit');
    if (len >= MAX_CHARS) charCounter.classList.add('at-limit');
    else if (len >= MAX_CHARS * 0.85) charCounter.classList.add('near-limit');
});

postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isLoggedIn()) return;
    const text = postBodyInput.value.trim();
    if (!text) {
        postBodyInput.style.borderColor = '#FF4444';
        postBodyInput.focus();
        setTimeout(() => { postBodyInput.style.borderColor = ''; }, 1500);
        return;
    }
    if (text.length > MAX_CHARS) { charCounter.classList.add('at-limit'); return; }

    const btn = postForm.querySelector('.creator-submit');
    btn.textContent = 'spilling...';
    btn.disabled = true;

    try {
        const postId = `spill_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        let imageUrl = '', imagePath = '';

        // Step 1: Upload image to Cloudinary (if any)
        if (uploadedBlob) {
            console.log('Uploading image to Cloudinary...');
            imageUrl = await withTimeout(
                uploadToCloudinary(uploadedBlob),
                30000, 'Image upload'
            );
            console.log('Image uploaded OK:', imageUrl);
        }

        // Step 2: Enforce 50 limit using local cache (no extra Firestore read!)
        if (postsCache.length >= MAX_POSTS) {
            const oldest = postsCache[0];
            console.log('Deleting oldest post:', oldest.id);
            if (oldest.imagePath)
                await deleteObject(ref(storage, oldest.imagePath)).catch(() => { });
            await withTimeout(deleteDoc(doc(db, 'posts', oldest.id)), 8000, 'Delete oldest post');
        }

        // Step 3: Write new post to Firestore
        console.log('Writing post to Firestore...');
        await withTimeout(
            addDoc(collection(db, 'posts'), {
                title: postTitleInput.value.trim(), text,
                mood: selectedMood || '✦', color: selectedColor,
                imageUrl,
                date: formatDate(new Date()),
                author: currentUser.username, authorUid: currentUser.uid,
                timestamp: Date.now()
            }),
            10000, 'Saving post'
        );
        console.log('Post saved to Firestore!');

        // Reset form
        postForm.reset();
        selectedMood = ''; uploadedBlob = null; uploadedPreviewUrl = null;
        imagePreview.style.display = 'none';
        uploadLabel.textContent = 'click or drag an image here';
        charCounter.textContent = '0 / ' + MAX_CHARS;
        charCounter.classList.remove('near-limit', 'at-limit');
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.color-pick').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.color-pick')[0].classList.add('active');
        selectedColor = '#7EB8DA';
        btn.textContent = 'spilled ✓';
        btn.style.background = '#4ECDC4';
        setTimeout(() => { btn.textContent = 'spill it →'; btn.style.background = ''; }, 2000);
    } catch (err) {
        console.error('Post failed:', err.code || '', err.message);
        btn.textContent = 'spill it →';
        if (err.message.includes('timed out')) {
            alert(`⏰ ${err.message}`);
        } else if (err.code === 'permission-denied' || err.code === 'storage/unauthorized') {
            alert('Permission denied. Publish your Firestore & Storage rules in Firebase Console.');
        } else {
            alert(`Error: ${err.message}`);
        }
    }
    btn.disabled = false;
});

// ==================== MOOD & COLOR ====================
document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedMood = btn.dataset.mood;
    });
});
document.querySelectorAll('.color-pick').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.color-pick').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedColor = btn.dataset.color;
    });
});

// ==================== GRID BACKGROUND ====================
function updateGridBackground(posts) {
    if (!gridBgBlur) return;
    gridBgBlur.innerHTML = '';
    posts.filter(p => p.imageUrl).slice(0, 5).forEach(p => {
        const img = document.createElement('img');
        img.className = 'grid-bg-blur-img';
        img.src = p.imageUrl;
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        gridBgBlur.appendChild(img);
    });
}

// ==================== HELPERS ====================
function escapeHTML(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
function formatDate(date) {
    const m = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const d = new Date(date);
    return `${m[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ==================== CUSTOM CURSOR ====================
const cursor = document.getElementById('scrapCursor');
const cursorTrail = document.getElementById('scrapCursorTrail');
let mx = 0, my = 0, tx = 0, ty = 0;
if (cursor && cursorTrail) {
    document.addEventListener('mousemove', (e) => {
        mx = e.clientX; my = e.clientY;
        cursor.style.left = mx + 'px'; cursor.style.top = my + 'px';
    });
    (function trailLoop() {
        tx += (mx - tx) * 0.1; ty += (my - ty) * 0.1;
        cursorTrail.style.left = tx + 'px'; cursorTrail.style.top = ty + 'px';
        requestAnimationFrame(trailLoop);
    })();
    document.querySelectorAll('a,button,.sticker,.mood-btn,.color-pick,.scrap-post,input,textarea').forEach(el => {
        el.addEventListener('mouseenter', () => { cursor.classList.add('hovering'); cursorTrail.classList.add('hovering'); });
        el.addEventListener('mouseleave', () => { cursor.classList.remove('hovering'); cursorTrail.classList.remove('hovering'); });
    });
    document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
    document.addEventListener('mouseup', () => cursor.classList.remove('clicking'));
    document.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; cursorTrail.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { cursor.style.opacity = '1'; cursorTrail.style.opacity = '1'; });
}

// ==================== BG PARTICLES ====================
const bgCanvas = document.getElementById('bgCanvas');
if (bgCanvas) {
    const ctx = bgCanvas.getContext('2d');
    const resize = () => { bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const particles = Array.from({ length: 40 }, () => {
        const p = {};
        const reset = () => {
            p.x = Math.random() * bgCanvas.width; p.y = Math.random() * bgCanvas.height;
            p.size = Math.random() * 2 + 0.5; p.sx = (Math.random() - 0.5) * 0.3; p.sy = (Math.random() - 0.5) * 0.3;
            p.op = Math.random() * 0.3 + 0.05;
            p.col = ['126,184,218', '168,216,240', '78,205,196', '90,154,190'][Math.floor(Math.random() * 4)];
        };
        reset();
        return p;
    });
    (function animateBG() {
        ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        particles.forEach(p => {
            p.x += p.sx; p.y += p.sy;
            if (p.x < 0 || p.x > bgCanvas.width) p.sx *= -1;
            if (p.y < 0 || p.y > bgCanvas.height) p.sy *= -1;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.col},${p.op})`; ctx.fill();
        });
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(126,184,218,${(1 - dist / 150) * 0.06})`; ctx.lineWidth = 0.5; ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animateBG);
    })();
}

// ==================== PAGE LOADER ====================
setTimeout(() => document.getElementById('pageLoader').classList.add('hidden'), 1800);

// ==================== STICKERS ====================
document.querySelectorAll('.sticker').forEach(s => {
    s.addEventListener('mouseenter', () => { s.style.transform = `rotate(${Math.random() * 8 - 4}deg) scale(1.1)`; });
    s.addEventListener('mouseleave', () => { s.style.transform = ''; });
});

// ==================== SCROLL REVEAL ====================
const gridObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0) scale(1)';
            gridObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.05 });
function observeGridItems() {
    grid.querySelectorAll('.scrap-post').forEach(p => gridObserver.observe(p));
}

// ==================== PAGE FADE + INIT ====================
document.body.style.opacity = '0';
requestAnimationFrame(() => {
    document.body.style.transition = 'opacity 0.5s ease';
    document.body.style.opacity = '1';
});

bootstrapAdmin().then(() => {
    setupPostsListener();
});

console.log('%c scrap. %c firebase edition ', 'background:#7EB8DA;color:#0E0E12;font-size:14px;padding:6px 10px;border-radius:4px;font-family:monospace;', 'background:#15151C;color:#D8D2CB;font-size:12px;padding:6px 10px;border-radius:4px;');
