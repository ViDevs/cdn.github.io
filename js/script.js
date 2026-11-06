(function() {
  // ==========================================
  // 1. DISCLAIMER BANNER
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
  // 3. UI TWEAKS
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

  // ==========================================
  // 4. DONATION & LEADERBOARD LOGIC
  // ==========================================
  let allDonorsCache = [];
  let currentRenderedIndex = 0;
  const CHUNK_SIZE = 10;
  
  function renderDonorsChunk() {
    const listContainer = document.getElementById('donors-inner-list');
    if (!listContainer || currentRenderedIndex >= allDonorsCache.length) return;

    const chunk = allDonorsCache.slice(currentRenderedIndex, currentRenderedIndex + CHUNK_SIZE);
    let html = '';
    chunk.forEach(d => {
        const amt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(d.amount);
        const date = new Date(d.created_at * 1000).toLocaleDateString('vi-VN');
        const safeDonorName = String(d.donor_name).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        html += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--donate-card); border: 1px solid var(--donate-border); border-radius: 8px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
             <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 13px; font-weight: 600; color: var(--donate-text);">${safeDonorName}</span>
                <span style="font-size: 11px; color: var(--donate-muted);">${date}</span>
             </div>
             <div style="font-size: 13px; font-weight: 700; color: #ff4d4f;">+${amt}</div>
          </div>
        `;
    });
    listContainer.insertAdjacentHTML('beforeend', html);
    currentRenderedIndex += CHUNK_SIZE;
  }

  async function fetchDonations() {
    const listWrap = document.getElementById('donors-list');
    if (!listWrap) return;
    
    try {
        const res = await fetch('/api/donations');
        if (!res.ok) throw new Error("HTTP " + res.status);
        
        const data = await res.json();
        
        const TARGET_MONTH = 1000000;
        const TARGET_YEAR = 12000000;
        
        const totalMonth = data.total_month || 0;
        const totalYear = data.total_year || 0;
        
        const monthPct = Math.min(100, Math.round((totalMonth / TARGET_MONTH) * 100));
        const yearPct = Math.min(100, Math.round((totalYear / TARGET_YEAR) * 100));
        const formatVND = (num) => new Intl.NumberFormat('vi-VN').format(num) + 'đ';
        
        if (document.getElementById('prog-month-text')) {
            document.getElementById('prog-month-text').textContent = formatVND(totalMonth);
            document.getElementById('prog-month-pct').textContent = monthPct + '%';
            document.getElementById('prog-month-fill').style.width = monthPct + '%';
        }
        
        if (document.getElementById('prog-year-text')) {
            document.getElementById('prog-year-text').textContent = formatVND(totalYear);
            document.getElementById('prog-year-pct').textContent = yearPct + '%';
            document.getElementById('prog-year-fill').style.width = yearPct + '%';
        }

        const donors = data.donors || [];
        if(!Array.isArray(donors)) throw new Error("Invalid array");
        
        if(donors.length === 0) {
            listWrap.innerHTML = '<div style="text-align: center; color: var(--donate-muted); font-size: 13.5px; font-style: italic; padding: 20px;">Chưa có dữ liệu. Hãy là người đầu tiên!</div>';
            return;
        }
        
        allDonorsCache = donors;
        currentRenderedIndex = 0;
        listWrap.innerHTML = '<div id="donors-inner-list"></div><div id="donors-sentinel" style="height: 10px;"></div>';
        renderDonorsChunk(); 

        const sentinel = document.getElementById('donors-sentinel');
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) renderDonorsChunk();
        }, { root: listWrap, threshold: 0.1 });
        observer.observe(sentinel);

    } catch (err) {
        console.error("Lỗi bảng vàng:", err);
        listWrap.innerHTML = '<div style="text-align: center; color: #ff4d4f; font-size: 13px; padding: 20px;">Đang thiết lập hệ thống máy chủ...</div>';
    }
  }

  function triggerConfetti(container) {
    const text = document.createElement('div');
    text.innerHTML = "🎉 THÀNH CÔNG 🎉";
    text.style.cssText = "color: #1890ff; font-weight: 900; font-size: 22px; animation: popIn 0.5s ease; margin-bottom:10px;";
    
    if (!document.getElementById('confetti-style')) {
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.innerHTML = "@keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }";
        document.head.appendChild(style);
    }
    
    container.innerHTML = "";
    container.appendChild(text);
    container.insertAdjacentHTML('beforeend', '<p style="color:var(--donate-muted);font-size:14px;">Cảm ơn bạn đã ủng hộ dự án!</p>');
  }

  let pollInterval = null; 

  function initDonateModal() {
    if (document.getElementById('donate-modal')) return;    
    
    const style = document.createElement('style');
    style.innerHTML = `
      :root {
         --donate-bg-main: #ffffff;
         --donate-bg-sub: #f8f9fa;
         --donate-border: #eceef0;
         --donate-text: #11181c;
         --donate-text-sub: #555555;
         --donate-muted: #687076;
         --donate-input-bg: #f8f9fa;
         --donate-card: #ffffff;
      }
      html.hope-ui-dark, @media (prefers-color-scheme: dark) {
         :root {
             --donate-bg-main: #1a202c;
             --donate-bg-sub: #2d3748;
             --donate-border: #4a5568;
             --donate-text: #e2e8f0;
             --donate-text-sub: #a0aec0;
             --donate-muted: #a0aec0;
             --donate-input-bg: #2d3748;
             --donate-card: #2d3748;
         }
      }
    `;
    document.head.appendChild(style);

    const modal = document.createElement('div');
    modal.id = 'donate-modal';
    modal.className = 'donate-overlay';
    
    modal.onclick = function(e) {
        if (e.target === this) {
            if (pollInterval) clearInterval(pollInterval);
            this.classList.remove('active');
        }
    };    
    
    const BANK_BIN = "970422"; 
    const ACCOUNT_NO = "00888886666";

    modal.innerHTML = `
      <div class="donate-modal" style="background: var(--donate-bg-main); color: var(--donate-text); max-width: 720px; width: 90%; max-height: 90vh; overflow-y: auto; overflow-x: hidden; word-break: break-word; display: flex; flex-wrap: wrap; padding: 0; text-align: left; border-radius: 16px; position: relative; box-shadow: 0 10px 40px rgba(0,0,0,0.3); margin: auto;">
        <span class="donate-close" id="btn-close-modal" style="position: absolute; top: 12px; right: 18px; font-size: 26px; cursor: pointer; color: #999; z-index: 10; line-height: 1;">&times;</span>
        
        <div style="flex: 1; min-width: 320px; padding: 28px; background: var(--donate-bg-main);">
          <div style="font-size: 20px; font-weight: 800; margin-bottom: 8px;">☕ Ủng hộ Dự án</div>
          <div style="font-size: 13.5px; color: var(--donate-text-sub); margin-bottom: 8px; line-height: 1.5;">Hệ thống được vận hành và lưu trữ bằng kinh phí cá nhân. Nếu bạn thấy trang web hữu ích, hãy ủng hộ admin một ly cà phê để có thêm động lực duy trì và phát triển dự án nhé! ❤️</div>
          <div style="font-size: 13.5px; color: var(--donate-text-sub); margin-bottom: 20px; line-height: 1.5;">Hãy nhập họ tên của bạn và số tiền donate!</div>
          
          <div style="margin-bottom: 12px;">
            <label style="font-size: 13px; font-weight: 600; color: var(--donate-muted);">Họ tên:</label>
            <input type="text" id="dynamic-donor-name" placeholder="Ví dụ: Nguyen Van A" style="width: 100%; padding: 10px; margin-top: 6px; border: 1px solid var(--donate-border); border-radius: 8px; font-size: 14px; outline: none; background: var(--donate-input-bg); color: var(--donate-text);">
          </div>
          
          <div style="margin-bottom: 16px;">
            <label style="font-size: 13px; font-weight: 600; color: var(--donate-muted);">Số tiền (VNĐ):</label>
            <input type="number" id="dynamic-donor-amount" value="50000" style="width: 100%; padding: 10px; margin-top: 6px; border: 1px solid var(--donate-border); border-radius: 8px; font-size: 14px; outline: none; background: var(--donate-input-bg); color: var(--donate-text);">
          </div>

          <button id="btn-generate-qr" style="width: 100%; padding: 12px; background: #1890ff; color: #fff; border: none; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; transition: 0.2s; margin-bottom: 16px;">Xem mã QR</button>
          
          <div id="dynamic-qr-box" style="display: none; background: var(--donate-bg-sub); padding: 16px; border-radius: 12px; border: 1px solid var(--donate-border); text-align: center;">
          </div>
        </div>

        <div style="flex: 1; min-width: 300px; padding: 28px; background: var(--donate-bg-sub); border-left: 1px solid var(--donate-border); display: flex; flex-direction: column;">
           <div style="font-size: 17px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">🌟 Bảng vàng vinh danh</div>
           
           <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--donate-muted); margin-bottom: 4px;">
                 <span>Mục tiêu năm: <b id="prog-year-text" style="color: #1890ff;">0đ</b> / 12.000.000đ</span>
                 <span id="prog-year-pct" style="color: #1890ff; font-weight: 600;">0%</span>
              </div>
              <div style="width: 100%; height: 8px; background: #e1f0ff; border-radius: 99px; overflow: hidden;">
                 <div id="prog-year-fill" style="height: 100%; width: 0%; background: #1890ff; border-radius: 99px; transition: width 0.8s ease;"></div>
              </div>
           </div>

           <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px dashed var(--donate-border);">
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--donate-muted); margin-bottom: 4px;">
                 <span>Mục tiêu tháng: <b id="prog-month-text" style="color: #1890ff;">0đ</b> / 1.000.000đ</span>
                 <span id="prog-month-pct" style="color: #1890ff; font-weight: 600;">0%</span>
              </div>
              <div style="width: 100%; height: 8px; background: #e1f0ff; border-radius: 99px; overflow: hidden;">
                 <div id="prog-month-fill" style="height: 100%; width: 0%; background: #1890ff; border-radius: 99px; transition: width 0.8s ease;"></div>
              </div>
           </div>

           <div id="donors-list" style="flex: 1; overflow-y: auto; overflow-x: hidden; max-height: 250px; padding-right: 6px;">
              <div style="text-align: center; color: var(--donate-muted); font-size: 13.5px; font-style: italic;">Đang tải danh sách...</div>
           </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btn-close-modal').addEventListener('click', function() {
        if (pollInterval) clearInterval(pollInterval);
        modal.classList.remove('active');
    });

    document.getElementById('btn-generate-qr').addEventListener('click', async function() {
        const btn = document.getElementById('btn-generate-qr');
        btn.textContent = "Đang kết xuất ảnh...";
        btn.style.opacity = "0.7";
        btn.style.pointerEvents = "none";

        try {
            if (typeof QRious === 'undefined') {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js";
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            if (!document.getElementById('polling-spinner-style')) {
                const style = document.createElement('style');
                style.id = 'polling-spinner-style';
                style.innerHTML = "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } .polling-spinner { border: 3px solid #f3f3f3; border-top: 3px solid #1890ff; border-radius: 50%; width: 16px; height: 16px; animation: spin 1s linear infinite; }";
                document.head.appendChild(style);
            }

            const nameInput = document.getElementById('dynamic-donor-name').value.trim();
            let amountInput = document.getElementById('dynamic-donor-amount').value.trim();
            amountInput = amountInput ? String(Number(amountInput)) : "";
            
            const safeName = nameInput ? nameInput.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "") : "Nha Hao Tam";
            
            const randomCode = Math.floor(1000 + Math.random() * 9000);
            const txCode = ("DONATE " + safeName + " " + randomCode).substring(0, 30).toUpperCase();

            const pad = (n) => n < 10 ? '0' + n : String(n);
            const tlv = (id, val) => id + pad(val.length) + val;
            
            const field00 = tlv('00', '01');
            const field01 = tlv('01', amountInput ? '12' : '11');
            const guid = tlv('00', 'A000000727');
            const bank = tlv('00', BANK_BIN) + tlv('01', ACCOUNT_NO);
            const beneOrg = tlv('01', bank);
            const serviceCode = tlv('02', 'QRIBFTTA');
            
            const field38 = tlv('38', guid + beneOrg + serviceCode);
            const field53 = tlv('53', '704');
            const field54 = amountInput ? tlv('54', amountInput) : '';
            const field58 = tlv('58', 'VN');
            const field62 = txCode ? tlv('62', tlv('08', txCode)) : '';
            
            const payload = field00 + field01 + field38 + field53 + field54 + field58 + field62 + '6304';
            
            let crc = 0xFFFF;
            for (let i = 0; i < payload.length; i++) {
                crc ^= payload.charCodeAt(i) << 8;
                for (let j = 0; j < 8; j++) {
                    if ((crc & 0x8000) > 0) crc = (crc << 1) ^ 0x1021;
                    else crc = crc << 1;
                }
            }
            const crcStr = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
            const finalQRString = payload + crcStr;

            const qr = new QRious({
                value: finalQRString,
                size: 350,
                level: 'M'
            });
            const base64Png = qr.toDataURL('image/png');
            
            const qrBox = document.getElementById('dynamic-qr-box');
            qrBox.innerHTML = `
                 <img src="${base64Png}" alt="Mã QR Chuyển khoản" style="display: block; margin: 0 auto 12px auto; width: 180px; height: 180px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); background:#fff;">
                 <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom: 8px;">
                    <div class="polling-spinner" id="poll-spin-icon"></div>
                    <p style="font-size: 13px; color: #1890ff; font-weight:600; margin:0;" id="poll-spin-text">Đang chờ ngân hàng xác nhận...</p>
                 </div>
                 <p style="font-size: 11.5px; color: var(--donate-muted); font-style: italic; margin-bottom: 12px;" id="timeout-msg">(Vui lòng không đóng cửa sổ này, hệ thống sẽ tự cập nhật khi nhận được tiền)</p>
                 <a href="${base64Png}" download="QR_Donate_Cloudily.png" style="display: inline-block; padding: 8px 16px; background: #e1f0ff; color: #1890ff; font-weight: 600; font-size: 13px; text-decoration: none; border-radius: 6px;">⬇️ Tải mã QR</a>
            `;
            
            btn.style.display = 'none';
            qrBox.style.display = 'block';

            if (pollInterval) clearInterval(pollInterval);
            let pollCount = 0;
            pollInterval = setInterval(async () => {
                pollCount++;
                if (pollCount > 20) { 
                    clearInterval(pollInterval);
                    document.getElementById('timeout-msg').innerHTML = "<span style='color:#eab308;font-weight:600;'>⏳ Đã hết thời gian chờ tự động.</span> Nếu bạn đã chuyển khoản, hệ thống vẫn sẽ ghi nhận trên Bảng vàng sau ít phút.";
                    document.getElementById('poll-spin-icon').style.display = 'none';
                    document.getElementById('poll-spin-text').style.color = '#eab308';
                    document.getElementById('poll-spin-text').textContent = 'Tạm dừng kiểm tra';
                    return;
                }
                try {
                    const res = await fetch(`/api/check-donate?tx=${encodeURIComponent(txCode)}`);
                    const data = await res.json();
                    if (data.success) {
                        clearInterval(pollInterval); 
                        triggerConfetti(document.getElementById('dynamic-qr-box')); 
                        fetchDonations();
                    }
                } catch(e) { }
            }, 3000);

        } catch (err) {
            console.error(err);
            alert("Lỗi hệ thống: Không thể khởi tạo mã QR.");
            btn.textContent = "Xem mã QR";
            btn.style.opacity = "1";
            btn.style.pointerEvents = "auto";
        }
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
    
    donate.onclick = (e) => {
        e.preventDefault();
        const modal = document.getElementById('donate-modal');
        if (modal) {
           modal.classList.add('active');
           document.getElementById('donors-list').innerHTML = '<div style="text-align: center; color: var(--donate-muted); font-size: 13.5px; font-style: italic;">Đang tải danh sách...</div>';
           fetchDonations();
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
  // 5. OBSERVERS SET UP & AUTO-OPEN MODAL
  // ==========================================
  
  if (window.location.href.includes('#donate') || window.location.href.includes('donate=1')) {
      sessionStorage.setItem('trigger_donate_modal', 'yes');
  }

  const resizeObserver = new ResizeObserver(entries => {
    window.requestAnimationFrame(() => {
      for (let entry of entries) {
        updateSubtitleFontSize(entry.target);
      }
    });
  });

  let hasAutoOpenedDonate = false;
  function checkAutoOpenDonate() {
    if (!hasAutoOpenedDonate && sessionStorage.getItem('trigger_donate_modal') === 'yes') {
      const modal = document.getElementById('donate-modal');
      if (modal) {
         hasAutoOpenedDonate = true; 
         sessionStorage.removeItem('trigger_donate_modal'); 
         
         setTimeout(() => {
             const activeModal = document.getElementById('donate-modal');
             if (activeModal) {
                 activeModal.classList.add('active');
                 document.getElementById('donors-list').innerHTML = '<div style="text-align: center; color: var(--donate-muted); font-size: 13.5px; font-style: italic;">Đang tải danh sách...</div>';
                 fetchDonations();
             }
         }, 400);
         
         const currentUrl = window.location.href;
         if (currentUrl.includes('donate')) {
             let cleanUrl = currentUrl.replace('#donate', '').replace('?donate=1', '').replace('&&', '&');
             if (cleanUrl.endsWith('?')) cleanUrl = cleanUrl.slice(0, -1);
             history.replaceState(null, null, cleanUrl);
         }
      }
    }
  }

  const mainAppObserver = new MutationObserver(() => {
    renameDashboard();
    hideSpecificMenus();
    hideOverwriteCheckbox(); 
    fixFooter();
    checkAutoOpenDonate(); 

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
    checkAutoOpenDonate(); 
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
