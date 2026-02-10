/**
 * Yahtzeeeee Multiplayer V2
 * 2-player strict alternating turns via Supabase
 */
const MP = (function() {

    const SUPABASE_URL = 'https://urmqudupcwqtpgfuybai.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVybXF1ZHVwY3dxdHBnZnV5YmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NjM0MzksImV4cCI6MjA4NjIzOTQzOX0.MaSGteOF089qFAVbiYEuflETsbWvEsKfX-d_bWGh7SQ';

    let sb = null;
    let game = null;
    let me = null;
    let token = null;
    let sub = null;
    let onUpdate = null;

    function init() {
        if (!window.supabase) return false;
        sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        token = localStorage.getItem('yaht-session');
        if (!token) { token = crypto.randomUUID(); localStorage.setItem('yaht-session', token); }
        return true;
    }

    function genCode() {
        const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let r = ''; for (let i=0;i<6;i++) r+=c[Math.floor(Math.random()*c.length)]; return r;
    }

    // === CREATE GAME ===
    // Creator enters their name AND the opponent's name
    async function createGame(myName, opponentName) {
        const code = genCode();
        const { data: g, error: e1 } = await sb.from('games').insert({
            code,
            creator_token: token,
            status: 'lobby',
            max_players: 2,
            player1_name: myName,
            player2_name: opponentName,
            current_turn: null, // will be set on start
            turn_dice: null,
            turn_held: null,
            turn_rolls_left: 3,
            last_action: null,
        }).select().single();
        if (e1) return { error: e1.message };

        const { data: p, error: e2 } = await sb.from('players').insert({
            game_id: g.id, name: myName, session_token: token,
            scores: {}, bonuses: [], current_round: 1, total_score: 0,
            jail_penalty: 0, joker_points: 0, player_num: 1,
        }).select().single();
        if (e2) return { error: e2.message };

        game = g; me = p;
        subscribe(g.id);
        return { game: g, player: p, code };
    }

    // === JOIN GAME ===
    async function joinGame(code, playerName) {
        code = code.toUpperCase().trim();
        const { data: g, error: e1 } = await sb.from('games').select('*').eq('code', code).single();
        if (e1 || !g) return { error: 'Game not found.' };
        if (g.status !== 'lobby') return { error: 'Game already started.' };

        // Check if already joined
        const { data: existing } = await sb.from('players').select('*')
            .eq('game_id', g.id).eq('session_token', token).single();
        if (existing) { game = g; me = existing; subscribe(g.id); return { game: g, player: existing, rejoined: true }; }

        // Check not full
        const { data: players } = await sb.from('players').select('id').eq('game_id', g.id);
        if (players && players.length >= 2) return { error: 'Game is full.' };

        const { data: p, error: e2 } = await sb.from('players').insert({
            game_id: g.id, name: playerName, session_token: token,
            scores: {}, bonuses: [], current_round: 1, total_score: 0,
            jail_penalty: 0, joker_points: 0, player_num: 2,
        }).select().single();
        if (e2) return { error: e2.message };

        game = g; me = p;
        subscribe(g.id);

        // Auto-start: both players are in, start the game. Player 1 goes first.
        await sb.from('games').update({
            status: 'playing',
            current_turn: 1, // player 1 goes first
            current_round: 1,
            turn_dice: [0,0,0,0,0],
            turn_held: [false,false,false,false,false],
            turn_rolls_left: 3,
            last_action: JSON.stringify({ type: 'game_started' }),
        }).eq('id', g.id);

        return { game: g, player: p };
    }

    // === GET STATE ===
    async function getGameState() {
        if (!game) return null;
        const { data: g } = await sb.from('games').select('*').eq('id', game.id).single();
        if (!g) return null;
        const { data: players } = await sb.from('players').select('*').eq('game_id', game.id).order('player_num');
        game = g;
        const myData = players?.find(p => p.session_token === token);
        if (myData) me = myData;
        return { game: g, players: players || [] };
    }

    async function getPlayers() {
        if (!game) return [];
        const { data } = await sb.from('players').select('*').eq('game_id', game.id).order('player_num');
        return data || [];
    }

    // === TURN ACTIONS (pushed to game row so opponent can watch) ===
    async function pushDiceState(dice, held, rollsLeft) {
        if (!game) return;
        await sb.from('games').update({
            turn_dice: dice,
            turn_held: held,
            turn_rolls_left: rollsLeft,
            last_action: JSON.stringify({ type: 'roll', dice, held, rollsLeft, ts: Date.now() }),
        }).eq('id', game.id);
    }

    async function pushHoldState(held) {
        if (!game) return;
        await sb.from('games').update({
            turn_held: held,
            last_action: JSON.stringify({ type: 'hold', held, ts: Date.now() }),
        }).eq('id', game.id);
    }

    // === END TURN (score a category) ===
    async function endTurn(scores, bonuses, jailPenalty, jokerPoints, totalScore, roundNum, cat, pts, earnedBonusNames) {
        if (!me) return { error: 'No player' };

        // Update player scores
        await sb.from('players').update({
            scores, bonuses,
            jail_penalty: jailPenalty,
            joker_points: jokerPoints,
            total_score: totalScore,
            current_round: roundNum + 1,
        }).eq('id', me.id);

        me.current_round = roundNum + 1;
        me.total_score = totalScore;
        me.scores = scores;

        // Determine next turn
        const myNum = me.player_num;
        const nextPlayerNum = myNum === 1 ? 2 : 1;

        // Check if game is over (both players done 13 rounds)
        const players = await getPlayers();
        const otherPlayer = players.find(p => p.player_num === nextPlayerNum);
        const myDone = roundNum + 1 > 13;
        const otherDone = otherPlayer && otherPlayer.current_round > 13;

        // Build recap
        const recap = {
            type: 'turn_end',
            playerName: me.name,
            playerNum: myNum,
            cat, pts,
            totalScore,
            bonuses: earnedBonusNames || [],
            ts: Date.now(),
        };

        if (myDone && otherDone) {
            // Game over
            await sb.from('games').update({
                status: 'finished',
                current_turn: 0,
                last_action: JSON.stringify(recap),
            }).eq('id', game.id);
        } else if (myDone) {
            // I'm done but other player still has rounds
            await sb.from('games').update({
                current_turn: nextPlayerNum,
                turn_dice: [0,0,0,0,0],
                turn_held: [false,false,false,false,false],
                turn_rolls_left: 3,
                last_action: JSON.stringify(recap),
            }).eq('id', game.id);
        } else if (otherDone) {
            // Other is done, back to me
            await sb.from('games').update({
                current_turn: myNum,
                turn_dice: [0,0,0,0,0],
                turn_held: [false,false,false,false,false],
                turn_rolls_left: 3,
                last_action: JSON.stringify(recap),
            }).eq('id', game.id);
        } else {
            // Normal: switch to other player
            await sb.from('games').update({
                current_turn: nextPlayerNum,
                turn_dice: [0,0,0,0,0],
                turn_held: [false,false,false,false,false],
                turn_rolls_left: 3,
                last_action: JSON.stringify(recap),
            }).eq('id', game.id);
        }

        return { success: true };
    }

    // === REALTIME ===
    function subscribe(gameId) {
        if (sub) sub.unsubscribe();
        sub = sb.channel(`game-${gameId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
                (payload) => { if (onUpdate) onUpdate('game_change', payload); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
                (payload) => { if (onUpdate) onUpdate('player_change', payload); })
            .subscribe();
    }

    function setOnUpdate(cb) { onUpdate = cb; }

    function isMyTurn() {
        return game && me && game.current_turn === me.player_num;
    }

    function getMyPlayerNum() { return me?.player_num; }
    function getOpponentName() {
        if (!game || !me) return '';
        return me.player_num === 1 ? game.player2_name : game.player1_name;
    }
    function getMatchTitle() {
        if (!game) return '';
        return `${game.player1_name} v. ${game.player2_name}`;
    }
    function isCreator() { return game && game.creator_token === token; }
    function isMultiplayer() { return game !== null; }
    function getCode() { return game?.code; }
    function getMyPlayer() { return me; }
    function getGame() { return game; }
    function saveGameId() { if (game) localStorage.setItem('yaht-game-id', game.id); }

    function cleanup() {
        if (sub) sub.unsubscribe();
        game = null; me = null;
        localStorage.removeItem('yaht-game-id');
    }

    return {
        init, createGame, joinGame, getGameState, getPlayers,
        pushDiceState, pushHoldState, endTurn,
        setOnUpdate, subscribe,
        isMyTurn, getMyPlayerNum, getOpponentName, getMatchTitle,
        isCreator, isMultiplayer, getCode, getMyPlayer, getGame,
        saveGameId, cleanup,
    };
})();
