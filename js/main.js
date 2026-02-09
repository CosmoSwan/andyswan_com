/**
 * Main JS — V2
 * Typing, scroll reveals, nav, interactions
 */
(function () {

    // ===== TYPING EFFECT =====
    const phrases = [
        'Creator of LikeFolio.',
        'Board at Contio.ai.',
        'Ships code, not slide decks.',
        'AI-native builder.',
        'Two exits. Building the third.',
        'Fintech meets frontier AI.',
        '₿itcoin. Hard money. Fixed supply.',
        'Always building.',
    ];

    const el = document.getElementById('hero-sub');
    let phraseIdx = 0, charIdx = 0, deleting = false, speed = 60;

    function type() {
        const current = phrases[phraseIdx];
        if (deleting) {
            el.textContent = current.substring(0, charIdx - 1) + '▍';
            charIdx--;
            speed = 25;
        } else {
            el.textContent = current.substring(0, charIdx + 1) + '▍';
            charIdx++;
            speed = 50 + Math.random() * 30;
        }

        if (!deleting && charIdx === current.length) {
            speed = 2800;
            deleting = true;
        } else if (deleting && charIdx === 0) {
            deleting = false;
            phraseIdx = (phraseIdx + 1) % phrases.length;
            speed = 300;
        }

        setTimeout(type, speed);
    }

    setTimeout(type, 1200);

    // ===== SCROLL REVEAL =====
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal-up').forEach(el => observer.observe(el));

    // Auto-add reveal to certain elements
    document.querySelectorAll('.work-block, .lab-card, .connect-link').forEach(el => {
        if (!el.classList.contains('reveal-up')) {
            el.classList.add('reveal-up');
            observer.observe(el);
        }
    });

    // ===== NAVIGATION =====
    const nav = document.getElementById('nav');
    const toggle = document.getElementById('nav-toggle');
    const mobileNav = document.getElementById('mobile-nav');

    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.pageYOffset > 60);
    }, { passive: true });

    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        mobileNav.classList.toggle('active');
        document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
    });

    document.querySelectorAll('.mobile-nav a').forEach(a => {
        a.addEventListener('click', () => {
            toggle.classList.remove('active');
            mobileNav.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Smooth scroll for all # links
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
            const target = document.querySelector(a.getAttribute('href'));
            if (target) {
                e.preventDefault();
                const y = target.getBoundingClientRect().top + window.pageYOffset - 80;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        });
    });

    // ===== LAB CARD HOVER GLOW =====
    document.querySelectorAll('.lab-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--glow-x', x + '%');
            card.style.setProperty('--glow-y', y + '%');
        });
    });

    // ===== KONAMI CODE =====
    const konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let ki = 0;

    document.addEventListener('keydown', (e) => {
        if (e.key === konami[ki]) {
            ki++;
            if (ki === konami.length) {
                ki = 0;
                document.body.style.transition = 'filter 0.5s ease';
                document.body.style.filter = 'hue-rotate(180deg) saturate(2)';
                setTimeout(() => { document.body.style.filter = ''; }, 3000);
            }
        } else {
            ki = 0;
        }
    });

    // ===== YEAR =====
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
