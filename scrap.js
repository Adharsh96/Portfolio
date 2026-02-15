/* =============================================
   SCRAP. — SPILLS — SCRIPT
   Light blue theme, login, multi-user, admin,
   50 spill limit, 1500 char limit, cursor,
   background particles, polaroid images
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

    // ==================== CONFIG ====================
    const MAX_POSTS = 50;
    const MAX_CHARS = 1500;

    // Default admin credential
    const ADMIN_USERNAME = 'adharshravi';
    const ADMIN_PASSWORD = 'Adharsh@1996';

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
    const addUserForm = document.getElementById('addUserForm');
    const adminUserList = document.getElementById('adminUserList');

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
    let uploadedImageData = '';
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

    // ==================== USER MANAGEMENT ====================
    function getUsers() {
        try {
            const users = JSON.parse(localStorage.getItem('scrapUsers'));
            if (!users || !Array.isArray(users)) throw new Error();
            const adminExists = users.some(u => u.username === ADMIN_USERNAME && u.role === 'admin');
            if (!adminExists) {
                users.unshift({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD, role: 'admin' });
                localStorage.setItem('scrapUsers', JSON.stringify(users));
            }
            return users;
        } catch {
            const defaultUsers = [
                { username: ADMIN_USERNAME, password: ADMIN_PASSWORD, role: 'admin' }
            ];
            localStorage.setItem('scrapUsers', JSON.stringify(defaultUsers));
            return defaultUsers;
        }
    }

    function saveUsers(users) {
        localStorage.setItem('scrapUsers', JSON.stringify(users));
    }

    function authenticateUser(username, password) {
        const users = getUsers();
        return users.find(u => u.username === username.toLowerCase().trim() && u.password === password);
    }

    function isAdmin() {
        return currentUser && currentUser.role === 'admin';
    }

    function isLoggedIn() {
        return currentUser !== null;
    }

    // ==================== SESSION ====================
    function saveSession() {
        if (currentUser) {
            sessionStorage.setItem('scrapSession', JSON.stringify(currentUser));
        }
    }

    function loadSession() {
        try {
            const session = JSON.parse(sessionStorage.getItem('scrapSession'));
            if (session && session.username) {
                const users = getUsers();
                const user = users.find(u => u.username === session.username);
                if (user) {
                    currentUser = { username: user.username, role: user.role };
                    onLogin();
                }
            }
        } catch { }
    }

    function clearSession() {
        sessionStorage.removeItem('scrapSession');
        currentUser = null;
    }

    // ==================== LOGIN UI ====================
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

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUser').value.trim().toLowerCase();
        const password = document.getElementById('loginPass').value;

        const user = authenticateUser(username, password);
        if (user) {
            currentUser = { username: user.username, role: user.role };
            saveSession();
            loginOverlay.classList.remove('active');
            loginForm.reset();
            loginError.textContent = '';
            onLogin();
        } else {
            loginError.textContent = '✕ invalid credentials. access denied.';
            document.getElementById('loginPass').value = '';
        }
    });

    navLogoutBtn.addEventListener('click', () => {
        clearSession();
        onLogout();
    });

    function onLogin() {
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

        if (isAdmin()) {
            adminPanelBtn.style.display = 'inline-flex';
        } else {
            adminPanelBtn.style.display = 'none';
        }

        renderPosts();
    }

    function onLogout() {
        navLoginBtn.style.display = 'inline-flex';
        navLogoutBtn.style.display = 'none';
        postCreator.style.display = 'none';
        userStatus.textContent = 'viewing as guest';
        userStatus.style.color = '#555';
        adminPanelBtn.style.display = 'none';
        renderPosts();
    }

    // ==================== ADMIN PANEL ====================
    if (adminPanelBtn) {
        adminPanelBtn.addEventListener('click', () => {
            if (!isAdmin()) return;
            renderAdminUserList();
            adminOverlay.classList.add('active');
        });
    }

    adminClose.addEventListener('click', () => {
        adminOverlay.classList.remove('active');
    });

    adminOverlay.addEventListener('click', (e) => {
        if (e.target === adminOverlay) adminOverlay.classList.remove('active');
    });

    addUserForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!isAdmin()) return;

        const username = document.getElementById('newUsername').value.trim().toLowerCase();
        const password = document.getElementById('newPassword').value.trim();

        if (!username || !password) return;

        const users = getUsers();
        if (users.some(u => u.username === username)) {
            alert('username already exists.');
            return;
        }

        users.push({ username, password, role: 'user' });
        saveUsers(users);
        addUserForm.reset();
        renderAdminUserList();
    });

    function renderAdminUserList() {
        const users = getUsers();
        adminUserList.innerHTML = '';

        users.forEach(user => {
            const item = document.createElement('div');
            item.className = 'admin-user-item';
            item.innerHTML = `
                <span class="user-name">${user.username}</span>
                <span class="user-role ${user.role === 'admin' ? 'admin' : ''}">${user.role}</span>
                ${user.role !== 'admin' ? `<button class="admin-user-delete" data-user="${user.username}">remove</button>` : '<span style="width:60px;"></span>'}
            `;
            adminUserList.appendChild(item);
        });

        adminUserList.querySelectorAll('.admin-user-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const uname = btn.dataset.user;
                let users = getUsers().filter(u => u.username !== uname);
                saveUsers(users);
                renderAdminUserList();
            });
        });
    }

    // ==================== POST MANAGEMENT ====================
    function getPosts() {
        try {
            return JSON.parse(localStorage.getItem('scrapPosts') || '[]');
        } catch {
            return [];
        }
    }

    function savePosts(posts) {
        localStorage.setItem('scrapPosts', JSON.stringify(posts));
    }

    function addPost(postData) {
        let posts = getPosts();
        posts.unshift(postData);

        // Enforce 50 post limit
        while (posts.length > MAX_POSTS) {
            posts.pop();
        }

        savePosts(posts);
    }

    function deletePost(id) {
        let posts = getPosts().filter(p => p.id !== id);
        savePosts(posts);
    }

    function updateGridBackground() {
        // Collect images from posts and place blurred versions behind grid
        if (!gridBgBlur) return;
        gridBgBlur.innerHTML = '';
        const posts = getPosts();
        const postsWithImages = posts.filter(p => p.image);
        const toShow = postsWithImages.slice(0, 5); // max 5 blurred images
        toShow.forEach(p => {
            const img = document.createElement('img');
            img.className = 'grid-bg-blur-img';
            img.src = p.image;
            img.alt = '';
            img.setAttribute('aria-hidden', 'true');
            gridBgBlur.appendChild(img);
        });
    }

    // ==================== RENDER POSTS ====================
    function renderPosts(isInitial = false) {
        const posts = getPosts();
        grid.innerHTML = '';

        if (posts.length === 0) {
            emptyState.classList.add('show');
        } else {
            emptyState.classList.remove('show');
        }

        posts.forEach((post, index) => {
            const el = createPostElement(post, isInitial, index);
            grid.appendChild(el);
        });

        updateGridBackground();
    }

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
        if (isLoggedIn() && (isAdmin() || (currentUser && currentUser.username === postData.author))) {
            deleteHTML = `<button class="post-delete" title="delete spill">×</button>`;
        }

        article.innerHTML = `
            ${deleteHTML}
            <div class="post-meta">
                <span class="post-date">${postData.date}</span>
                <span class="post-mood">${escapeHTML(postData.mood || '✦')}</span>
            </div>
            <div class="post-author">by ${escapeHTML(postData.author || 'anonymous')}</div>
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
                article.style.transition = 'all 0.45s ease';
                article.style.opacity = '0';
                article.style.transform = 'scale(0.9) translateY(10px)';
                setTimeout(() => {
                    article.remove();
                    deletePost(postData.id);
                    updateGridBackground();
                    if (getPosts().length === 0) emptyState.classList.add('show');
                }, 450);
            });
        }

        return article;
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function formatDate(date) {
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
            'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const d = new Date(date);
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }

    // ==================== MOOD SELECTOR ====================
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedMood = btn.dataset.mood;
        });
    });

    // ==================== COLOR PICKER ====================
    document.querySelectorAll('.color-pick').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-pick').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedColor = btn.dataset.color;
        });
    });

    // ==================== IMAGE UPLOAD ====================
    imageUploadArea.addEventListener('click', () => postImageInput.click());

    imageUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageUploadArea.style.borderColor = '#7EB8DA';
    });
    imageUploadArea.addEventListener('dragleave', () => {
        imageUploadArea.style.borderColor = '';
    });
    imageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        imageUploadArea.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) processImage(file);
    });

    postImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) processImage(file);
    });

    function processImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxW = 600;
                const scale = Math.min(1, maxW / img.width);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                uploadedImageData = canvas.toDataURL('image/jpeg', 0.7);
                imagePreview.src = uploadedImageData;
                imagePreview.style.display = 'block';
                uploadLabel.textContent = 'image added ✓ click to change';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ==================== POST FORM SUBMIT ====================
    postForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!isLoggedIn()) return;

        const text = postBodyInput.value.trim();
        if (!text) {
            postBodyInput.style.borderColor = '#FF4444';
            postBodyInput.focus();
            setTimeout(() => { postBodyInput.style.borderColor = ''; }, 1500);
            return;
        }

        // Enforce 1500 char limit
        if (text.length > MAX_CHARS) {
            postBodyInput.style.borderColor = '#FF4444';
            charCounter.classList.add('at-limit');
            return;
        }

        const postData = {
            id: 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            title: postTitleInput.value.trim(),
            text: text,
            mood: selectedMood || '✦',
            color: selectedColor,
            image: uploadedImageData || '',
            date: formatDate(new Date()),
            author: currentUser.username,
            timestamp: Date.now()
        };

        addPost(postData);

        // Insert at top of grid with animation
        const postEl = createPostElement(postData);
        postEl.classList.add('just-added');
        if (grid.firstChild) {
            grid.insertBefore(postEl, grid.firstChild);
        } else {
            grid.appendChild(postEl);
            emptyState.classList.remove('show');
        }

        // If over MAX_POSTS, remove last card visually
        while (grid.children.length > MAX_POSTS) {
            grid.removeChild(grid.lastChild);
        }

        updateGridBackground();

        // Reset
        postForm.reset();
        selectedMood = '';
        uploadedImageData = '';
        imagePreview.style.display = 'none';
        uploadLabel.textContent = 'click or drag an image here';
        charCounter.textContent = '0 / ' + MAX_CHARS;
        charCounter.classList.remove('near-limit', 'at-limit');
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.color-pick').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.color-pick')[0].classList.add('active');
        selectedColor = '#7EB8DA';

        // Animate button
        const submitBtn = postForm.querySelector('.creator-submit');
        submitBtn.textContent = 'spilled ✓';
        submitBtn.style.background = '#4ECDC4';
        setTimeout(() => {
            submitBtn.textContent = 'spill it →';
            submitBtn.style.background = '';
        }, 2000);

        // Scroll to post
        setTimeout(() => {
            postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
    });

    // ==================== CUSTOM CURSOR ====================
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

        // Hover targets
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

        document.addEventListener('mouseleave', () => {
            cursor.style.opacity = '0';
            cursorTrail.style.opacity = '0';
        });
        document.addEventListener('mouseenter', () => {
            cursor.style.opacity = '1';
            cursorTrail.style.opacity = '1';
        });
    }

    // ==================== BACKGROUND ANIMATION ====================
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

    // ==================== PAGE LOADER ====================
    const loader = document.getElementById('pageLoader');
    setTimeout(() => {
        loader.classList.add('hidden');
    }, 1800);

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
    getUsers();
    renderPosts(true);
    loadSession();
    setTimeout(observeGridItems, 100);

    // ==================== PAGE FADE IN ====================
    document.body.style.opacity = '0';
    requestAnimationFrame(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    });

    // ==================== CONSOLE ====================
    console.log(
        '%c scrap. %c spills — private space ',
        'background: #7EB8DA; color: #0E0E12; font-size: 14px; padding: 6px 10px; border-radius: 4px; font-family: monospace;',
        'background: #15151C; color: #D8D2CB; font-size: 12px; padding: 6px 10px; border-radius: 4px;'
    );

});
