const CONFIG = {
  DISCORD_USER_ID: '1282292887878369358',
  LANYARD_WS: 'wss://api.lanyard.rest/socket',
  HTTP: 'https://api.lanyard.rest/v1/users/',
  FALLBACK: 'https://cdn.discordapp.com/embed/avatars/0.png',
  CACHE_KEY: 'lanyard_cache',
  CACHE_TTL: 30000
};

let ws, reconnects = 0;

function $(sel){return document.querySelector(sel)}
function cacheGet(){
  const c = localStorage.getItem(CONFIG.CACHE_KEY);
  if(!c) return null;
  const {data,ts} = JSON.parse(c);
  return Date.now()-ts < CONFIG.CACHE_TTL ? data : null;
}
function cacheSet(data){
  localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({data,ts:Date.now()}));
}

function render(data){
  const u = data.discord_user;
  $('#username').textContent = u.username;
  $('#discriminator').textContent = '@'+u.username;
  $('#avatar').src = u.avatar
    ? `https://cdn.discordapp.com/avatars/${CONFIG.DISCORD_USER_ID}/${u.avatar}.png?size=128`
    : CONFIG.FALLBACK;

  const status = data.discord_status || 'offline';
  $('#statusDot').className = 'status-dot '+status;
  $('#statusText').textContent = {online:'Online',idle:'Away',dnd:'Do Not Disturb'}[status]||'Offline';

  const custom = (data.activities||[]).find(a=>a.type===4);
  $('#customStatus').textContent = custom?.state||'';
  $('#customStatus').style.display = custom?.state?'block':'none';

  $('#loading').style.display = 'none';
  $('#profile').style.display = 'block';
  cacheSet(data);
}

function connect(){
  ws = new WebSocket(CONFIG.LANYARD_WS);
  ws.onopen = ()=>{
    ws.send(JSON.stringify({op:2,d:{subscribe_to_id:CONFIG.DISCORD_USER_ID}}));
    reconnects = 0;
  };
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if(msg.op===0 && (msg.t==='INIT_STATE'||msg.t==='PRESENCE_UPDATE')) render(msg.d);
  };
  ws.onclose = ()=>{
    if(++reconnects < 5) setTimeout(connect, 3000);
    else fallback();
  };
  ws.onerror = ()=>ws.close();
}
function fallback(){
  const cached = cacheGet();
  if(cached) return render(cached);
  fetch(CONFIG.HTTP+CONFIG.DISCORD_USER_ID)
    .then(r=>r.json()).then(d=>render(d.data)).catch(()=>render({discord_user:null}));
}

document.addEventListener('DOMContentLoaded', ()=>{
  $('#loading').style.display = 'flex';
  connect();
});