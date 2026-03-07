(function(){
  const DEFAULT_LINKS = [
    { id: "marketing", label: "MARKETING", href: "https://vmb-mkt.vercel.app/marketing-decks" },
    { id: "datastore", label: "DATA STORE", href: "https://vmb-mkt.vercel.app/dashboard/targets" },
    { id: "team", label: "TEAM", href: "/" },
    { id: "admin", label: "ADMIN", href: "/admin" }
  ];

  function normalizeUrl(url){
    try {
      return new URL(url, window.location.origin);
    } catch (_e) {
      return null;
    }
  }

  function isActiveLink(href){
    const target = normalizeUrl(href);
    if(!target) return false;
    const here = window.location;
    if(target.origin !== here.origin){
      if(target.hostname !== here.hostname) return false;
      if(target.pathname === "/") return here.pathname === "/" || here.pathname.endsWith("/index.html");
      return here.pathname === target.pathname || here.pathname.startsWith(target.pathname + "/");
    }
    if(target.pathname === "/"){
      return here.pathname === "/" || here.pathname.endsWith("/index.html");
    }
    return here.pathname === target.pathname || here.pathname.startsWith(target.pathname + "/");
  }

  function resolveLinks(){
    if(Array.isArray(window.VMB_GLOBAL_NAV_LINKS) && window.VMB_GLOBAL_NAV_LINKS.length){
      return window.VMB_GLOBAL_NAV_LINKS;
    }
    return DEFAULT_LINKS;
  }

  function renderInto(slot){
    if(!slot) return;
    slot.innerHTML = "";
    const links = resolveLinks();
    for(const link of links){
      if(!link || !link.href || !link.label) continue;
      const a = document.createElement("a");
      a.className = "globalNavBtn";
      a.href = link.href;
      a.textContent = link.label;
      a.title = link.label;
      if(isActiveLink(link.href)){
        a.classList.add("isActive");
        a.setAttribute("aria-current", "page");
      }
      slot.appendChild(a);
    }
  }

  function mountGlobalNav(){
    const slots = document.querySelectorAll("[data-global-nav-slot]");
    for(const slot of slots) renderInto(slot);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", mountGlobalNav);
  } else {
    mountGlobalNav();
  }
})();

