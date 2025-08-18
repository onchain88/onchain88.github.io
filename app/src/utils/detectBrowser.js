// ブラウザとモバイル環境の検出ユーティリティ

export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isMetaMaskMobile() {
  // MetaMask Mobile WebViewの検出
  return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask && isMobile();
}

export function isInMetaMaskBrowser() {
  // MetaMask Mobile内のブラウザかどうかを判定
  if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
    // MetaMaskがインストールされていて、かつモバイル環境
    return isMobile();
  }
  return false;
}

export function shouldShowMetaMaskRedirect() {
  // MetaMaskで開き直すボタンを表示すべきかどうか
  return isMobile() && !isInMetaMaskBrowser();
}

export function getMetaMaskDeepLink(url) {
  // 現在のURLまたは指定されたURLをMetaMaskで開くためのディープリンク
  const targetUrl = url || window.location.href;
  // MetaMask Mobileのディープリンクスキーム
  const cleanUrl = targetUrl.replace(/^https?:\/\//, '');
  return `https://metamask.app.link/dapp/${cleanUrl}`;
}

export function openInMetaMask() {
  // MetaMask Mobileで現在のページを開く
  const deepLink = getMetaMaskDeepLink();
  window.location.href = deepLink;
}