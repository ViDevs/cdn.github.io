(function() {
    function updateSubtitleFontSize(container) {
        const subtitleElement = document.querySelector('.art-subtitle');
        if (!subtitleElement || !container) return;
        const videoWidth = container.offsetWidth;
        let fontSize = videoWidth * 0.03;
        fontSize = Math.max(14, Math.min(fontSize, 45)); 
        subtitleElement.style.fontSize = fontSize + 'px';
    }
    const resizeObserver = new ResizeObserver(entries => {
        window.requestAnimationFrame(() => {
            for (let entry of entries) {
                updateSubtitleFontSize(entry.target);
            }
        });
    });
    const observer = new MutationObserver(() => {
        const videoElement = document.querySelector('.art-video') || (document.querySelector('video') ? document.querySelector('video').parentNode : null);
        if (videoElement && !videoElement.dataset.subtitleObserved) {
            videoElement.dataset.subtitleObserved = 'true';
            resizeObserver.observe(videoElement);
            updateSubtitleFontSize(videoElement);
        }
    });
    const root = document.getElementById('root') || document.body;
    observer.observe(root, { childList: true, subtree: true });
})();

(function () {
  const STORAGE_KEY = 'disclaimer_accepted_v1';
  if (localStorage.getItem(STORAGE_KEY)) return;
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
})();

function fixFooter() {
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
    footer.appendChild(authLink);    
    
    footer.style.display = 'flex';
    footer.style.flexDirection = 'row';
    footer.style.alignItems = 'center';
    footer.style.justifyContent = 'center';
    footer.style.gap = '10px';
    footer.style.fontSize = '16px';
}

const appObserver = new MutationObserver(() => {
    const footer = document.querySelector('.footer');
    if (footer && footer.dataset.customized !== 'true') {
        fixFooter();
    }
});
appObserver.observe(document.body, { childList: true, subtree: true });
window.addEventListener('load', fixFooter);
