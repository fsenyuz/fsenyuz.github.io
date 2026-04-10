function onSubmit(t) {
  App.sub(t);
}
function onErr() {
  console.warn("ReCAPTCHA Error");
}
function sanitize(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

window.App = (function () {
  const C = window.CFG;
  const MAP_DARK =
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const MAP_LIGHT =
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  let l = "en",
    map,
    lyrs = {},
    DATA;

  async function init() {
    try {
      const res = await fetch("data.json");
      if (!res.ok) throw new Error("Data fetch failed");
      DATA = await res.json();

      document.getElementById("loader").style.opacity = 0;
      setTimeout(
        () => (document.getElementById("loader").style.display = "none"),
        500,
      );

      document.getElementById("yr").innerText = new Date().getFullYear();

      // AUTO THEME DETECTION
      const saved = localStorage.getItem(C.THEME);
      const sysLight = window.matchMedia(
        "(prefers-color-scheme: light)",
      ).matches;
      if (saved === "light" || (!saved && sysLight)) {
        document.body.classList.add("light-mode");
      }

      const u = navigator.language || navigator.userLanguage;
      l = u.startsWith("tr") ? "tr" : u.startsWith("sr") ? "sr" : "en";
      render(l);

      const obsMap = new IntersectionObserver((e) => {
        if (e[0].isIntersecting) {
          initMap();
          obsMap.disconnect();
        }
      });
      obsMap.observe(document.getElementById("map"));

      const pObs = new IntersectionObserver((e) => {
        e.forEach((i) => {
          if (i.isIntersecting) {
            i.target.classList.add("visible-item");
            pObs.unobserve(i.target);
          }
        });
      });
      document.querySelectorAll(".card").forEach((c) => pObs.observe(c));
    } catch (e) {
      document.getElementById("loader").innerHTML =
        `<p style="color:var(--gold);margin-bottom:15px">⚠️ Connection Failed</p><button class="f-btn" onclick="location.reload()">Retry</button>`;
    }
  }

  function render(lg) {
    const tr = DATA.translations[lg];
    document
      .querySelectorAll("[data-t]")
      .forEach((e) => (e.innerHTML = tr[e.dataset.t] || e.innerHTML));
    document
      .querySelectorAll("[data-tip]")
      .forEach((e) => e.setAttribute("data-tooltip", tr[e.dataset.tip]));
    ["name", "email", "msg"].forEach(
      (i) =>
        (document.getElementById(i).placeholder =
          tr[
            i === "msg" ? "formMsg" : i === "name" ? "formName" : "formEmail"
          ]),
    );
    document.getElementById("lang-btn").innerText = lg.toUpperCase();

    const mk = (i, cls) => {
      const title = tr[i.key + "Title"] || i.key;
      const desc = tr[i.key + "Desc"] || "";
      return `<div class="t-item ${cls || ""} item-box visible-item" data-cat="${i.cat}">
                        <h4>${title}</h4><span class="co">${i.company}</span>
                        <div class="meta"><span>${i.loc}</span><span>${i.date}</span></div>
                        ${i.subtext ? `<small style="display:block;margin-bottom:8px;opacity:0.9"><i>${i.subtext}</i></small>` : ""}
                        <ul>${desc}</ul>
                    </div>`;
    };

    document.getElementById("exp").innerHTML = DATA.experience
      .map((i) => mk(i))
      .join("");
    document.getElementById("edu").innerHTML = DATA.education
      .map((i) => mk(i, "edu"))
      .join("");

    const actBtn = document.querySelector(".f-btn.active");
    if (actBtn) filt(actBtn.getAttribute("onclick").split("'")[1]);

    if (map) {
      map.removeControl(window.mc);
      addLC(lg);
    }
  }

  function filt(c) {
    document
      .querySelectorAll(".f-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelector(`button[onclick="App.filt('${c}')"]`)
      .classList.add("active");
    [...document.querySelectorAll(".item-box")].forEach((i) => {
      if (c === "all" || i.dataset.cat === c) {
        i.classList.remove("hidden-item");
        i.classList.add("visible-item");
      } else {
        i.classList.remove("visible-item");
        i.classList.add("hidden-item");
      }
    });
  }

  function lang() {
    l = l === "en" ? "tr" : l === "tr" ? "sr" : "en";
    render(l);
  }

  function chat() {
    const w = document.getElementById("win");
    w.classList.toggle("act");
    document.getElementById("bub").classList.toggle("act");
    if (w.classList.contains("act")) document.getElementById("inp").focus();
  }

  async function send() {
    const inp = document.getElementById("inp"),
      msgs = document.getElementById("msgs"),
      txt = inp.value.trim();
    if (!txt) return;
    msgs.innerHTML += `<div class="msg usr">${sanitize(txt)}</div>`;
    inp.value = "";
    msgs.scrollTop = msgs.scrollHeight;

    const ld = document.createElement("div");
    ld.className = "msg bot typing";
    ld.innerHTML = "...";
    msgs.appendChild(ld);
    msgs.scrollTop = msgs.scrollHeight;

    try {
      const fd = new FormData();
      fd.append("message", txt);
      const res = await fetch(C.API, { method: "POST", body: fd });
      if (!res.ok) throw 0;
      const d = await res.json();
      msgs.removeChild(ld);
      msgs.innerHTML += `<div class="msg bot">${sanitize(d.reply)}</div>`;
    } catch (e) {
      msgs.removeChild(ld);
      msgs.innerHTML += `<div class="msg bot">⚠️ Connection failed. <a href="#" style="color:var(--txt);text-decoration:underline;font-weight:bold" onclick="App.cont(event)">Email me</a></div>`;
    }
    msgs.scrollTop = msgs.scrollHeight;
  }

  function initMap() {
    map = L.map("map"); // Zoom kısıtlaması kaldırıldı
    const isLight = document.body.classList.contains("light-mode");
    L.tileLayer(isLight ? MAP_LIGHT : MAP_DARK, {
      attribution: "&copy; CARTO",
    }).addTo(map);

    // CRITICAL FIX: Initialize layer groups FIRST
    lyrs = {
      work: L.featureGroup(),
      edu: L.featureGroup(),
      tender: L.featureGroup(),
    };

    const markers = [];
    DATA.locations.forEach((l) => {
      const iconUrl = `https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-${l.ty === "edu" ? "green" : l.ty === "tender" ? "orange" : "blue"}.png`;
      const marker = L.marker([l.lat, l.lng], {
        icon: new L.Icon({ iconUrl, iconSize: [25, 41], iconAnchor: [12, 41] }),
      }).bindPopup(`<b>${l.t}</b><br>${l.desc}`);

      lyrs[l.ty].addLayer(marker);
      markers.push(marker);
    });

    ["work", "edu", "tender"].forEach((k) => lyrs[k].addTo(map));

    // Auto-fit with delay for smooth rendering
    const group = L.featureGroup(markers);
    setTimeout(() => {
      map.invalidateSize();
      if (markers.length > 0) {
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
      } else {
        map.setView([41.0, 29.0], 3);
      }
    }, 500);

    addLC(l);
  }
  function addLC(lg) {
    const tr = DATA.translations[lg];
    window.mc = L.control
      .layers(
        null,
        {
          [`<span style='color:#38bdf8'>${tr.legendWork}</span>`]: lyrs.work,
          [`<span style='color:#2ecc71'>${tr.legendEdu}</span>`]: lyrs.edu,
          [`<span style='color:#fbbf24'>${tr.legendTender}</span>`]:
            lyrs.tender,
        },
        { collapsed: true },
      )
      .addTo(map);
  }

  function openM(t, c, isF = false) {
    document.getElementById("m-tit").innerText = t;
    document.getElementById("m-txt").innerHTML = c;
    document.getElementById("m-txt").style.display = isF ? "none" : "block";
    document.getElementById("frm").style.display = isF ? "block" : "none";
    document.getElementById("m-btn").style.display = isF
      ? "none"
      : "inline-block";
    document.getElementById("mod").classList.add("act");
  }
  function cls() {
    document.getElementById("mod").classList.remove("act");
  }

  function sub(tok) {
    const f = document.getElementById("frm"),
      b = f.querySelector("button");
    b.disabled = true;
    b.innerText = "...";
    const fd = new FormData(f);
    fd.append("g-recaptcha-response", tok);
    fetch(f.action, {
      method: "POST",
      body: fd,
      headers: { Accept: "application/json" },
    }).then((r) => {
      if (r.ok) {
        f.reset();
        setTimeout(cls, 2000);
      }
      b.disabled = false;
      b.innerText = "Send";
    });
  }

  return {
    init,
    lang,
    filt,
    chat,
    send,
    cls,
    sub,
    errCap: onErr,
    key: (e) => {
      if (e.key === "Enter") send();
    },
    tip: (t) => t.classList.toggle("active"),

    theme: () => {
      document.body.classList.toggle("light-mode");
      const isLight = document.body.classList.contains("light-mode");
      localStorage.setItem(C.THEME, isLight ? "light" : "dark");
      if (map)
        map.eachLayer((layer) => {
          if (layer instanceof L.TileLayer) {
            layer.setUrl(isLight ? MAP_LIGHT : MAP_DARK);
          }
        });
    },

    cont: (e) => {
      e.preventDefault();
      openM(DATA.translations[l].contactBtn, "", true);
    },
    repo: (e, n) => {
      e.preventDefault();
      openM(
        "Repo",
        DATA.repos && DATA.repos[n] && DATA.repos[n].ready
          ? DATA.translations[l].repoTextPublic
          : DATA.translations[l].repoTextPrivate,
      );
    },
    cons: (g) => {
      localStorage.setItem(C.CONSENT, g);
      gtag("consent", "update", { ad_storage: g ? "granted" : "denied" });
      App.hCook();
    },
    hCook: () => document.getElementById("cook").classList.remove("shw"),
  };
})();
document.addEventListener("DOMContentLoaded", App.init);
