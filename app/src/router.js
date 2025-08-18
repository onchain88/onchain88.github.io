// Simple client-side router
class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.onRouteChange = null;
  }

  addRoute(path, handler) {
    this.routes[path] = handler;
  }

  navigate(path) {
    // 現在のルートと同じ場合は何もしない
    const currentHash = window.location.hash.slice(1) || 'home';
    if (currentHash === path) {
      return;
    }
    
    window.history.pushState({}, '', `#${path}`);
    this.handleRoute();
  }

  handleRoute() {
    const hash = window.location.hash.slice(1) || 'home';
    
    // まず完全一致を試す
    let route = this.routes[hash];
    let params = {};
    
    if (!route) {
      // 動的ルートのマッチング
      for (const [routePath, handler] of Object.entries(this.routes)) {
        // ワイルドカードルート（*）のサポート
        if (routePath.includes('*')) {
          const routePrefix = routePath.replace('/*', '');
          if (hash.startsWith(routePrefix + '/') || hash === routePrefix) {
            route = handler;
            params = { path: hash.substring(routePrefix.length + 1) };
            break;
          }
        }
        // パラメータルート（:）のサポート
        else if (routePath.includes(':')) {
          const routeParts = routePath.split('/');
          const hashParts = hash.split('/');
          
          if (routeParts.length === hashParts.length) {
            let match = true;
            const extractedParams = {};
            
            for (let i = 0; i < routeParts.length; i++) {
              if (routeParts[i].startsWith(':')) {
                extractedParams[routeParts[i].slice(1)] = hashParts[i];
              } else if (routeParts[i] !== hashParts[i]) {
                match = false;
                break;
              }
            }
            
            if (match) {
              route = handler;
              params = extractedParams;
              break;
            }
          }
        }
      }
    }
    
    if (route) {
      this.currentRoute = hash;
      if (this.onRouteChange) {
        this.onRouteChange(hash);
      }
      route(params);
    } else {
      // Default to home
      this.navigate('home');
    }
  }

  init() {
    window.addEventListener('popstate', () => this.handleRoute());
    this.handleRoute();
  }

  getCurrentRoute() {
    return this.currentRoute;
  }

  setOnRouteChange(callback) {
    this.onRouteChange = callback;
  }
}

export const router = new Router();