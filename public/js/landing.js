(async () => {
  const shortCode = new URLSearchParams(location.search).get('c');
  if (!shortCode) return;

  // Admin Panel (Page 4) se Ad Load karo
  try {
    const res = await fetch(`/api/public/ad-placements/4`);
    if (res.ok) {
      const { html, enabled } = await res.json();
      if (enabled && html) {
        const container = document.getElementById('finalAdContainer');
        container.innerHTML = html;
        
        // Execute scripts inside ad HTML
        const scripts = container.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          oldScript.parentNode.replaceChild(newScript, oldScript);
        });
      }
    }
  } catch (e) { console.error(e); }

  // Course button ka link set karo
  // Jab user journey complete karega, hum URL me "url" param bhejenge
  const destUrl = new URLSearchParams(location.search).get('url');
  if (destUrl) {
    const btn = document.getElementById('mainCourseBtn');
    btn.href = destUrl;
    
    // Agar user banner par click nahi karta, aur direct niche wale link par click karta hai
    document.querySelectorAll('a[href="#"]').forEach(a => {
       a.href = destUrl;
    });
  }
})();