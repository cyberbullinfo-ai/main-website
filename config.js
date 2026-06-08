// Configure API origin for deployments (set to your backend URL, without trailing slash)
// Example: window.API_ORIGIN = 'https://api.example.com';
// If left unset, the site will attempt to use a subpath-aware relative `/api/*` (useful for GitHub Pages + a backend served under the same repo path).

window.API_ORIGIN = window.API_ORIGIN || '';

// Convenience: central apiUrl helper for pages that don't define one.
window.apiUrl = window.apiUrl || (function(){
  return function(path){
    if (!path) return path;
    if (!path.startsWith('/')) path = '/' + path;
    if (window.API_ORIGIN && typeof window.API_ORIGIN === 'string' && window.API_ORIGIN.trim()) {
      const base = window.API_ORIGIN.replace(/\/$/, '');
      return base + path;
    }
    // fallback: detect /main-website subpath
    const p = (window.location && window.location.pathname) || '';
    const subpath = (p.indexOf('/main-website/') !== -1 || p === '/main-website') ? '/main-website' : '';
    return (subpath || '') + path;
  };
})();
