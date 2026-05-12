const { query } = require('./src/config/db'); 
query(`INSERT INTO games (id, white_id, black_id, time_control, increment, status, is_bot_game, bot_elo, white_rating_before, black_rating_before) VALUES ($1, $2, $3::VARCHAR, $4, $5, 'waiting', $6, $7, (SELECT rating FROM users WHERE id = $2), (SELECT rating FROM users WHERE id = $3::VARCHAR)) RETURNING *`, ['test-id-4', 'a40818c0-5314-41ed-bb45-482465ebe121', null, '300', 0, false, null])
.then(res => { console.log(res.rows); process.exit(0); })
.catch(err => { console.error(err.message); process.exit(1); });
