import './style.css';
import { router } from './router';
import { header } from './components/Header';
import { AddressDisplay } from './components/AddressDisplay';
import { HomePage } from './pages/Home';
import { nftPage } from './pages/Nft';
import { nftDetailPage } from './pages/NftDetail';
import { mintPage } from './pages/Mint';
import { shopPage } from './pages/Shop';
import { createItemPage } from './pages/CreateItem';
import { itemDetailPage } from './pages/ItemDetail';
import { profilePage } from './pages/Profile';
import { ContentsPage } from './pages/Contents';
import './utils/mobileConsole';

const app = document.querySelector('#app');

// Navigation items
const navItems = [
  { 
    id: 'home', 
    label: 'Home', 
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>' 
  },
  { 
    id: 'nft', 
    label: 'NFT', 
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="10" height="10" rx="1" ry="1"></rect><path d="M7 3v4"></path><path d="M17 3v4"></path><path d="M7 17v4"></path><path d="M17 17v4"></path><path d="M3 7h4"></path><path d="M17 7h4"></path><path d="M3 17h4"></path><path d="M17 17h4"></path></svg>' 
  },
  { 
    id: 'mint', 
    label: 'Mint', 
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' 
  },
  { 
    id: 'shop', 
    label: 'Shop', 
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>' 
  },
  { 
    id: 'profile', 
    label: 'Profile', 
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' 
  }
];

// Create app structure
function createAppStructure() {
  app.innerHTML = `
    <div class="app-container">
      <header id="app-header" class="app-header"></header>
      <div id="page-content" class="page-content"></div>
      <nav class="bottom-nav">
        ${navItems.map(item => `
          <button class="nav-item" data-route="${item.id}">
            <span class="nav-icon">${item.icon}</span>
            <span class="nav-label">${item.label}</span>
          </button>
        `).join('')}
      </nav>
    </div>
  `;
  
  // Initialize header
  header.render();
  header.checkConnection();
  
  // Add click handlers to navigation items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const route = item.getAttribute('data-route');
      router.navigate(route);
    });
  });
}

// Update navigation active state
function updateNavigation(route) {
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-route') === route) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// Page renderers
function renderPage(content) {
  const pageContent = document.getElementById('page-content');
  if (pageContent) {
    pageContent.innerHTML = content;
  }
}

// Route handlers
router.addRoute('home', async () => {
  renderPage(await HomePage());
  updateNavigation('home');
});

router.addRoute('nft', () => {
  nftPage.render();
  nftPage.loadNFTs();
  updateNavigation('nft');
});

router.addRoute('mint', () => {
  mintPage.render();
  mintPage.checkConnection();
  updateNavigation('mint');
});

router.addRoute('shop', () => {
  shopPage.render();
  shopPage.loadItems();
  updateNavigation('shop');
});

router.addRoute('profile', () => {
  profilePage.render();
  updateNavigation('profile');
});

// NFT詳細ページのルート（パラメータ付き）
router.addRoute('nft/:id', (params) => {
  const tokenId = params.id;
  nftDetailPage.render();
  nftDetailPage.loadNFTDetail(tokenId);
  // 詳細ページではナビゲーションを更新しない
});

// 商品作成ページのルート
router.addRoute('shop/create', () => {
  createItemPage.render();
  updateNavigation('shop');
});

// 商品詳細ページのルート（パラメータ付き）
router.addRoute('shop/item/:id', (params) => {
  const tokenId = params.id;
  itemDetailPage.render();
  itemDetailPage.loadItemDetail(tokenId);
  updateNavigation('shop');
});

// Contentsページのルート（動的パス）
router.addRoute('contents/*', async (params) => {
  const path = window.location.hash.slice(1); // #contents/...の部分を取得
  renderPage(await ContentsPage(path));
  // Contentsページではナビゲーションを更新しない
});

// Set up route change listener
router.setOnRouteChange((route) => {
  // Route change handling can be added here if needed
});

// Initialize app
createAppStructure();
router.init();

// Make router, profilePage, nftPage, nftDetailPage, mintPage, shopPage, createItemPage, itemDetailPage and header available globally
window.router = router;
window.profilePage = profilePage;
window.nftPage = nftPage;
window.nftDetailPage = nftDetailPage;
window.mintPage = mintPage;
window.shopPage = shopPage;
window.createItemPage = createItemPage;
window.itemDetailPage = itemDetailPage;
window.header = header;

// Listen for wallet events
window.addEventListener('walletConnected', (e) => {
  console.log('Wallet connected:', e.detail.account);
  // Profile pageを更新
  if (router.getCurrentRoute() === 'profile' && profilePage) {
    profilePage.render();
  }
  // NFT pageを更新
  if (router.getCurrentRoute() === 'nft' && nftPage) {
    nftPage.loadNFTs();
  }
});

window.addEventListener('walletDisconnected', () => {
  console.log('Wallet disconnected');
  // Profile pageを更新
  if (router.getCurrentRoute() === 'profile' && profilePage) {
    profilePage.render();
  }
  // NFT pageを更新
  if (router.getCurrentRoute() === 'nft' && nftPage) {
    nftPage.setState({
      userNfts: [],
      filter: 'all'
    });
  }
});