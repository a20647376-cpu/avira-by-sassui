document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    // ---------- MENU DRAWER ----------
    const menuButton = $("menuButton"), mainNav = $("mainNav"), menuOverlay = $("menuOverlay");
    const openMenu = () => { mainNav.classList.add("open"); menuOverlay.hidden = false; menuButton.setAttribute("aria-expanded", "true"); };
    const closeMenu = () => { mainNav.classList.remove("open"); menuOverlay.hidden = true; menuButton.setAttribute("aria-expanded", "false"); };
    menuButton.addEventListener("click", openMenu);
    $("menuClose").addEventListener("click", closeMenu);
    menuOverlay.addEventListener("click", closeMenu);
    mainNav.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
    document.querySelectorAll("[data-open-menu]").forEach((el) =>
        el.addEventListener("click", (e) => { e.preventDefault(); openMenu(); })
    );

    // ---------- PAGES: collections live in the menu ----------
    const COLLECTIONS = ["collection", "mists", "wax-balms", "bundles"];
    const route = () => {
        const id = decodeURIComponent(location.hash.slice(1));
        const isColl = COLLECTIONS.includes(id);
        document.querySelectorAll("main > section").forEach((sec) => {
            const coll = COLLECTIONS.includes(sec.id);
            sec.style.display = isColl ? (sec.id === id ? "" : "none") : (coll ? "none" : "");
        });
        if (isColl || id === "home" || !id) {
            window.scrollTo({ top: 0, behavior: id === "home" ? "smooth" : "auto" });
        } else {
            const t = document.getElementById(id);
            if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };
    window.addEventListener("hashchange", route);
    route();

    // ---------- TOAST ----------
    const toast = $("toast");
    let toastTimer;
    const showToast = (msg) => {
        toast.textContent = msg;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
    };

    // ---------- CURRENCY ----------
    // Prices are stored in PKR. Rates = how many PKR for 1 unit (approx., open-market, 18 Nov 2026).
    // Edit these numbers any time to update the prices shown.
    const RATES = { PKR: 1, USD: 278.5, EUR: 307.3, JPY: 1.75, SAR: 74.2, QAR: 76.5, AED: 75.8 };
    let currency = "PKR";
    try { const c = localStorage.getItem("aviraCurrency"); if (c && RATES[c]) currency = c; } catch (e) {}
    const money = (pkr, cur = currency) => {
        if (cur === "PKR") return "PKR " + Math.round(pkr).toLocaleString("en-US");
        return new Intl.NumberFormat("en-US", {
            style: "currency", currency: cur,
            minimumFractionDigits: cur === "JPY" ? 0 : 2, maximumFractionDigits: cur === "JPY" ? 0 : 2
        }).format(pkr / RATES[cur]);
    };
    // remember each price's PKR value once, before anything is converted
    const priced = document.querySelectorAll(".price, .was, [data-pkr]");
    priced.forEach((el) => { if (!el.dataset.pkr) el.dataset.pkr = el.textContent.replace(/[^\d]/g, ""); });
    const paintPrices = () => priced.forEach((el) => {
        el.textContent = (el.dataset.prefix || "") + money(parseInt(el.dataset.pkr, 10));
    });
    const selects = document.querySelectorAll(".currency-select");
    selects.forEach((sel) => { sel.value = currency; });

    // ---------- BAG ----------
    let bag = [];
    try { bag = JSON.parse(localStorage.getItem("aviraBag") || "[]"); } catch (e) { bag = []; }
    const save = () => { try { localStorage.setItem("aviraBag", JSON.stringify(bag)); } catch (e) {} };
    const fmt = (n) => money(n);

    const drawer = $("bagDrawer"), overlay = $("bagOverlay");
    const openBag = () => { drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); overlay.hidden = false; };
    const closeBag = () => { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); overlay.hidden = true; };
    $("bagButton").addEventListener("click", openBag);
    $("bagClose").addEventListener("click", closeBag);
    overlay.addEventListener("click", closeBag);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeBag(); });

    const render = () => {
        const list = $("bagItems");
        const count = bag.reduce((s, i) => s + i.qty, 0);
        const total = bag.reduce((s, i) => s + i.qty * i.price, 0);
        const badge = $("bagCount");
        badge.textContent = count;
        badge.hidden = count === 0;
        list.innerHTML = "";
        if (!bag.length) {
            list.innerHTML = '<p class="bag-empty">Your bag is empty.</p>';
        }
        bag.forEach((item, idx) => {
            const row = document.createElement("div");
            row.className = "bag-row";
            const info = document.createElement("div");
            const name = document.createElement("strong");
            name.textContent = item.name;
            const meta = document.createElement("span");
            meta.textContent = item.size + " · " + fmt(item.price);
            info.append(name, meta);
            const ctl = document.createElement("div");
            ctl.className = "bag-qty";
            const minus = document.createElement("button");
            minus.textContent = "−"; minus.setAttribute("aria-label", "Decrease");
            const q = document.createElement("span");
            q.textContent = item.qty;
            const plus = document.createElement("button");
            plus.textContent = "+"; plus.setAttribute("aria-label", "Increase");
            minus.onclick = () => { item.qty--; if (item.qty <= 0) bag.splice(idx, 1); save(); render(); };
            plus.onclick = () => { item.qty++; save(); render(); };
            ctl.append(minus, q, plus);
            row.append(info, ctl);
            list.appendChild(row);
        });
        $("bagTotal").textContent = fmt(total);

        const order = $("bagOrder");
        order.disabled = !bag.length;
        order.classList.toggle("disabled", !bag.length);
    };
    $("bagOrder").addEventListener("click", () => {
        if (!bag.length) return;
        const pkr = (n) => money(n, "PKR");
        const total = bag.reduce((s, i) => s + i.qty * i.price, 0);
        const text = "AVIRA BY SASSUI order:\n" +
            bag.map((i) => `- ${i.name} (${i.size}) x${i.qty} = ${pkr(i.qty * i.price)}`).join("\n") +
            "\nTotal: " + pkr(total);
        const done = () => showToast("Order summary copied");
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => showToast("Could not copy"));
        else showToast("Could not copy");
    });
    $("bagClear").addEventListener("click", () => { bag = []; save(); render(); });

    document.querySelectorAll(".product-card").forEach((card) => {
        const btn = card.querySelector(".add-button");
        if (!btn) return;
        btn.addEventListener("click", () => {
            const name = card.querySelector("h3").textContent.trim();
            const size = card.querySelector(".product-size").textContent.trim();
            const price = parseInt(card.querySelector(".price").dataset.pkr, 10);
            const found = bag.find((i) => i.name === name);
            if (found) found.qty++; else bag.push({ name, size, price, qty: 1 });
            save(); render();
            showToast(name + " added to bag");
        });
    });

    // ---------- SEARCH ----------
    $("searchButton").addEventListener("click", () => {
        if (document.querySelector(".search-box")) return;
        const box = document.createElement("div");
        box.className = "search-box";
        box.innerHTML = '<input type="search" placeholder="Search Avira (e.g. Noir, mist, wax)..." aria-label="Search"><button type="button" aria-label="Close search">×</button>';
        document.body.appendChild(box);
        const input = box.querySelector("input");
        input.focus();
        const close = () => box.remove();
        box.querySelector("button").onclick = close;
        input.addEventListener("keydown", (e) => {
            if (e.key === "Escape") return close();
            if (e.key !== "Enter") return;
            const term = input.value.trim().toLowerCase();
            if (!term) return;
            const hit = [...document.querySelectorAll(".product-card")].find((c) => c.textContent.toLowerCase().includes(term));
            if (hit) {
                close();
                const sec = hit.closest("section");
                if (sec && sec.style.display === "none") {
                    location.hash = sec.id;
                }
                setTimeout(() => {
                    hit.scrollIntoView({ behavior: "smooth", block: "center" });
                    hit.classList.add("flash");
                    setTimeout(() => hit.classList.remove("flash"), 1800);
                }, 150);
            }
            else showToast("No matching product found");
        });
    });

    // ---------- NEWSLETTER ----------
    const form = $("newsletter-form");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = form.querySelector('input[type="email"]').value.trim();
            if (!email) return;
            showToast("Thank you for joining AVIRA BY SASSUI");
            form.reset();
        });
    }

    // ---------- HERO VIDEO ----------
    const hero = $("hero-video");
    if (hero) {
        hero.muted = true;
        const p = hero.play();
        if (p && p.catch) p.catch(() => {});
    }

    // ---------- HEADER SHADOW ----------
    const header = document.querySelector(".site-header");
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // ---------- REELS: play when visible ----------
    const reels = document.querySelectorAll(".reel");
    if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (en.isIntersecting) { const p = en.target.play(); if (p && p.catch) p.catch(() => {}); }
                else en.target.pause();
            });
        }, { threshold: 0.5 });
        reels.forEach((r) => io.observe(r));
    }

    const onCurrency = (e) => {
        currency = e.target.value;
        selects.forEach((sel) => { sel.value = currency; });
        try { localStorage.setItem("aviraCurrency", currency); } catch (e) {}
        paintPrices();
        render();
        showToast("Prices shown in " + currency);
    };
    selects.forEach((sel) => sel.addEventListener("change", onCurrency));
    paintPrices();
    render();
});
