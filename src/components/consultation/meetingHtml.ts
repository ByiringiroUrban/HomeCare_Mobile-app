// Self-contained "Google Meet"-style meeting surface rendered by the Agora Web SDK 4.x
// inside a WebView (native) or an iframe (web). AGENTS.md note: this HTML is a static
// string evaluated by the platform's web engine, not React Native components.

export interface MeetingConfig {
  appId: string;
  channel: string;
  token: string;
  uid: number;
  /** Current user (doctor or patient). */
  displayName: string;
  roleLabel: string;
  /** The other participant of the visit. */
  peerName: string;
  peerRoleLabel: string;
  meetingTitle: string;
  /** Short human friendly meeting code shown in the header. */
  meetingCode: string;
}

export function buildMeetingHtml(config: MeetingConfig): string {
  const cfgJson = JSON.stringify(config).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<meta name="color-scheme" content="dark" />
<title>HomeCare Video Consultation</title>
<style>
  :root{
    --bg:#202124; --panel:#292a2d; --tile:#3c4043; --tile-2:#4a4d51; --text:#e8eaed;
    --muted:#9aa0a6; --accent:#8ab4f8; --red:#ea4335; --green:#34a853;
  }
  *{box-sizing:border-box; -webkit-tap-highlight-color:transparent}
  html,body{margin:0;padding:0;height:100%;background:var(--bg);color:var(--text);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
    overflow:hidden; overscroll-behavior:none}
  .hidden{display:none !important}
  button{font-family:inherit}
  svg{display:block}

  /* ---------- Lobby ---------- */
  #lobby{height:100%;display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto}
  .lobby-card{width:100%;max-width:430px;background:var(--panel);border-radius:18px;padding:20px;
    box-shadow:0 20px 50px rgba(0,0,0,.45);display:flex;flex-direction:column;gap:14px}
  .eyebrow{font-size:10px;font-weight:700;letter-spacing:1.4px;color:var(--accent);text-transform:uppercase}
  .lobby-card h1{font-size:19px;font-weight:600;margin:0;line-height:1.25}
  .lobby-card .subline{font-size:12.5px;color:var(--muted);margin:0;line-height:1.4}
  .peers{display:flex;align-items:center;justify-content:center;gap:12px}
  .avatar{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;
    color:#fff;letter-spacing:.5px;flex:none}
  .avatar.lg{width:52px;height:52px;font-size:18px}
  .avatar.xl{width:82px;height:82px;font-size:28px}
  .peers .link{color:var(--muted);font-size:15px}
  .peer-tag{font-size:10.5px;color:var(--muted);text-align:center;margin-top:4px}
  .preview{position:relative;aspect-ratio:4/3;background:var(--tile);border-radius:14px;overflow:hidden}
  .preview-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
  .preview video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
  .preview-label{position:absolute;left:10px;bottom:10px;background:rgba(32,33,36,.72);
    padding:4px 9px;border-radius:7px;font-size:11.5px}
  .lobby-controls{display:flex;justify-content:center;gap:14px}
  .join-btn{width:100%;border:none;border-radius:26px;background:var(--accent);color:#202124;
    font-size:15px;font-weight:600;padding:14px;cursor:pointer}
  .join-btn:disabled{opacity:.65}
  .join-btn.secondary{background:transparent;color:var(--accent);border:1px solid rgba(138,180,248,.4)}
  .fineprint{font-size:11.5px;color:var(--muted);margin:0;line-height:1.45;text-align:center}
  .fineprint.error{color:#f28b82}

  /* ---------- Call ---------- */
  #call{height:100%;display:flex;flex-direction:column}
  #topbar{display:flex;align-items:center;gap:10px;padding:10px 12px 8px}
  #topbar .titles{min-width:0;flex:1}
  #topbar .title{font-size:14.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #topbar .sub{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .chip{font-size:11px;font-weight:600;color:#c7d6ee;background:#2d3a4d;border:1px solid rgba(138,180,248,.25);
    padding:5px 9px;border-radius:7px;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
  .timer{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--muted);
    font-variant-numeric:tabular-nums;white-space:nowrap}
  .timer .dot{width:7px;height:7px;border-radius:50%;background:var(--red);animation:pulse 1.6s infinite}
  @keyframes pulse{0%,100%{opacity:.35}50%{opacity:1}}
  .icon-btn{background:transparent;border:none;color:var(--text);padding:6px;cursor:pointer;border-radius:50%}
  .icon-btn:active{background:rgba(255,255,255,.1)}

  #stage{position:relative;flex:1;min-height:0;padding:4px 8px 0}
  #grid{height:100%;display:grid;gap:8px;grid-template-columns:1fr;grid-auto-rows:1fr}
  #grid[data-count="2"]{grid-template-columns:1fr 1fr}
  #grid[data-count="3"],#grid[data-count="4"]{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
  #grid[data-count="5"],#grid[data-count="6"],
  #grid[data-count="7"],#grid[data-count="8"],#grid[data-count="9"]{grid-template-columns:repeat(3,1fr)}

  .tile{position:relative;background:var(--tile);border-radius:12px;overflow:hidden;min-width:0;min-height:0;
    box-shadow:0 0 0 1px rgba(255,255,255,.05) inset;transition:box-shadow .2s}
  .tile.speaking{box-shadow:0 0 0 2px var(--accent)}
  .tile-video{position:absolute;inset:0}
  .tile-video video{width:100%;height:100%;object-fit:cover}
  .tile.local .tile-video video{transform:scaleX(-1)}
  .tile-avatar{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    font-size:30px;font-weight:600;color:#fff;letter-spacing:.5px}
  .tile-footer{position:absolute;left:8px;bottom:8px;right:8px;display:flex;align-items:center;gap:6px}
  .pill{display:inline-flex;align-items:center;gap:6px;max-width:100%;background:rgba(32,33,36,.72);
    border-radius:7px;padding:4px 8px;font-size:11.5px;color:#f1f3f4}
  .pill .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pill .mic{color:#9aa0a6;display:flex}
  .pill .mic.muted{color:#f28b82}
  .waiting{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);background:rgba(41,42,45,.94);
    border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:8px 14px;font-size:11.5px;
    color:#d3d6da;display:flex;align-items:center;gap:8px;white-space:nowrap;max-width:92%;
    overflow:hidden;text-overflow:ellipsis}
  .waiting .spinner{width:12px;height:12px;border-radius:50%;border:2px solid rgba(138,180,248,.3);
    border-top-color:var(--accent);animation:spin 1s linear infinite;flex:none}
  @keyframes spin{to{transform:rotate(360deg)}}

  #roster{position:absolute;right:10px;bottom:10px;background:var(--panel);border:1px solid rgba(255,255,255,.08);
    border-radius:12px;padding:10px 12px;min-width:190px;max-width:80%;box-shadow:0 12px 30px rgba(0,0,0,.45)}
  #roster h4{margin:0 0 8px;font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted)}
  .roster-row{display:flex;align-items:center;gap:8px;font-size:12.5px;padding:3px 0}
  .roster-row .dot{width:7px;height:7px;border-radius:50%;background:var(--green);flex:none}
  .roster-row .dot.off{background:#5f6368}
  .roster-row .role{color:var(--muted);font-size:10.5px;margin-left:auto}

  #controls{display:flex;align-items:center;justify-content:center;gap:10px;padding:12px 10px 16px}
  .ctrl{width:50px;height:50px;border-radius:50%;border:none;background:var(--tile);color:var(--text);
    display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s, transform .1s}
  .ctrl:active{transform:scale(.94)}
  .ctrl.off{background:#3f2a2a;color:#f28b82}
  .ctrl.end{background:var(--red);color:#fff;width:66px;border-radius:26px}
  .ctrl.people{position:relative}
  .ctrl .badge{position:absolute;top:-2px;right:-2px;background:var(--accent);color:#202124;font-size:10px;
    font-weight:700;border-radius:10px;padding:1px 5px;border:2px solid var(--bg)}
  #fatal{position:absolute;inset:0;background:rgba(32,33,36,.96);display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;z-index:5}
  #fatal h3{margin:0;font-size:16px;font-weight:600}
  #fatal p{margin:0;font-size:12.5px;color:var(--muted);line-height:1.5;max-width:320px}

  @media (max-width:520px){
    #topbar{gap:8px;padding:8px 8px 6px}
    #topbar .title{font-size:13px}
    .chip{display:none}
    .ctrl{width:46px;height:46px}
    .ctrl.end{width:60px}
    #grid[data-count="3"],#grid[data-count="4"]{grid-template-columns:1fr;grid-template-rows:1fr 1fr}
    .tile-avatar{font-size:24px}
  }
</style>
</head>
<body>
  <section id="lobby">
    <div class="lobby-card">
      <div class="eyebrow">HomeCare &middot; Online Consultation</div>
      <h1 id="lobby-title">Video consultation</h1>
      <p class="subline" id="lobby-sub">Secure end-to-end video room for this visit.</p>

      <div class="peers">
        <div>
          <div class="avatar lg" id="my-avatar">--</div>
          <div class="peer-tag" id="my-tag">You</div>
        </div>
        <div class="link">&#10231;</div>
        <div>
          <div class="avatar lg" id="peer-avatar">--</div>
          <div class="peer-tag" id="peer-tag">Guest</div>
        </div>
      </div>

      <div class="preview">
        <div id="preview-player"></div>
        <div class="preview-fallback hidden" id="preview-fallback">
          <div class="avatar xl" id="preview-initials">--</div>
        </div>
        <div class="preview-label" id="preview-label">Camera off</div>
      </div>

      <div class="lobby-controls">
        <button class="ctrl" id="lobby-mic" aria-label="Toggle microphone"></button>
        <button class="ctrl" id="lobby-cam" aria-label="Toggle camera"></button>
      </div>

      <button class="join-btn" id="btn-join">Join now</button>
      <button class="join-btn secondary" id="btn-lobby-back">Back to visit</button>
      <p class="fineprint" id="lobby-status">Camera and microphone access will be requested now.</p>
    </div>
  </section>

  <section id="call" class="hidden">
    <header id="topbar">
      <button class="icon-btn" id="btn-back" aria-label="Leave meeting"></button>
      <div class="titles">
        <div class="title" id="call-title">Video consultation</div>
        <div class="sub" id="call-sub">HomeCare online consultation</div>
      </div>
      <div class="chip" id="call-code">---</div>
      <div class="timer"><span class="dot"></span><span id="timer">00:00</span></div>
    </header>

    <main id="stage">
      <div id="grid" data-count="1"></div>
      <div class="waiting" id="waiting"><span class="spinner"></span><span id="waiting-text">Waiting for the other participant…</span></div>
      <div id="roster" class="hidden"></div>
    </main>

    <footer id="controls">
      <button class="ctrl" id="btn-mic" aria-label="Toggle microphone"></button>
      <button class="ctrl" id="btn-cam" aria-label="Toggle camera"></button>
      <button class="ctrl people" id="btn-people" aria-label="Participants"></button>
      <button class="ctrl" id="btn-flip" aria-label="Switch camera"></button>
      <button class="ctrl end" id="btn-end" aria-label="Leave call"></button>
    </footer>

    <div id="fatal" class="hidden">
      <h3 id="fatal-title">Connection problem</h3>
      <p id="fatal-text"></p>
      <button class="join-btn" id="btn-retry" style="max-width:180px">Try again</button>
      <button class="join-btn secondary" id="btn-fatal-back" style="max-width:180px">Back to visit</button>
    </div>
  </section>

<script>window.__HOMECARE_MEETING__ = ${cfgJson};</script>
<script src="https://download.agora.io/sdk/release/AgoraRTC_N-4.23.4.js"></script>
<script>
(function () {
  'use strict';

  var cfg = window.__HOMECARE_MEETING__ || {};
  var ICON = {
    micOn: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 1 0-7 0v5.5A3.5 3.5 0 0 0 12 15Zm5.5-3.5a.9.9 0 0 0-1.8 0 3.7 3.7 0 0 1-7.4 0 .9.9 0 0 0-1.8 0 5.5 5.5 0 0 0 4.6 5.4V19h-2a.9.9 0 0 0 0 1.8h5.8a.9.9 0 0 0 0-1.8h-2v-2.1a5.5 5.5 0 0 0 4.6-5.4Z"/></svg>',
    micOff: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3.7 2.3 2.3 3.7l4.1 4.1V11a5.6 5.6 0 0 0 8.3 4.9l1.3 1.3A7.3 7.3 0 0 1 12 18.4v2.1h3.4a.9.9 0 0 1 0 1.8H8.6a.9.9 0 0 1 0-1.8H12v-2.1a7.2 7.2 0 0 1-5.1-2.6 7 7 0 0 1-1.6-4.6 .9.9 0 0 1 1.8 0 5.3 5.3 0 0 0 1.1 3.2l1.4 1.4V16h-.5a3.5 3.5 0 0 1-3.5-3.5V10L3.7 7.4 8.5 3.7 3.7 2.3Z"/><path d="M15.5 10.7V6a3.5 3.5 0 0 0-5.9-2.5L15.5 10.7Zm2.8-2.3a.9.9 0 0 1 .9.9 7 7 0 0 1-.9 3.4l-1.3-1.3a5.4 5.4 0 0 0 .4-2.1 .9.9 0 0 1 .9-.9Z"/></svg>',
    camOn: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 6h9A2.5 2.5 0 0 1 16 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 2 15.5v-7A2.5 2.5 0 0 1 4.5 6Zm13 3.6 3.6-2.4A1 1 0 0 1 22.6 8v8a1 1 0 0 1-1.5.8l-3.6-2.4v-4.8Z"/></svg>',
    camOff: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3.3 2.3 2 3.6l2.7 2.7A2.5 2.5 0 0 0 2 8.5v7A2.5 2.5 0 0 0 4.5 18h9a2.5 2.5 0 0 0 2.1-1.2l5.1 5.1 1.3-1.3L3.3 2.3Zm17.8 9.6v4.9c0 .3-.3.5-.6.3l-3.6-2.4v-1.6l1.7-1.7 2.5.5Z"/></svg>',
    people: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7.5 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM9 13.8c-3 0-6 1.5-6 3.4V20h12v-2.8c0-1.9-3-3.4-6-3.4Zm7.5.2c-.6 0-1.2.1-1.7.2 1 .9 1.7 2 1.7 3.1V20H22v-2.4c0-1.6-2.4-3.6-5.5-3.6Z"/></svg>',
    flip: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7.8 8.2a7 7 0 0 1 9.6-.6V6a.9.9 0 0 1 1.8 0v4.1a.9.9 0 0 1-.9.9h-4.1a.9.9 0 0 1 0-1.8h2A5.2 5.2 0 0 0 9 9.4L7.8 8.2Zm8.4 7.6a7 7 0 0 1-9.6.6V18a.9.9 0 0 1-1.8 0v-4.1a.9.9 0 0 1 .9-.9h4.1a.9.9 0 0 1 0 1.8h-2a5.2 5.2 0 0 0 7.2-.6l1.2 1.2Z"/></svg>',
    end: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-1.9 0-3.7.4-5.4 1.2-.6.3-1 .8-1.1 1.4l-.4 2.4a1.6 1.6 0 0 0 1.3 1.8l2.6.4c.6.1 1.2-.3 1.4-.9l.5-1.5c.7-.2 1.4-.3 2.1-.3s1.4.1 2.1.3l.5 1.5c.2.6.8 1 1.4.9l2.6-.4a1.6 1.6 0 0 0 1.3-1.8l-.4-2.4c-.1-.6-.5-1.1-1.1-1.4A14 14 0 0 0 12 9Z"/></svg>',
    back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20v-2Z"/></svg>',
    micSmall: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 1 0-7 0v5.5A3.5 3.5 0 0 0 12 15Zm5.5-3.5a.9.9 0 0 0-1.8 0 3.7 3.7 0 0 1-7.4 0 .9.9 0 0 0-1.8 0 5.5 5.5 0 0 0 4.6 5.4V19h-2a.9.9 0 0 0 0 1.8h5.8a.9.9 0 0 0 0-1.8h-2v-2.1a5.5 5.5 0 0 0 4.6-5.4Z"/></svg>',
    micSmallOff: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M4 3.3 2.7 4.6 6.8 8.7V11a5.2 5.2 0 0 0 7.6 4.6l1.2 1.2A7 7 0 0 1 12 17.4v2h3a.8.8 0 0 1 0 1.6H9a.8.8 0 0 1 0-1.6h1.4v-2A6.8 6.8 0 0 1 5.6 13a.85.85 0 0 1 1.7 0 5.1 5.1 0 0 0 1 3l1.2 1.2V16A3.4 3.4 0 0 1 8.5 13V11.3L4 6.8 4 3.3Z"/><path d="M15.5 10.1V6a3.5 3.5 0 0 0-5.6-2.8l5.6 6.9Z"/></svg>'
  };

  var state = { mic: true, cam: true, joined: false, leaving: false, prepared: false };
  var client = null;
  var micTrack = null;
  var camTrack = null;
  var tiles = {};
  var remoteAudio = {};
  var startedAt = 0;
  var timerHandle = null;
  var preparePromise = null;

  var $ = function (id) { return document.getElementById(id); };
  var grid = $('grid');

  function post(payload) {
    payload.source = 'homecare-meeting';
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, '*');
      }
    } catch (e) { /* bridge unavailable */ }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function initials(name) {
    var parts = String(name || '?').trim().split(/\\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function gradient(seed) {
    var hash = 0;
    var text = String(seed || 'x');
    for (var i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) % 360;
    return 'linear-gradient(135deg, hsl(' + hash + ',48%,42%), hsl(' + ((hash + 48) % 360) + ',52%,30%))';
  }

  function setStatus(text, isError) {
    var el = $('lobby-status');
    el.textContent = text;
    el.className = 'fineprint' + (isError ? ' error' : '');
  }

  function paintLobby() {
    $('lobby-title').textContent = cfg.meetingTitle || 'Video consultation';
    $('lobby-sub').textContent = 'Secure room ' + (cfg.meetingCode || '') + ' · ' + (cfg.peerName || 'your specialist') + ' is invited.';
    $('my-avatar').textContent = initials(cfg.displayName);
    $('my-avatar').style.background = gradient(cfg.displayName);
    $('my-tag').textContent = 'You · ' + (cfg.roleLabel || '');
    $('peer-avatar').textContent = initials(cfg.peerName);
    $('peer-avatar').style.background = gradient(cfg.peerName);
    $('peer-tag').textContent = (cfg.peerName || 'Guest') + ' · ' + (cfg.peerRoleLabel || '');
    $('preview-initials').textContent = initials(cfg.displayName);
    $('preview-initials').style.background = gradient(cfg.displayName);
    $('call-title').textContent = cfg.meetingTitle || 'Video consultation';
    $('call-code').textContent = cfg.meetingCode || '';
    $('waiting-text').textContent = 'Waiting for ' + (cfg.peerName || 'the other participant') + ' to join…';
    $('btn-back').innerHTML = ICON.back;
    $('btn-mic').innerHTML = ICON.micOn;
    $('btn-cam').innerHTML = ICON.camOn;
    $('btn-people').innerHTML = ICON.people + '<span class="badge" id="count">1</span>';
    $('btn-flip').innerHTML = ICON.flip;
    $('btn-end').innerHTML = ICON.end;
    $('lobby-mic').innerHTML = ICON.micOn;
    $('lobby-cam').innerHTML = ICON.camOn;
  }

  function setMicUi(on) {
    state.mic = on;
    $('lobby-mic').innerHTML = on ? ICON.micOn : ICON.micOff;
    $('lobby-mic').className = 'ctrl' + (on ? '' : ' off');
    $('btn-mic').innerHTML = on ? ICON.micOn : ICON.micOff;
    $('btn-mic').className = 'ctrl' + (on ? '' : ' off');
    var localMic = tiles[String(cfg.uid)] && tiles[String(cfg.uid)].mic;
    if (localMic) {
      localMic.innerHTML = on ? ICON.micSmall : ICON.micSmallOff;
      localMic.className = 'mic' + (on ? '' : ' muted');
    }
    renderRoster();
  }

  function setCamUi(on) {
    state.cam = on;
    $('lobby-cam').innerHTML = on ? ICON.camOn : ICON.camOff;
    $('lobby-cam').className = 'ctrl' + (on ? '' : ' off');
    $('btn-cam').innerHTML = on ? ICON.camOn : ICON.camOff;
    $('btn-cam').className = 'ctrl' + (on ? '' : ' off');
    $('preview-fallback').classList.toggle('hidden', on && !!camTrack);
    $('preview-label').textContent = on ? 'You (preview)' : 'Camera off';
    var localTile = tiles[String(cfg.uid)];
    if (localTile) localTile.avatar.classList.toggle('hidden', on);
  }

  async function prepareTracks() {
    if (preparePromise) return preparePromise;
    preparePromise = (async function () {
      if (!window.AgoraRTC) {
        setStatus('Video engine could not load. Check your internet connection and reopen the meeting.', true);
        return;
      }
      try {
        var tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        micTrack = tracks[0];
        camTrack = tracks[1];
        state.prepared = true;
        if (camTrack) camTrack.play('preview-player', { fit: 'cover' });
        setStatus('Camera and microphone ready. Tap "Join now" to enter the room.');
        setCamUi(state.cam);
        setMicUi(state.mic);
        if (!state.mic) micTrack.setEnabled(false);
      } catch (err) {
        var message = (err && (err.message || err.name)) || 'Permission denied';
        setStatus('No camera or microphone access (' + message + '). You can still join to view the consultation.', true);
        $('btn-join').textContent = 'Join without camera';
      }
    })();
    return preparePromise;
  }

  function tileKey(uid) { return String(uid); }

  function ensureTile(uid, name, isLocal, label) {
    var key = tileKey(uid);
    if (tiles[key]) return tiles[key];

    var root = document.createElement('div');
    root.className = 'tile' + (isLocal ? ' local' : '');
    root.innerHTML =
      '<div class="tile-video" data-video="' + key + '"></div>' +
      '<div class="tile-avatar" data-avatar="' + key + '">' + escapeHtml(initials(name)) + '</div>' +
      '<div class="tile-footer"><span class="pill"><span class="mic" data-mic="' + key + '">' + ICON.micSmall + '</span>' +
      '<span class="nm">' + escapeHtml(label || name) + '</span></span></div>';

    var avatar = root.querySelector('[data-avatar]');
    avatar.style.background = gradient(name);
    grid.appendChild(root);

    tiles[key] = {
      root: root,
      video: root.querySelector('[data-video]'),
      avatar: avatar,
      mic: root.querySelector('[data-mic]'),
      name: name
    };

    updateCount();
    return tiles[key];
  }

  function removeTile(uid) {
    var key = tileKey(uid);
    var tile = tiles[key];
    if (!tile) return;
    tile.video.innerHTML = '';
    if (tile.root.parentNode) tile.root.parentNode.removeChild(tile.root);
    delete tiles[key];
    updateCount();
    renderRoster();
  }

  function updateCount() {
    var count = Object.keys(tiles).length || 1;
    grid.setAttribute('data-count', String(Math.min(count, 9)));
    var badge = $('count');
    if (badge) badge.textContent = String(count);
    $('waiting').classList.toggle('hidden', count > 1);
    renderRoster();
  }

  function renderRoster() {
    var roster = $('roster');
    if (roster.classList.contains('hidden')) return;
    var rows = '<h4>In this meeting (' + (Object.keys(tiles).length || 1) + ')</h4>';
    Object.keys(tiles).forEach(function (key) {
      var isLocal = key === String(cfg.uid);
      var audioOn = isLocal ? state.mic : remoteAudio[key] !== false;
      var name = isLocal ? (cfg.displayName + ' (you)') : (cfg.peerName || tiles[key].name);
      var role = isLocal ? (cfg.roleLabel || '') : (cfg.peerRoleLabel || '');
      rows += '<div class="roster-row"><span class="dot' + (audioOn ? '' : ' off') + '"></span>' +
        '<span>' + escapeHtml(name) + '</span><span class="role">' + escapeHtml(role) + '</span></div>';
    });
    roster.innerHTML = rows;
  }

  function startTimer() {
    startedAt = Date.now();
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = setInterval(function () {
      var elapsed = Math.floor((Date.now() - startedAt) / 1000);
      var mins = Math.floor(elapsed / 60);
      var secs = elapsed % 60;
      if (mins >= 60) {
        var hrs = Math.floor(mins / 60);
        mins = mins % 60;
        $('timer').textContent = hrs + ':' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
      } else {
        $('timer').textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
      }
    }, 1000);
  }

  function showFatal(title, text) {
    $('fatal-title').textContent = title;
    $('fatal-text').textContent = text;
    $('fatal').classList.remove('hidden');
  }

  function registerHandlers() {
    client.on('user-joined', function (user) {
      ensureTile(user.uid, cfg.peerName || 'Participant', false);
    });

    client.on('user-published', async function (user, mediaType) {
      try {
        await client.subscribe(user, mediaType);
      } catch (err) {
        return;
      }
      var name = cfg.peerName || 'Participant';
      var tile = ensureTile(user.uid, name, false);
      if (mediaType === 'video' && user.videoTrack) {
        tile.avatar.classList.add('hidden');
        user.videoTrack.play(tile.video, { fit: 'cover' });
      }
      if (mediaType === 'audio' && user.audioTrack) {
        user.audioTrack.play();
        remoteAudio[tileKey(user.uid)] = true;
        tile.mic.innerHTML = ICON.micSmall;
        tile.mic.className = 'mic';
        renderRoster();
      }
      updateCount();
    });

    client.on('user-unpublished', function (user, mediaType) {
      var tile = tiles[tileKey(user.uid)];
      if (!tile) return;
      if (mediaType === 'video') {
        tile.video.innerHTML = '';
        tile.avatar.classList.remove('hidden');
      }
      if (mediaType === 'audio') {
        remoteAudio[tileKey(user.uid)] = false;
        tile.mic.innerHTML = ICON.micSmallOff;
        tile.mic.className = 'mic muted';
        renderRoster();
      }
    });

    client.on('user-left', function (user) { removeTile(user.uid); });

    if (client.enableAudioVolumeIndicator) {
      client.enableAudioVolumeIndicator();
      client.on('volume-indicator', function (volumes) {
        (volumes || []).forEach(function (item) {
          var tile = tiles[tileKey(item.uid)];
          if (!tile) return;
          tile.root.classList.toggle('speaking', item.level > 6);
        });
      });
    }

    client.on('connection-state-changed', function (current, previous) {
      if (current === 'DISCONNECTED' && state.joined) {
        showFatal('Connection lost', 'The video call was disconnected. Rejoin to continue the consultation.');
      }
    });
  }

  async function join() {
    if (state.joined) return;
    var joinBtn = $('btn-join');
    joinBtn.disabled = true;
    joinBtn.textContent = 'Connecting…';

    if (!window.AgoraRTC) {
      setStatus('Video engine could not load. Check your internet connection and try again.', true);
      joinBtn.disabled = false;
      joinBtn.textContent = 'Join now';
      return;
    }

    try {
      client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      registerHandlers();
      await client.join(cfg.appId, cfg.channel, cfg.token, cfg.uid);

      var toPublish = [micTrack, camTrack].filter(Boolean);
      if (toPublish.length) await client.publish(toPublish);

      state.joined = true;
      $('lobby').classList.add('hidden');
      $('call').classList.remove('hidden');

      var local = ensureTile(cfg.uid, cfg.displayName, true, cfg.displayName + ' (you)');
      if (camTrack) {
        if (state.cam) {
          camTrack.play(local.video, { fit: 'cover' });
          local.avatar.classList.add('hidden');
        } else {
          camTrack.stop();
        }
      }
      if (micTrack && !state.mic) micTrack.setEnabled(false);
      setMicUi(state.mic);
      setCamUi(state.cam);
      startTimer();
      updateCount();
      post({ type: 'joined', channel: cfg.channel, uid: cfg.uid });
    } catch (err) {
      var reason = (err && (err.message || err.reason || err.code)) || 'Unable to join the room';
      $('lobby').classList.add('hidden');
      $('call').classList.remove('hidden');
      showFatal('Could not join the consultation', String(reason) + ' — check the meeting credentials and your network, then retry.');
      joinBtn.disabled = false;
      joinBtn.textContent = 'Join now';
    }
  }

  async function leave() {
    if (state.leaving) return;
    state.leaving = true;
    if (timerHandle) clearInterval(timerHandle);
    try {
      if (client) {
        try { await client.unpublish(); } catch (e) { /* already unpublished */ }
        await client.leave();
      }
    } catch (e) { /* already left */ }
    [micTrack, camTrack].forEach(function (track) {
      if (!track) return;
      try { track.stop(); track.close(); } catch (e) { /* track gone */ }
    });
    post({ type: 'leave' });
  }

  function toggleMic() {
    if (!micTrack) {
      setMicUi(!state.mic);
      return;
    }
    setMicUi(!state.mic);
    micTrack.setEnabled(state.mic);
  }

  function toggleCam() {
    setCamUi(!state.cam);
    if (!camTrack) return;
    camTrack.setEnabled(state.cam);
    if (!state.cam) camTrack.stop();
    else if (state.joined) {
      var local = tiles[String(cfg.uid)];
      if (local) camTrack.play(local.video, { fit: 'cover' });
    }
  }

  async function flipCamera() {
    if (!camTrack || !camTrack.setEncoderConfiguration) return;
    try {
      var devices = await AgoraRTC.getCameras();
      if (!devices || devices.length < 2) return;
      var next = devices.find(function (device) {
        return device.deviceId !== camTrack.getMediaStreamTrack().getSettings().deviceId;
      });
      if (next) await camTrack.setDevice(next.deviceId);
    } catch (e) { /* single camera device */ }
  }

  function bind() {
    $('lobby-mic').addEventListener('click', toggleMic);
    $('lobby-cam').addEventListener('click', toggleCam);
    $('btn-mic').addEventListener('click', toggleMic);
    $('btn-cam').addEventListener('click', toggleCam);
    $('btn-flip').addEventListener('click', flipCamera);
    $('btn-people').addEventListener('click', function () {
      $('roster').classList.toggle('hidden');
      renderRoster();
    });
    $('btn-end').addEventListener('click', leave);
    $('btn-back').addEventListener('click', leave);
    $('btn-lobby-back').addEventListener('click', function () {
      [micTrack, camTrack].forEach(function (track) { if (track) { try { track.stop(); track.close(); } catch (e) {} } });
      post({ type: 'leave' });
    });
    $('btn-retry').addEventListener('click', function () {
      $('fatal').classList.add('hidden');
      if (state.joined) return;
      join();
    });
    $('btn-fatal-back').addEventListener('click', leave);
    $('btn-join').addEventListener('click', join);
  }

  paintLobby();
  bind();
  prepareTracks();
})();
</script>
</body>
</html>`;
}
