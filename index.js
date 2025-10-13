import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

(function () {
  const MODULE_NAME = "RealWorld";

  function ready(fn) {
  if (window.SillyTavern && SillyTavern.getContext) return fn();
  const i = setInterval(() => {
    if (window.SillyTavern && SillyTavern.getContext) {
      clearInterval(i);
      fn();
    }
  }, 200);
  setTimeout(fn, 5000);
}

ready(() => {
  try {
    const ctx = getContext();

    if (!extension_settings[MODULE_NAME]) {
      extension_settings[MODULE_NAME] = {
        apiConfig: { amapKey: "", amapSecret: "" },
      };
      saveSettingsDebounced();
    }

    if (!document.getElementById("realworld-button")) {
      // 直接创建按钮，不等待load事件
      const btn = document.createElement("div");
      btn.id = "realworld-button";
      btn.title = "RealWorld 扩展";
      btn.innerText = "🌈";
      btn.classList.add("realworld-fab");

      // 样式部分
      btn.style.position = "fixed";
      btn.style.zIndex = 99999;
      btn.style.width = "32px";
      btn.style.height = "32px";
      btn.style.background = "transparent";
      btn.style.borderRadius = "50%";
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.style.cursor = "pointer";
      btn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";

      // 位置恢复
      const savedPosition = JSON.parse(localStorage.getItem("rw_button_position") || "null");
      if (savedPosition &&
          savedPosition.left >= 0 && savedPosition.top >= 0 &&
          savedPosition.left < window.innerWidth && savedPosition.top < window.innerHeight) {
        btn.style.left = savedPosition.left + "px";
        btn.style.top = savedPosition.top + "px";
      } else {
        btn.style.left = (window.innerWidth / 2 - 25) + "px";
        btn.style.top = (window.innerHeight / 2 - 25) + "px";
      }

      document.body.appendChild(btn);

      // ------- 拖动逻辑写在这里 --------
      let isDragging = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let buttonStartX = 0;
      let buttonStartY = 0;
      let hasMoved = false;

      btn.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });

      function startDrag(e) {
        isDragging = true;
        hasMoved = false;
        const clientX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;
        dragStartX = clientX;
        dragStartY = clientY;
        const rect = btn.getBoundingClientRect();
        buttonStartX = rect.left;
        buttonStartY = rect.top;
        btn.style.cursor = "grabbing";
        btn.style.transition = "none";
      }

      function drag(e) {
        if (!isDragging) return;
        e.preventDefault();
        const clientX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;
        const deltaX = clientX - dragStartX;
        const deltaY = clientY - dragStartY;
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) hasMoved = true;

        let newX = buttonStartX + deltaX;
        let newY = buttonStartY + deltaY;

        newX = Math.max(0, Math.min(window.innerWidth - btn.offsetWidth, newX));
        newY = Math.max(0, Math.min(window.innerHeight - btn.offsetHeight, newY));

        btn.style.left = newX + "px";
        btn.style.top = newY + "px";
      }

      function endDrag(e) {
        if (!isDragging) return;
        isDragging = false;
        btn.style.cursor = "pointer";
        btn.style.transition = "";

        const rect = btn.getBoundingClientRect();
        localStorage.setItem("rw_button_position", JSON.stringify({ left: rect.left, top: rect.top }));

        if (!hasMoved) {
          const panel = document.getElementById("realworld-panel");
          if (panel) {
            panel.style.display = panel.style.display === "none" ? "flex" : "none";
          } else {
            createPanel();
          }
        }
      }

      btn.addEventListener("mousedown", startDrag);
      document.addEventListener("mousemove", drag);
      document.addEventListener("mouseup", endDrag);

      btn.addEventListener("touchstart", startDrag);
      document.addEventListener("touchmove", drag, { passive: false });
      document.addEventListener("touchend", endDrag);

      window.addEventListener("resize", () => {
        const rect = btn.getBoundingClientRect();
        let newX = rect.left;
        let newY = rect.top;
        let needUpdate = false;

        if (rect.right > window.innerWidth) {
          newX = window.innerWidth - btn.offsetWidth;
          needUpdate = true;
        }
        if (rect.bottom > window.innerHeight) {
          newY = window.innerHeight - btn.offsetHeight;
          needUpdate = true;
        }

        if (needUpdate) {
          btn.style.left = newX + "px";
          btn.style.top = newY + "px";
          localStorage.setItem("rw_button_position", JSON.stringify({ left: newX, top: newY }));
        }
      });
    }
    
  } catch (err) {
    console.error('RealWorld extension initialization failed:', err);
  }
});
  function createPanel() {
    const panel = document.createElement("div");
    panel.id = "realworld-panel";
    panel.innerHTML = `
      

      <div class="rw-grid">
        <div class="rw-btn" data-key="api">API 配置</div>
        <div class="rw-btn" data-key="map">地图展示</div>
        <div class="rw-btn" data-key="inject">注入设置</div>
      </div>

      <div id="rw-content-area" class="rw-subpanel">
        <div class="rw-small">请选择一个功能</div>
      </div>

      <div id="rw-debug" class="rw-debug">
        <div class="rw-debug-header">调试面板</div>
        <div id="rw-log" class="rw-log"></div>
      </div>
    `;
    document.body.appendChild(panel);
    
    // 添加高德 AutoComplete 所需的 CSS 样式
    if (!document.getElementById('amap-autocomplete-styles')) {
  const style = document.createElement('style');
  style.id = 'amap-autocomplete-styles';
  style.textContent = `
    /* 高德地图自动补全样式 */
    .amap-sug-result {
      z-index: 9999 !important;
      position: absolute !important;
      background-color: white !important;
      border: 1px solid #000 !important; /* 黑色边框 */
      border-top: none !important;
      max-height: 300px !important;
      overflow-y: auto !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
      color: #000 !important; /* 黑色文字 */
    }

    .amap-sug-item {
      padding: 10px !important;
      cursor: pointer !important;
      border-bottom: 1px solid #000 !important; /* 黑色边框 */
      color: #000 !important; /* 黑色文字 */
    }

    .amap-sug-item:hover {
      background-color: rgba(0, 0, 0, 0.1) !important; /* hover时轻微背景 */
      color: #000 !important; /* 确保hover时也是黑色文字 */
    }

    .amap_lib_placeSearch {
      z-index: 9999 !important;
      color: #000 !important; /* 黑色文字 */
    }

    .amap-ui-poi-picker-sugg-container {
      z-index: 9999 !important;
      color: #000 !important; /* 黑色文字 */
    }

    /* 确保所有子元素也是黑色文字 */
    .amap-sug-result * {
      color: #000 !important;
    }
  `;
  document.head.appendChild(style);
}


    panel.querySelectorAll(".rw-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.key;
        loadSubPanel(key);
        log(`切换到子面板：${key}`);
      });
    });

    log("RealWorld 面板已创建");
  }

  function loadSubPanel(key) {
    const content = document.getElementById("rw-content-area");
    if (!content) return;
    switch (key) {
      case "api":
        loadAPIPanel(content);
        break;
      case "map":
        loadMapPanel(content);
        break;
      case "inject":
  loadInjectPanel(content);
  break;
      default:
        content.innerHTML = `<div><p>未知面板。</p></div>`;
    }
  }

  function loadMapPanel(container) {
  container.innerHTML = `
    <div class="rw-panel">
      <div class="rw-row">
        <input type="text" id="rw-location-display" class="rw-input" placeholder="当前地点..." readonly>
        <button id="rw-locate-btn" class="rw-btn-mini">📍</button>
      </div>
      <div class="rw-info-row">
        <span id="rw-weather">天气：--</span>
        <span id="rw-temp">气温：--°C</span>
        <span id="rw-air">空气质量：--</span>
      </div>
      <div class="rw-row">
        <input type="text" id="rw-search-input" class="rw-input" placeholder="输入要搜索的地点">
        <button id="rw-star-btn" class="rw-btn-mini">⭐</button>
        <button id="rw-search-btn" class="rw-btn-mini">🔍</button>
      </div>
      <div class="rw-row">
  <input type="text" id="rw-tag-input" class="rw-input" placeholder="输入标签">
  <button id="rw-add-tag" class="rw-btn-mini">➕</button>
  <button id="rw-del-mode" class="rw-btn-mini">🗑️</button>
  <button id="rw-smart-search" class="rw-btn-mini">🤔</button>
</div>
<div id="rw-tag-list" class="rw-tag-list"></div>
      <div id="rw-map" class="rw-map">地图加载中...</div>
      <div id="rw-search-popup" class="rw-search-popup hidden">
        <div id="rw-popup-name" class="rw-popup-name"></div>
        <div id="rw-popup-address" class="rw-popup-address"></div>
      </div>
    </div>
  `;

  const locateBtn = container.querySelector("#rw-locate-btn");
  const searchInput = container.querySelector("#rw-search-input");
  const searchBtn = container.querySelector("#rw-search-btn");
  const locInput = container.querySelector("#rw-location-display");
  const popup = container.querySelector("#rw-search-popup");
  const popupName = container.querySelector("#rw-popup-name");
  const popupAddress = container.querySelector("#rw-popup-address");
  // === 新增：⭐ 按钮查询 ===
const starBtn = container.querySelector("#rw-star-btn");

// === 新增函数：添加到收藏 ===
async function addToFavorites() {
  const searchText = searchInput.value.trim();
  if (!searchText) {
    alert("请输入要收藏的地点！");
    return;
  }

  try {
    console.log(`[RealWorld] 添加收藏：${searchText}`);

    // 动态导入 world-info.js
    const moduleWI = await import('/scripts/world-info.js');

    // 找到 realworld 世界书文件
    const selected = moduleWI.selected_world_info || [];
    let fileId = null;
    for (const wi of selected) {
      if (wi.includes("realworld")) {
        fileId = wi;
        break;
      }
    }
    if (!fileId) {
      console.warn("[RealWorld] 未找到 world-info 文件 realworld.json");
      alert("未找到世界书文件 realworld.json");
      return;
    }

    // 获取 SillyTavern API
    const ctx = globalThis.SillyTavern.getContext();
    const setEntry = ctx.SlashCommandParser.commands["setentryfield"];
    const createEntry = ctx.SlashCommandParser.commands["createentry"];
    if (!setEntry || !createEntry) {
      throw new Error("SillyTavern API 未加载必要命令");
    }

    // 读取世界书内容
    let worldInfo = await moduleWI.loadWorldInfo(fileId);
    let entries = worldInfo.entries || {};
    let favoritesUID = null;

    // 查找 "收藏" 条目（通过 key、title 或 comment 匹配）
    for (const id in entries) {
      const entry = entries[id];
      if (!entry.disable && 
          (entry.key === "收藏" || 
           entry.title === "收藏" || 
           entry.comment?.includes("收藏") ||
           entry.key?.includes("收藏") ||
           entry.title?.includes("收藏"))) {
        favoritesUID = entry.uid;
        break;
      }
    }

    let currentContent = "";
    if (favoritesUID) {
      // 已存在，读取当前内容
      currentContent = entries[favoritesUID].content || "";
    } else {
      // 创建新条目
      console.log("[RealWorld] 创建收藏条目");
      await createEntry.callback({
        file: fileId,
        key: "收藏",
        title: "收藏地点"
      }, "");  // 初始为空

      await new Promise(resolve => setTimeout(resolve, 1000));

      // 重新加载并查找 UID
      worldInfo = await moduleWI.loadWorldInfo(fileId);
      entries = worldInfo.entries || {};
      for (const id in entries) {
        const entry = entries[id];
        if (entry.key === "收藏" || entry.title === "收藏" || entry.key?.includes("收藏")) {
          favoritesUID = entry.uid;
          currentContent = entry.content || "";
          break;
        }
      }
    }

    if (!favoritesUID) {
      throw new Error("无法创建或找到收藏条目");
    }

    // 追加新内容（不清空旧内容）
    const newEntry = `${new Date().toLocaleString()}\n📍 ${searchText}\n\n`;
    const updatedContent = currentContent ? `${newEntry}${currentContent}` : newEntry;  // 新内容放顶部，旧的在下（或反之，根据需求调整）

    // 更新条目
    await setEntry.callback({
      file: fileId,
      uid: favoritesUID,
      field: "content"
    }, updatedContent);

    log(`[RealWorld] 已添加到收藏：${searchText}`);
    alert(`✅ "${searchText}" 已添加到世界书收藏！`);

    // 可选：清空搜索框
    searchInput.value = "";

  } catch (error) {
    console.error("[RealWorld] 添加收藏失败：", error);
    alert("❌ 添加收藏失败：" + error.message);
  }
}

// === 按钮绑定 ===
starBtn.addEventListener("click", addToFavorites);

// 可选：搜索按钮也能触发收藏（双击或长按），但按需求只绑定⭐
// 如果需要 Enter 键触发搜索框收藏：
// searchInput.addEventListener("keypress", (e) => {
//   if (e.key === "Enter") addToFavorites();
// });

  let map, mainMarker, autoComplete, placeSearch, currentCity = "";

  // --- 数据持久化 ---
  function saveState(data) {
    localStorage.setItem("rw_state", JSON.stringify(data));
  }

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem("rw_state") || "{}");
    } catch {
      return {};
    }
  }

  // 从缓存加载上次状态
  const cached = loadState();
  if (cached.address) {
    locInput.value = `${cached.address} (${cached.lng}, ${cached.lat})`;
    document.getElementById("rw-weather").textContent = cached.weather || "天气：--";
    document.getElementById("rw-temp").textContent = cached.temp || "气温：--°C";
    document.getElementById("rw-air").textContent = cached.air || "空气质量：--";
  }

  locateBtn.addEventListener("click", initLocation);
  
  function initializeGaodeServices(inputElement) {
    const AMap = window.AMap;
    autoComplete = new AMap.AutoComplete({
      input: inputElement,
      citylimit: true,
      city: currentCity || "全国"
    });
    placeSearch = new AMap.PlaceSearch({ map });

    autoComplete.on("select", (e) => {
      if (e.poi && e.poi.name) performSearch(e.poi.name);
    });

    // 检测并转移自动补全层
    const moveSugDom = () => {
      const sug = document.querySelector(".amap-sug-result");
      if (sug && sug.parentElement !== document.body) {
        document.body.appendChild(sug);
        sug.style.position = "fixed";
        sug.style.zIndex = 999999;
        console.log("[RealWorld] 自动补全层已移动到 body");
      }
    };
    for (let i = 0; i < 10; i++) setTimeout(moveSugDom, 200 * i);

    log("[RealWorld] Gaode自动补全服务初始化成功");
  }

  function clearPoiMarkers() {
    // 预留接口：清除多个POI标记
  }

  function updateMainMarker(position) {
    if (mainMarker) mainMarker.setMap(null);
    mainMarker = new AMap.Marker({ position, map });
  }

  function showInteractionPopup(poi, position) {
    if (popupName && popupAddress && popup) {
      popupName.textContent = poi.name || "";
      popupAddress.textContent = poi.address || poi.district || "";
      popup.classList.add("show");

      setTimeout(() => {
        popup.classList.remove("show");
      }, 3000);
    }
  }

  async function initLocation() {
    locInput.value = "正在定位，请稍候...";
    log("[RealWorld] 开始定位…");

    const ctx = SillyTavern.getContext();
    const conf = ctx.extensionSettings["RealWorld"]?.apiConfig || {};
    const amapKey = conf.amapKey;
    const amapSecret = conf.amapSecret;

    if (!amapKey || !amapSecret) {
      locInput.value = "⚠️ 请先在 API 配置面板中设置高德 Key 和安全码";
      return;
    }

    try {
      await loadAMapScript(amapKey, amapSecret);
      const AMap = window.AMap;

      const mapDiv = document.getElementById("rw-map");
      map = new AMap.Map(mapDiv, {
        resizeEnable: true,
        zoom: 12,
        viewMode: "2D"
      });

      const geocoder = new AMap.Geocoder({ extensions: "all" });

      // 点击地图获取详细信息
      // 点击地图获取详细信息
let clickTimer = null;
let isLongPress = false;
let lastClickInfo = null;
let touchStartPos = null;
let isMoved = false;
let touchCount = 0;

// 配置参数
const LONG_PRESS_DURATION = 600; // 增加长按时间到600ms
const MOVE_THRESHOLD = 10; // 移动阈值（像素）

// 检测是否移动过
function checkIfMoved(startPos, currentPos) {
  if (!startPos || !currentPos) return false;
  const dx = Math.abs(currentPos.x - startPos.x);
  const dy = Math.abs(currentPos.y - startPos.y);
  return dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD;
}

// 清理长按定时器
function clearLongPressTimer() {
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
  }
  isLongPress = false;
  isMoved = false;
  touchStartPos = null;
}

// 触摸开始
map.on("touchstart", function (e) {
  const touches = e.originEvent.touches;
  touchCount = touches.length;

  // 如果是多点触控（通常是缩放），直接取消长按
  if (touchCount > 1) {
    clearLongPressTimer();
    return;
  }

  // 记录起始位置
  const touch = touches[0];
  touchStartPos = { x: touch.clientX, y: touch.clientY };
  isLongPress = false;
  isMoved = false;

  // 开始长按计时
  clickTimer = setTimeout(() => {
    // 再次检查是否移动过和是否仍是单点触控
    if (!isMoved && touchCount === 1) {
      isLongPress = true;

      // 震动反馈，表示长按已触发
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]); // 双重震动反馈
      }

      // 执行长按逻辑
      const lnglat = map.containerToLngLat(new AMap.Pixel(touch.clientX, touch.clientY));
      handleLongPress(lnglat);
    }
  }, LONG_PRESS_DURATION);
});

// 触摸移动
map.on("touchmove", function (e) {
  const touches = e.originEvent.touches;
  touchCount = touches.length;

  // 多点触控或已经移动，取消长按
  if (touchCount > 1) {
    clearLongPressTimer();
    return;
  }

  // 检测移动距离
  if (touchStartPos && touches[0]) {
    const currentPos = { x: touches[0].clientX, y: touches[0].clientY };
    if (checkIfMoved(touchStartPos, currentPos)) {
      isMoved = true;
      clearLongPressTimer();
    }
  }
});

// 触摸结束
map.on("touchend", function (e) {
  clearLongPressTimer();
});

// 触摸取消
map.on("touchcancel", function (e) {
  clearLongPressTimer();
});

// 鼠标事件（桌面端）
map.on("mousedown", function (e) {
  // 记录起始位置
  touchStartPos = { x: e.originEvent.clientX, y: e.originEvent.clientY };
  isLongPress = false;
  isMoved = false;

  clickTimer = setTimeout(() => {
    if (!isMoved) {
      isLongPress = true;
      handleLongPress(e.lnglat);
    }
  }, LONG_PRESS_DURATION);
});

map.on("mousemove", function (e) {
  if (touchStartPos) {
    const currentPos = { x: e.originEvent.clientX, y: e.originEvent.clientY };
    if (checkIfMoved(touchStartPos, currentPos)) {
      isMoved = true;
      clearLongPressTimer();
    }
  }
});

map.on("mouseup", function () {
  clearLongPressTimer();
});

// 点击事件（短按）
map.on("click", function (e) {
  // 如果是长按触发的，忽略click事件
  if (isLongPress) {
    isLongPress = false;
    return;
  }

  const { lng, lat } = e.lnglat;
  handleShortPress({ lng, lat });
});

// 长按处理函数
function handleLongPress(lnglat) {
  const { lng, lat } = lnglat;

  geocoder.getAddress({ lng, lat }, (status, result) => {
    if (status === "complete" && result.regeocode) {
      const placeName = extractPlaceName(result.regeocode);
      const addr = result.regeocode.formattedAddress;

      // 计算距离
      const cached = loadState();
      let distanceText = "";
      if (cached.lng && cached.lat) {
        const lnglat1 = new AMap.LngLat(cached.lng, cached.lat);
        const lnglat2 = new AMap.LngLat(lng, lat);
        const distance = Math.round(lnglat1.distance(lnglat2));

        if (distance < 1000) {
          distanceText = `${distance}米`;
        } else {
          distanceText = `${(distance / 1000).toFixed(1)}公里`;
        }
      }

      const roadTag = `<road>正在前往${placeName}，${addr}${distanceText ? `，${distanceText}` : ''}</road>`;

      const chatInput = document.getElementById('send_textarea');
      if (chatInput) {
        const currentValue = chatInput.value;
        chatInput.value = currentValue + (currentValue ? '\n' : '') + roadTag;
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));

        // 显示成功提示
        toastr.success(`已注入路径信息：${placeName}`, '长按地图', {
          positionClass: "toast-top-center",
          timeOut: 2000
        });
      }

      updateMainMarker([lng, lat]);
    }
  });
}

// 短按处理函数
function handleShortPress({ lng, lat }) {
  geocoder.getAddress({ lng, lat }, (status, result) => {
    if (status === "complete" && result.regeocode) {
      const placeName = extractPlaceName(result.regeocode);
      const addr = result.regeocode.formattedAddress;

      // 计算距离
      const cached = loadState();
      let distance = null;
      if (cached.lng && cached.lat) {
        const lnglat1 = new AMap.LngLat(cached.lng, cached.lat);
        const lnglat2 = new AMap.LngLat(lng, lat);
        distance = Math.round(lnglat1.distance(lnglat2));
      }

      const clickPoi = {
        name: placeName,
        address: addr,
        position: [lng, lat],
        distance: distance
      };

      lastClickInfo = {
        name: placeName,
        address: addr,
        distance: distance
      };

      showInteractionPopup(clickPoi, [lng, lat]);
      updateMainMarker([lng, lat]);
    }
  });
}

// 提取地点名称的函数
function extractPlaceName(regeocode) {
  let placeName = "";

  if (regeocode.pois && regeocode.pois.length > 0) {
    placeName = regeocode.pois[0].name;
  } else if (regeocode.roads && regeocode.roads.length > 0) {
    placeName = regeocode.roads[0].name;
  } else if (regeocode.aois && regeocode.aois.length > 0) {
    placeName = regeocode.aois[0].name;
  } else if (regeocode.addressComponent) {
    const comp = regeocode.addressComponent;
    if (comp.building && comp.building.name) {
      placeName = comp.building.name;
    } else if (comp.neighborhood && comp.neighborhood.name) {
      placeName = comp.neighborhood.name;
    } else if (comp.street) {
      placeName = comp.street;
    } else {
      placeName = comp.district || "未知地点";
    }
  }

  return placeName || "未知地点";
}



      // 延迟初始化高德服务
      AMap.plugin(["AMap.AutoComplete", "AMap.PlaceSearch"], () => {
        const inputEl = document.getElementById("rw-search-input");
        if (inputEl) initializeGaodeServices(inputEl);
        else log("[RealWorld] 警告：搜索输入框未找到，无法初始化自动补全");
      });

      // 高德定位
      AMap.plugin("AMap.Geolocation", function () {
        const geolocation = new AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 10000,
          showButton: false
        });

        geolocation.getCurrentPosition((status, result) => {
          if (status === "complete" && result.position) {
            const { lng, lat } = result.position;
            log(`[RealWorld] 高德定位成功：经度 ${lng}, 纬度 ${lat}`);
            map.setCenter([lng, lat]);
            mainMarker = new AMap.Marker({ position: [lng, lat], map });

            geocoder.getAddress({ lng, lat }, (status, geoResult) => {
              if (status === "complete" && geoResult.regeocode) {
                const addrComp = geoResult.regeocode.addressComponent;
                const formatted = geoResult.regeocode.formattedAddress;
                currentCity = addrComp.city || addrComp.province;
                if (autoComplete) autoComplete.setCity(currentCity);

                locInput.value = `${formatted} (${lng.toFixed(5)}, ${lat.toFixed(5)})`;
                log(`[RealWorld] 地址解析成功：${formatted}`);
                getWeatherInfo(addrComp.adcode);

                // 🌤️ 保存状态
                setTimeout(() => {
                  const weatherSpan = document.getElementById("rw-weather").textContent;
                  const tempSpan = document.getElementById("rw-temp").textContent;
                  const airSpan = document.getElementById("rw-air").textContent;
                  saveState({
                    address: formatted,
                    lng, lat,
                    weather: weatherSpan,
                    temp: tempSpan,
                    air: airSpan
                  });
                }, 1500);
              } else {
                locInput.value = `${lng.toFixed(5)}, ${lat.toFixed(5)}（无法解析地址）`;
              }
            });
          } else {
            log("[RealWorld] 高德定位失败，尝试浏览器定位");
            fallbackGeolocation();
          }
        });
      });

    } catch (err) {
      log(`[RealWorld] 加载高德定位出错：${err}`);
      fallbackGeolocation();
    }
  }

  function getWeatherInfo(adcode) {
  const weatherSpan = document.getElementById("rw-weather");
  const tempSpan = document.getElementById("rw-temp");
  const airSpan = document.getElementById("rw-air");

  AMap.plugin("AMap.Weather", () => {
    const weather = new AMap.Weather();
    weather.getLive(adcode, (err, data) => {
      if (!err && data) {
        weatherSpan.textContent = `天气：${data.weather}`;
        tempSpan.textContent = `气温：${data.temperature}°C`;

        // 保存城市信息到缓存
        const cached = loadState();
        cached.city = data.city || currentCity;
        saveState(cached);
      }
    });
    weather.getForecast(adcode, (err, data) => {
      airSpan.textContent = (data?.forecasts?.[0]?.reporttime)
        ? "空气质量：良"
        : "空气质量：--";
    });
  });
}


  function fallbackGeolocation() {
    if (!("geolocation" in navigator)) {
      locInput.value = "浏览器不支持定位";
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        locInput.value = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}（来源：浏览器）`;
      },
      (err) => {
        locInput.value = `定位失败：${err.message}`;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function loadAMapScript(key, secret) {
  return new Promise((resolve, reject) => {
    if (window.AMap) {
      log("[RealWorld] AMap已加载");
      return resolve();
    }

    window._AMapSecurityConfig = { securityJsCode: secret };

    const script = document.createElement("script");
    script.type = "text/javascript";
    // 添加所有必要的插件
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.Geocoder,AMap.Weather,AMap.Geolocation,AMap.AutoComplete,AMap.PlaceSearch`;

    script.onload = () => {
      log("[RealWorld] 高德地图脚本加载成功");
      if (window.AMap) resolve();
      else reject(new Error("AMap 基础库加载失败"));
    };

    script.onerror = (error) => {
      log("[RealWorld] 高德地图脚本加载失败:", error);
      reject(error);
    };

    document.head.appendChild(script);
  });
}
  // === 标签系统 ===
const tagInput = container.querySelector("#rw-tag-input");
const addTagBtn = container.querySelector("#rw-add-tag");
const delModeBtn = container.querySelector("#rw-del-mode");
const smartSearchBtn = container.querySelector("#rw-smart-search");
const tagListDiv = container.querySelector("#rw-tag-list");

let tags = JSON.parse(localStorage.getItem("rw_tags") || "[]");
let deleteMode = false;

function renderTags() {
  tagListDiv.innerHTML = "";
  tags.forEach((tag, index) => {
    const span = document.createElement("span");
    span.className = "rw-tag-item";
    span.textContent = tag.name;
    if (tag.enabled) span.classList.add("active");
    span.addEventListener("click", () => {
      if (deleteMode) {
        tags.splice(index, 1);
        saveTags();
        renderTags();
      } else {
        tag.enabled = !tag.enabled;
        saveTags();
        renderTags();
      }
    });
    tagListDiv.appendChild(span);
  });
}

function saveTags() {
  localStorage.setItem("rw_tags", JSON.stringify(tags));
}

addTagBtn.addEventListener("click", () => {
  const value = tagInput.value.trim();
  if (!value) return;
  tags.push({ name: value, enabled: true });
  saveTags();
  renderTags();
  tagInput.value = "";
});

delModeBtn.addEventListener("click", () => {
  deleteMode = !deleteMode;
  delModeBtn.classList.toggle("active", deleteMode);
  delModeBtn.title = deleteMode ? "删除模式中" : "普通模式";
});

smartSearchBtn.addEventListener("click", () => {
  const enabledTags = tags.filter(t => t.enabled).map(t => t.name);
  if (enabledTags.length === 0) {
    log("[RealWorld] 没有启用标签，智能搜索已取消");
    return;
  }

  const keyword = searchInput.value.trim();
  // 获取用户设置的搜索半径
  const searchRadius = parseInt(localStorage.getItem('rw_search_radius') || '2000');

  if (keyword) {
    // 先搜索输入的地点，获取坐标后再搜索周边
    placeSearch.search(keyword, (status, result) => {
      if (status === "complete" && result.poiList && result.poiList.pois.length > 0) {
        const centerPoi = result.poiList.pois[0];
        const centerPos = centerPoi.location;

        // 以找到的地点为中心搜索周边
        const nearbyQuery = enabledTags.join(" ");
        placeSearch.searchNearBy(nearbyQuery, centerPos, searchRadius, (nearbyStatus, nearbyResult) => {
          if (nearbyStatus === "complete" && nearbyResult.poiList && nearbyResult.poiList.pois.length > 0) {
            // 显示中心点
            if (mainMarker) mainMarker.setMap(null);
            mainMarker = new AMap.Marker({
              position: centerPos,
              map: map,
              title: centerPoi.name
            });

            // 显示第一个搜索结果
            const firstPoi = nearbyResult.poiList.pois[0];
            map.setCenter(firstPoi.location);
            map.setZoom(16);  // 保持原来的缩放级别

            popupName.textContent = `找到${nearbyResult.poiList.pois.length}个结果`;
            popupAddress.textContent = `最近：${firstPoi.name}`;
            popup.classList.add("show");

            setTimeout(() => {
              popup.classList.remove("show");
            }, 3000);

            log(`[RealWorld] 在${centerPoi.name}附近${searchRadius}米内找到${nearbyResult.poiList.pois.length}个结果`);
          } else {
            log(`[RealWorld] 在${centerPoi.name}附近${searchRadius}米内未找到相关结果`);
          }
        });
      } else {
        log(`[RealWorld] 未找到地点：${keyword}`);
      }
    });
  } else {
    // 使用当前位置搜索周边
    const cached = loadState();
    if (cached.lng && cached.lat) {
      const currentPos = new AMap.LngLat(cached.lng, cached.lat);
      const nearbyQuery = enabledTags.join(" ");

      placeSearch.searchNearBy(nearbyQuery, currentPos, searchRadius, (status, result) => {
        if (status === "complete" && result.poiList && result.poiList.pois.length > 0) {
          const firstPoi = result.poiList.pois[0];
          map.setCenter(firstPoi.location);
          map.setZoom(16);  // 保持原来的缩放级别

          popupName.textContent = `找到${result.poiList.pois.length}个结果`;
          popupAddress.textContent = `最近：${firstPoi.name}`;
          popup.classList.add("show");

          setTimeout(() => {
            popup.classList.remove("show");
          }, 3000);

          log(`[RealWorld] 在当前位置附近${searchRadius}米内找到${result.poiList.pois.length}个结果`);
        } else {
          log("[RealWorld] 在当前位置附近未找到相关结果");
        }
      });
    } else {
      log("[RealWorld] 请先定位当前位置");
    }
  }
});


// 初始化时渲染标签
renderTags();

async function performSearch(keyword) {
  if (!keyword || !placeSearch) {
    log("[RealWorld] 搜索关键词为空或搜索服务未初始化");
    return;
  }

  log(`[RealWorld] 执行搜索：${keyword}`);

  placeSearch.search(keyword, (status, result) => {
    if (status === "complete" && result.poiList && result.poiList.pois.length > 0) {
      const poi = result.poiList.pois[0];
      const position = poi.location;

      map.setCenter(position);
      map.setZoom(16);

      if (mainMarker) mainMarker.setMap(null);
      mainMarker = new AMap.Marker({
        position: position,
        map: map,
        title: poi.name
      });

      searchInput.value = poi.name;

      popupName.textContent = poi.name;
      popupAddress.textContent = poi.address || "";
      popup.classList.add("show");

      setTimeout(() => {
        popup.classList.remove("show");
      }, 3000);
    } else {
      popup.classList.remove("show");
      log(`[RealWorld] 未找到"${keyword}"相关结果`);
    }
  });
}

}

  function loadAPIPanel(container) {
    const cfg = extension_settings[MODULE_NAME].apiConfig || {};
    container.innerHTML = `
      <div class="rw-panel">
        <h3>API 配置</h3>
        <label class="rw-label">高德 Key</label>
        <input type="text" id="rw-amap-key" class="rw-input" placeholder="请输入高德开放平台 Key" value="${cfg.amapKey || ""}">
        <label class="rw-label">高德安全密钥</label>
        <input type="text" id="rw-amap-secret" class="rw-input" placeholder="请输入高德安全密钥" value="${cfg.amapSecret || ""}">
        <div class="rw-tip">修改后会自动保存</div>
      </div>
    `;

    const keyInput = container.querySelector("#rw-amap-key");
    const secInput = container.querySelector("#rw-amap-secret");

    const save = () => {
      extension_settings[MODULE_NAME].apiConfig.amapKey = keyInput.value.trim();
      extension_settings[MODULE_NAME].apiConfig.amapSecret = secInput.value.trim();
      saveSettingsDebounced();
      log("已保存 API 配置。");
    };

    keyInput.addEventListener("input", save);
    secInput.addEventListener("input", save);
  }
  function loadInjectPanel(container) {
  container.innerHTML = `
    <div class="rw-panel">
      <div class="rw-row" style="gap: 8px; align-items: center;">
        <button id="rw-update-now-btn" class="rw-btn-mini">立刻更新</button>
        <button id="rw-auto-update-btn" class="rw-btn-mini">自动更新</button>
      </div>

      <!-- 新增行：数字输入 + 当前消息数 + 预计消息数 -->
      <div class="rw-row" style="gap: 8px; align-items: center; margin-top: 8px;">
        <input type="number" id="rw-add-number" class="rw-input" placeholder="输入数字" style="width:80px;">
        <span>当前消息数：<span id="rw-current-msg">0</span></span>
        <span>预计消息数：<span id="rw-expected-msg">0</span></span>
      </div>
      
      <!-- 新增：搜索半径和结果数量设置 -->
      <div class="rw-row" style="gap: 8px; align-items: center; margin-top: 8px;">
        <label style="white-space: nowrap;">搜索半径：</label>
        <input type="number" id="rw-search-radius" class="rw-input" placeholder="2000" style="width:80px;" min="100" max="10000" value="${localStorage.getItem('rw_search_radius') || 2000}">
        <span>米</span>
      </div>
      
      <div class="rw-row" style="gap: 8px; align-items: center; margin-top: 8px;">
        <label style="white-space: nowrap;">最大结果：</label>
        <input type="number" id="rw-max-results" class="rw-input" placeholder="10" style="width:80px;" min="1" max="50" value="${localStorage.getItem('rw_max_results') || 10}">
        <span>条</span>
      </div>
    </div>
  `;

  const updateNowBtn = container.querySelector("#rw-update-now-btn");
  const autoUpdateBtn = container.querySelector("#rw-auto-update-btn");
  const addNumberInput = container.querySelector("#rw-add-number");
  const currentMsgSpan = container.querySelector("#rw-current-msg");
  const expectedMsgSpan = container.querySelector("#rw-expected-msg");
  
  // 新增：获取搜索半径和最大结果输入框
  const searchRadiusInput = container.querySelector("#rw-search-radius");
  const maxResultsInput = container.querySelector("#rw-max-results");

  // 保存搜索半径和最大结果数到 localStorage
  searchRadiusInput.addEventListener("input", () => {
    localStorage.setItem("rw_search_radius", searchRadiusInput.value);
    log(`[RealWorld] 搜索半径已更新为 ${searchRadiusInput.value} 米`);
  });

  maxResultsInput.addEventListener("input", () => {
    localStorage.setItem("rw_max_results", maxResultsInput.value);
    log(`[RealWorld] 最大结果数已更新为 ${maxResultsInput.value} 条`);
  });
  // 自动更新状态
  let autoUpdateActive = false;
  let expectedCount = 0;
  let lastMessageCount = 0;
  let autoObserver = null;
  const AUTO_MODE_KEY = 'rw_auto_update_mode';

  // 从 localStorage 读取保存的数字
  const savedNumber = localStorage.getItem("rw_add_number");
  if (savedNumber) {
    addNumberInput.value = savedNumber;
  }

  // === 立刻更新世界书的逻辑（保留原有内容） ===
  async function updateWorldLocationEntry() {
  try {
    console.log("[RealWorld] 开始更新世界书：realworld/当前位置信息");

    // 读取 localStorage 的保存数据
    const cached = JSON.parse(localStorage.getItem("rw_state") || "{}");
    if (!cached.address) {
      alert("未找到本地位置数据，请先进行一次定位。");
      return;
    }

    const { address, lng, lat, weather, temp, air } = cached;

    // 动态导入 world-info.js
    const moduleWI = await import('/scripts/world-info.js');

    // 找到 realworld 世界书文件
    const selected = moduleWI.selected_world_info || [];
    let fileId = null;
    for (const wi of selected) {
      if (wi.includes("realworld")) {
        fileId = wi;
        break;
      }
    }
    if (!fileId) {
      console.warn("[RealWorld] 未找到 world-info 文件 realworld.json");
      alert("未找到世界书文件 realworld.json");
      return;
    }

    // 获取 SillyTavern API
    const ctx = globalThis.SillyTavern.getContext();
    const setEntry = ctx.SlashCommandParser.commands["setentryfield"];
    const createEntry = ctx.SlashCommandParser.commands["createentry"];
    if (!setEntry || !createEntry) {
      throw new Error("SillyTavern API 未加载必要命令");
    }

    // === 第一步：更新基础位置信息 ===
    const baseContent = `📍 位置：${address}
经纬度：${lng}, ${lat}
${weather}
${temp}
${air}
更新时间：${new Date().toLocaleString()}`;

    // 读取世界书内容
    let worldInfo = await moduleWI.loadWorldInfo(fileId);
    let entries = worldInfo.entries || {};
    let baseUID = null;

    // 查找基础位置信息条目
    for (const id in entries) {
      const entry = entries[id];
      if (!entry.disable && (entry.title === "当前位置信息" || entry.comment?.includes("当前位置信息"))) {
        baseUID = entry.uid;
        break;
      }
    }

    if (!baseUID) {
      console.log("[RealWorld] 创建基础位置信息条目");
      await createEntry.callback({
        file: fileId,
        key: "当前位置信息"
      }, "");

      await new Promise(resolve => setTimeout(resolve, 1000));

      worldInfo = await moduleWI.loadWorldInfo(fileId);
      entries = worldInfo.entries || {};
      for (const id in entries) {
        const entry = entries[id];
        if (entry.key === "当前位置信息" || entry.title === "当前位置信息") {
          baseUID = entry.uid;
          break;
        }
      }
    }

    if (baseUID) {
      await setEntry.callback({ file: fileId, uid: baseUID, field: "content" }, baseContent);
      log("[RealWorld] 基础位置信息条目已更新成功");
    }

    // === 第二步 & 第三步：处理标签搜索 ===
    const tags = JSON.parse(localStorage.getItem("rw_tags") || "[]");
    const enabledTags = tags.filter(t => t.enabled && t.name);

    if (enabledTags.length === 0) {
      log("[RealWorld] 没有启用的标签，跳过标签搜索");
      if (!autoUpdateActive) {
        alert("✅ 已更新世界书中的位置信息！");
      }
      return;
    }

    // 确保高德服务已加载
    if (!window.AMap || !window.AMap.PlaceSearch) {
      log("[RealWorld] 高德地图服务未加载，无法进行标签搜索");
      alert("⚠️ 地图服务未加载，请先在地图面板进行定位");
      return;
    }

    const maxResults = parseInt(localStorage.getItem('rw_max_results') || '10');
const placeSearch = new window.AMap.PlaceSearch({
  pageSize: maxResults,  // 使用动态值
  pageIndex: 1,
  city: cached.city || "全国",
  extensions: "all"
});

    // 处理每个启用的标签
    for (const tag of enabledTags) {
      try {
        log(`[RealWorld] 处理标签：${tag.name}`);

        // 重新加载世界书
        worldInfo = await moduleWI.loadWorldInfo(fileId);
        entries = worldInfo.entries || {};

        // 调试：打印所有条目
        log(`[RealWorld] 当前世界书条目数：${Object.keys(entries).length}`);
        for (const id in entries) {
          const entry = entries[id];
          log(`[RealWorld] 条目 ${id}: key="${entry.key}", title="${entry.title}", comment="${entry.comment}"`);
        }

        // 查找对应的条目
        let tagUID = null;
        for (const id in entries) {
          const entry = entries[id];
          if (!entry.disable) {
            // 更宽松的匹配条件
            if (entry.key === tag.name ||
                entry.title === tag.name ||
                entry.comment === tag.name ||
                (entry.key && entry.key.includes(tag.name)) ||
                (entry.title && entry.title.includes(tag.name))) {
              tagUID = entry.uid;
              log(`[RealWorld] 找到标签条目：${tag.name}, UID=${tagUID}`);
              break;
            }
          }
        }

        if (!tagUID) {
          // 创建新条目
          log(`[RealWorld] 创建标签条目：${tag.name}`);

          // 尝试使用不同的创建方式
          const createResult = await createEntry.callback({
            file: fileId,
            key: tag.name,
            comment: tag.name  // 添加 comment 字段
          }, tag.name); // 传入标签名作为内容

          log(`[RealWorld] 创建条目结果：${JSON.stringify(createResult)}`);

          // 等待更长时间
          await new Promise(resolve => setTimeout(resolve, 2000));

          // 强制刷新世界书
          if (moduleWI.updateWorldInfoList) {
            await moduleWI.updateWorldInfoList();
          }

          // 再次加载
          worldInfo = await moduleWI.loadWorldInfo(fileId);
          entries = worldInfo.entries || {};

          log(`[RealWorld] 创建后条目数：${Object.keys(entries).length}`);

          // 再次查找
          for (const id in entries) {
            const entry = entries[id];
            if (entry.key === tag.name ||
                entry.title === tag.name ||
                entry.comment === tag.name ||
                (entry.key && entry.key.includes(tag.name)) ||
                (entry.title && entry.title.includes(tag.name))) {
              tagUID = entry.uid;
              log(`[RealWorld] 创建后找到条目：${tag.name}, UID=${tagUID}`);
              break;
            }
          }
        }

        if (!tagUID) {
          log(`[RealWorld] 无法创建或找到标签条目：${tag.name}`);
          continue;
        }

        // 执行搜索
        const searchQuery = tag.name; // 简化搜索，只用标签名
        log(`[RealWorld] 搜索：${searchQuery}，位置：${lng}, ${lat}`);

        await new Promise((resolve, reject) => {
          // 使用周边搜索而不是关键字搜索
          const searchRadius = parseInt(localStorage.getItem('rw_search_radius') || '2000');
placeSearch.searchNearBy(searchQuery, [lng, lat], searchRadius, (status, result) => {
            log(`[RealWorld] 搜索状态：${status}`);

            if (status === "complete" && result.poiList && result.poiList.pois.length > 0) {
              const pois = result.poiList.pois;
              log(`[RealWorld] 找到 ${pois.length} 个结果`);

              let tagContent = `🔍 ${tag.name} - ${cached.address} 附近\n`;
              tagContent += `更新时间：${new Date().toLocaleString()}\n\n`;

              pois.forEach((poi, index) => {
                tagContent += `${index + 1}. ${poi.name}\n`;
                tagContent += `   📍 ${poi.address || poi.district || "地址未知"}\n`;
                if (poi.distance) {
                  tagContent += `   📏 距离：${Math.round(poi.distance)}米\n`;
                }
                if (poi.tel) {
                  tagContent += `   📞 电话：${poi.tel}\n`;
                }
                if (poi.type) {
                  tagContent += `   🏷️ 类型：${poi.type}\n`;
                }
                tagContent += `\n`;
              });

              // 更新条目内容
              setEntry.callback({ file: fileId, uid: tagUID, field: "content" }, tagContent)
                .then(() => {
                  log(`[RealWorld] 标签 "${tag.name}" 的搜索结果已更新`);
                  resolve();
                })
                .catch(err => {
                  log(`[RealWorld] 更新标签 "${tag.name}" 内容失败：${err.message}`);
                  reject(err);
                });
            } else {
              log(`[RealWorld] 搜索无结果或失败：${result?.info || '未知原因'}`);

              const emptyContent = `🔍 ${tag.name} - ${cached.address} 附近\n更新时间：${new Date().toLocaleString()}\n\n未找到相关地点。`;
              setEntry.callback({ file: fileId, uid: tagUID, field: "content" }, emptyContent)
                .then(() => {
                  log(`[RealWorld] 标签 "${tag.name}" 已更新为无结果`);
                  resolve();
                })
                .catch(reject);
            }
          });
        });

        // 添加延迟
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (tagError) {
        log(`[RealWorld] 处理标签 "${tag.name}" 时出错：${tagError.message}`);
        console.error(tagError);
      }
    }

    log("[RealWorld] 所有标签搜索完成");

    if (!autoUpdateActive) {
      alert("✅ 已更新世界书中的位置信息和标签搜索结果！");
    }

  } catch (e) {
    console.error("[RealWorld] 更新世界书失败：", e);
    alert("❌ 更新失败：" + (e.message || e));
  }
}


  // === 新增逻辑：数字输入 + 当前消息数 + 预计消息数 ===
  function refreshMessageCounts() {
    const ctx = globalThis.SillyTavern.getContext();

    // 尝试多个可能的路径
    const currentMsgCount =
      ctx?.chat?.length ||
      ctx?.chat?.messages?.length ||
      ctx?.messages?.length ||
      0;

    currentMsgSpan.textContent = currentMsgCount;

    if (autoUpdateActive) {
      expectedMsgSpan.textContent = expectedCount;
    } else {
      const addValue = parseInt(addNumberInput.value) || 0;
      expectedMsgSpan.textContent = currentMsgCount + addValue;
    }
  }

  // 保存数字到 localStorage
  function saveNumber() {
    localStorage.setItem("rw_add_number", addNumberInput.value);
  }

  // 切换自动更新状态
  // 切换自动更新状态
function toggleAutoUpdate(forceState) {
    autoUpdateActive = typeof forceState === 'boolean' ? forceState : !autoUpdateActive;
    localStorage.setItem(AUTO_MODE_KEY, autoUpdateActive ? '1' : '0');
    
    autoUpdateBtn.textContent = autoUpdateActive ? "停止自动" : "自动更新";
    autoUpdateBtn.style.backgroundColor = autoUpdateActive ? "#f44336" : "";
    
    if (autoUpdateActive) {
        console.log("[RealWorld] 自动更新模式已开启");
        
        // 立刻更新一次
        updateWorldLocationEntry().then(() => {
            // 计算预计消息数
            const ctx = globalThis.SillyTavern.getContext();
            lastMessageCount = ctx?.chat?.length || 0;
            const addValue = parseInt(addNumberInput.value) || 0;
            expectedCount = lastMessageCount + addValue;
            refreshMessageCounts();
        });
        
        // 设置观察器
        autoObserver = new MutationObserver((mutations) => {
            // 添加延迟确保消息已完全加载
            setTimeout(() => {
                const ctx = globalThis.SillyTavern.getContext();
                if (!ctx || !Array.isArray(ctx.chat)) {
                    console.log("[RealWorld] 无法获取聊天上下文");
                    return;
                }
                
                const currentCount = ctx.chat.length;
                
                // 更新当前消息数显示
                currentMsgSpan.textContent = currentCount;
                
                // 检测到新消息
                if (currentCount > lastMessageCount) {
                    console.log(`[RealWorld] 检测到消息变化，从 ${lastMessageCount} 到 ${currentCount}`);
                    
                    const newMsg = ctx.chat[currentCount - 1];
                    lastMessageCount = currentCount;
                    
                    // 打印消息信息用于调试
                    console.log("[RealWorld] 新消息信息:", {
                        is_user: newMsg?.is_user,
                        is_name: newMsg?.is_name, 
                        is_system: newMsg?.is_system,
                        name: newMsg?.name,
                        mes: newMsg?.mes?.substring(0, 50) + "..."
                    });
                    
                    // 检查是否是AI消息（多种判断方式）
                    const isAIMessage = newMsg && (
                        newMsg.is_user === false || 
                        newMsg.is_name === false ||
                        (!newMsg.is_user && !newMsg.is_system) ||
                        (newMsg.name && newMsg.name !== 'You' && newMsg.name !== ctx.name1)
                    ) && newMsg.mes;
                    
                    if (isAIMessage) {
                        console.log(`[RealWorld] 检测到新AI消息，当前: ${currentCount}, 预计: ${expectedCount}`);
                        
                        // 检查是否达到预计消息数
                        if (currentCount >= expectedCount) {
                            console.log("[RealWorld] 达到预计消息数，执行更新");
                            
                            updateWorldLocationEntry().then(() => {
                                // 重新计算下一个预计消息数
                                const addValue = parseInt(addNumberInput.value) || 0;
                                expectedCount = currentCount + addValue;
                                expectedMsgSpan.textContent = expectedCount;
                                console.log(`[RealWorld] 更新完成，下次预计消息数: ${expectedCount}`);
                            }).catch(err => {
                                console.error("[RealWorld] 自动更新失败:", err);
                            });
                        }
                    } else {
                        console.log("[RealWorld] 不是AI消息，跳过");
                    }
                }
            }, 100); // 100ms 延迟
        });
        
        // 监听多个可能的容器
        const containers = [
            document.getElementById('chat'),
            document.querySelector('#chat'),
            document.querySelector('.chat-container'),
            document.querySelector('[id*="chat"]')
        ].filter(Boolean);
        
        if (containers.length > 0) {
            const targetContainer = containers[0];
            console.log("[RealWorld] 监听容器:", targetContainer);
            
            autoObserver.observe(targetContainer, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'data-*']
            });
        } else {
            console.error('[RealWorld] 未找到聊天容器，无法自动化');
            alert("⚠️ 未找到聊天容器，自动更新功能可能无法正常工作");
        }
        
    } else {
        console.log("[RealWorld] 自动更新模式已关闭");
        if (autoObserver) {
            autoObserver.disconnect();
            autoObserver = null;
        }
        refreshMessageCounts();
    }
}

// 添加一个辅助函数来定期检查消息数（作为备用方案）
let checkInterval = null;

function startIntervalCheck() {
    if (checkInterval) clearInterval(checkInterval);
    
    checkInterval = setInterval(() => {
        if (!autoUpdateActive) {
            clearInterval(checkInterval);
            return;
        }
        
        const ctx = globalThis.SillyTavern.getContext();
        if (!ctx || !Array.isArray(ctx.chat)) return;
        
        const currentCount = ctx.chat.length;
        currentMsgSpan.textContent = currentCount;
        
        if (currentCount > lastMessageCount) {
            console.log(`[RealWorld] (定时检查) 消息数变化: ${lastMessageCount} -> ${currentCount}`);
            lastMessageCount = currentCount;
            
            if (currentCount >= expectedCount) {
                console.log("[RealWorld] (定时检查) 达到预计消息数，执行更新");
                updateWorldLocationEntry().then(() => {
                    const addValue = parseInt(addNumberInput.value) || 0;
                    expectedCount = currentCount + addValue;
                    expectedMsgSpan.textContent = expectedCount;
                });
            }
        }
    }, 1000); // 每秒检查一次
}

// 修改 toggleAutoUpdate 函数，在开启自动更新时也启动定时检查
// 在 if (autoUpdateActive) 块的末尾添加：
if (autoUpdateActive) {
    // ... 现有代码 ...
    
    // 启动定时检查作为备用
    startIntervalCheck();
}

  // 事件监听
  updateNowBtn.addEventListener("click", updateWorldLocationEntry);
  autoUpdateBtn.addEventListener("click", () => toggleAutoUpdate());
  addNumberInput.addEventListener("input", () => {
    saveNumber();
    refreshMessageCounts();
  });

  // 初始化显示
  refreshMessageCounts();

  // 页面加载时读取持久化的自动更新状态
  const savedAutoMode = localStorage.getItem(AUTO_MODE_KEY);
  if (savedAutoMode === '1') {
    toggleAutoUpdate(true); // 强制开启
  }
}



  function log(msg) {
    const logBox = document.getElementById("rw-log");
    if (!logBox) return;
    const line = document.createElement("div");
    const time = new Date().toLocaleTimeString();
    line.textContent = `[${time}] ${msg}`;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
  }
})();