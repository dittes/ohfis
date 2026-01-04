document.addEventListener('DOMContentLoaded', () => {
    const consentKey = 'ohfis_cookie_consent';

    if (!localStorage.getItem(consentKey)) {
        showBanner();
    }

    function showBanner() {
        const banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.className = 'fixed-bottom bg-white border-top p-3 shadow-lg';
        banner.style.zIndex = '1050';

        banner.innerHTML = `
            <div class="container d-flex flex-column flex-md-row align-items-center justify-content-between gap-3">
                <div class="text-muted small">
                    We use cookies to ensure you get the best experience on our website. 
                    <a href="/terms.html" class="text-decoration-underline text-muted">Learn more</a>.
                </div>
                <div class="d-flex gap-2">
                    <button id="accept-cookies" class="btn btn-primary btn-sm px-4">Accept</button>
                    <button id="decline-cookies" class="btn btn-outline-secondary btn-sm px-4">Decline</button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        document.getElementById('accept-cookies').addEventListener('click', () => {
            localStorage.setItem(consentKey, 'accepted');
            banner.remove();
        });

        document.getElementById('decline-cookies').addEventListener('click', () => {
            localStorage.setItem(consentKey, 'declined');
            banner.remove();
        });
    }
});
