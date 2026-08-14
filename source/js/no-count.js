// 浏览量自我排除：在自己浏览器访问一次 https://你的域名/?nocount=1 后，本浏览器不再计入不蒜子统计
(function () {
  // 处理 ?nocount=1：写入标记并清理 URL
  try {
    var u = new URL(location.href);
    if (u.searchParams.get('nocount') === '1') {
      localStorage.setItem('noCount', '1');
      u.searchParams.delete('nocount');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    }
  } catch (e) {}

  if (localStorage.getItem('noCount') !== '1') return;

  function removeCounters() {
    document.querySelectorAll('[id^="busuanzi_container"], [id^="busuanzi_value"]').forEach(function (el) { el.remove(); });
    document.querySelectorAll('script[src*="busuanzi"]').forEach(function (el) { el.remove(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeCounters);
  } else {
    removeCounters();
  }
})();
