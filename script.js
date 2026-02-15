/* =============================================
   BRUTALIST PORTFOLIO — SCRIPT
   Custom cursor, scroll animations, interactions
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

    // ==================== CUSTOM CURSOR ====================
    const cursorDot = document.getElementById('cursorDot');
    const cursorRing = document.getElementById('cursorRing');

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    if (cursorDot && cursorRing) {
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            cursorDot.style.left = mouseX + 'px';
            cursorDot.style.top = mouseY + 'px';
        });

        // Smooth ring follow
        function animateRing() {
            ringX += (mouseX - ringX) * 0.12;
            ringY += (mouseY - ringY) * 0.12;
            cursorRing.style.left = ringX + 'px';
            cursorRing.style.top = ringY + 'px';
            requestAnimationFrame(animateRing);
        }
        animateRing();

        // Hover effects on interactive elements
        const hoverTargets = document.querySelectorAll(
            'a, button, .btn, .nav-link, .title-tag, .interest-tag, .skill-list li, .social-link, .nav-hamburger, .about-block, .skill-category, .timeline-item, input, textarea'
        );

        hoverTargets.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursorDot.classList.add('hovering');
                cursorRing.classList.add('hovering');
            });
            el.addEventListener('mouseleave', () => {
                cursorDot.classList.remove('hovering');
                cursorRing.classList.remove('hovering');
            });
        });

        // Click effect
        document.addEventListener('mousedown', () => {
            cursorDot.classList.add('clicking');
            cursorRing.classList.add('clicking');
        });
        document.addEventListener('mouseup', () => {
            cursorDot.classList.remove('clicking');
            cursorRing.classList.remove('clicking');
        });

        // Hide cursor when leaving window
        document.addEventListener('mouseleave', () => {
            cursorDot.style.opacity = '0';
            cursorRing.style.opacity = '0';
        });
        document.addEventListener('mouseenter', () => {
            cursorDot.style.opacity = '1';
            cursorRing.style.opacity = '1';
        });
    }

    // ==================== MOBILE MENU ====================
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            mobileMenu.classList.toggle('open');
            document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
        });

        document.querySelectorAll('.mobile-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('open');
                mobileMenu.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    // ==================== NAVBAR SCROLL ====================
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        });
    }

    // ==================== SCROLL REVEAL ANIMATIONS ====================
    const animatedElements = document.querySelectorAll('[data-animate]');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
    });

    animatedElements.forEach(el => {
        revealObserver.observe(el);
    });

    // Auto-animate elements in the viewport on page load (for home page hero)
    setTimeout(() => {
        animatedElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                el.classList.add('animated');
            }
        });
    }, 100);

    // ==================== SCROLL REVEAL - NON-DATA-ANIMATE ELEMENTS ====================
    const revealElements = document.querySelectorAll(
        '.about-block, .skill-category, .timeline-item, .info-block, .contact-form-wrapper'
    );

    const genericObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                genericObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    revealElements.forEach((el, index) => {
        if (!el.hasAttribute('data-animate')) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${index * 0.08}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${index * 0.08}s`;
            genericObserver.observe(el);
        }
    });

    // ==================== MAGNETIC BUTTON EFFECT ====================
    const magneticBtns = document.querySelectorAll('.magnetic');

    magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });

    // ==================== PARALLAX ON HOME PHOTO ====================
    const photoFrame = document.querySelector('.photo-frame');

    if (photoFrame && window.innerWidth > 900) {
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            photoFrame.style.transform = `translateY(${scrolled * 0.1}px)`;
        });
    }

    // ==================== CONTACT FORM ====================
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const submitBtn = contactForm.querySelector('.btn-submit');
            const originalText = submitBtn.textContent;

            submitBtn.textContent = 'SENDING...';
            submitBtn.style.background = '#FF3D00';
            submitBtn.style.borderColor = '#FF3D00';
            submitBtn.style.color = '#FFF';
            submitBtn.disabled = true;

            setTimeout(() => {
                submitBtn.textContent = '✓ MESSAGE SENT';
                submitBtn.style.background = '#111';
                submitBtn.style.borderColor = '#111';
                submitBtn.style.color = '#F2EDE8';

                setTimeout(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.style.background = '';
                    submitBtn.style.borderColor = '';
                    submitBtn.style.color = '';
                    submitBtn.disabled = false;
                    contactForm.reset();
                }, 2500);
            }, 1500);
        });
    }

    // ==================== INTEREST TAG RANDOM ACCENTS ====================
    const interestTags = document.querySelectorAll('.interest-tag');
    interestTags.forEach(tag => {
        const colors = ['#FF3D00', '#111', '#FF8C00'];
        const c = colors[Math.floor(Math.random() * colors.length)];
        tag.style.borderLeftColor = c;
        tag.style.borderLeftWidth = '4px';
    });

    // ==================== PAGE TRANSITION EFFECT ====================
    // Fade in on load
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    requestAnimationFrame(() => {
        document.body.style.opacity = '1';
    });

    // ==================== CONSOLE EASTER EGG ====================
    console.log(
        '%c ADHARSH %c Web Designer & Developer ',
        'background: #FF3D00; color: #FFF; font-size: 16px; font-weight: bold; padding: 8px 12px;',
        'background: #111; color: #F2EDE8; font-size: 14px; padding: 8px 12px;'
    );

});
