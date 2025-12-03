// Theme switcher functionality
(function() {
  // Theme options
  const themes = [
    { id: 'light-blue', label: '☀️ Light Blue (Default)', darkTheme: false, bgClass: '' },
    { id: 'dark-navy', label: '🌙 Dark Navy', darkTheme: true, bgClass: '' },
    { id: 'ocean', label: '🌊 Ocean', darkTheme: false, bgClass: 'bg-ocean' },
    { id: 'sky', label: '🌤️ Sky', darkTheme: false, bgClass: 'bg-sky' },
    { id: 'navy-bg', label: '🎨 Navy BG', darkTheme: false, bgClass: 'bg-navy' },
  ];

  const THEME_KEY = 'carmine-theme';

  function applyTheme(themeId) {
    const theme = themes.find(t => t.id === themeId);
    if (!theme) return;

    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('dark-theme', 'bg-ocean', 'bg-sky', 'bg-navy');
    
    // Apply dark theme if needed
    if (theme.darkTheme) {
      root.classList.add('dark-theme');
    }
    
    // Apply background class if needed
    if (theme.bgClass) {
      root.classList.add(theme.bgClass);
    }

    // Update active state in menu
    document.querySelectorAll('.theme-option').forEach(opt => {
      opt.classList.remove('active');
      if (opt.dataset.theme === themeId) {
        opt.classList.add('active');
      }
    });

    // Save preference
    localStorage.setItem(THEME_KEY, themeId);
  }

  function initThemeSwitcher() {
    // Create theme menu if it doesn't exist
    const nav = document.querySelector('nav');
    if (!nav) return;

    // Check if theme switcher already exists
    if (document.querySelector('.theme-menu')) return;

    const themeMenu = document.createElement('div');
    themeMenu.className = 'theme-menu';
    
    const btn = document.createElement('button');
    btn.className = 'theme-switcher-btn';
    btn.innerHTML = '🎨 Theme';
    btn.type = 'button';
    
    const dropdown = document.createElement('div');
    dropdown.className = 'theme-dropdown';
    
    themes.forEach(theme => {
      const option = document.createElement('button');
      option.className = 'theme-option';
      option.dataset.theme = theme.id;
      option.innerHTML = theme.label;
      option.type = 'button';
      
      option.addEventListener('click', (e) => {
        e.preventDefault();
        applyTheme(theme.id);
        themeMenu.classList.remove('active');
      });
      
      dropdown.appendChild(option);
    });
    
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      themeMenu.classList.toggle('active');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!themeMenu.contains(e.target)) {
        themeMenu.classList.remove('active');
      }
    });
    
    themeMenu.appendChild(btn);
    themeMenu.appendChild(dropdown);
    nav.appendChild(themeMenu);

    // Load saved theme or apply default
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light-blue';
    applyTheme(savedTheme);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeSwitcher);
  } else {
    initThemeSwitcher();
  }
})();
