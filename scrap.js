/* =============================================
   SCRAP. — SPILLS — SCRIPT (FIREBASE EDITION)
   ============================================= */

import { auth, db, storage } from './firebase_config.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

document.addEventListener('DOMContentLoaded', () => {

    // ==================== CONFIG ====================
    const MAX_CHARS = 1500;

    // ==================== DOM REFS ====================
    const grid = document.getElementById('scrapGrid');
    const emptyState = document.getElementById('emptyState');
    const gridBgBlur = document.getElementById('gridBgBlur');

    // Login
    const loginOverlay = document.getElementById('loginOverlay');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const loginClose = document.getElementById('loginClose');
    const navLoginBtn = document.getElementById('navLoginBtn');
    const navLogoutBtn = document.getElementById('navLogoutBtn');
    const userStatus = document.getElementById('userStatus');

    // Admin (Simplified - just login mostly)
    const adminOverlay = document.getElementById('adminOverlay');
    const adminClose = document.getElementById('adminClose');
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    // const addUserForm = document.getElementById('addUserForm'); // Disabled for client-side safety
    // const adminUserList = document.getElementById('adminUserList'); // Disabled

    // Post creator
    const postCreator = document.getElementById('postCreator');
    const postForm = document.getElementById('postForm');
    const postTitleInput = document.getElementById('postTitle');
    const postBodyInput = document.getElementById('postBody');
    const postImageInput = document.getElementById('postImage');
    const imageUploadArea = document.getElementById('imageUploadArea');
    const imagePreview = document.getElementById('imagePreview');
    const uploadLabel = document.getElementById('uploadLabel');
    const charCounter = document.getElementById('charCounter');

    let selectedMood = '';
    let selectedColor = '#7EB8DA';
    let selectedFile = null; // Store actual file object for upload
    let currentUser = null;

    // ==================== CHARACTER COUNTER ====================
    postBodyInput.addEventListener('input', () => {
        const len = postBodyInput.value.length;
        charCounter.textContent = `${len} / ${MAX_CHARS}`;
        charCounter.classList.remove('near-limit', 'at-limit');
        if (len >= MAX_CHARS) {
            charCounter.classList.add('at-limit');
        } else if (len >= MAX_CHARS * 0.85) {
            charCounter.classList.add('near-limit');
        }
    });

    // ==================== AUTHENTICATION ====================

    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            onLogin(user);
        } else {
            currentUser = null;
            onLogout();
        }
    });

    // Login Form Submit
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUser').value.trim(); // actually email for firebase
        const password = document.getElementById('loginPass').value;

        // Simple check to append fake domain if user enters just username (convenience)
        let email = username;
        if (!email.includes('@')) {
            email = email + '@admin.com'; // User needs to create this in Firebase Console
        }

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                loginOverlay.classList.remove('active');
                loginForm.reset();
                loginError.textContent = '';
            })
            .catch((error) => {
                console.error(error);
                loginError.textContent = '✕ invalid credentials. access denied.';
            });
    });

    // Logout
    navLogoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            // Sign-out successful.
        }).catch((error) => {
            console.error(error);
        });
    });

    // UI Updates for Auth
    function onLogin(user) {
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

        const display = user.displayName || user.email.split('@')[0];
        userStatus.textContent = `logged in as ${display}`;
        userStatus.style.color = '#7EB8DA';

        // Show delete buttons if any exist
        document.querySelectorAll('.post-delete').forEach(btn => btn.style.display = 'block');
    }

    function onLogout() {
        navLoginBtn.style.display = 'inline-flex';
        navLogoutBtn.style.display = 'none';

        postCreator.style.display = 'none';

        userStatus.textContent = 'viewing as guest';
        userStatus.style.color = '#555';

        adminPanelBtn.style.display = 'none';

        // Hide delete buttons
        document.querySelectorAll('.post-delete').forEach(btn => btn.style.display = 'none');
    }

    // Modal Toggles
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
        }
    });


    // ==================== DATA (FIRESTORE) ====================

    // Real-time listener for posts
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));

    onSnapshot(q, (snapshot) => {
        const posts = [];
        snapshot.forEach((doc) => {
            posts.push({ id: doc.id, ...doc.data() });
        });
        renderPosts(posts);
    });

    // Render Logic
    function renderPosts(posts) {
        grid.innerHTML = '';

        if (posts.length === 0) {
            emptyState.classList.add('show');
        } else {
            emptyState.classList.remove('show');
        }

        posts.forEach((post, index) => {
            const el = createPostElement(post, index);
            grid.appendChild(el);
        });

        updateGridBackground(posts);
    }

    function createPostElement(postData, index = 0) {
        const article = document.createElement('article');
        article.className = 'scrap-post';
        article.setAttribute('data-id', postData.id);

        // Staggered animation on load
        article.classList.add('grid-animate');
        article.style.animationDelay = `${0.05 * index}s`;

        article.style.setProperty('--post-accent', postData.color || '#7EB8DA');

        let imageHTML = '';
        if (postData.image) {
            imageHTML = `
                <div class="post-image-wrapper">
                    <img src="${postData.image}" alt="spill image" loading="lazy">
                </div>
            `;
        }

        let titleHTML = '';
        if (postData.title) {
            titleHTML = `<h3 class="post-title">${escapeHTML(postData.title)}</h3>`;
        }

        let deleteHTML = '';
        // Only show delete btn element here (hidden via CSS if not logged in, but we handle it via JS display toggle too)
        deleteHTML = `<button class="post-delete" title="delete spill" style="display: ${currentUser ? 'block' : 'none'};">×</button>`;

        article.innerHTML = `
            ${deleteHTML}
            <div class="post-meta">
                <span class="post-date">${postData.date}</span>
                <span class="post-mood">${escapeHTML(postData.mood || '✦')}</span>
            </div>
            <div class="post-author">by ${escapeHTML(postData.author || 'admin')}</div>
            ${imageHTML}
            <div class="post-body">
                ${titleHTML}
                <p class="post-text">${escapeHTML(postData.text)}</p>
            </div>
            <div class="post-footer">
                <span class="post-tag"># spill</span>
            </div>
        `;

        const deleteBtn = article.querySelector('.post-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (!currentUser) return;
                if (confirm('delete this spill permanently?')) {
                    deleteDoc(doc(db, "posts", postData.id))
                        .then(() => console.log("Document deleted"))
                        .catch((error) => console.error("Error removing document: ", error));
                }
            });
        }

        return article;
    }

    function updateGridBackground(posts) {
        if (!gridBgBlur) return;
        gridBgBlur.innerHTML = '';
        const postsWithImages = posts.filter(p => p.image);
        const toShow = postsWithImages.slice(0, 5);
        toShow.forEach(p => {
            const img = document.createElement('img');
            img.className = 'grid-bg-blur-img';
            img.src = p.image;
            img.alt = '';
            img.setAttribute('aria-hidden', 'true');
            gridBgBlur.appendChild(img);
        });
    }

    // ==================== UPLOAD & SUBMIT ====================

    // Image Selection
    imageUploadArea.addEventListener('click', () => postImageInput.click());

    // Drag & Drop
    imageUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault(); imageUploadArea.style.borderColor = '#7EB8DA';
    });
    imageUploadArea.addEventListener('dragleave', () => imageUploadArea.style.borderColor = '');
    imageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault(); imageUploadArea.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handleFileSelect(file);
    });

    postImageInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFileSelect(e.target.files[0]);
    });

    function handleFileSelect(file) {
        selectedFile = file;

        // Preview
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            uploadLabel.textContent = `selected: ${file.name}`;
        };
        reader.readAsDataURL(file);
    }

    // Form Submit
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const text = postBodyInput.value.trim();
        const title = postTitleInput.value.trim();
        if (!text) return;

        const submitBtn = postForm.querySelector('.creator-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'spilling...';

        try {
            let imageUrl = '';

            // Upload Image if selected
            if (selectedFile) {
                const storageRef = ref(storage, 'spills/' + Date.now() + '_' + selectedFile.name);
                await uploadBytes(storageRef, selectedFile);
                imageUrl = await getDownloadURL(storageRef);
            }

            // Save to Firestore
            await addDoc(collection(db, "posts"), {
                title: title,
                text: text,
                mood: selectedMood || '✦',
                color: selectedColor,
                image: imageUrl,
                date: formatDate(new Date()),
                author: currentUser.displayName || currentUser.email.split('@')[0],
                timestamp: serverTimestamp() // Firestore server time
            });

            // Success UI
            postForm.reset();
            selectedFile = null;
            selectedMood = '';
            imagePreview.style.display = 'none';
            uploadLabel.textContent = 'click or drag an image here';
            charCounter.textContent = `0 / ${MAX_CHARS}`;

            submitBtn.textContent = 'spilled ✓';
            submitBtn.style.background = '#4ECDC4';
            setTimeout(() => {
                submitBtn.textContent = 'spill it →';
                submitBtn.style.background = '';
                submitBtn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error("Error adding post: ", error);
            alert('Error posting spill. Check console.');
            submitBtn.textContent = 'error ✕';
            submitBtn.disabled = false;
        }
    });

    // ==================== UTILS ====================

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function formatDate(date) {
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        // if it's a Firestore timestamp (has seconds)
        if (date && date.seconds) date = new Date(date.seconds * 1000);

        const d = date || new Date();
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }

    // Mood & Color Selectors
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

    // ==================== VISUALS (Mouse, Particles) ====================
    // (Kept from original script)
    const cursor = document.getElementById('scrapCursor');
    const cursorTrail = document.getElementById('scrapCursorTrail');
    let mx = 0, my = 0, tx = 0, ty = 0;

    if (cursor && cursorTrail) {
        document.addEventListener('mousemove', (e) => {
            mx = e.clientX;
            my = e.clientY;
            cursor.style.left = mx + 'px';
            cursor.style.top = my + 'px';
        });

        function trailLoop() {
            tx += (mx - tx) * 0.1;
            ty += (my - ty) * 0.1;
            cursorTrail.style.left = tx + 'px';
            cursorTrail.style.top = ty + 'px';
            requestAnimationFrame(trailLoop);
        }
        trailLoop();

        const hoverEls = document.querySelectorAll(
            'a, button, .sticker, .mood-btn, .color-pick, .scrap-post, .image-upload-area, input, textarea'
        );
        hoverEls.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.classList.add('hovering');
                cursorTrail.classList.add('hovering');
            });
            el.addEventListener('mouseleave', () => {
                cursor.classList.remove('hovering');
                cursorTrail.classList.remove('hovering');
            });
        });

        document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
        document.addEventListener('mouseup', () => cursor.classList.remove('clicking'));
    }

    // Background Particles
    const canvas = document.getElementById('bgCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        const PARTICLE_COUNT = 40;

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        class Particle {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = (Math.random() - 0.5) * 0.3;
                this.speedY = (Math.random() - 0.5) * 0.3;
                this.opacity = Math.random() * 0.3 + 0.05;
                // Light blue themed particle colors
                const colors = ['126,184,218', '168,216,240', '78,205,196', '90,154,190'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
                if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
                ctx.fill();
            }
        }

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(new Particle());
        }

        function drawConnections() {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        const opacity = (1 - dist / 150) * 0.06;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        // Light blue connection lines
                        ctx.strokeStyle = `rgba(126, 184, 218, ${opacity})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
        }

        function animateBG() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            drawConnections();
            requestAnimationFrame(animateBG);
        }
        animateBG();
    }

    // Page Loader
    const loader = document.getElementById('pageLoader');
    if (loader) setTimeout(() => loader.classList.add('hidden'), 1800);

    // ==================== STICKER WOBBLE ====================
    document.querySelectorAll('.sticker').forEach(sticker => {
        sticker.addEventListener('mouseenter', () => {
            const r = Math.random() * 8 - 4;
            sticker.style.transform = `rotate(${r}deg) scale(1.1)`;
        });
        sticker.addEventListener('mouseleave', () => {
            sticker.style.transform = '';
        });
    });

    // ==================== GRID SCROLL REVEAL ====================
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
        grid.querySelectorAll('.scrap-post').forEach(post => {
            gridObserver.observe(post);
        });
    }

    // ==================== INIT ====================
    // getUsers(); // deprecated
    // renderPosts(true); // handled by onSnapshot
    // loadSession(); // handled by onAuthStateChanged
    setTimeout(observeGridItems, 100);

    // ==================== PAGE FADE IN ====================
    document.body.style.opacity = '0';
    requestAnimationFrame(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    });

    // ==================== CONSOLE ====================
    console.log(
        '%c scrap. %c firebase edition ',
        'background: #7EB8DA; color: #0E0E12; font-size: 14px; padding: 6px 10px; border-radius: 4px; font-family: monospace;',
        'background: #15151C; color: #D8D2CB; font-size: 12px; padding: 6px 10px; border-radius: 4px;'
    );

});
