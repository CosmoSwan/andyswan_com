/**
 * Yahtzeeeee Multiplayer Module
 * Async round-based multiplayer via Supabase
 */
const MP = (function() {

    // === SUPABASE CONFIG ===
    // REPLACE these with your Supabase project values
    const SUPABASE_URL = 'YOUR_SUPABASE_URL';
    const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

    let supabase = null;
    let currentGame = null;
    let currentPlayer = null;
    let sessionToken = null;
    let subscription = null;
    let onGameUpdate = null; // callback when game state changes

    // === INIT ===
    function init() {
        if (typeof window.supabase === 'undefined') {
            console.error('Supabase SDK not loaded');
            return false;
        }
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Restore session token from localStorage
        sessionToken = localStorage.getItem('yaht-session');
        if (!sessionToken) {
            sessionToken = generateToken();
            localStorage.setItem('yaht-session', sessionToken);
        }
        return true;
    }

    // === HELPERS ===
    function generateToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I confusion
        let code = '';
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
        return code;
    }

    // === CREATE GAME ===
    async function createGame(playerName) {
        if (!supabase) return { error: 'Not initialized' };

        const code = generateCode();

        // Create game
        const { data: game, error: gErr } = await supabase
            .from('games')
            .insert({ code, creator_token: sessionToken, status: 'lobby' })
            .select()
            .single();

        if (gErr) return { error: gErr.message };

        // Join as first player
        const { data: player, error: pErr } = await supabase
            .from('players')
            .insert({
                game_id: game.id,
                name: playerName,
                session_token: sessionToken,
                scores: {},
                bonuses: [],
                current_round: 1
            })
            .select()
            .single();

        if (pErr) return { error: pErr.message };

        currentGame = game;
        currentPlayer = player;

        // Subscribe to realtime updates
        subscribeToGame(game.id);

        return { game, player, code };
    }

    // === JOIN GAME ===
    async function joinGame(code, playerName) {
        if (!supabase) return { error: 'Not initialized' };

        code = code.toUpperCase().trim();

        // Find game
        const { data: game, error: gErr } = await supabase
            .from('games')
            .select('*')
            .eq('code', code)
            .single();

        if (gErr || !game) return { error: 'Game not found. Check your code.' };
        if (game.status !== 'lobby') return { error: 'Game already in progress.' };

        // Check player count
        const { data: players } = await supabase
            .from('players')
            .select('id')
            .eq('game_id', game.id);

        if (players && players.length >= game.max_players) return { error: 'Game is full.' };

        // Check if already in this game
        const { data: existing } = await supabase
            .from('players')
            .select('*')
            .eq('game_id', game.id)
            .eq('session_token', sessionToken)
            .single();

        if (existing) {
            currentGame = game;
            currentPlayer = existing;
            subscribeToGame(game.id);
            return { game, player: existing, code, rejoined: true };
        }

        // Join
        const { data: player, error: pErr } = await supabase
            .from('players')
            .insert({
                game_id: game.id,
                name: playerName,
                session_token: sessionToken,
                scores: {},
                bonuses: [],
                current_round: 1
            })
            .select()
            .single();

        if (pErr) return { error: pErr.message };

        currentGame = game;
        currentPlayer = player;

        subscribeToGame(game.id);

        return { game, player, code };
    }

    // === START GAME (creator only) ===
    async function startGame() {
        if (!currentGame) return { error: 'No game' };

        const { error } = await supabase
            .from('games')
            .update({ status: 'playing', current_round: 1 })
            .eq('id', currentGame.id);

        if (error) return { error: error.message };
        currentGame.status = 'playing';
        return { success: true };
    }

    // === GET PLAYERS ===
    async function getPlayers() {
        if (!currentGame) return [];
        const { data } = await supabase
            .from('players')
            .select('*')
            .eq('game_id', currentGame.id)
            .order('joined_at', { ascending: true });
        return data || [];
    }

    // === SUBMIT ROUND ===
    async function submitRound(scores, bonuses, jailPenalty, jokerPoints, totalScore, roundNum) {
        if (!currentPlayer) return { error: 'No player' };

        const { error } = await supabase
            .from('players')
            .update({
                scores,
                bonuses,
                jail_penalty: jailPenalty,
                joker_points: jokerPoints,
                total_score: totalScore,
                current_round: roundNum + 1
            })
            .eq('id', currentPlayer.id);

        if (error) return { error: error.message };

        currentPlayer.current_round = roundNum + 1;

        // Check if all players finished this round
        const players = await getPlayers();
        const allDone = players.every(p => p.current_round > roundNum);

        if (allDone) {
            const nextRound = roundNum + 1;
            if (nextRound > 13) {
                // Game over
                await supabase.from('games').update({ status: 'finished', current_round: 14 }).eq('id', currentGame.id);
            } else {
                await supabase.from('games').update({ current_round: nextRound }).eq('id', currentGame.id);
            }
        }

        return { allDone };
    }

    // === GET GAME STATE ===
    async function getGameState() {
        if (!currentGame) return null;

        const { data: game } = await supabase
            .from('games')
            .select('*')
            .eq('id', currentGame.id)
            .single();

        const players = await getPlayers();

        currentGame = game;

        return { game, players };
    }

    // === REALTIME SUBSCRIPTION ===
    function subscribeToGame(gameId) {
        if (subscription) subscription.unsubscribe();

        subscription = supabase
            .channel(`game-${gameId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
                (payload) => { if (onGameUpdate) onGameUpdate('player_change', payload); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
                (payload) => { if (onGameUpdate) onGameUpdate('game_change', payload); })
            .subscribe();
    }

    function setOnGameUpdate(callback) {
        onGameUpdate = callback;
    }

    // === REJOIN CHECK ===
    async function checkExistingGame() {
        const savedGameId = localStorage.getItem('yaht-game-id');
        if (!savedGameId) return null;

        const { data: game } = await supabase
            .from('games')
            .select('*')
            .eq('id', savedGameId)
            .single();

        if (!game || game.status === 'finished') {
            localStorage.removeItem('yaht-game-id');
            return null;
        }

        const { data: player } = await supabase
            .from('players')
            .select('*')
            .eq('game_id', game.id)
            .eq('session_token', sessionToken)
            .single();

        if (!player) {
            localStorage.removeItem('yaht-game-id');
            return null;
        }

        currentGame = game;
        currentPlayer = player;
        subscribeToGame(game.id);

        return { game, player };
    }

    function saveGameId() {
        if (currentGame) localStorage.setItem('yaht-game-id', currentGame.id);
    }

    function isCreator() {
        return currentGame && currentGame.creator_token === sessionToken;
    }

    function isMultiplayer() {
        return currentGame !== null;
    }

    function getCode() {
        return currentGame ? currentGame.code : null;
    }

    function getMyPlayer() {
        return currentPlayer;
    }

    function cleanup() {
        if (subscription) subscription.unsubscribe();
        currentGame = null;
        currentPlayer = null;
        localStorage.removeItem('yaht-game-id');
    }

    return {
        init,
        createGame,
        joinGame,
        startGame,
        getPlayers,
        submitRound,
        getGameState,
        setOnGameUpdate,
        checkExistingGame,
        saveGameId,
        isCreator,
        isMultiplayer,
        getCode,
        getMyPlayer,
        cleanup,
    };
})();
