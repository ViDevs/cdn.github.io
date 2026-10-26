(function() {
  // ==========================================
  // 1. DISCLAIMER BANNER (Runs once on load)
  // ==========================================
  const STORAGE_KEY = 'disclaimer_accepted_v1';
  if (!localStorage.getItem(STORAGE_KEY)) {
    const banner = document.createElement('div');
    banner.id = 'site-disclaimer';
    banner.innerHTML = `
      <span class="disc-icon">⚠️</span>
      <div class="disc-body">
        <div class="disc-title">Tuyên bố miễn trừ trách nhiệm</div>
        <div class="disc-text">
          Website này được xây dựng và vận hành <strong>hoàn toàn vì mục đích cá nhân, phi thương mại</strong>,
          không có bất kỳ hình thức kinh doanh, thu phí hay khai thác thương mại nào.
          Một số nội dung lưu trữ trên website có thể <span class="disc-highlight">thuộc quyền sở hữu của bên thứ ba</span>.
          Người quản trị không sở hữu, không phân phối và không kiếm lợi nhuận từ các nội dung đó.
          Nếu bạn tiếp tục truy cập, sử dụng và chia sẻ, bạn <strong>tự chịu hoàn toàn trách nhiệm pháp lý</strong> về
          việc sử dụng nội dung theo đúng quy định pháp luật tại quốc gia của bạn.
          Người quản trị <strong>không chịu bất kỳ trách nhiệm nào</strong> phát sinh từ hành vi sử dụng
          nội dung của người dùng, bao gồm nhưng không giới hạn ở các vi phạm bản quyền hay pháp luật liên quan.
        </div>
      </div>
      <button class="disc-btn" id="disc-accept-btn">Đã hiểu & Đồng ý</button>
    `;
    document.body.appendChild(banner);
    document.getElementById('disc-accept-btn').addEventListener('click', function () {
      localStorage.setItem(STORAGE_KEY, '1');
      banner.style.transition = 'opacity 0.3s, transform 0.3s';
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(100%)';
      setTimeout(() => banner.remove(), 320);
    });
  }

  // ==========================================
  // 2. CLIPBOARD INTERCEPTOR (Dành riêng cho hàm OC của AList)
  // ==========================================
  function formatProxyUrl(text) {
    if (typeof text === 'string' && text.includes('https://cloudily.org/d/')) {
      return text.replace(/https:\/\/cloudily\.org\/d\//g, 'https://drive.cloudily.org/');
    }
    return text;
  }

  function interceptClipboard() {
    // 2A. Chặn trực tiếp lúc AList gọi o.selectNodeContents(s) trên thẻ <span>
    if (typeof Range !== 'undefined' && Range.prototype && Range.prototype.selectNodeContents) {
      const origSelectNodeContents = Range.prototype.selectNodeContents;
      Range.prototype.selectNodeContents = function(node) {
        if (node && node.textContent && node.textContent.includes('https://cloudily.org/d/')) {
          node.textContent = formatProxyUrl(node.textContent);
        }
        return origSelectNodeContents.call(this, node);
      };
    }

    // 2B. Chặn sự kiện copy ở pha Capture (chạy trước khi thẻ <span> gọi stopPropagation)
    window.addEventListener('copy', function(e) {
      const sel = document.getSelection ? document.getSelection() : null;
      const selectedText = sel ? sel.toString() : '';
      if (selectedText && selectedText.includes('https://cloudily.org/d/') && e.clipboardData) {
        e.clipboardData.setData('text/plain', formatProxyUrl(selectedText));
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);

    // 2C. Chặn document.execCommand('copy') để kiểm tra vùng chọn hiện tại
    const originalExecCommand = document.execCommand;
    document.execCommand = function(command, ui, value) {
      if (command && command.toLowerCase() === 'copy') {
        const sel = document.getSelection ? document.getSelection() : null;
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const node = range.commonAncestorContainer;
          const el = node.nodeType === 3 ? node.parentElement : node;
          if (el && el.textContent && el.textContent.includes('https://cloudily.org/d/')) {
            el.textContent = formatProxyUrl(el.textContent);
            range.selectNodeContents(el);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }
      return originalExecCommand.apply(this, arguments);
    };

    // 2D. Dự phòng cho API Clipboard hiện đại
    if (navigator.clipboard && navigator.clipboard.writeText) {
      const originalNavWriteText = navigator.clipboard.writeText;
      navigator.clipboard.writeText = function(text) {
        return originalNavWriteText.call(navigator.clipboard, formatProxyUrl(text));
      };
    }
  }

  interceptClipboard();

  // ==========================================
  // 3. HELPER FUNCTIONS FOR DOM MUTATIONS
  // ==========================================
  function renameDashboard() {
    if (document.title.includes('AList Manage')) {
      document.title = document.title.replace('AList Manage', 'Dashboard');
    }
    const headings = document.querySelectorAll('h2.hope-heading');
    headings.forEach(heading => {
      if (heading.textContent.trim() === 'AList Manage') {
        heading.textContent = 'Dashboard';
      }
    });
  }

  function hideSpecificMenus() {
    const links = document.querySelectorAll('a'); 
    links.forEach(link => {
      const text = link.textContent.trim();
      if (text === 'About' || text === 'Documentation') {
        link.style.display = 'none';
      }
    });
  }

  function hideOverwriteCheckbox() {
    const labels = document.querySelectorAll('label.hope-checkbox');
    labels.forEach(label => {
      if (label.textContent.includes('Overwrite existing files')) {
        label.style.display = 'none';
      }
    });
  }

  function updateSubtitleFontSize(container) {
    const subtitleElement = document.querySelector('.art-subtitle');
    if (!subtitleElement || !container) return;
    const videoWidth = container.offsetWidth;
    let fontSize = videoWidth * 0.03;
    fontSize = Math.max(14, Math.min(fontSize, 45)); 
    subtitleElement.style.fontSize = fontSize + 'px';
  }

  function initDonateModal() {
    if (document.getElementById('donate-modal')) return;    
    const modal = document.createElement('div');
    modal.id = 'donate-modal';
    modal.className = 'donate-overlay';
    modal.onclick = function(e) {
        if (e.target === this) this.classList.remove('active');
    };    
    modal.innerHTML = `
      <div class="donate-modal">
        <span class="donate-close" onclick="document.getElementById('donate-modal').classList.remove('active')">&times;</span>
        <div class="donate-title">☕ Ủng hộ Dự án</div>
        <div class="donate-desc">
          Hệ thống được vận hành và lưu trữ bằng kinh phí cá nhân. Nếu bạn thấy trang web hữu ích, hãy ủng hộ admin một ly cà phê để có thêm động lực duy trì và phát triển dự án nhé! ❤️
        </div>
        <div class="qr-wrapper">
          <div class="qr-box">
            <img src="https://cdn.cloudily.org/img/momo-qr.png" alt="MoMo">
            <span class="qr-name" style="color: #A50064;">MoMo</span>
          </div>
          <div class="qr-box">
            <img src="https://cdn.cloudily.org/img/vtpay-qr.png" alt="Viettel Money">
            <span class="qr-name" style="color: #EE0033;">Viettel Money</span>
          </div>
          <div class="qr-box">
            <img src="https://cdn.cloudily.org/img/mb-qr.png" alt="MB Bank">
            <span class="qr-name" style="color: #123281;">MB Bank</span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function fixFooter() {
    initDonateModal();
    
    const footer = document.querySelector('.footer');
    if (!footer || footer.dataset.customized === 'true') return;    
    
    footer.innerHTML = '';
    footer.dataset.customized = 'true';    
    
    const copyright = document.createElement('a');
    copyright.href = '/';
    copyright.textContent = '© 2026. Cloudily';
    copyright.style.color = 'inherit';
    copyright.style.textDecoration = 'none';
    copyright.style.whiteSpace = 'nowrap';
    copyright.onmouseover = () => copyright.style.textDecoration = 'underline';
    copyright.onmouseout  = () => copyright.style.textDecoration = 'none';    
    
    const donate = document.createElement('a');
    donate.href = 'javascript:void(0)';
    donate.textContent = '💖 Donate';
    donate.style.color = '#ff4d4f';
    donate.style.fontWeight = 'bold';
    donate.style.textDecoration = 'none';
    donate.style.whiteSpace = 'nowrap';
    donate.onclick = (e) => {
        e.preventDefault();
        const modal = document.getElementById('donate-modal');
        if (modal) modal.classList.add('active');
    };
    
    const token = localStorage.getItem('token');
    const isLoggedIn = (token && token !== 'undefined' && token !== 'null' && token.length > 0);    
    
    const authLink = document.createElement('a');
    authLink.href = isLoggedIn ? '/@manage' : '/@login';
    authLink.textContent = isLoggedIn ? 'Manage' : 'Login';
    authLink.style.color = 'inherit';
    authLink.style.textDecoration = 'none';
    authLink.style.whiteSpace = 'nowrap';    
    
    const leaderboard = document.createElement('a');
    leaderboard.href = '/leaderboard';
    leaderboard.textContent = 'Top Contributors';
    leaderboard.style.color = '#eab308';
    leaderboard.style.fontWeight = 'bold';
    leaderboard.style.textDecoration = 'none';
    leaderboard.style.whiteSpace = 'nowrap';

    footer.appendChild(copyright);
    footer.appendChild(document.createTextNode(' | '));
    footer.appendChild(leaderboard);
    footer.appendChild(document.createTextNode(' | '));
    footer.appendChild(donate);
    footer.appendChild(document.createTextNode(' | '));
    footer.appendChild(authLink);    
    
    footer.style.display = 'flex';
    footer.style.flexDirection = 'row';
    footer.style.alignItems = 'center';
    footer.style.justifyContent = 'center';
    footer.style.gap = '10px';
    footer.style.fontSize = '16px';
  }

  // ==========================================
  // 4. OBSERVERS SET UP
  // ==========================================
  const resizeObserver = new ResizeObserver(entries => {
    window.requestAnimationFrame(() => {
      for (let entry of entries) {
        updateSubtitleFontSize(entry.target);
      }
    });
  });

  const mainAppObserver = new MutationObserver(() => {
    renameDashboard();
    hideSpecificMenus();
    hideOverwriteCheckbox(); 
    fixFooter();

    const videoElement = document.querySelector('.art-video') || (document.querySelector('video') ? document.querySelector('video').parentNode : null);
    if (videoElement && !videoElement.dataset.subtitleObserved) {
      videoElement.dataset.subtitleObserved = 'true';
      resizeObserver.observe(videoElement);
      updateSubtitleFontSize(videoElement);
    }
  });

  const initMainObserver = () => {
    mainAppObserver.observe(document.body, { childList: true, subtree: true });
    renameDashboard();
    hideSpecificMenus();
    hideOverwriteCheckbox(); 
    fixFooter();
  };

  if (document.body) {
    initMainObserver();
  } else {
    window.addEventListener('DOMContentLoaded', initMainObserver);
  }

  const titleElement = document.querySelector('title');
  if (titleElement) {
    const titleObserver = new MutationObserver(renameDashboard);
    titleObserver.observe(titleElement, { childList: true });
  }
})();
