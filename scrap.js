/* =============================================
   SCRAP. — SPILLS — SCRIPT (FIREBASE EDITION)
   ============================================= */

import { auth, db, storage } from './firebase_config.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

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

    // Admin
    const adminOverlay = document.getElementById('adminOverlay');
    const adminClose = document.getElementById('adminClose');
    const adminPanelBtn = document.getElementById('adminPanelBtn');

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
    let selectedFile = null;
    let uploadedImageData = null; // Base64 string for upload
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

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            onLogin(user);
        } else {
            currentUser = null;
            onLogout();
        }
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUser').value.trim();
        const password = document.getElementById('loginPass').value;

        let email = username;
        if (!email.includes('@')) {
            email = email + '@admin.com';
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

    navLogoutBtn.addEventListener('click', () => {
        signOut(auth).catch((error) => console.error(error));
    });

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

        document.querySelectorAll('.post-delete').forEach(btn => btn.style.display = 'block');
    }

    function onLogout() {
        navLoginBtn.style.display = 'inline-flex';
        navLogoutBtn.style.display = 'none';
        postCreator.style.display = 'none';
        userStatus.textContent = 'viewing as guest';
        userStatus.style.color = '#555';
        adminPanelBtn.style.display = 'none';
        document.querySelectorAll('.post-delete').forEach(btn => btn.style.display = 'none');
    }

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

    // Real-time listener
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));

    onSnapshot(q, (snapshot) => {
        const posts = [];
        snapshot.forEach((doc) => {
            posts.push({ id: doc.id, ...doc.data() });
        });
        renderPosts(posts);
    });

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

        let deleteHTML = `<button class="post-delete" title="delete spill" style="display: ${currentUser ? 'block' : 'none'};">×</button>`;

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

    // ==================== UPLOAD & IMAGE PROCESSING ====================

    function processImage(file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Resize to max 1000px to ensure reliable upload
                const maxDim = 1000;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDim) {
                        height *= maxDim / width;
                        width = maxDim;
                    }
                } else {
                    if (height > maxDim) {
                        width *= maxDim / height;
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Get Base64 string (JPEG 80% quality)
                uploadedImageData = canvas.toDataURL('image/jpeg', 0.8);

                // Show preview
                imagePreview.src = uploadedImageData;
                imagePreview.style.display = 'block';
                uploadLabel.textContent = `selected: ${file.name} (ready)`;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    imageUploadArea.addEventListener('click', () => postImageInput.click());

    imageUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault(); imageUploadArea.style.borderColor = '#7EB8DA';
    });
    imageUploadArea.addEventListener('dragleave', () => imageUploadArea.style.borderColor = '');
    imageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault(); imageUploadArea.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) processImage(file);
    });

    postImageInput.addEventListener('change', (e) => {
        if (e.target.files[0]) processImage(e.target.files[0]);
    });


    // ==================== FORM SUBMIT ====================
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

            // Upload Image (Base64)
            if (uploadedImageData) {
                console.log("Starting image upload...");
                const filename = 'spills/' + Date.now() + '_img.jpg';
                const storageRef = ref(storage, filename);

                try {
                    // Upload the base64 string
                    await uploadString(storageRef, uploadedImageData, 'data_url');
                    console.log("Image upload complete.");
                } catch (uploadErr) {
                    console.error("Upload failed:", uploadErr);
                    throw new Error("Image upload failed: " + uploadErr.message);
                }

                try {
                    imageUrl = await getDownloadURL(storageRef);
                    console.log("Image URL retrieved:", imageUrl);
                } catch (urlErr) {
                    console.error("Get URL failed:", urlErr);
                    throw new Error("Failed to get image URL: " + urlErr.message);
                }
            }

            // Save to Firestore
            console.log("Saving to Firestore...");
            await addDoc(collection(db, "posts"), {
                title: title,
                text: text,
                mood: selectedMood || '✦',
                color: selectedColor,
                image: imageUrl,
                date: formatDate(new Date()),
                author: currentUser.displayName || currentUser.email.split('@')[0],
                timestamp: serverTimestamp()
            });
            console.log("Complete!");

            // Success UI
            postForm.reset();
            selectedFile = null;
            uploadedImageData = null;
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
            alert('Error posting spill: ' + error.message);
            submitBtn.textContent = 'error ✕';
            submitBtn.disabled = false;
        }
    });

    // ==================== UTILS & VISUALS ====================

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function formatDate(date) {
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        if (date && date.seconds) date = new Date(date.seconds * 1000);
        const d = date || new Date();
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }

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

    // Cursor
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

    // Particles
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
            constructor() { this.reset(); }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = (Math.random() - 0.5) * 0.3;
                this.speedY = (Math.random() - 0.5) * 0.3;
                this.opacity = Math.random() * 0.3 + 0.05;
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
        for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());
        function animateBG() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(126, 184, 218, ${(1 - dist / 150) * 0.06})`;
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(animateBG);
        }
        animateBG();
    }

    // Loader & Init
    const loader = document.getElementById('pageLoader');
    if (loader) setTimeout(() => loader.classList.add('hidden'), 1800);

    document.querySelectorAll('.sticker').forEach(sticker => {
        sticker.addEventListener('mouseenter', () => {
            sticker.style.transform = `rotate(${Math.random() * 8 - 4}deg) scale(1.1)`;
        });
        sticker.addEventListener('mouseleave', () => sticker.style.transform = '');
    });

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
        grid.querySelectorAll('.scrap-post').forEach(post => gridObserver.observe(post));
    }

    setTimeout(observeGridItems, 100);
    document.body.style.opacity = '0';
    requestAnimationFrame(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    });
    console.log('%c scrap. %c firebase optimized ', 'background: #7EB8DA; color: #111', 'background: #FFA500; color: #111');
});
