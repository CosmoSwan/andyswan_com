/**
 * Interactive Terminal — V2
 * Real Andy Swan data. Tighter, more confident.
 */
(function () {
    const input = document.getElementById('terminal-input');
    const output = document.getElementById('terminal-output');
    const body = document.getElementById('terminal-body');
    if (!input || !output) return;

    let history = [];
    let historyIdx = -1;

    const COMMANDS = {

        help: () => [
            { t: '', c: '' },
            { t: '  Commands:', c: 't-head' },
            { t: '', c: '' },
            { t: '  about        → Who is Andy Swan', c: 't-muted' },
            { t: '  likefolio    → The company I created', c: 't-muted' },
            { t: '  career       → Timeline', c: 't-muted' },
            { t: '  skills       → Technical chops', c: 't-muted' },
            { t: '  now          → What I\'m working on', c: 't-muted' },
            { t: '  beliefs      → How I think', c: 't-muted' },
            { t: '  contact      → Reach me', c: 't-muted' },
            { t: '  clear        → Clear terminal', c: 't-muted' },
            { t: '', c: '' },
            { t: '  There might be some other commands too...', c: 't-dim' },
            { t: '', c: '' },
        ],

        about: () => [
            { t: '', c: '' },
            { t: '  Andy Swan', c: 't-bold' },
            { t: '  Founder. Builder. Operator.', c: 't-blue' },
            { t: '', c: '' },
            { t: '  I build companies at the intersection of AI,', c: '' },
            { t: '  fintech, and consumer intelligence.', c: '' },
            { t: '', c: '' },
            { t: '  Created LikeFolio — the platform that turns', c: '' },
            { t: '  social signals into investment alpha. Named to', c: '' },
            { t: '  Fast Company\'s Most Innovative in Finance.', c: '' },
            { t: '', c: '' },
            { t: '  Board member at Contio.ai. Former board member', c: '' },
            { t: '  at Riskalyze (now Nitrogen). Started and sold', c: '' },
            { t: '  two previous companies in finance.', c: '' },
            { t: '', c: '' },
            { t: '  25+ years of building software, teams, and', c: '' },
            { t: '  companies that ship.', c: '' },
            { t: '', c: '' },
            { t: '  → "likefolio" for the deep dive', c: 't-dim' },
            { t: '  → "career" for the timeline', c: 't-dim' },
            { t: '', c: '' },
        ],

        likefolio: () => [
            { t: '', c: '' },
            { t: '  LikeFolio', c: 't-bold' },
            { t: '  Consumer Intelligence for Investors', c: 't-blue' },
            { t: '', c: '' },
            { t: '  What: A platform that discovers investment', c: '' },
            { t: '  opportunities by tracking consumer enthusiasm', c: '' },
            { t: '  for brands and products on social media.', c: '' },
            { t: '', c: '' },
            { t: '  Why: See consumer shifts on Main Street', c: '' },
            { t: '  before they become news on Wall Street.', c: '' },
            { t: '', c: '' },
            { t: '  Recognition:', c: 't-cyan' },
            { t: '  • Fast Company Most Innovative (Finance)', c: 't-muted' },
            { t: '  • Featured on CNBC, Yahoo Finance, Barron\'s', c: 't-muted' },
            { t: '  • Used by institutional investors & corporations', c: 't-muted' },
            { t: '', c: '' },
            { t: '  → likefolio.com', c: 't-blue' },
            { t: '', c: '' },
        ],

        career: () => [
            { t: '', c: '' },
            { t: '  Timeline', c: 't-head' },
            { t: '', c: '' },
            { t: '  NOW   Building in public, shipping weekly', c: 't-cyan' },
            { t: '        AI-native experiments at andyswan.com', c: 't-muted' },
            { t: '        Board — Contio.ai (AI meeting OS)', c: 't-muted' },
            { t: '', c: '' },
            { t: '  ──────────────────────────────────────', c: 't-dim' },
            { t: '', c: '' },
            { t: '  LKF   Created LikeFolio', c: 't-blue' },
            { t: '        Consumer signals → investment alpha', c: 't-muted' },
            { t: '        Fast Company Most Innovative', c: 't-muted' },
            { t: '', c: '' },
            { t: '  ──────────────────────────────────────', c: 't-dim' },
            { t: '  BRD   Board — Riskalyze (6 years)', c: 't-violet' },
            { t: '        Risk alignment for financial advisors', c: 't-muted' },
            { t: '', c: '' },
            { t: '  ──────────────────────────────────────', c: 't-dim' },
            { t: '  EXIT  Two companies sold in finance', c: 't-pink' },
            { t: '        Built, scaled, exited', c: 't-muted' },
            { t: '', c: '' },
            { t: '  ──────────────────────────────────────', c: 't-dim' },
            { t: '  001   Started coding before it was cool', c: 't-muted' },
            { t: '        Built first company in college', c: 't-dim' },
            { t: '', c: '' },
        ],

        skills: () => [
            { t: '', c: '' },
            { t: '  Technical Arsenal', c: 't-head' },
            { t: '', c: '' },
            { t: '  AI / ML', c: 't-cyan' },
            { t: '  ████████████████████████░  LLMs, RAG, Agents, Prompt Eng', c: 't-muted' },
            { t: '', c: '' },
            { t: '  Fintech', c: 't-cyan' },
            { t: '  █████████████████████████  Trading, payments, risk, data', c: 't-muted' },
            { t: '', c: '' },
            { t: '  Full Stack', c: 't-cyan' },
            { t: '  ████████████████████████░  Python, JS/TS, Go, React, Node', c: 't-muted' },
            { t: '', c: '' },
            { t: '  Infra', c: 't-cyan' },
            { t: '  ██████████████████████░░░  AWS, Docker, CI/CD, Edge', c: 't-muted' },
            { t: '', c: '' },
            { t: '  Leadership', c: 't-cyan' },
            { t: '  █████████████████████████  Teams, culture, strategy, M&A', c: 't-muted' },
            { t: '', c: '' },
            { t: '  Preferred tool: Whatever ships fastest.', c: 't-blue' },
            { t: '', c: '' },
        ],

        now: () => [
            { t: '', c: '' },
            { t: '  What I\'m Doing Now', c: 't-head' },
            { t: '', c: '' },
            { t: '  • Building AI-powered experiments weekly', c: '' },
            { t: '  • Board work at Contio.ai', c: '' },
            { t: '  • Advising AI/fintech founders', c: '' },
            { t: '  • Shipping projects at andyswan.com/lab', c: '' },
            { t: '  • Exploring what\'s next', c: '' },
            { t: '', c: '' },
            { t: '  Status: Building.', c: 't-cyan' },
            { t: '', c: '' },
        ],

        beliefs: () => [
            { t: '', c: '' },
            { t: '  Operating Principles', c: 't-head' },
            { t: '', c: '' },
            { t: '  1. Ship > Plan', c: 't-cyan' },
            { t: '     A shipped MVP beats the best deck.', c: 't-muted' },
            { t: '', c: '' },
            { t: '  2. AI is infrastructure', c: 't-cyan' },
            { t: '     Not a feature. The foundation.', c: 't-muted' },
            { t: '', c: '' },
            { t: '  3. Use what you build', c: 't-cyan' },
            { t: '     Best fintech = built by traders.', c: 't-muted' },
            { t: '', c: '' },
            { t: '  4. Culture eats code', c: 't-cyan' },
            { t: '     Right team > right architecture.', c: 't-muted' },
            { t: '', c: '' },
            { t: '  5. Comfort is the enemy', c: 't-cyan' },
            { t: '     If it doesn\'t scare you, think bigger.', c: 't-muted' },
            { t: '', c: '' },
        ],

        contact: () => [
            { t: '', c: '' },
            { t: '  Reach Me', c: 't-head' },
            { t: '', c: '' },
            { t: '  𝕏 @andyswan      ← this is where the action is', c: 't-cyan t-bold' },
            { t: '    Hot takes on AI, fintech, building, life.', c: 't-muted' },
            { t: '    x.com/andyswan', c: 't-muted' },
            { t: '', c: '' },
            { t: '  LinkedIn    linkedin.com/in/andyswan', c: '' },
            { t: '  GitHub      github.com/andyswan', c: '' },
            { t: '  Email       andy@andyswan.com', c: '' },
            { t: '', c: '' },
            { t: '  Building something ambitious? Let\'s talk.', c: 't-blue' },
            { t: '', c: '' },
        ],

        clear: () => {
            output.innerHTML = '';
            return [];
        },

        // --- Easter Eggs ---
        'sudo hire andy': () => [
            { t: '', c: '' },
            { t: '  ✓ Excellent judgment detected.', c: 't-cyan t-bold' },
            { t: '', c: '' },
            { t: '  Processing offer letter...', c: 't-muted' },
            { t: '  [████████████████████████] 100%', c: 't-blue' },
            { t: '', c: '' },
            { t: '  Just kidding. But seriously → andy@andyswan.com', c: 't-pink' },
            { t: '', c: '' },
        ],

        sudo: () => [
            { t: '  No root access. Try "sudo hire andy"', c: 't-pink' },
            { t: '', c: '' },
        ],

        matrix: () => {
            triggerMatrix();
            return [
                { t: '  Follow the white rabbit...', c: 't-cyan' },
                { t: '', c: '' },
            ];
        },

        ls: () => [
            { t: '  drwxr-xr-x  companies/', c: 't-blue' },
            { t: '  drwxr-xr-x  projects/', c: 't-blue' },
            { t: '  -rw-r--r--  ideas.txt          (43,721 lines)', c: 't-muted' },
            { t: '  -rw-r--r--  coffee_addiction.log', c: 't-muted' },
            { t: '  -rw-r--r--  sleep.txt           (empty)', c: 't-dim' },
            { t: '', c: '' },
        ],

        whoami: () => [
            { t: '  visitor@andyswan.com — welcome.', c: 't-cyan' },
            { t: '', c: '' },
        ],

        pwd: () => [
            { t: '  /home/andy/building-the-future', c: 't-cyan' },
            { t: '', c: '' },
        ],

        ping: () => [
            { t: '  PING andyswan.com — always online, always building.', c: 't-cyan' },
            { t: '', c: '' },
        ],

        exit: () => [
            { t: '  There is no exit from the arena. Stay.', c: 't-pink' },
            { t: '', c: '' },
        ],

        vim: () => [
            { t: '  I use Cursor now. Welcome to the future.', c: 't-blue' },
            { t: '', c: '' },
        ],

        coffee: () => [
            { t: '  ☕ Brewing... [████████████████████████] done.', c: 't-cyan' },
            { t: '  Fuel level: MAXIMUM', c: 't-cyan' },
            { t: '', c: '' },
        ],

        bitcoin: () => [
            { t: '', c: '' },
            { t: '  ₿', c: 't-btc t-bold' },
            { t: '', c: '' },
            { t: '  Hard money. Fixed supply. No counterparty risk.', c: 't-btc' },
            { t: '  21 million. That\'s it. That\'s the tweet.', c: 't-btc' },
            { t: '', c: '' },
            { t: '  If you know, you know.', c: 't-muted' },
            { t: '  If you don\'t — have fun staying poor.', c: 't-muted' },
            { t: '', c: '' },
        ],

        btc: () => COMMANDS.bitcoin(),

        hodl: () => [
            { t: '', c: '' },
            { t: '  ₿ HODL MODE ACTIVATED', c: 't-btc t-bold' },
            { t: '  Diamond hands. Low time preference.', c: 't-btc' },
            { t: '  Stack sats. Stay humble.', c: 't-muted' },
            { t: '', c: '' },
        ],

        hello: () => [
            { t: '  Hey. 👋 Type "help" to explore.', c: 't-blue' },
            { t: '', c: '' },
        ],

        hi: () => COMMANDS.hello(),
        hey: () => COMMANDS.hello(),
    };

    // --- Matrix Easter Egg ---
    function triggerMatrix() {
        let overlay = document.querySelector('.matrix-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'matrix-overlay';
            const canvas = document.createElement('canvas');
            overlay.appendChild(canvas);
            document.body.appendChild(overlay);
        }

        const canvas = overlay.querySelector('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        overlay.classList.add('active');

        const chars = 'ANDYSWANLIKEFOLIO01アイウエオカキ';
        const fontSize = 14;
        const cols = Math.floor(canvas.width / fontSize);
        const drops = Array(cols).fill(1);

        const interval = setInterval(() => {
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00e5c8';
            ctx.font = fontSize + 'px monospace';
            for (let i = 0; i < drops.length; i++) {
                const t = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(t, i * fontSize, drops[i] * fontSize);
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
        }, 33);

        setTimeout(() => {
            clearInterval(interval);
            overlay.classList.remove('active');
        }, 5000);
    }

    // --- Rendering ---
    function print(lines) {
        lines.forEach(l => {
            const div = document.createElement('div');
            div.className = `t-line ${l.c || ''}`;
            div.textContent = l.t;
            output.appendChild(div);
        });
        body.scrollTop = body.scrollHeight;
    }

    function printCmd(cmd) {
        const div = document.createElement('div');
        div.className = 't-line t-cmd';
        div.innerHTML = `<span class="prompt">→</span> <span class="cmd-val">${esc(cmd)}</span>`;
        output.appendChild(div);
    }

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function run(raw) {
        const cmd = raw.trim().toLowerCase();
        if (!cmd) return;

        history.unshift(cmd);
        historyIdx = -1;
        printCmd(cmd);

        if (COMMANDS[cmd]) {
            const result = COMMANDS[cmd]();
            if (result && result.length) print(result);
        } else {
            print([
                { t: `  Unknown: ${cmd}`, c: 't-pink' },
                { t: '  Type "help" for commands.', c: 't-dim' },
                { t: '', c: '' },
            ]);
        }

        body.scrollTop = body.scrollHeight;
    }

    // --- Welcome ---
    print([
        { t: '', c: '' },
        { t: '  Welcome to Andy Swan\'s terminal.', c: 't-blue t-bold' },
        { t: '  Type "help" to explore.', c: 't-muted' },
        { t: '', c: '' },
    ]);

    // --- Events ---
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            run(input.value);
            input.value = '';
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIdx < history.length - 1) {
                historyIdx++;
                input.value = history[historyIdx];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIdx > 0) {
                historyIdx--;
                input.value = history[historyIdx];
            } else {
                historyIdx = -1;
                input.value = '';
            }
        }
    });

    body.addEventListener('click', () => input.focus());
})();
