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
  // 2. CLIPBOARD INTERCEPTOR
  // ==========================================
  function formatProxyUrl(text) {
    if (typeof text === 'string' && text.includes('https://cloudily.org/d/')) {
      return text.replace(/https:\/\/cloudily\.org\/d\//g, 'https://drive.cloudily.org/');
    }
    return text;
  }

  function interceptClipboard() {
    if (typeof Range !== 'undefined' && Range.prototype && Range.prototype.selectNodeContents) {
      const origSelectNodeContents = Range.prototype.selectNodeContents;
      Range.prototype.selectNodeContents = function(node) {
        if (node && node.textContent && node.textContent.includes('https://cloudily.org/d/')) {
          node.textContent = formatProxyUrl(node.textContent);
        }
        return origSelectNodeContents.call(this, node);
      };
    }

    window.addEventListener('copy', function(e) {
      const sel = document.getSelection ? document.getSelection() : null;
      const selectedText = sel ? sel.toString() : '';
      if (selectedText && selectedText.includes('https://cloudily.org/d/') && e.clipboardData) {
        e.clipboardData.setData('text/plain', formatProxyUrl(selectedText));
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);

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

    if (navigator.clipboard && navigator.clipboard.writeText) {
      const originalNavWriteText = navigator.clipboard.writeText;
      navigator.clipboard.writeText = function(text) {
        return originalNavWriteText.call(navigator.clipboard, formatProxyUrl(text));
      };
    }
  }

  interceptClipboard();

  // ==========================================
  // 3. UI TWEAKS & DONATION MODAL WITH AUTO-REFRESH
  // ==========================================
  
  // Biến lưu trữ ID của bộ đếm thời gian
  let donationInterval = null;

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

  // Hàm độc lập để Fetch và Render Bảng vàng
  async function fetchDonations() {
    const listContainer = document.getElementById('donors-list');
    if (!listContainer) return;
    
    try {
        const res = await fetch('/api/donations');
        
        if (!res.ok) throw new Error("HTTP " + res.status);
        
        const donors = await res.json();
        
        // Kiểm tra an toàn: Nếu AList trả về object lỗi thay vì Array từ Worker
        if (!Array.isArray(donors)) {
            throw new Error("Route Worker chưa hoạt động, Cloudily đang chặn request.");
        }
        
        if(donors.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: #687076; font-size: 13.5px; font-style: italic; padding: 20px;">Chưa có dữ liệu. Hãy là người đầu tiên!</div>';
            return;
        }
        
        let html = '';
        donors.forEach(d => {
            const amt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(d.amount);
            const date = new Date(d.created_at * 1000).toLocaleDateString('vi-VN');
            const safeDonorName = String(d.donor_name).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            html += `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #fff; border: 1px solid #eceef0; border-radius: 8px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                 <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-size: 13px; font-weight: 600; color: #11181c;">${safeDonorName}</span>
                    <span style="font-size: 11px; color: #687076;">${date}</span>
                 </div>
                 <div style="font-size: 13px; font-weight: 700; color: #ff4d4f;">+${amt}</div>
              </div>
            `;
        });
        listContainer.innerHTML = html;
    } catch (err) {
        console.error("Lỗi bảng vàng:", err);
        listContainer.innerHTML = '<div style="text-align: center; color: #ff4d4f; font-size: 13px; padding: 20px; background: #fff1f0; border-radius: 8px;">Đang thiết lập hệ thống máy chủ...</div>';
    }
  }

  function initDonateModal() {
    if (document.getElementById('donate-modal')) return;    
    const modal = document.createElement('div');
    modal.id = 'donate-modal';
    modal.className = 'donate-overlay';
    
    // Đóng Modal và hủy bộ đếm khi click ra ngoài
    modal.onclick = function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            if (donationInterval) clearInterval(donationInterval);
        }
    };    
    
    // --- THÔNG TIN TÀI KHOẢN NHẬN TIỀN CỦA BẠN ---
    const BANK_ID = "MB";
    const ACCOUNT_NO = "00888886666";
    const ACCOUNT_NAME = "HO ANH TUNG";
    // ---------------------------------------------

    modal.innerHTML = `
      <div class="donate-modal" style="max-width: 720px; display: flex; flex-wrap: wrap; padding: 0; overflow: hidden; text-align: left;">
        <span class="donate-close" id="btn-close-modal" style="z-index: 10;">&times;</span>
        
        <!-- Cột trái: Form nhập & Hiển thị QR -->
        <div style="flex: 1; min-width: 320px; padding: 28px; background: #ffffff;">
          <div class="donate-title">☕ Ủng hộ Dự án</div>
          <div class="donate-desc">Hãy nhập họ tên của bạn và số tiền donate!</div>
          
          <div style="margin-bottom: 12px;">
            <label style="font-size: 13px; font-weight: 600; color: #687076;">Họ tên:</label>
            <input type="text" id="dynamic-donor-name" placeholder="Ví dụ: Nguyen Van A" style="width: 100%; padding: 10px; margin-top: 6px; border: 1px solid #eceef0; border-radius: 8px; font-size: 14px; outline: none; background: #f8f9fa;">
          </div>
          
          <div style="margin-bottom: 16px;">
            <label style="font-size: 13px; font-weight: 600; color: #687076;">Số tiền (VNĐ):</label>
            <input type="number" id="dynamic-donor-amount" value="20000" style="width: 100%; padding: 10px; margin-top: 6px; border: 1px solid #eceef0; border-radius: 8px; font-size: 14px; outline: none; background: #f8f9fa;">
          </div>

          <button id="btn-generate-qr" style="width: 100%; padding: 12px; background: #1890ff; color: #fff; border: none; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; transition: 0.2s; margin-bottom: 16px;">
            Xem mã QR
          </button>
          
          <!-- Nơi hiển thị mã QR Động -->
          <div id="dynamic-qr-box" style="display: none; background: #f8f9fa; padding: 16px; border-radius: 12px; border: 1px solid #eceef0; text-align: center;">
             <img id="dynamic-qr-img" src="" alt="Mã QR Chuyển khoản" style="width: 180px; height: 180px; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
             <p style="font-size: 13px; color: #11181c; margin-bottom: 4px;">Quét bằng App Ngân hàng</p>
             <p style="font-size: 12px; color: #687076; font-style: italic;">Hệ thống sẽ tự xác nhận sau 1-2 phút.</p>
          </div>
        </div>

        <!-- Cột phải: Bảng vàng -->
        <div style="flex: 1; min-width: 300px; padding: 28px; background: #f8f9fa; border-left: 1px solid #eceef0; display: flex; flex-direction: column;">
           <div style="font-size: 17px; font-weight: 700; color: #11181c; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
             🌟 Bảng vàng vinh danh
           </div>
           <div id="donors-list" style="flex: 1; overflow-y: auto; max-height: 400px; padding-right: 6px;">
              <div style="text-align: center; color: #687076; font-size: 13.5px; font-style: italic;">Đang tải danh sách...</div>
           </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Đóng Modal và hủy bộ đếm khi bấm nút X
    document.getElementById('btn-close-modal').addEventListener('click', function() {
        modal.classList.remove('active');
        if (donationInterval) clearInterval(donationInterval);
    });

    // Sự kiện tạo QR
    document.getElementById('btn-generate-qr').addEventListener('click', function() {
        const nameInput = document.getElementById('dynamic-donor-name').value.trim();
        const amountInput = document.getElementById('dynamic-donor-amount').value.trim();
        
        let safeName = nameInput ? nameInput.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "") : "Nha Hao Tam";
        const content = encodeURIComponent(`DONATE ${safeName}`.substring(0, 30));
        const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${amountInput}&addInfo=${content}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
        
        const qrBox = document.getElementById('dynamic-qr-box');
        const qrImg = document.getElementById('dynamic-qr-img');
        const btn = document.getElementById('btn-generate-qr');
        
        qrImg.src = qrUrl;
        btn.style.display = 'none';
        qrBox.style.display = 'block';
    });
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

    const leaderboard = document.createElement('a');
    leaderboard.href = '/leaderboard';
    leaderboard.rel = 'external';
    leaderboard.textContent = 'Top Contributors';
    leaderboard.style.color = '#eab308';
    leaderboard.style.fontWeight = 'bold';
    leaderboard.style.textDecoration = 'none';
    leaderboard.style.whiteSpace = 'nowrap';
    leaderboard.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = '/leaderboard';
    };
    
    const donate = document.createElement('a');
    donate.href = 'javascript:void(0)';
    donate.textContent = '💖 Donate';
    donate.style.color = '#ff4d4f';
    donate.style.fontWeight = 'bold';
    donate.style.textDecoration = 'none';
    donate.style.whiteSpace = 'nowrap';
    
    // Mở Modal, tải dữ liệu lần đầu, và kích hoạt Auto-Refresh 30s
    donate.onclick = (e) => {
        e.preventDefault();
        const modal = document.getElementById('donate-modal');
        if (modal) {
           modal.classList.add('active');
           
           // Reset giao diện list về trạng thái đang tải
           document.getElementById('donors-list').innerHTML = '<div style="text-align: center; color: #687076; font-size: 13.5px; font-style: italic;">Đang tải danh sách...</div>';
           
           // Gọi lần đầu tiên ngay lập tức
           fetchDonations();
           
           // Dọn dẹp Interval cũ (nếu có) và thiết lập lặp lại mỗi 30 giây (30000ms)
           if (donationInterval) clearInterval(donationInterval);
           donationInterval = setInterval(fetchDonations, 30000);
        }
    };
    
    const token = localStorage.getItem('token');
    const isLoggedIn = (token && token !== 'undefined' && token !== 'null' && token.length > 0);    
    
    const authLink = document.createElement('a');
    authLink.href = isLoggedIn ? '/@manage' : '/@login';
    authLink.textContent = isLoggedIn ? 'Manage' : 'Login';
    authLink.style.color = 'inherit';
    authLink.style.textDecoration = 'none';
    authLink.style.whiteSpace = 'nowrap';    
    
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
