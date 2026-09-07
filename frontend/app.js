/**
 * 极光影院 - 智能聚合搜索与解析播放
 */

// 状态管理
const state = {
  currentPlatform: 'all',
  currentRoute: 'https://jx.xmflv.com/?url=',
  currentVideo: null,
  currentEpisodeIndex: 0,
  currentEpisodeUrl: '',
  history: []
};

// DOM 元素引用
const elements = {
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  platformTabs: document.getElementById('platformTabs'),
  resultsGrid: document.getElementById('resultsGrid'),
  loadingSkeleton: document.getElementById('loadingSkeleton'),
  emptyState: document.getElementById('emptyState'),
  resultsHeading: document.getElementById('resultsHeading'),
  resultsCount: document.getElementById('resultsCount'),
  
  // 播放器组件
  playerSection: document.getElementById('playerSection'),
  videoIframe: document.getElementById('videoIframe'),
  playerVideoTitle: document.getElementById('playerVideoTitle'),
  playerPlatformBadge: document.getElementById('playerPlatformBadge'),
  refreshPlayerBtn: document.getElementById('refreshPlayerBtn'),
  openOriginalBtn: document.getElementById('openOriginalBtn'),
  closePlayerBtn: document.getElementById('closePlayerBtn'),
  
  // 选集组件
  episodesSection: document.getElementById('episodesSection'),
  episodesTotalBadge: document.getElementById('episodesTotalBadge'),
  currentEpisodeStatus: document.getElementById('currentEpisodeStatus'),
  episodesGrid: document.getElementById('episodesGrid'),
  toastNotification: document.getElementById('toastNotification'),
  
  // 直连与线路
  routeSelect: document.getElementById('routeSelect'),
  directUrlInput: document.getElementById('directUrlInput'),
  directPlayBtn: document.getElementById('directPlayBtn'),
  
  // 历史记录抽屉
  toggleHistoryBtn: document.getElementById('toggleHistoryBtn'),
  historyDrawer: document.getElementById('historyDrawer'),
  drawerOverlay: document.getElementById('drawerOverlay'),
  closeDrawerBtn: document.getElementById('closeDrawerBtn'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  historyList: document.getElementById('historyList')
};

// 初始化
function init() {
  loadHistory();
  bindEvents();
  
  // 默认填充热门推荐或聚焦搜索框
  elements.searchInput.focus();
}

// 绑定交互事件
function bindEvents() {
  // 平台标签切换
  elements.platformTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.currentPlatform = btn.dataset.platform;
    
    // 如果当前搜索框有词，切换平台时自动重搜
    if (elements.searchInput.value.trim()) {
      executeSearch();
    }
  });

  // 搜索发起
  elements.searchBtn.addEventListener('click', executeSearch);
  elements.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      executeSearch();
    }
  });

  // 搜索输入框清理按键
  elements.searchInput.addEventListener('input', () => {
    if (elements.searchInput.value.trim()) {
      elements.clearSearchBtn.classList.remove('hidden');
    } else {
      elements.clearSearchBtn.classList.add('hidden');
    }
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.clearSearchBtn.classList.add('hidden');
    elements.searchInput.focus();
  });

  // 热门快捷关键词点击
  document.querySelectorAll('.hot-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      elements.searchInput.value = tag.innerText;
      elements.clearSearchBtn.classList.remove('hidden');
      executeSearch();
    });
  });

  // 线路切换
  elements.routeSelect.addEventListener('change', (e) => {
    state.currentRoute = e.target.value;
    const playTarget = state.currentEpisodeUrl || (state.currentVideo ? state.currentVideo.url : '');
    if (playTarget && elements.videoIframe.src) {
      elements.videoIframe.src = state.currentRoute + encodeURIComponent(playTarget);
    }
  });

  // 直接解析播放
  elements.directPlayBtn.addEventListener('click', handleDirectPlay);
  elements.directUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleDirectPlay();
    }
  });

  // 播放器控制
  elements.closePlayerBtn.addEventListener('click', () => {
    elements.playerSection.classList.add('hidden');
    elements.videoIframe.src = '';
    state.currentVideo = null;
    state.currentEpisodeUrl = '';
  });

  elements.refreshPlayerBtn.addEventListener('click', () => {
    const playTarget = state.currentEpisodeUrl || (state.currentVideo ? state.currentVideo.url : '');
    if (playTarget) {
      elements.videoIframe.src = state.currentRoute + encodeURIComponent(playTarget);
    }
  });

  elements.openOriginalBtn.addEventListener('click', () => {
    const playTarget = state.currentEpisodeUrl || (state.currentVideo ? state.currentVideo.url : '');
    if (playTarget) {
      window.open(playTarget, '_blank');
    }
  });

  // 历史记录抽屉
  elements.toggleHistoryBtn.addEventListener('click', () => {
    renderHistoryDrawer();
    elements.historyDrawer.classList.add('open');
  });

  elements.closeDrawerBtn.addEventListener('click', () => {
    elements.historyDrawer.classList.remove('open');
  });

  elements.drawerOverlay.addEventListener('click', () => {
    elements.historyDrawer.classList.remove('open');
  });

  elements.clearHistoryBtn.addEventListener('click', () => {
    if (confirm('确定要清空所有观看历史吗？')) {
      state.history = [];
      localStorage.removeItem('movie_watch_history');
      renderHistoryDrawer();
    }
  });
}

// 执行搜索
async function executeSearch() {
  const query = elements.searchInput.value.trim();
  if (!query) {
    alert('请输入想要搜索的影片名称！');
    elements.searchInput.focus();
    return;
  }

  // UI 进入加载状态
  setLoading(true);
  elements.emptyState.classList.add('hidden');
  elements.resultsGrid.innerHTML = '';
  elements.resultsHeading.innerText = `“${query}” 的搜索结果`;
  elements.resultsCount.innerText = '正在全网检索中...';

  try {
    const url = `/api/search?q=${encodeURIComponent(query)}&platform=${state.currentPlatform}`;
    const resp = await fetch(url);
    const result = await resp.json();

    if (result.code === 200 && result.data && result.data.length > 0) {
      renderResults(result.data);
      elements.resultsCount.innerText = `找到 ${result.data.length} 条相关资源`;
    } else {
      elements.resultsGrid.innerHTML = '';
      elements.emptyState.classList.remove('hidden');
      elements.emptyState.innerHTML = `
        <div class="empty-icon">🔍</div>
        <h3>未找到相关资源</h3>
        <p>可以尝试更换关键词、检查是否有错别字，或在上方切换至“全网聚合”重新检索。</p>
      `;
      elements.resultsCount.innerText = '0 条结果';
    }
  } catch (err) {
    console.error('Search error:', err);
    elements.resultsCount.innerText = '搜索出错';
    alert('搜索服务连接失败，请确认后台服务已启动！');
  } finally {
    setLoading(false);
  }
}

// 渲染搜索卡片
function renderResults(items) {
  elements.resultsGrid.innerHTML = '';

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'movie-card';

    // 来源徽章与样式
    const platformClass = getPlatformBadgeClass(item.platform);
    const platformName = item.platform_name || getPlatformName(item.platform);

    // 封面图处理（带缺省图容错）
    const coverUrl = item.cover || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';

    card.innerHTML = `
      <div class="poster-box">
        <span class="platform-badge ${platformClass}">${platformName}</span>
        <img class="poster-img" src="${coverUrl}" alt="${item.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60'" />
        <div class="card-play-overlay">
          <div class="play-circle">▶</div>
        </div>
        ${item.category ? `<span class="status-badge">${item.category}</span>` : ''}
      </div>
      <div class="card-info">
        <h4 class="card-title" title="${item.title}">${item.title}</h4>
        <p class="card-subtext" title="${item.desc || ''}">${item.desc || '暂无简介'}</p>
        <div class="card-footer">
          <span>${item.year ? item.year + ' 年' : '高清直连'}</span>
          <span style="color: var(--accent-cyan)">点击立即播放 ❯</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      playVideo(item);
    });

    elements.resultsGrid.appendChild(card);
  });
}

// 全局 Toast 提示
let toastTimer = null;
function showToast(message) {
  if (!elements.toastNotification) return;
  elements.toastNotification.innerText = message;
  elements.toastNotification.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    elements.toastNotification.classList.add('hidden');
  }, 2800);
}

// 查找匹配的观看历史记录
function findInHistory(video) {
  if (!video) return null;
  const vTitle = (video.title || '').trim();
  return state.history.find(h => {
    if (vTitle && h.title && h.title.trim() === vTitle) return true;
    if (video.url && h.url && video.url === h.url) return true;
    const m1 = (video.url || '').match(/\/cover\/([a-zA-Z0-9]+)/);
    const m2 = (h.url || '').match(/\/cover\/([a-zA-Z0-9]+)/);
    if (m1 && m2 && m1[1] === m2[1]) return true;
    return false;
  }) || null;
}

// 保存/更新观看历史
function saveWatchHistory(item) {
  // 根据影片名与地址去重
  state.history = state.history.filter(h => {
    if (item.title && h.title && item.title.trim() === h.title.trim()) return false;
    if (item.url && h.url && item.url === h.url) return false;
    const m1 = (item.url || '').match(/\/cover\/([a-zA-Z0-9]+)/);
    const m2 = (h.url || '').match(/\/cover\/([a-zA-Z0-9]+)/);
    if (m1 && m2 && m1[1] === m2[1]) return false;
    return true;
  });

  state.history.unshift(item);

  // 最多保存 30 条记录
  if (state.history.length > 30) {
    state.history = state.history.slice(0, 30);
  }

  try {
    localStorage.setItem('movie_watch_history', JSON.stringify(state.history));
  } catch (e) {}
}

// 渲染剧集选集面板
function renderEpisodesSection(episodes, activeIndex) {
  if (!elements.episodesSection) return;

  if (!episodes || episodes.length <= 1) {
    elements.episodesSection.classList.add('hidden');
    return;
  }

  elements.episodesSection.classList.remove('hidden');
  elements.episodesTotalBadge.innerText = `共 ${episodes.length} 集`;
  const curEp = episodes[activeIndex];
  const curName = curEp ? curEp.title : `第${activeIndex + 1}集`;
  elements.currentEpisodeStatus.innerText = `当前播放：${curName}`;

  elements.episodesGrid.innerHTML = '';
  episodes.forEach((ep, idx) => {
    const btn = document.createElement('button');
    btn.className = `episode-btn ${idx === activeIndex ? 'active' : ''}`;
    // 简写按钮文字（如 "第1集" 简写为 "1"，保留完整 title 悬停提示）
    const shortLabel = ep.title.replace(/^第(\d+)集$/, '$1');
    btn.innerText = shortLabel;
    btn.title = ep.title;

    btn.addEventListener('click', () => {
      if (idx !== state.currentEpisodeIndex) {
        playVideo(state.currentVideo, idx);
      }
    });

    elements.episodesGrid.appendChild(btn);
  });
}

// 异步补充拉取分集数据
async function fetchEpisodesForVideo(video, currentUrl) {
  try {
    const resp = await fetch(`/api/episodes?url=${encodeURIComponent(currentUrl)}`);
    const data = await resp.json();
    if (data.code === 200 && data.episodes && data.episodes.length > 0) {
      video.episodes = data.episodes;
      const hist = findInHistory(video);
      if (hist) {
        hist.episodes = data.episodes;
        saveWatchHistory(hist);
      }
      renderEpisodesSection(data.episodes, state.currentEpisodeIndex);
    }
  } catch (e) {
    console.warn('Async fetch episodes failed:', e);
  }
}

// 启动播放流程
async function playVideo(video, forcedEpisodeIndex = null) {
  state.currentVideo = video;

  // 更新播放器标题与角标
  elements.playerPlatformBadge.className = `platform-badge ${getPlatformBadgeClass(video.platform)}`;
  elements.playerPlatformBadge.innerText = video.platform_name || getPlatformName(video.platform);

  // 展开播放区
  elements.playerSection.classList.remove('hidden');
  elements.playerSection.scrollIntoView({ behavior: 'smooth' });

  // 检查是否在历史记录中
  const historyItem = findInHistory(video);

  // 整理分集列表
  let episodes = (video.episodes && video.episodes.length > 0)
    ? video.episodes
    : (historyItem && historyItem.episodes && historyItem.episodes.length > 0)
      ? historyItem.episodes
      : [];

  let targetIndex = 0;
  let targetUrl = video.url;
  let episodeTitle = '第1集';

  if (forcedEpisodeIndex !== null) {
    // 1. 用户点击了指定的选集按钮
    targetIndex = forcedEpisodeIndex;
    if (episodes[targetIndex]) {
      targetUrl = episodes[targetIndex].url;
      episodeTitle = episodes[targetIndex].title;
    }
  } else if (historyItem && historyItem.lastEpisodeUrl) {
    // 2. 存在历史记录：打开上次观看的集数！
    targetIndex = historyItem.lastEpisodeIndex ?? 0;
    targetUrl = historyItem.lastEpisodeUrl;
    episodeTitle = historyItem.lastEpisodeName || `第${targetIndex + 1}集`;
    showToast(`🎬 欢迎回来！已为您续播至上次观看的【${episodeTitle}】`);
  } else {
    // 3. 从未看过或没有历史记录：默认第 1 集！
    targetIndex = 0;
    if (episodes.length > 0) {
      targetUrl = episodes[0].url;
      episodeTitle = episodes[0].title;
    } else if (video.first_episode_url) {
      targetUrl = video.first_episode_url;
    }
    showToast(`🎬 正在为您从【第1集】开始播放`);
  }

  state.currentEpisodeIndex = targetIndex;
  state.currentEpisodeUrl = targetUrl;
  elements.playerVideoTitle.innerText = `${video.title} · ${episodeTitle}`;

  // 规范化与处理爱奇艺详情专辑页
  if (targetUrl.includes('iqiyi.com/a_')) {
    try {
      const resolveResp = await fetch(`/api/resolve?url=${encodeURIComponent(targetUrl)}`);
      const resolveData = await resolveResp.json();
      if (resolveData.code === 200 && resolveData.resolved_url) {
        targetUrl = resolveData.resolved_url;
        state.currentEpisodeUrl = targetUrl;
      }
    } catch (e) {
      console.warn('URL auto-resolve failed:', e);
    }
  }

  // 拼接解析线路并载入 iframe
  const parserEndpoint = state.currentRoute;
  elements.videoIframe.src = parserEndpoint + encodeURIComponent(targetUrl);

  // 保存/更新到本地播放历史
  saveWatchHistory({
    title: video.title,
    url: video.url,
    cover: video.cover,
    platform: video.platform,
    platform_name: video.platform_name || getPlatformName(video.platform),
    lastEpisodeIndex: targetIndex,
    lastEpisodeName: episodeTitle,
    lastEpisodeUrl: targetUrl,
    episodes: episodes,
    time: new Date().toLocaleString()
  });

  // 渲染分集面板
  renderEpisodesSection(episodes, targetIndex);

  // 若暂无分集列表且为腾讯视频等平台，异步尝试拉取全部分集
  if (episodes.length === 0 && (targetUrl.includes('v.qq.com') || (video.url && video.url.includes('v.qq.com')))) {
    fetchEpisodesForVideo(video, targetUrl || video.url);
  }
}

// 处理直接粘贴 URL 解析
async function handleDirectPlay() {
  const directUrl = elements.directUrlInput.value.trim();
  if (!directUrl) {
    alert('请先在输入框中粘贴腾讯、爱奇艺或优酷的视频网页链接！');
    elements.directUrlInput.focus();
    return;
  }

  // 识别平台
  let platform = 'all';
  let platformName = '第三方视频';
  if (directUrl.includes('v.qq.com')) {
    platform = 'qq';
    platformName = '腾讯视频';
  } else if (directUrl.includes('iqiyi.com')) {
    platform = 'iqiyi';
    platformName = '爱奇艺';
  } else if (directUrl.includes('youku.com')) {
    platform = 'youku';
    platformName = '优酷';
  }

  const customVideo = {
    title: '自定义解析视频',
    url: directUrl,
    first_episode_url: directUrl,
    cover: '',
    platform: platform,
    platform_name: platformName,
    episodes: []
  };

  await playVideo(customVideo);
  elements.directUrlInput.value = '';
}

// 历史记录加载
function loadHistory() {
  try {
    const raw = localStorage.getItem('movie_watch_history');
    if (raw) {
      state.history = JSON.parse(raw);
    }
  } catch (e) {
    state.history = [];
  }
}

// 渲染侧边抽屉历史记录列表
function renderHistoryDrawer() {
  elements.historyList.innerHTML = '';
  if (state.history.length === 0) {
    elements.historyList.innerHTML = '<div style="text-align: center; color: #64748b; padding: 3rem 0;">暂无观看历史</div>';
    return;
  }

  state.history.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    const thumb = item.cover || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=60';
    const epName = item.lastEpisodeName || '第1集';
    const platformClass = getPlatformBadgeClass(item.platform);
    const platformName = item.platform_name || getPlatformName(item.platform);

    div.innerHTML = `
      <img class="history-thumb" src="${thumb}" alt="${item.title}" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=60'" />
      <div class="history-details">
        <h5 class="history-title" title="${item.title}">${item.title}</h5>
        <div class="history-meta">
          <span class="platform-badge ${platformClass}" style="padding: 0.1rem 0.45rem; font-size: 0.72rem;">${platformName}</span>
          <span class="history-ep-info">上次看到：${epName}</span>
        </div>
        <span class="history-time">${item.time}</span>
      </div>
    `;

    div.addEventListener('click', () => {
      elements.historyDrawer.classList.remove('open');
      playVideo(item);
    });

    elements.historyList.appendChild(div);
  });
}

// 辅助工具函数
function setLoading(loading) {
  if (loading) {
    elements.searchBtn.disabled = true;
    elements.searchBtn.querySelector('.btn-text').classList.add('hidden');
    elements.searchBtn.querySelector('.btn-loader').classList.remove('hidden');
    elements.loadingSkeleton.classList.remove('hidden');
  } else {
    elements.searchBtn.disabled = false;
    elements.searchBtn.querySelector('.btn-text').classList.remove('hidden');
    elements.searchBtn.querySelector('.btn-loader').classList.add('hidden');
    elements.loadingSkeleton.classList.add('hidden');
  }
}

function getPlatformBadgeClass(platform) {
  switch (platform) {
    case 'qq': return 'badge-qq';
    case 'iqiyi': return 'badge-iqiyi';
    case 'youku': return 'badge-youku';
    default: return 'badge-all';
  }
}

function getPlatformName(platform) {
  switch (platform) {
    case 'qq': return '腾讯视频';
    case 'iqiyi': return '爱奇艺';
    case 'youku': return '优酷';
    default: return '全网资源';
  }
}

// 启动初始化
document.addEventListener('DOMContentLoaded', init);
