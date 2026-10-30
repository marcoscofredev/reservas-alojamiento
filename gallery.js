(() => {
    const links = Array.from(document.querySelectorAll("a[data-gallery]"));
    const dialog = document.getElementById("gallery-dialog");
    // Sin soporte de diálogo, los enlaces siguen abriendo la fotografía completa.
    if (!links.length || !dialog || typeof dialog.showModal !== "function") return;
    const image = document.getElementById("gallery-image");
    const caption = document.getElementById("gallery-caption");
    const counter = document.getElementById("gallery-counter");
    const previous = document.getElementById("gallery-previous");
    const next = document.getElementById("gallery-next");
    const close = document.getElementById("gallery-close");
    const error = document.getElementById("gallery-error");
    let index = 0;
    let opener = null;
    let touchStart = null;

    function showPhoto(position) {
        if (position < 0 || position >= links.length) return;
        index = position;
        const link = links[index];
        image.alt = link.querySelector("img").alt;
        caption.textContent = link.dataset.caption;
        counter.textContent = `${index + 1} de ${links.length}`;
        error.textContent = "";
        image.src = link.href;
        previous.disabled = index === 0;
        next.disabled = index === links.length - 1;
        if (next.disabled && document.activeElement === next) previous.focus();
        if (previous.disabled && document.activeElement === previous) next.focus();
    }
    links.forEach((link, position) => {
        link.addEventListener("click", event => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
            event.preventDefault();
            opener = link;
            showPhoto(position);
            dialog.showModal();
            document.body.classList.add("gallery-is-open");
            close.focus();
        });
    });
    close.addEventListener("click", () => dialog.close());
    previous.addEventListener("click", () => showPhoto(index - 1));
    next.addEventListener("click", () => showPhoto(index + 1));
    dialog.addEventListener("keydown", event => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            showPhoto(index + (event.key === "ArrowLeft" ? -1 : 1));
        }
        // Escape y el control del foco dentro del modal los gestiona el diálogo nativo.
    });
    dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => {
        document.body.classList.remove("gallery-is-open");
        image.removeAttribute("src");
        image.alt = "";
        error.textContent = "";
        touchStart = null;
        opener?.focus({ preventScroll: true });
    });
    image.addEventListener("error", () => { error.textContent = "No pudimos cargar esta foto. Probá con la siguiente o cerrá y volvé a abrirla."; });
    image.addEventListener("touchstart", event => {
        touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    }, { passive: true });
    image.addEventListener("touchend", event => {
        if (!touchStart || !event.changedTouches.length) return;
        const dx = event.changedTouches[0].clientX - touchStart.x;
        const dy = event.changedTouches[0].clientY - touchStart.y;
        touchStart = null;
        if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy)) showPhoto(index + (dx < 0 ? 1 : -1));
    }, { passive: true });
})();
