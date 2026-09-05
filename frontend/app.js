/**
 * 极光影院 - 智能聚合搜索与解析播放
 */

// 状态管理
const state = {
  currentPlatform: 'all',
  currentRoute: 'https://jx.xmflv.com/?url=',
  currentVideo: null,
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
    if (state.currentVideo && elements.videoIframe.src) {
      // 重新加载播放器
      elements.videoIframe.src = state.currentRoute + encodeURIComponent(state.currentVideo.url);
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
  });

  elements.refreshPlayerBtn.addEventListener('click', () => {
    if (state.currentVideo) {
      elements.videoIframe.src = state.currentRoute + encodeURIComponent(state.currentVideo.url);
    }
  });

  elements.openOriginalBtn.addEventListener('click', () => {
    if (state.currentVideo && state.currentVideo.url) {
      window.open(state.currentVideo.url, '_blank');
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

// 启动播放流程
async function playVideo(video) {
  state.currentVideo = video;

  // 更新播放器标题与角标
  elements.playerVideoTitle.innerText = video.title;
  elements.playerPlatformBadge.className = `platform-badge ${getPlatformBadgeClass(video.platform)}`;
  elements.playerPlatformBadge.innerText = video.platform_name || getPlatformName(video.platform);

  // 展开播放区
  elements.playerSection.classList.remove('hidden');
  elements.playerSection.scrollIntoView({ behavior: 'smooth' });

  // 规范化与解析 URL
  let targetUrl = video.url;
  try {
    // 异步向后端确认真实播放页链接（如专辑页转换）
    const resolveResp = await fetch(`/api/resolve?url=${encodeURIComponent(targetUrl)}`);
    const resolveData = await resolveResp.json();
    if (resolveData.code === 200 && resolveData.resolved_url) {
      targetUrl = resolveData.resolved_url;
      state.currentVideo.url = targetUrl;
    }
  } catch (e) {
    console.warn('URL auto-resolve failed, using direct URL:', e);
  }

  // 拼接解析线路并载入 iframe
  const parserEndpoint = state.currentRoute;
  elements.videoIframe.src = parserEndpoint + encodeURIComponent(targetUrl);

  // 添加到本地播放历史
  addToHistory({
    title: video.title,
    url: targetUrl,
    cover: video.cover,
    platform: video.platform,
    time: new Date().toLocaleString()
  });
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
    cover: '',
    platform: platform,
    platform_name: platformName
  };

  await playVideo(customVideo);
  elements.directUrlInput.value = '';
}

// 历史记录管理
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

function addToHistory(item) {
  // 去重 (移至第一位)
  state.history = state.history.filter(h => h.url !== item.url);
  state.history.unshift(item);

  // 最多保存 30 条记录
  if (state.history.length > 30) {
    state.history = state.history.slice(0, 30);
  }

  try {
    localStorage.setItem('movie_watch_history', JSON.stringify(state.history));
  } catch (e) {}
}

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

    div.innerHTML = `
      <img class="history-thumb" src="${thumb}" alt="${item.title}" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=60'" />
      <div class="history-details">
        <h5 class="history-title" title="${item.title}">${item.title}</h5>
        <div style="font-size: 0.75rem; color: var(--accent-cyan);">${getPlatformName(item.platform)}</div>
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
