(() => {
  if (window.__JP_KR_DUAL_SUB_LOADED__) return;
  window.__JP_KR_DUAL_SUB_LOADED__ = true;

  const DEEPL_API_KEY = '';
  const DEEPL_ENDPOINT = 'https://api-free.deepl.com/v2/translate';
  const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
  
  const AVAILABLE_LANGS = ['en', 'ja', 'ko', 'zh'];
  
  const UI_STRINGS = {
    en: {
      title: 'Subtitle Control',
      displayLangs: 'Display Languages',
      showLang1: 'Show Language 1',
      showLang2: 'Show Language 2',
      style: 'Style',
      fontSize: 'Font size',
      lang1Color: 'Language 1 color',
      lang2Color: 'Language 2 color',
      externalSubs: 'External Subtitles',
      loadFile: 'Load .srt / .vtt',
      clearFile: 'Clear file',
      resetPos: 'Reset position',
      resetStyle: 'Reset style',
      uiLang: 'UI Language',
      targetLangs: 'Translation Languages',
      lang1: 'Language 1',
      lang2: 'Language 2',
      button: 'Subs'
    },
    ja: {
      title: '字幕コントロール',
      displayLangs: '表示言語',
      showLang1: '言語1を表示',
      showLang2: '言語2を表示',
      style: 'スタイル',
      fontSize: 'フォントサイズ',
      lang1Color: '言語1の色',
      lang2Color: '言語2の色',
      externalSubs: '外部字幕',
      loadFile: '.srt / .vtt ファイル',
      clearFile: 'ファイルをクリア',
      resetPos: '位置をリセット',
      resetStyle: 'スタイルをリセット',
      uiLang: 'UI言語',
      targetLangs: '翻訳言語',
      lang1: '言語1',
      lang2: '言語2',
      button: '字幕'
    },
    ko: {
      title: '자막 컨트롤',
      displayLangs: '표시 언어',
      showLang1: '언어 1 표시',
      showLang2: '언어 2 표시',
      style: '스타일',
      fontSize: '글꼴 크기',
      lang1Color: '언어 1 색상',
      lang2Color: '언어 2 색상',
      externalSubs: '외부 자막',
      loadFile: '.srt / .vtt 파일',
      clearFile: '파일 지우기',
      resetPos: '위치 초기화',
      resetStyle: '스타일 초기화',
      uiLang: 'UI 언어',
      targetLangs: '번역 언어',
      lang1: '언어 1',
      lang2: '언어 2',
      button: '자막'
    },
    zh: {
      title: '字幕控制',
      displayLangs: '显示语言',
      showLang1: '显示语言1',
      showLang2: '显示语言2',
      style: '样式',
      fontSize: '字体大小',
      lang1Color: '语言1颜色',
      lang2Color: '语言2颜色',
      externalSubs: '外部字幕',
      loadFile: '加载 .srt / .vtt',
      clearFile: '清除文件',
      resetPos: '重置位置',
      resetStyle: '重置样式',
      uiLang: 'UI语言',
      targetLangs: '翻译语言',
      lang1: '语言1',
      lang2: '语言2',
      button: '字幕'
    }
  };

  const LANG_NAMES = {
    en: { en: 'English', ja: '英語', ko: '영어', zh: '英语' },
    ja: { en: 'Japanese', ja: '日本語', ko: '일본어', zh: '日语' },
    ko: { en: 'Korean', ja: '韓国語', ko: '한국어', zh: '韩语' },
    zh: { en: 'Chinese', ja: '中国語', ko: '중국어', zh: '中文' }
  };

  const translationCache = new Map();
  let lastCaption = '';
  let lastCaptionTime = 0;
  let overlay = null;
  let settingsPanel = null;
  let settingsButton = null;
  let dragState = null;
  let lastRender = {
    sourceText: '',
    sourceLang: '',
    lang1Text: '',
    lang2Text: ''
  };
  let lastDisplayedKey = '';
  const youtubeTrack = {
    videoId: '',
    cues: [],
    lang: 'en'
  };
  const externalTrack = {
    cues: [],
    label: 'FILE',
    lang: 'auto'
  };
  let lastTranscriptFetch = 0;

  const STORAGE_KEYS = {
    position: 'jpkr_overlay_position',
    visibility: 'jpkr_visibility',
    uiLang: 'jpkr_ui_lang',
    targetLangs: 'jpkr_target_langs'
  };

  const defaultVisibility = {
    lang1: true,
    lang2: true
  };

  const defaultStyle = {
    fontSize: 18,
    textColor: '#ffffff',
    background: '#000000cc',
    lang1Color: '#56a1ff',
    lang2Color: '#ffb856',
    border: '#ffffff14'
  };

  const defaultTargetLangs = {
    lang1: 'ko',
    lang2: 'ja'
  };

  function loadUILang() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.uiLang);
      return raw && AVAILABLE_LANGS.includes(raw) ? raw : 'en';
    } catch (e) {
      return 'en';
    }
  }

  function saveUILang(lang) {
    try {
      localStorage.setItem(STORAGE_KEYS.uiLang, lang);
    } catch (e) {}
  }

  function loadTargetLangs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.targetLangs);
      return raw ? { ...defaultTargetLangs, ...JSON.parse(raw) } : { ...defaultTargetLangs };
    } catch (e) {
      return { ...defaultTargetLangs };
    }
  }

  function saveTargetLangs(langs) {
    try {
      localStorage.setItem(STORAGE_KEYS.targetLangs, JSON.stringify(langs));
    } catch (e) {}
  }

  let uiLang = loadUILang();
  let targetLangs = loadTargetLangs();

  function t(key) {
    return UI_STRINGS[uiLang]?.[key] || UI_STRINGS.en[key] || key;
  }

  function getLangName(langCode) {
    return LANG_NAMES[langCode]?.[uiLang] || langCode.toUpperCase();
  }

  function createOverlay() {
    if (overlay) return overlay;
    const container = document.createElement('div');
    container.id = 'jpkr-dual-container';
    container.innerHTML = `
      <div class="jpkr-netflix-box">
        <div class="jpkr-sub-line lang1" data-role="lang1"></div>
        <div class="jpkr-sub-line lang2" data-role="lang2"></div>
      </div>
    `;
    document.body.appendChild(container);
    overlay = container;
    return overlay;
  }

  function extractSingleCaptionText(selector) {
    if (!selector) return '';
    const nodes = document.querySelectorAll(selector);
    if (!nodes.length) return '';
    
    const allTexts = [];
    nodes.forEach((el) => {
      const t = (el.textContent || '').trim();
      if (t) allTexts.push(t);
    });
    
    if (allTexts.length === 0) return '';
    
    const fullText = allTexts.join(' ');
    return cleanDuplicates(fullText);
  }

  function cleanDuplicates(text) {
    if (!text) return '';
    
    let cleaned = text.replace(/\s+/g, ' ').trim();
    
    const words = cleaned.split(' ');
    if (words.length < 3) return cleaned;
    
    for (let patternLen = 1; patternLen <= Math.floor(words.length / 2); patternLen++) {
      const pattern = words.slice(0, patternLen).join(' ');
      let isRepeating = true;
      
      for (let i = patternLen; i < words.length; i += patternLen) {
        const chunk = words.slice(i, Math.min(i + patternLen, words.length)).join(' ');
        if (i + patternLen <= words.length && chunk !== pattern) {
          isRepeating = false;
          break;
        }
      }
      
      if (isRepeating && words.length >= patternLen * 2) {
        return pattern;
      }
    }
    
    const sentences = cleaned.split(/(?<=[。．\.！？!?\n])\s*/);
    const uniqueSentences = [];
    const seen = new Set();
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;
      
      const normalized = trimmed.toLowerCase().replace(/[^\w\s\u3040-\u30ff\u4e00-\u9faf\uac00-\ud7af]/g, '');
      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniqueSentences.push(trimmed);
      }
    }
    
    return uniqueSentences.join(' ');
  }

  function isYouTube() {
    return /\.youtube\.com$/.test(location.hostname);
  }

  function isNetflix() {
    return /netflix\.com$/.test(location.hostname);
  }

  function getYouTubeVideoId() {
    const params = new URLSearchParams(location.search);
    const vParam = params.get('v');
    if (vParam) return vParam;
    const shorts = location.pathname.match(/\/shorts\/([^/?#]+)/);
    if (shorts) return shorts[1];
    const embed = location.pathname.match(/\/embed\/([^/?#]+)/);
    if (embed) return embed[1];
    return '';
  }

  function parseTimedTextEvents(events) {
    if (!Array.isArray(events)) return [];
    return events
      .map((ev) => {
        const text = Array.isArray(ev.segs) ? ev.segs.map((s) => s.utf8 || '').join('').trim() : '';
        const start = typeof ev.tStartMs === 'number' ? ev.tStartMs / 1000 : null;
        const dur = typeof ev.dDurationMs === 'number' ? ev.dDurationMs / 1000 : null;
        if (!text || start === null || dur === null) return null;
        return {
          start,
          end: start + dur,
          text: cleanDuplicates(text)
        };
      })
      .filter(Boolean);
  }

  async function fetchYouTubeTimedText(videoId) {
    const candidates = [
      { lang: 'en', kind: '' },
      { lang: 'en', kind: 'asr' },
      { lang: 'en-US', kind: '' },
      { lang: 'ja', kind: '' },
      { lang: 'ja', kind: 'asr' },
      { lang: 'ko', kind: '' },
      { lang: 'ko', kind: 'asr' },
      { lang: 'zh', kind: '' },
      { lang: 'zh-Hans', kind: '' },
      { lang: 'zh-Hant', kind: '' }
    ];

    for (const cand of candidates) {
      const params = new URLSearchParams({
        lang: cand.lang,
        v: videoId,
        fmt: 'json3'
      });
      if (cand.kind) params.set('kind', cand.kind);
      const url = `https://www.youtube.com/api/timedtext?${params.toString()}`;
      try {
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) continue;
        const data = await res.json();
        const cues = parseTimedTextEvents(data?.events || []);
        if (cues.length) {
          return { cues, lang: cand.lang };
        }
      } catch (e) {
      }
    }

    return { cues: [], lang: '' };
  }

  async function maybeLoadYouTubeTranscript() {
    if (!isYouTube()) return;
    const videoId = getYouTubeVideoId();
    if (!videoId) return;
    if (youtubeTrack.videoId !== videoId) {
      youtubeTrack.videoId = videoId;
      youtubeTrack.cues = [];
    }
    const now = Date.now();
    if (youtubeTrack.videoId === videoId && youtubeTrack.cues.length) return;
    if (youtubeTrack.videoId === videoId && now - lastTranscriptFetch < 10000) return;
    lastTranscriptFetch = now;
    const { cues, lang } = await fetchYouTubeTimedText(videoId);
    youtubeTrack.videoId = videoId;
    youtubeTrack.cues = cues;
    youtubeTrack.lang = lang || 'en';
  }

  function getActiveCueText(cues, currentTime) {
    if (!Array.isArray(cues) || !cues.length) return '';
    if (typeof currentTime !== 'number' || Number.isNaN(currentTime)) return '';
    for (let i = cues.length - 1; i >= 0; i -= 1) {
      const cue = cues[i];
      if (currentTime >= cue.start && currentTime <= cue.end + 0.35) {
        return cue.text;
      }
    }
    return '';
  }

  function readYouTubeCaption() {
    const selectors = [
      '.ytp-caption-segment'
    ].join(',');
    return extractSingleCaptionText(selectors);
  }

  function readNetflixCaption() {
    const selectors = [
      '.player-timedtext-text-container span'
    ].join(',');
    return extractSingleCaptionText(selectors);
  }

  function getCurrentCaption() {
    const video = document.querySelector('video');
    const time = video ? video.currentTime : null;

    const externalText = getActiveCueText(externalTrack.cues, time);
    if (externalText) {
      const normalized = cleanDuplicates(externalText);
      if (!shouldSkipCaption(normalized)) return { text: normalized, source: 'ext' };
    }

    if (isYouTube()) {
      const ytText = getActiveCueText(youtubeTrack.cues, time);
      if (ytText) {
        const normalized = cleanDuplicates(ytText);
        if (!shouldSkipCaption(normalized)) return { text: normalized, source: 'yt' };
      }
    }

    const domRaw = readYouTubeCaption() || readNetflixCaption() || '';
    const normalized = cleanDuplicates(domRaw);
    if (shouldSkipCaption(normalized)) return { text: '', source: '' };
    const source = isNetflix() ? 'nf' : domRaw ? 'dom' : '';
    return { text: normalized, source };
  }

  function autoEnableCaptions() {
    const ytBtn =
      document.querySelector('.ytp-subtitles-button.ytp-button') ||
      document.querySelector('[aria-keyshortcuts="c"]');
    if (ytBtn && ytBtn.getAttribute('aria-pressed') !== 'true') {
      ytBtn.click();
    }

    const nfBtn =
      document.querySelector('[data-uia="player-subs-button"]') ||
      document.querySelector('.button-nfplayerSubtitles');
    if (nfBtn && nfBtn.getAttribute('aria-pressed') !== 'true') {
      nfBtn.click();
    }
  }

  function loadPosition() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.position);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function savePosition(pos) {
    try {
      localStorage.setItem(STORAGE_KEYS.position, JSON.stringify(pos));
    } catch (e) {}
  }

  function loadVisibility() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.visibility);
      return raw ? { ...defaultVisibility, ...JSON.parse(raw) } : { ...defaultVisibility };
    } catch (e) {
      return { ...defaultVisibility };
    }
  }

  function saveVisibility(vis) {
    try {
      localStorage.setItem(STORAGE_KEYS.visibility, JSON.stringify(vis));
    } catch (e) {}
  }

  function loadStyleSettings() {
    try {
      const raw = localStorage.getItem('jpkr_style');
      return raw ? { ...defaultStyle, ...JSON.parse(raw) } : { ...defaultStyle };
    } catch (e) {
      return { ...defaultStyle };
    }
  }

  function saveStyleSettings(style) {
    try {
      localStorage.setItem('jpkr_style', JSON.stringify(style));
    } catch (e) {}
  }

  async function translateWithGoogle(text, target) {
    const googleLang = target === 'zh' ? 'zh-CN' : target;
    const url = `${TRANSLATE_ENDPOINT}?client=gtx&dt=t&sl=auto&tl=${googleLang}&q=${encodeURIComponent(
      text
    )}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      const translated = Array.isArray(data?.[0])
        ? data[0]
            .map((chunk) => (Array.isArray(chunk) ? chunk[0] : ''))
            .join('')
            .trim()
        : '';
      const detectedSource = data?.[2] || 'auto';
      return { translated: cleanDuplicates(translated), detectedSource };
    } catch (error) {
      return { translated: '', detectedSource: 'auto' };
    }
  }

  async function translateWithDeepL(text, target) {
    const deeplLang = target === 'zh' ? 'ZH' : target.toUpperCase();
    const body = new URLSearchParams({
      auth_key: DEEPL_API_KEY.trim(),
      text,
      target_lang: deeplLang
    });

    try {
      const res = await fetch(DEEPL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });
      const data = await res.json();
      const translation = data?.translations?.[0];
      const translated = translation?.text?.trim() || '';
      const detectedSource = translation?.detected_source_language?.toLowerCase() || 'auto';
      return { translated: cleanDuplicates(translated), detectedSource };
    } catch (error) {
      return { translated: '', detectedSource: 'auto' };
    }
  }

  async function translateText(text, target) {
    const provider = DEEPL_API_KEY.trim() ? 'deepl' : 'google';
    const cacheKey = `${provider}:${target}:${text}`;
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey);
    }

    const primary =
      provider === 'deepl'
        ? await translateWithDeepL(text, target)
        : await translateWithGoogle(text, target);
    if (primary.translated) {
      translationCache.set(cacheKey, primary);
      return primary;
    }

    if (provider === 'deepl') {
      const fallback = await translateWithGoogle(text, target);
      translationCache.set(`google:${target}:${text}`, fallback);
      return fallback;
    }

    return primary;
  }

  function shouldSkipCaption(text) {
    if (!text) return true;
    if (text.length < 2) return true;
    const nonSpeechPatterns = [
      /^\[.*(music|musique|음악|音楽|bgm|♪|♫|applause|clap|拍手).*\]$/i,
      /^\(.*(music|음악|音楽|bgm|♪|♫|applause|clap|拍手).*\)$/i,
      /^♪+$/i,
      /^♬+$/i
    ];
    if (nonSpeechPatterns.some((re) => re.test(text))) return true;
    const uniqueTokens = new Set(text.split(' '));
    if (uniqueTokens.size === 1 && text.split(' ').length > 3) return true;
    const letters = text.replace(/[^A-Za-z\u3040-\u30ff\u4e00-\u9faf\uac00-\ud7af0-9]/g, '');
    return letters.length < 2;
  }

  function parseTimestamp(str) {
    const match = str.match(/(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})/);
    if (!match) return null;
    const [_, h, m, s, ms] = match;
    return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
  }

  function parseCueBlock(lines) {
    if (!lines.length) return null;
    let timeLine = lines[0];
    let textLines = lines.slice(1);
    if (/^\d+$/.test(lines[0]) && lines[1]) {
      timeLine = lines[1];
      textLines = lines.slice(2);
    }
    const [startStr, endStr] = timeLine.split('-->').map((t) => t.trim());
    const start = parseTimestamp(startStr);
    const end = parseTimestamp(endStr || '');
    if (start === null || end === null) return null;
    const text = textLines.join(' ').trim();
    if (!text) return null;
    return { start, end, text };
  }

  function parseSrt(content) {
    const blocks = content
      .replace(/\r\n/g, '\n')
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean);
    const cues = [];
    for (const block of blocks) {
      const lines = block.split('\n');
      const cue = parseCueBlock(lines);
      if (cue) cues.push(cue);
    }
    return cues;
  }

  function parseVtt(content) {
    const cleaned = content.replace(/^WEBVTT[^\n]*\n/i, '').trim();
    return parseSrt(cleaned);
  }

  function parseSubtitleFile(text) {
    if (!text) return [];
    const trimmed = text.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('WEBVTT')) return parseVtt(trimmed);
    return parseSrt(trimmed);
  }

  function setExternalTrackFromText(text, label) {
    const cues = parseSubtitleFile(text);
    externalTrack.cues = cues;
    externalTrack.label = label || 'FILE';
    externalTrack.lang = 'auto';
  }

  function updateOverlay({ sourceText, sourceLang, lang1Text, lang2Text }) {
    const root = createOverlay();
    const lang1Line = root.querySelector('[data-role="lang1"]');
    const lang2Line = root.querySelector('[data-role="lang2"]');
    const netflixBox = root.querySelector('.jpkr-netflix-box');

    const cleanLang1 = cleanDuplicates(lang1Text);
    const cleanLang2 = cleanDuplicates(lang2Text);

    const showLang1 = visibility.lang1 && cleanLang1;
    const showLang2 = visibility.lang2 && cleanLang2;

    if (lang1Line) {
      lang1Line.textContent = cleanLang1 || '';
      lang1Line.style.display = showLang1 ? 'block' : 'none';
    }
    
    if (lang2Line) {
      lang2Line.textContent = cleanLang2 || '';
      lang2Line.style.display = showLang2 ? 'block' : 'none';
    }

    const hasContent = showLang1 || showLang2;
    const newKey = `${cleanLang1}||${cleanLang2}`;
    
    if (newKey === lastDisplayedKey) return;
    lastDisplayedKey = newKey;
    
    if (netflixBox) {
      netflixBox.style.display = hasContent ? 'block' : 'none';
    }
    root.style.display = hasContent ? 'flex' : 'none';
    lastRender = { sourceText, sourceLang, lang1Text: cleanLang1, lang2Text: cleanLang2 };
  }

  async function handleCaption(text, sourceLabel) {
    const cleanedSource = cleanDuplicates(text);
    
    const [result1, result2] = await Promise.all([
      translateText(cleanedSource, targetLangs.lang1),
      translateText(cleanedSource, targetLangs.lang2)
    ]);
    
    const sourceLang = sourceLabel || result1?.detectedSource || result2?.detectedSource || 'auto';
    const lang1Text = result1?.translated || '';
    const lang2Text = result2?.translated || '';

    updateOverlay({
      sourceText: cleanedSource,
      sourceLang,
      lang1Text,
      lang2Text
    });
  }

  const visibility = loadVisibility();
  let currentStyle = loadStyleSettings();

  function applyPosition() {
    const pos = loadPosition();
    const root = createOverlay();
    if (pos && typeof pos.left === 'number' && typeof pos.top === 'number') {
      root.style.left = `${pos.left}px`;
      root.style.top = `${pos.top}px`;
      root.style.bottom = 'auto';
      root.style.transform = 'translate(0, 0)';
    } else {
      root.style.left = '50%';
      root.style.top = 'auto';
      root.style.bottom = '10%';
      root.style.transform = 'translateX(-50%)';
    }
  }

  function startDrag(e) {
    const root = createOverlay();
    dragState = {
      startX: e.clientX,
      startY: e.clientY,
      origLeft: root.offsetLeft,
      origTop: root.offsetTop
    };
    root.classList.add('dragging');
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
  }

  function onDrag(e) {
    if (!dragState) return;
    const root = createOverlay();
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const newLeft = dragState.origLeft + dx;
    const newTop = dragState.origTop + dy;
    root.style.left = `${newLeft}px`;
    root.style.top = `${newTop}px`;
    root.style.bottom = 'auto';
    root.style.transform = 'translate(0, 0)';
  }

  function endDrag() {
    const root = createOverlay();
    root.classList.remove('dragging');
    const pos = { left: root.offsetLeft, top: root.offsetTop };
    savePosition(pos);
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    dragState = null;
  }

  function attachDrag() {
    const root = createOverlay();
    root.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      startDrag(e);
    });
  }

  function toggleSidebar() {
    const panel = createSettingsPanel();
    panel.classList.toggle('open');
  }

  function rebuildSettingsPanel() {
    if (settingsPanel) {
      settingsPanel.remove();
      settingsPanel = null;
    }
    createSettingsPanel();
  }

  function createSettingsPanel() {
    if (settingsPanel) return settingsPanel;
    const panel = document.createElement('div');
    panel.id = 'jpkr-settings-panel';
    const styleSettings = loadStyleSettings();
    currentStyle = { ...styleSettings };
    
    const langOptions = AVAILABLE_LANGS.map(code => 
      `<option value="${code}" ${uiLang === code ? 'selected' : ''}>${getLangName(code)}</option>`
    ).join('');
    
    const lang1Options = AVAILABLE_LANGS.map(code => 
      `<option value="${code}" ${targetLangs.lang1 === code ? 'selected' : ''}>${getLangName(code)}</option>`
    ).join('');
    
    const lang2Options = AVAILABLE_LANGS.map(code => 
      `<option value="${code}" ${targetLangs.lang2 === code ? 'selected' : ''}>${getLangName(code)}</option>`
    ).join('');

    panel.innerHTML = `
      <div class="jpkr-settings-header">
        <div class="jpkr-title">${t('title')}</div>
        <select data-role="ui-lang" class="jpkr-select-small">${langOptions}</select>
      </div>
      <div class="jpkr-section">
        <div class="jpkr-label">${t('targetLangs')}</div>
        <div class="jpkr-control">
          <label>${t('lang1')}</label>
          <select data-role="target-lang1" class="jpkr-select">${lang1Options}</select>
        </div>
        <div class="jpkr-control">
          <label>${t('lang2')}</label>
          <select data-role="target-lang2" class="jpkr-select">${lang2Options}</select>
        </div>
      </div>
      <div class="jpkr-section">
        <div class="jpkr-label">${t('displayLangs')}</div>
        <label class="jpkr-toggle"><input type="checkbox" data-role="show-lang1" ${visibility.lang1 ? 'checked' : ''}>${t('showLang1')}</label>
        <label class="jpkr-toggle"><input type="checkbox" data-role="show-lang2" ${visibility.lang2 ? 'checked' : ''}>${t('showLang2')}</label>
      </div>
      <div class="jpkr-section">
        <div class="jpkr-label">${t('style')}</div>
        <div class="jpkr-control">
          <label>${t('fontSize')}</label>
          <div class="jpkr-range">
            <input type="range" min="12" max="32" value="${styleSettings.fontSize}" data-role="font-size">
            <span data-role="font-size-value">${styleSettings.fontSize}px</span>
          </div>
        </div>
        <div class="jpkr-control">
          <label>${t('lang1Color')}</label>
          <input type="color" value="${styleSettings.lang1Color}" data-role="lang1-color">
        </div>
        <div class="jpkr-control">
          <label>${t('lang2Color')}</label>
          <input type="color" value="${styleSettings.lang2Color}" data-role="lang2-color">
        </div>
      </div>
      <div class="jpkr-section">
        <div class="jpkr-label">${t('externalSubs')}</div>
        <div class="jpkr-control">
          <label for="jpkr-subfile">${t('loadFile')}</label>
          <input type="file" id="jpkr-subfile" data-role="subtitle-file" accept=".srt,.vtt,text/vtt,text/plain">
        </div>
        <div class="jpkr-control">
          <button data-role="clear-subfile">${t('clearFile')}</button>
        </div>
      </div>
      <div class="jpkr-actions">
        <button data-role="reset-pos">${t('resetPos')}</button>
        <button data-role="reset-style">${t('resetStyle')}</button>
      </div>
    `;
    document.body.appendChild(panel);
    
    panel.querySelector('[data-role="ui-lang"]').addEventListener('change', (e) => {
      uiLang = e.target.value;
      saveUILang(uiLang);
      if (settingsButton) {
        settingsButton.textContent = t('button');
      }
      rebuildSettingsPanel();
      const newPanel = createSettingsPanel();
      newPanel.classList.add('open');
    });
    
    panel.querySelector('[data-role="target-lang1"]').addEventListener('change', (e) => {
      targetLangs.lang1 = e.target.value;
      saveTargetLangs(targetLangs);
      translationCache.clear();
      lastCaption = '';
    });
    
    panel.querySelector('[data-role="target-lang2"]').addEventListener('change', (e) => {
      targetLangs.lang2 = e.target.value;
      saveTargetLangs(targetLangs);
      translationCache.clear();
      lastCaption = '';
    });
    
    panel.querySelector('[data-role="show-lang1"]').addEventListener('change', (e) => {
      visibility.lang1 = e.target.checked;
      saveVisibility(visibility);
      updateOverlay(lastRender);
    });
    panel.querySelector('[data-role="show-lang2"]').addEventListener('change', (e) => {
      visibility.lang2 = e.target.checked;
      saveVisibility(visibility);
      updateOverlay(lastRender);
    });
    panel.querySelector('[data-role="reset-pos"]').addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEYS.position);
      applyPosition();
    });
    panel.querySelector('[data-role="reset-style"]').addEventListener('click', () => {
      currentStyle = { ...defaultStyle };
      saveStyleSettings(currentStyle);
      applyStyle(currentStyle);
      refreshStyleControls(panel, currentStyle);
      updateOverlay(lastRender);
    });
    panel.querySelector('[data-role="font-size"]').addEventListener('input', (e) => {
      currentStyle = { ...loadStyleSettings(), fontSize: Number(e.target.value) };
      saveStyleSettings(currentStyle);
      applyStyle(currentStyle);
      panel.querySelector('[data-role="font-size-value"]').textContent = `${currentStyle.fontSize}px`;
      updateOverlay(lastRender);
    });
    panel.querySelector('[data-role="lang1-color"]').addEventListener('input', (e) => {
      currentStyle = { ...loadStyleSettings(), lang1Color: e.target.value };
      saveStyleSettings(currentStyle);
      applyStyle(currentStyle);
      updateOverlay(lastRender);
    });
    panel.querySelector('[data-role="lang2-color"]').addEventListener('input', (e) => {
      currentStyle = { ...loadStyleSettings(), lang2Color: e.target.value };
      saveStyleSettings(currentStyle);
      applyStyle(currentStyle);
      updateOverlay(lastRender);
    });
    panel.querySelector('[data-role="subtitle-file"]').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result ? String(evt.target.result) : '';
        setExternalTrackFromText(text, file.name || 'FILE');
        lastCaption = '';
      };
      reader.readAsText(file);
    });
    panel.querySelector('[data-role="clear-subfile"]').addEventListener('click', () => {
      externalTrack.cues = [];
      externalTrack.label = 'FILE';
      externalTrack.lang = 'auto';
      lastCaption = '';
    });
    settingsPanel = panel;
    return panel;
  }

  function refreshStyleControls(panel, styleSettings) {
    panel.querySelector('[data-role="font-size"]').value = styleSettings.fontSize;
    panel.querySelector('[data-role="font-size-value"]').textContent = `${styleSettings.fontSize}px`;
    panel.querySelector('[data-role="lang1-color"]').value = styleSettings.lang1Color;
    panel.querySelector('[data-role="lang2-color"]').value = styleSettings.lang2Color;
  }

  function applyStyle(styleSettings) {
    const root = createOverlay();
    root.style.setProperty('--jpkr-font-size', `${styleSettings.fontSize}px`);
    root.style.setProperty('--jpkr-text-color', styleSettings.textColor);
    root.style.setProperty('--jpkr-bg-color', styleSettings.background);
    root.style.setProperty('--jpkr-lang1-color', styleSettings.lang1Color);
    root.style.setProperty('--jpkr-lang2-color', styleSettings.lang2Color);
    root.style.setProperty('--jpkr-border-color', styleSettings.border);
  }

  function createSettingsButton() {
    if (settingsButton) return settingsButton;
    const btn = document.createElement('button');
    btn.id = 'jpkr-settings-toggle';
    btn.textContent = t('button');
    btn.addEventListener('click', toggleSidebar);
    document.body.appendChild(btn);
    settingsButton = btn;
    return btn;
  }

  function startCaptionWatcher() {
    createOverlay();
    createSettingsButton();
    createSettingsPanel();
    applyStyle(currentStyle);
    applyPosition();
    attachDrag();
    
    setInterval(() => {
      autoEnableCaptions();
      if (isYouTube()) {
        maybeLoadYouTubeTranscript();
      }

      const { text: caption = '', source: sourceLabel = '' } = getCurrentCaption() || {
        text: '',
        source: ''
      };
      
      if (!caption) {
        const now = Date.now();
        if (now - lastCaptionTime > 2000) {
          updateOverlay({ sourceText: '', sourceLang: '', lang1Text: '', lang2Text: '' });
          lastCaption = '';
        }
        return;
      }

      lastCaptionTime = Date.now();
      const captionKey = `${sourceLabel}:${caption}`;
      if (captionKey === lastCaption) return;
      lastCaption = captionKey;
      handleCaption(caption, sourceLabel);
    }, 150);
  }

  startCaptionWatcher();
})();
