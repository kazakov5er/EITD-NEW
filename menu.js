// ==UserScript==
// @name         EXTENSION ITD NEW
// @namespace    https://xn--d1ah4a.com/
// @version      1.3
// @description  Расширение для ITD: EITD
// @author       EITD Status
// @match https://*.xn--d1ah4a.com/*
// @match https://итд.com/*
// @icon         data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJDYXBhXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNjEyIDYxMiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNjEyIDYxMjsiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxnPjxnIGlkPSJfNDFfNDNfIj48Zz48cGF0aCBkPSJNNDAzLjkzOSwyOTUuNzQ5bC03OC44MTQsNzguODMzVjE3Mi4xMjVjMC0xMC41NTctOC41NjgtMTkuMTI1LTE5LjEyNS0xOS4xMjVjLTEwLjU1NywwLTE5LjEyNSw4LjU2OC0xOS4xMjUsMTkuMTI1IHYyMDIuNDU3bC03OC44MTQtNzguODE0Yy03LjQ3OC03LjQ3OC0xOS41ODQtNy40NzgtMjcuMDQzLDBjLTcuNDc4LDcuNDc4LTcuNDc4LDE5LjU4NCwwLDI3LjA0MmwxMDguMTksMTA4LjE5IGM0LjU5LDQuNTksMTAuODYzLDYuMDA1LDE2LjgxMiw0Ljk1M2M1LjkyOSwxLjA1MiwxMi4yMjEtMC4zODIsMTYuODExLTQuOTUzbDEwOC4xOS0xMDguMTljNy40NzgtNy40NzgsNy40NzgtMTkuNTgzLDAtMjcuMDQyIEM0MjMuNTIzLDI4OC4yOSw0MTEuNDE3LDI4OC4yOSw0MDMuOTM5LDI5NS43NDl6IE0zMDYsMEMxMzcuMDEyLDAsMCwxMzYuOTkyLDAsMzA2czEzNy4wMTIsMzA2LDMwNiwzMDZzMzA2LTEzNy4wMTIsMzA2LTMwNiBTNDc1LjAwOCwwLDMwNiwweiBNMzA2LDU3My43NWMtMTQ3Ljg3NSwwLTI2Ny43NS0xMTkuODc1LTI2Ny43NS0zMDZDMzguMjUsMTU4LjEyNSwxNTguMTI1LDM4LjI1LDMwNiwzOC4yNSBjMTQ3Ljg3NSwwLDI2Ny43NSwxMTkuODc1LDI2Ny43NSwyNjcuNzVDNTczLjc1LDQ1My44NzUsNDUzLjg3NSw1NzMuNzUsMzA2LDU3My43NXoiPjwvcGF0aD48L2c+PC9nPjwvZz48L3N2Zz4=
// @grant        GM_xmlhttpRequest
// @grant        GM_addElement
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // ИНЖЕКЦИЯ В ГЛАВНЫЙ КОНТЕКСТ
    // ============================================
    // Tampermonkey с @grant создаёт sandbox, поэтому нужно инжектить
    // скрипт перехвата fetch в главный контекст страницы

    function injectIntoPageContext() {
        const script = document.createElement('script');
        script.textContent = `
            (function() {
                const CONFIG = {
                    apiPatterns: ['/api/users/', '/api/v1/users/', '/users/me', '/users/']
                };

                let originalFetch = window.fetch;
                let lastApiResponse = null;

                window.fetch = async function(...args) {
                    const url = args[0] instanceof Request ? args[0].url : String(args[0]);
                    const isApiCall = CONFIG.apiPatterns.some(pattern => url.includes(pattern));

                    const response = await originalFetch.apply(this, args);

                    if (isApiCall && response.clone) {
                        try {
                            const clone = response.clone();
                            const data = await clone.json();

                            // Сохраняем ответ API для кнопки копирования
                            lastApiResponse = data;
                            window.dispatchEvent(new CustomEvent('itd-api-response', { detail: { data: data } }));

                            let date = null;
                            if (data && typeof data === 'object') {
                                if (data.createdAt) date = data.createdAt;
                                else if (data.author && data.author.createdAt) date = data.author.createdAt;
                                else if (data.originalPost && data.originalPost.author && data.originalPost.author.createdAt) {
                                    date = data.originalPost.author.createdAt;
                                }
                                else if (data.profile && data.profile.createdAt) date = data.profile.createdAt;
                                else if ((Array.isArray(data.data) || Array.isArray(data.users)) && data.data && data.data.length > 0 && data.data[0].createdAt) {
                                    date = data.data[0].createdAt;
                                }
                            }

                            if (date) {
                                window.dispatchEvent(new CustomEvent('itd-reg-date', { detail: { date: date } }));
                            }

                        } catch (e) {
                            // Игнорируем не-JSON ответы
                        }
                    }

                    return response;
                };
            })();
        `;
        document.documentElement.appendChild(script);
        script.remove();
    }

    // Инжектим сразу
    injectIntoPageContext();

    // ============================================
    // ФУНКЦИИ ПОЛНОЙ ДАТЫ РЕГИСТРАЦИИ (из time.js)
    // ============================================

    const CONFIG = {
        apiPatterns: ['/api/users/', '/api/v1/users/', '/users/me', '/users/'],
        uiInjection: true
    };

    let lastRegDate = null;
    let isFullDateEnabled = true;

    // ========== МОНИТОРИНГ API + КНОПКА КОПИРОВАНИЯ ==========
    let lastApiResponse = null;
    let isCopyButtonEnabled = true;

    // Слушаем события от инжектированного скрипта
    window.addEventListener('itd-reg-date', (e) => {
        if (e.detail && e.detail.date) {
            lastRegDate = e.detail.date;
            if (isFullDateEnabled) {
                setTimeout(injectRegDate, 100);
            }
        }
    });

    // Слушаем ответы API для кнопки копирования
    window.addEventListener('itd-api-response', (e) => {
        if (e.detail && e.detail.data) {
            lastApiResponse = e.detail.data;
        }
    });

    const formatRegDate = (iso) => {
        if (!iso) return null;
        try {
            const d = new Date(iso);
            if (isNaN(d.getTime())) return null;

            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');

            return `${day}:${month}:${year} ${hours}:${minutes}:${seconds}`;
        } catch {
            return null;
        }
    };

    const extractDateFromData = (data) => {
        if (!data || typeof data !== 'object') return null;

        if (data.createdAt) return data.createdAt;
        if (data.author && data.author.createdAt) return data.author.createdAt;
        if (data.originalPost && data.originalPost.author && data.originalPost.author.createdAt) {
            return data.originalPost.author.createdAt;
        }
        if (data.profile && data.profile.createdAt) return data.profile.createdAt;

        if (Array.isArray(data.data) || Array.isArray(data.users)) {
            const list = data.data || data.users;
            if (list.length > 0 && list[0].createdAt) return list[0].createdAt;
        }

        return null;
    };

    const injectRegDate = () => {
        if (!isFullDateEnabled || !lastRegDate) return;

        const formatted = formatRegDate(lastRegDate);
        if (!formatted) return;

        const items = document.querySelectorAll('.at4eWYfl');

        items.forEach(item => {
            const text = item.innerText || item.textContent || '';

            if (text.includes('Регистрация:')) {
                if (item.dataset.itdRegDate === formatted) return;

                const svgIcon = item.querySelector('svg');

                item.innerHTML = '';
                if (svgIcon) item.appendChild(svgIcon.cloneNode(true));

                const textSpan = document.createElement('span');
                textSpan.style.marginLeft = svgIcon ? '6px' : '0';
                textSpan.innerText = ` Регистрация: ${formatted}`;
                item.appendChild(textSpan);

                item.dataset.itdRegDate = formatted;
            }
        });
    };

    const removeInjectedDates = () => {
        const items = document.querySelectorAll('.at4eWYfl');
        items.forEach(item => {
            const text = item.innerText || item.textContent || '';
            if (text.includes('Регистрация:') && item.dataset.itdRegDate) {
                const svgIcon = item.querySelector('svg');
                if (svgIcon) {
                    item.innerHTML = '';
                    item.appendChild(svgIcon.cloneNode(true));
                    const textSpan = document.createElement('span');
                    textSpan.style.marginLeft = '6px';
                    textSpan.innerText = ' Регистрация';
                    item.appendChild(textSpan);
                }
                delete item.dataset.itdRegDate;
            }
        });
        lastRegDate = null;
    };

    // Observer для отслеживания появления элементов с датой
    const regDateObserver = new MutationObserver((mutations) => {
        if (!isFullDateEnabled || !lastRegDate) return;

        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && node.classList.contains('at4eWYfl')) {
                            setTimeout(injectRegDate, 50);
                            return;
                        }
                        if (node.querySelector && node.querySelector('.at4eWYfl')) {
                            setTimeout(injectRegDate, 50);
                            return;
                        }
                    }
                }
            }
        }
    });

    // Отслеживаем смену URL для очистки даты
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            // При смене страницы очищаем дату
            if (isFullDateEnabled) {
                removeInjectedDates();
            }
        }
    });
    urlObserver.observe(document.body, { childList: true, subtree: true });

    window.setFullDateEnabled = (enabled) => {
        isFullDateEnabled = enabled;
        console.log('[EITD] Полная дата регистрации:', enabled ? 'включена' : 'выключена');

        if (!enabled) {
            removeInjectedDates();
        } else if (lastRegDate) {
            setTimeout(injectRegDate, 100);
        }
    };

    window.getRegDate = () => ({
        raw: lastRegDate,
        formatted: formatRegDate(lastRegDate)
    });

    window.forceInjectRegDate = () => {
        injectRegDate();
    };

    window.setRegDate = (iso) => {
        lastRegDate = iso;
        injectRegDate();
    };

    // ============================================
    // CSS СТИЛИ (вместо инлайновых)
    // ============================================

    function injectStyles() {
        const styles = `
            @keyframes itdPulse {
                0%, 100% { box-shadow: 0 4px 15px rgba(64, 224, 208, 0.5); transform: scale(1); }
                50% { box-shadow: 0 4px 25px rgba(64, 224, 208, 0.8), 0 0 30px rgba(64, 224, 208, 0.4); transform: scale(1.05); }
            }

            #itd-plus-menu-btn {
                position: fixed;
                left: 20px;
                top: 100px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, #40E0D0 0%, #20B2AA 100%);
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                z-index: 999998;
                box-shadow: 0 4px 15px rgba(64, 224, 208, 0.5);
                transition: transform 0.2s ease;
                outline: none;
                padding: 0;
                animation: itdPulse 2s ease-in-out infinite;
            }

            #itd-plus-menu-btn:hover { transform: scale(1.1); }
            #itd-plus-menu-btn svg { width: 24px; height: 24px; }

            .itd-window {
                position: fixed;
                width: 300px;
                min-width: 200px;
                min-height: 150px;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(64, 224, 208, 0.3);
                border: 1px solid rgba(64, 224, 208, 0.3);
                color: #fff;
                font-family: inherit;
                z-index: 999999;
                overflow: auto;
            }

            .itd-window-header {
                padding: 15px 20px;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-bottom: 1px solid rgba(64, 224, 208, 0.2);
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
                font-weight: bold;
                font-size: 16px;
                position: sticky;
                top: 0;
                z-index: 10;
            }

            .itd-window-header-buttons {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .itd-window-btn {
                background: transparent;
                border: none;
                color: rgba(255, 255, 255, 0.7);
                cursor: pointer;
                padding: 5px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .itd-window-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }

            .itd-window-content {
                padding: 20px;
                font-size: 14px;
                line-height: 1.6;
            }

            .itd-menu-item { margin-bottom: 15px; }

            .itd-slider-label {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 14px;
                color: #fff;
            }

            .itd-slider-container {
                position: relative;
                display: inline-block;
                width: 50px;
                height: 26px;
            }

            .itd-slider-container input {
                opacity: 0;
                width: 0;
                height: 0;
                position: absolute;
                z-index: -1;
            }

            .itd-slider {
                position: absolute;
                cursor: pointer;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: #4a4a6a;
                transition: 0.4s;
                border-radius: 26px;
            }

            .itd-slider:before {
                position: absolute;
                content: "";
                height: 20px;
                width: 20px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: 0.4s;
                border-radius: 50%;
            }

            .itd-slider-container input:checked + .itd-slider {
                background-color: #40E0D0;
            }

            .itd-slider-container input:checked + .itd-slider:before {
                transform: translateX(24px);
            }

            /* Range слайдеры для настроек снега */
            .itd-range-label {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 14px;
                color: #fff;
                margin-bottom: 5px;
            }

            .itd-range-label span:last-child {
                color: #40E0D0;
                font-weight: bold;
            }

            .itd-range-slider {
                width: 100%;
                height: 6px;
                border-radius: 3px;
                background: #4a4a6a;
                outline: none;
                margin: 10px 0 15px 0;
                -webkit-appearance: none;
                appearance: none;
            }

            .itd-range-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #40E0D0;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(64, 224, 208, 0.4);
            }

            .itd-range-slider::-moz-range-thumb {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #40E0D0;
                cursor: pointer;
                border: none;
                box-shadow: 0 2px 6px rgba(64, 224, 208, 0.4);
            }

            .itd-snow-section {
                margin-bottom: 15px;
            }

            .itd-reset-btn {
                margin-top: 20px;
                width: 100%;
                padding: 10px;
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
                border: none;
                border-radius: 8px;
                color: white;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
            }

            .itd-reset-btn:hover {
                transform: scale(1.02);
                box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
            }

            /* Кнопка скачивания */
            .itd-download-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 6px 8px;
                border-radius: 8px;
                background: transparent;
                border: none;
                cursor: pointer;
                margin-left: 4px;
            }

            .itd-download-btn:hover {
                background: rgba(128, 128, 128, 0.1);
            }

            .itd-download-btn svg {
                width: 20px;
                height: 20px;
                color: var(--text-secondary);
            }

            /* Сворачиваемый раздел */
            .itd-collapse-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 0;
                cursor: pointer;
                user-select: none;
                font-size: 14px;
                color: #fff;
                border-top: 1px solid rgba(64, 224, 208, 0.2);
                margin-top: 10px;
            }

            .itd-collapse-header:hover {
                opacity: 0.8;
            }

            .itd-collapse-arrow {
                display: inline-block;
                width: 16px;
                height: 16px;
                transition: transform 0.3s ease;
                fill: #40E0D0;
            }

            .itd-collapse-header.itd-collapsed .itd-collapse-arrow {
                transform: rotate(-90deg);
            }

            .itd-collapse-content {
                overflow: hidden;
                transition: max-height 0.3s ease;
                max-height: 200px;
            }

            .itd-collapse-header.itd-collapsed + .itd-collapse-content {
                max-height: 0;
            }

            /* Ручка для изменения размера окна */
            .itd-resize-handle {
                position: absolute;
                width: 15px;
                height: 15px;
                bottom: 0;
                right: 0;
                cursor: se-resize;
                background: linear-gradient(135deg, transparent 50%, rgba(64, 224, 208, 0.5) 50%);
                border-radius: 0 0 12px 0;
                transition: opacity 0.2s;
                opacity: 0.6;
                z-index: 10;
            }

            .itd-resize-handle:hover {
                opacity: 1;
                background: linear-gradient(135deg, transparent 50%, rgba(64, 224, 208, 0.8) 50%);
            }

            /* Кнопка копирования ответа API */
            .copy-tooltip {
                visibility: hidden;
                background-color: #333;
                color: #fff;
                text-align: center;
                padding: 4px 8px;
                border-radius: 4px;
                position: absolute;
                z-index: 1;
                bottom: 125%;
                left: 50%;
                transform: translateX(-50%);
                white-space: nowrap;
                opacity: 0;
                transition: opacity 0.3s;
                font-size: 11px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            }

            .itd-copy-btn:hover .copy-tooltip {
                visibility: visible;
                opacity: 1;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    // ============================================
    // ФУНКЦИИ СКАЧИВАНИЯ КАРТИНОК
    // ============================================

    const downloadIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 612 612"><path fill="currentColor" d="M403.939,295.749l-78.814,78.833V172.125c0-10.557-8.568-19.125-19.125-19.125c-10.557,0-19.125,8.568-19.125,19.125 v202.457l-78.814-78.814c-7.478-7.478-19.584-7.478-27.043,0c-7.478,7.478-7.478,19.584,0,27.042l108.19,108.19 c4.59,4.59,10.863,6.005,16.812,4.953c5.929,1.052,12.221-0.382,16.811-4.953l108.19-108.19c7.478-7.478,7.478-19.583,0-27.042 C423.523,288.29,411.417,288.29,403.939,295.749z M306,0C137.012,0,0,136.992,0,306s137.012,306,306,306s306-137.012,306-306 S475.008,0,306,0z M306,573.75C158.125,573.75,38.25,453.875,38.25,306C38.25,158.125,158.125,38.25,306,38.25 c147.875,0,267.75,119.875,267.75,267.75C573.75,453.875,453.875,573.75,306,573.75z"></path></svg>`;

    function downloadImage(url, postId, callback) {
        const doDownload = (blob) => {
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `itd_post_${postId}_${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
            if (callback) callback();
        };

        const handleError = (error) => {
            console.error('Ошибка при скачивании:', error);
            window.open(url, '_blank');
            if (callback) callback();
        };

        if (typeof GM_xmlhttpRequest !== 'undefined') {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'blob',
                onload: (response) => doDownload(response.response),
                onerror: handleError
            });
        } else {
            fetch(url)
                .then(response => response.blob())
                .then(doDownload)
                .catch(handleError);
        }
    }

    function addDownloadButton(postElement) {
        if (postElement.querySelector('.itd-download-btn')) return;

        // Ищем контейнер контента поста (картинки/видео)
        const contentContainer = postElement.querySelector('[class*="l4cwyAPN"], [class*="_4vGEh5tJ"]');

        if (!contentContainer) return;

        // Проверяем, есть ли видео — если только видео, не добавляем кнопку
        const video = contentContainer.querySelector('video');
        const hasOnlyVideo = video && !contentContainer.querySelector('img');
        if (hasOnlyVideo) return;

        // Ищем только картинки внутри контейнера контента
        const images = contentContainer.querySelectorAll('img');

        // Фильтруем только CDN-картинки (контент поста, не пины/аватарки)
        let imageUrls = [...images]
            .map(img => img.src)
            .filter(src => src && src.includes('cdn.xn--d1ah4a.com') && src.includes('/images/'));

        // Убираем дубликаты
        imageUrls = [...new Set(imageUrls)];

        if (imageUrls.length === 0) return;

        const btn = document.createElement('button');
        btn.className = 'itd-download-btn';
        btn.innerHTML = downloadIconSvg;
        btn.title = 'Скачать картинки';
        btn.setAttribute('aria-label', 'Скачать картинки');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postId = postElement.getAttribute('data-post-id') ||
                          postElement.id.replace('post-', '') ||
                          'unknown';

            if (imageUrls.length === 1) {
                downloadImage(imageUrls[0], postId);
            } else {
                let completed = 0;
                const downloadNext = (index) => {
                    if (index >= imageUrls.length) return;
                    downloadImage(imageUrls[index], postId, () => {
                        completed++;
                        if (completed < imageUrls.length) {
                            setTimeout(() => downloadNext(index + 1), 200);
                        }
                    });
                };
                downloadNext(0);
            }
        });

        const footer = postElement.querySelector('footer[class]');
        if (!footer) return;

        const actionsLeft = footer.querySelector('[class*="actionsLeft"]') ||
                           footer.querySelector('[class*="actions"]');

        if (actionsLeft) {
            actionsLeft.appendChild(btn);
        } else {
            const buttonsContainer = footer.querySelector('div[class]');
            if (buttonsContainer) {
                buttonsContainer.appendChild(btn);
            } else {
                footer.appendChild(btn);
            }
        }
    }

    function processPosts() {
        const downloadEnabled = localStorage.getItem('itdPlusDownloadEnabled') !== 'false';
        if (!downloadEnabled) return;

        const articles = document.querySelectorAll('article');
        articles.forEach(article => {
            if (article.querySelector('img') && !article.querySelector('.itd-download-btn')) {
                addDownloadButton(article);
            }
        });
    }

    const downloadObserver = new MutationObserver((mutations) => {
        if (mutations.some(m => m.addedNodes.length > 0)) {
            setTimeout(processPosts, 100);
        }
    });

    function removeDownloadButtons() {
        document.querySelectorAll('.itd-download-btn').forEach(btn => btn.remove());
    }

    // ============================================
    // КНОПКА КОПИРОВАНИЯ ОТВЕТА API
    // ============================================

    function findTargetElement() {
        // Ищем контейнер с кнопками действий - ищем по разным селекторам
        const selectors = [
            "div.NkXf1I05",
            "[class*='actions']",
            "footer[class]"
        ];

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);

            for (const el of elements) {
                const container = el;
                if (container) {
                    // Проверяем, есть ли внутри кнопки
                    const buttons = container.querySelectorAll("button.WsNIl9yN");
                    if (buttons.length > 0) {
                        return container;
                    }
                }
            }
        }
        return null;
    }

    function createCopyButton() {
        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.className = "WsNIl9yN QJCDyxuF BCtviEiQ _2NIyBgLE itd-copy-btn";
        copyButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span class="copy-tooltip">Копировать информацию о профиле.</span>
        `;
        copyButton.style.cssText = `
            margin-left: 8px;
            padding: 4px 8px;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        `;

        const tooltip = copyButton.querySelector(".copy-tooltip");

        copyButton.addEventListener("mouseenter", function() {
            tooltip.style.visibility = "visible";
            tooltip.style.opacity = "1";
        });

        copyButton.addEventListener("mouseleave", function() {
            tooltip.style.visibility = "hidden";
            tooltip.style.opacity = "0";
        });

        copyButton.addEventListener("click", function() {
            if (lastApiResponse) {
                const textToCopy = typeof lastApiResponse === 'string'
                    ? lastApiResponse
                    : JSON.stringify(lastApiResponse, null, 2);

                navigator.clipboard.writeText(textToCopy).then(() => {
                    const originalText = tooltip.textContent;
                    tooltip.textContent = "Скопировано!";
                    tooltip.style.visibility = "visible";
                    tooltip.style.opacity = "1";

                    setTimeout(() => {
                        tooltip.textContent = originalText;
                        tooltip.style.visibility = "hidden";
                        tooltip.style.opacity = "0";
                    }, 1500);
                }).catch(err => {
                    console.error('Ошибка копирования:', err);
                });
            } else {
                alert("Сначала загрузите данные через API");
            }
        });

        return copyButton;
    }

    function addCopyButton() {
        if (!isCopyButtonEnabled) return;

        const targetElement = findTargetElement();
        if (!targetElement) {
            return false;
        }

        // Проверяем, есть ли уже наша кнопка
        const existingButton = targetElement.querySelector('.itd-copy-btn');
        if (existingButton) {
            return true;
        }

        const copyButton = createCopyButton();
        targetElement.appendChild(copyButton);
        return true;
    }

    function removeCopyButtons() {
        document.querySelectorAll('.itd-copy-btn').forEach(btn => btn.remove());
    }

    const copyButtonObserver = new MutationObserver(function() {
        if (isCopyButtonEnabled) {
            addCopyButton();
        }
    });

    // ============================================
    // УНИВЕРСАЛЬНЫЙ DRAGGABLE WINDOW
    // ============================================

    function createDraggableWindow(options) {
        const { id, title, content, positionKey, defaultPosition, onInit } = options;

        const savedPosition = JSON.parse(localStorage.getItem(positionKey)) || defaultPosition;
        const savedSize = JSON.parse(localStorage.getItem(positionKey + 'Size')) || {};
        const window = document.createElement('div');
        window.id = id;
        window.className = 'itd-window';
        window.style.display = 'none';
        window.style.left = savedPosition.left;
        window.style.top = savedPosition.top;

        // Применяем сохранённый размер или ширину по умолчанию
        if (savedSize.width) {
            window.style.width = savedSize.width;
        }
        if (savedSize.height) {
            window.style.height = savedSize.height;
        }

        window.innerHTML = `
            <div class="itd-window-header">
                <span>${title}</span>
                <div class="itd-window-header-buttons">
                    ${options.showSettings ? `
                    <button class="itd-window-btn itd-btn-settings" aria-label="Настройки">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>` : ''}
                    <button class="itd-window-btn itd-btn-close" aria-label="Закрыть">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="itd-window-content">${content}</div>
            <div class="itd-resize-handle" title="Изменить размер"></div>
        `;

        // Логика перетаскивания
        const header = window.querySelector('.itd-window-header');
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const onMouseDown = (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = window.offsetLeft;
            initialTop = window.offsetTop;
            header.style.cursor = 'grabbing';
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            window.style.left = `${initialLeft + dx}px`;
            window.style.top = `${initialTop + dy}px`;
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                header.style.cursor = 'move';
                localStorage.setItem(positionKey, JSON.stringify({
                    left: window.style.left,
                    top: window.style.top
                }));
            }
        };

        header.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // Логика изменения размера
        const resizeHandle = window.querySelector('.itd-resize-handle');
        let isResizing = false;
        let startWidth, startHeight, startResizeX, startResizeY;

        const onResizeMouseDown = (e) => {
            isResizing = true;
            startWidth = window.offsetWidth;
            startHeight = window.offsetHeight;
            startResizeX = e.clientX;
            startResizeY = e.clientY;
            e.preventDefault();
            e.stopPropagation();
        };

        const onResizeMouseMove = (e) => {
            if (!isResizing) return;
            const dx = e.clientX - startResizeX;
            const dy = e.clientY - startResizeY;
            const newWidth = startWidth + dx;
            const newHeight = startHeight + dy;

            // Минимальные размеры
            if (newWidth > 200) window.style.width = `${newWidth}px`;
            if (newHeight > 150) window.style.height = `${newHeight}px`;
        };

        const onResizeMouseUp = () => {
            isResizing = false;
            // Сохраняем размер окна
            const savedSize = JSON.parse(localStorage.getItem(positionKey + 'Size')) || {};
            savedSize.width = window.style.width;
            savedSize.height = window.style.height;
            localStorage.setItem(positionKey + 'Size', JSON.stringify(savedSize));
        };

        resizeHandle.addEventListener('mousedown', onResizeMouseDown);
        document.addEventListener('mousemove', onResizeMouseMove);
        document.addEventListener('mouseup', onResizeMouseUp);

        // Кнопка закрытия
        const closeBtn = window.querySelector('.itd-btn-close');
        closeBtn.addEventListener('click', () => {
            window.style.display = 'none';
        });

        // Очистка слушателей при удалении окна
        window.cleanupDrag = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('mousemove', onResizeMouseMove);
            document.removeEventListener('mouseup', onResizeMouseUp);
        };

        if (onInit) onInit(window);
        return window;
    }

    // ============================================
    // PREMIUM NICK (из prem.js)
    // ============================================

    const PREMIUM_WRAPPER_CLASS = 'RrXA28Pz';
    let isPremiumNickEnabled = true;
    let premiumStyleElement = null;
    let premiumObserver = null;

    function getMyDisplayName() {
        try {
            const authData = sessionStorage.getItem('auth-storage');
            if (!authData) return null;
            const parsed = JSON.parse(authData);
            return parsed?.state?.profile?.displayName || null;
        } catch (e) {
            console.error('Ошибка парсинга auth-storage:', e);
            return null;
        }
    }

    function injectPremiumStyles() {
        const styleId = 'premium-nicks-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .j8vGlZKp .${PREMIUM_WRAPPER_CLASS},
                [data-theme=dark] .j8vGlZKp .${PREMIUM_WRAPPER_CLASS} {
                    filter: drop-shadow(0 2px 16px rgba(0,128,255,.4));
                }
                .j8vGlZKp .${PREMIUM_WRAPPER_CLASS} .lE9vN8i6 {
                    background: linear-gradient(270deg,#0288d1,#26c6da);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                [data-theme=dark] .j8vGlZKp .${PREMIUM_WRAPPER_CLASS} .lE9vN8i6 {
                    background: linear-gradient(270deg,#4fc3f7,#e0f7fa);
                    -webkit-background-clip: text;
                    background-clip: text;
                }
            `;
            document.head.appendChild(style);
            premiumStyleElement = style;
        }
    }

    function applyPremiumToMyNick() {
        if (!isPremiumNickEnabled) return;

        const myDisplayName = getMyDisplayName();
        if (!myDisplayName) return;

        const nickElements = document.querySelectorAll('.lE9vN8i6');

        nickElements.forEach(nickEl => {
            if (nickEl.textContent.trim() !== myDisplayName) return;
            if (nickEl.parentElement && nickEl.parentElement.classList.contains(PREMIUM_WRAPPER_CLASS)) return;

            const parentContainer = nickEl.closest('.j8vGlZKp');
            if (!parentContainer) return;

            const wrapper = document.createElement('span');
            wrapper.className = PREMIUM_WRAPPER_CLASS;
            nickEl.parentNode.insertBefore(wrapper, nickEl);
            wrapper.appendChild(nickEl);
        });
    }

    function removePremiumFromAllNicks() {
        const wrappers = document.querySelectorAll(`.${PREMIUM_WRAPPER_CLASS}`);
        wrappers.forEach(wrapper => {
            const nick = wrapper.querySelector('.lE9vN8i6');
            if (nick) {
                wrapper.parentNode.insertBefore(nick, wrapper);
                wrapper.remove();
            }
        });

        if (premiumStyleElement) {
            premiumStyleElement.remove();
            premiumStyleElement = null;
        }
    }

    function startPremiumObserver() {
        if (premiumObserver) return;

        premiumObserver = new MutationObserver((mutations) => {
            if (!isPremiumNickEnabled) return;

            let shouldApply = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    shouldApply = true;
                    break;
                }
            }
            if (shouldApply) {
                applyPremiumToMyNick();
            }
        });

        premiumObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function stopPremiumObserver() {
        if (premiumObserver) {
            premiumObserver.disconnect();
            premiumObserver = null;
        }
    }

    window.setPremiumNickEnabled = (enabled) => {
        isPremiumNickEnabled = enabled;
        console.log('[EITD] Премиум ник:', enabled ? 'включен' : 'выключен');

        if (enabled) {
            injectPremiumStyles();
            applyPremiumToMyNick();
            startPremiumObserver();
        } else {
            removePremiumFromAllNicks();
            stopPremiumObserver();
        }
    };

    // ============================================
    // ПРИВЕТСТВЕННЫЙ ЭКРАН
    // ============================================

    function showWelcomeScreen() {
        // Проверяем, показывали ли уже приветствие
        if (localStorage.getItem('itdPlusWelcomeShown') === 'true') {
            return;
        }

        // Создаём затемнение
        const overlay = document.createElement('div');
        overlay.id = 'itd-welcome-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: itdFadeIn 0.3s ease;
        `;

        // Создаём приветственное окно
        const welcomeBox = document.createElement('div');
        welcomeBox.id = 'itd-welcome-box';
        welcomeBox.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(64, 224, 208, 0.4);
            border: 1px solid rgba(64, 224, 208, 0.3);
            color: #fff;
            padding: 40px;
            text-align: center;
            max-width: 400px;
            animation: itdScaleIn 0.4s ease;
        `;

        welcomeBox.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
            <h2 style="margin: 0 0 15px 0; font-size: 24px; background: linear-gradient(135deg, #40E0D0 0%, #20B2AA 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Спасибо за скачивание!</h2>
            <p style="margin: 0 0 30px 0; font-size: 16px; color: rgba(255, 255, 255, 0.8); line-height: 1.6;">Расширение для ITD: EITD успешно установлено</p>
            <button id="itd-welcome-btn" style="
                background: linear-gradient(135deg, #40E0D0 0%, #20B2AA 100%);
                border: none;
                border-radius: 8px;
                color: white;
                padding: 12px 32px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 4px 15px rgba(64, 224, 208, 0.4);
            ">Отлично!</button>
        `;

        overlay.appendChild(welcomeBox);
        document.body.appendChild(overlay);

        // Добавляем анимации в стили
        const welcomeStyles = document.createElement('style');
        welcomeStyles.id = 'itd-welcome-styles';
        welcomeStyles.textContent = `
            @keyframes itdFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes itdScaleIn {
                from { opacity: 0; transform: scale(0.8); }
                to { opacity: 1; transform: scale(1); }
            }
            #itd-welcome-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 6px 20px rgba(64, 224, 208, 0.6);
            }
        `;
        document.head.appendChild(welcomeStyles);

        // Обработчик кнопки
        const welcomeBtn = document.getElementById('itd-welcome-btn');
        welcomeBtn.addEventListener('click', () => {
            overlay.style.animation = 'itdFadeIn 0.3s ease reverse';
            setTimeout(() => {
                overlay.remove();
                welcomeStyles.remove();
                localStorage.setItem('itdPlusWelcomeShown', 'true');
            }, 300);
        });

        // Закрытие по клику на overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                welcomeBtn.click();
            }
        });
    }

    // ============================================
    // СНЕГ (из sneg.js)
    // ============================================

    let _snowCanvas = null;
    let _snowCtx = null;
    let _snowWidth = 0;
    let _snowHeight = 0;
    let _snowflakes = [];
    let _snowAnimationId = null;
    let _snowAngle = 0;
    let _snowIsRunning = false;

    function _getSnowConfig() {
        return {
            count: parseInt(localStorage.getItem('itdPlusSnowCount') || '150'),
            speed: parseFloat(localStorage.getItem('itdPlusSnowSpeed') || '1'),
            wind: parseFloat(localStorage.getItem('itdPlusSnowWind') || '0.5'),
            sizeMin: parseFloat(localStorage.getItem('itdPlusSnowSizeMin') || '1'),
            sizeMax: parseFloat(localStorage.getItem('itdPlusSnowSizeMax') || '4'),
            opacity: parseFloat(localStorage.getItem('itdPlusSnowOpacity') || '0.8')
        };
    }

    function _createSnowflakes() {
        const config = _getSnowConfig();
        _snowflakes.length = 0;
        for (let i = 0; i < config.count; i++) {
            _snowflakes.push({
                x: Math.random() * _snowWidth,
                y: Math.random() * _snowHeight,
                r: Math.random() * (config.sizeMax - config.sizeMin) + config.sizeMin,
                d: Math.random() * config.count,
                speed: Math.random() * config.speed + 0.2,
                wind: (Math.random() * config.wind * 2 - config.wind) * 0.5
            });
        }
    }

    function _snowDraw() {
        const config = _getSnowConfig();
        _snowCtx.clearRect(0, 0, _snowWidth, _snowHeight);
        _snowCtx.fillStyle = `rgba(255, 255, 255, ${config.opacity})`;
        _snowCtx.beginPath();
        for (let i = 0; i < _snowflakes.length; i++) {
            const f = _snowflakes[i];
            _snowCtx.moveTo(f.x + f.r, f.y);
            _snowCtx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        }
        _snowCtx.fill();
        _snowUpdate();
        _snowAnimationId = requestAnimationFrame(_snowDraw);
    }

    function _snowUpdate() {
        const config = _getSnowConfig();
        _snowAngle += 0.01;
        for (let i = 0; i < _snowflakes.length; i++) {
            const f = _snowflakes[i];
            f.y += Math.pow(f.d, 0.3) * f.speed * 0.3 * config.speed;
            f.x += Math.sin(_snowAngle + f.d) * config.wind * f.wind;

            if (f.y > _snowHeight + 5) {
                f.y = -5;
                f.x = Math.random() * _snowWidth;
            }
            if (f.x > _snowWidth + 5) {
                f.x = -5;
            } else if (f.x < -5) {
                f.x = _snowWidth + 5;
            }
        }
    }

    function initSnow() {
        if (_snowIsRunning) return;
        _snowIsRunning = true;

        _snowCanvas = document.createElement('canvas');
        _snowCanvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 2147483647;
        `;
        document.body.appendChild(_snowCanvas);

        _snowCtx = _snowCanvas.getContext('2d');
        _snowWidth = _snowCanvas.width = window.innerWidth;
        _snowHeight = _snowCanvas.height = window.innerHeight;

        _createSnowflakes();
        _snowDraw();

        window.addEventListener('resize', _snowOnResize);

        // Глобальные функции управления для слайдеров
        window.__setSnowCount = function(n) {
            localStorage.setItem('itdPlusSnowCount', n);
            _createSnowflakes();
        };
        window.__setSnowSpeed = function(s) { /* speed применяется в draw/update напрямую из localStorage */ };
        window.__setSnowWind = function(w) { /* wind применяется в update напрямую из localStorage */ };
        window.__setSnowSize = function(min, max) {
            localStorage.setItem('itdPlusSnowSizeMin', min);
            localStorage.setItem('itdPlusSnowSizeMax', max);
            _createSnowflakes();
        };
        window.__setSnowOpacity = function(o) { /* opacity читается из localStorage в draw */ };
    }

    function stopSnow() {
        if (!_snowIsRunning) return;
        cancelAnimationFrame(_snowAnimationId);
        if (_snowCanvas && _snowCanvas.parentNode) _snowCanvas.parentNode.removeChild(_snowCanvas);
        _snowIsRunning = false;
        _snowCanvas = null;
        _snowCtx = null;
        _snowflakes = [];
        window.removeEventListener('resize', _snowOnResize);
        delete window.__setSnowCount;
        delete window.__setSnowSpeed;
        delete window.__setSnowWind;
        delete window.__setSnowSize;
        delete window.__setSnowOpacity;
        console.log('❄️ Снег остановлен.');
    }

    function _snowOnResize() {
        if (_snowCanvas) {
            _snowWidth = _snowCanvas.width = window.innerWidth;
            _snowHeight = _snowCanvas.height = window.innerHeight;
        }
    }

    // ============================================
    // ИНИЦИАЛИЗАЦИЯ
    // ============================================

    function init() {
        injectStyles();

        // Показываем приветственный экран
        showWelcomeScreen();

        // Создаём кнопку меню
        const button = document.createElement('button');
        button.id = 'itd-plus-menu-btn';
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
        `;
        document.body.appendChild(button);

        // Создаём главное меню
        const downloadEnabled = localStorage.getItem('itdPlusDownloadEnabled') !== 'false';
        const fullDateEnabled = localStorage.getItem('itdPlusFullDateEnabled') !== 'false';
        const copyButtonEnabled = localStorage.getItem('itdPlusCopyButtonEnabled') !== 'false';
        const premiumNickEnabled = localStorage.getItem('itdPlusPremiumNickEnabled') !== 'false';
        const snowEnabled = localStorage.getItem('itdPlusSnowEnabled') !== 'false';
        const menuContent = `
            <div class="itd-menu-item">
                <label class="itd-slider-label">
                    <span>Кнопка скачивания изображений</span>
                    <div class="itd-slider-container">
                        <input type="checkbox" id="itd-download-toggle" ${downloadEnabled ? 'checked' : ''}>
                        <span class="itd-slider"></span>
                    </div>
                </label>
            </div>
            <div class="itd-menu-item">
                <label class="itd-slider-label">
                    <span>Полная дата регистрации</span>
                    <div class="itd-slider-container">
                        <input type="checkbox" id="itd-full-date-toggle" ${fullDateEnabled ? 'checked' : ''}>
                        <span class="itd-slider"></span>
                    </div>
                </label>
            </div>
            <div class="itd-menu-item">
                <label class="itd-slider-label">
                    <span>Кнопка копирования профиля</span>
                    <div class="itd-slider-container">
                        <input type="checkbox" id="itd-copy-toggle" ${copyButtonEnabled ? 'checked' : ''}>
                        <span class="itd-slider"></span>
                    </div>
                </label>
            </div>
            <div class="itd-menu-item">
                <label class="itd-slider-label">
                    <span>Премиум ник</span>
                    <div class="itd-slider-container">
                        <input type="checkbox" id="itd-premium-nick-toggle" ${premiumNickEnabled ? 'checked' : ''}>
                        <span class="itd-slider"></span>
                    </div>
                </label>
            </div>
            <div class="itd-menu-item">
                <label class="itd-slider-label">
                    <span>Снег</span>
                    <div class="itd-slider-container">
                        <input type="checkbox" id="itd-snow-toggle" ${snowEnabled ? 'checked' : ''}>
                        <span class="itd-slider"></span>
                    </div>
                </label>
            </div>
        `;

        const menu = createDraggableWindow({
            id: 'itd-plus-menu',
            title: 'EITD Меню',
            content: menuContent,
            positionKey: 'itdPlusMenuPosition',
            defaultPosition: { left: '90px', top: '100px' },
            showSettings: true,
            onInit: (menuWindow) => {
                const checkbox = menuWindow.querySelector('#itd-download-toggle');
                checkbox.addEventListener('change', function() {
                    const isEnabled = this.checked;
                    localStorage.setItem('itdPlusDownloadEnabled', isEnabled);
                    console.log('[EITD] Кнопка скачивания:', isEnabled ? 'включена' : 'выключена');

                    if (isEnabled) {
                        processPosts();
                    } else {
                        removeDownloadButtons();
                    }
                });

                // Обработчик для полной даты регистрации
                const fullDateCheckbox = menuWindow.querySelector('#itd-full-date-toggle');
                fullDateCheckbox.addEventListener('change', function() {
                    const isEnabled = this.checked;
                    localStorage.setItem('itdPlusFullDateEnabled', isEnabled);
                    setFullDateEnabled(isEnabled);
                });

                // Обработчик для кнопки копирования профиля
                const copyCheckbox = menuWindow.querySelector('#itd-copy-toggle');
                copyCheckbox.addEventListener('change', function() {
                    const isEnabled = this.checked;
                    localStorage.setItem('itdPlusCopyButtonEnabled', isEnabled);
                    isCopyButtonEnabled = isEnabled;
                    console.log('[EITD] Кнопка копирования профиля:', isEnabled ? 'включена' : 'выключена');

                    if (isEnabled) {
                        addCopyButton();
                        copyButtonObserver.observe(document.body, { childList: true, subtree: true });
                    } else {
                        removeCopyButtons();
                    }
                });

                // Обработчик для премиум ника
                const premiumNickCheckbox = menuWindow.querySelector('#itd-premium-nick-toggle');
                premiumNickCheckbox.addEventListener('change', function() {
                    const isEnabled = this.checked;
                    localStorage.setItem('itdPlusPremiumNickEnabled', isEnabled);
                    setPremiumNickEnabled(isEnabled);
                });

                // Обработчик для снега
                const snowCheckbox = menuWindow.querySelector('#itd-snow-toggle');
                snowCheckbox.addEventListener('change', function() {
                    const isEnabled = this.checked;
                    localStorage.setItem('itdPlusSnowEnabled', isEnabled);
                    console.log('[EITD] Снег:', isEnabled ? 'включен' : 'выключен');

                    if (isEnabled) {
                        initSnow();
                    } else {
                        stopSnow();
                    }
                });

                // Инициализируем состояние полной даты при загрузке меню
                const fullDateEnabled = localStorage.getItem('itdPlusFullDateEnabled') !== 'false';
                setFullDateEnabled(fullDateEnabled);

                // Инициализируем состояние премиум ника при загрузке меню
                const premiumNickEnabled = localStorage.getItem('itdPlusPremiumNickEnabled') !== 'false';
                setPremiumNickEnabled(premiumNickEnabled);

                // Инициализируем снег при загрузке, если он включён
                const snowEnabled = localStorage.getItem('itdPlusSnowEnabled') !== 'false';
                if (snowEnabled) {
                    initSnow();
                }
            }
        });
        document.body.appendChild(menu);

        // Создаём окно настроек
        const snowCountVal = parseInt(localStorage.getItem('itdPlusSnowCount') || '150');
        const snowSpeedVal = parseFloat(localStorage.getItem('itdPlusSnowSpeed') || '1');
        const snowWindVal = parseFloat(localStorage.getItem('itdPlusSnowWind') || '0.5');
        const snowSizeMinVal = parseFloat(localStorage.getItem('itdPlusSnowSizeMin') || '1');
        const snowSizeMaxVal = parseFloat(localStorage.getItem('itdPlusSnowSizeMax') || '4');
        const snowOpacityVal = parseFloat(localStorage.getItem('itdPlusSnowOpacity') || '0.8');

        const settingsContent = `
            <div class="itd-snow-section">
                <div style="font-weight: bold; font-size: 15px; margin-bottom: 15px; color: #40E0D0;">❄️ Настройки снега</div>

                <div class="itd-range-label">
                    <span>Количество снежинок</span>
                    <span id="itd-snow-count-val">${snowCountVal}</span>
                </div>
                <input type="range" class="itd-range-slider" id="itd-snow-count" min="10" max="500" value="${snowCountVal}">

                <div class="itd-range-label">
                    <span>Скорость падения</span>
                    <span id="itd-snow-speed-val">${snowSpeedVal}</span>
                </div>
                <input type="range" class="itd-range-slider" id="itd-snow-speed" min="0.1" max="5" step="0.1" value="${snowSpeedVal}">

                <div class="itd-range-label">
                    <span>Сила ветра</span>
                    <span id="itd-snow-wind-val">${snowWindVal}</span>
                </div>
                <input type="range" class="itd-range-slider" id="itd-snow-wind" min="0" max="3" step="0.1" value="${snowWindVal}">

                <div class="itd-range-label">
                    <span>Мин. размер</span>
                    <span id="itd-snow-size-min-val">${snowSizeMinVal}</span>
                </div>
                <input type="range" class="itd-range-slider" id="itd-snow-size-min" min="0.5" max="10" step="0.5" value="${snowSizeMinVal}">

                <div class="itd-range-label">
                    <span>Макс. размер</span>
                    <span id="itd-snow-size-max-val">${snowSizeMaxVal}</span>
                </div>
                <input type="range" class="itd-range-slider" id="itd-snow-size-max" min="1" max="15" step="0.5" value="${snowSizeMaxVal}">

                <div class="itd-range-label">
                    <span>Прозрачность</span>
                    <span id="itd-snow-opacity-val">${snowOpacityVal}</span>
                </div>
                <input type="range" class="itd-range-slider" id="itd-snow-opacity" min="0" max="1" step="0.1" value="${snowOpacityVal}">
            </div>
            <button class="itd-reset-btn">Сбросить всё</button>
        `;

        const settingsMenu = createDraggableWindow({
            id: 'itd-plus-settings-menu',
            title: 'Настройки',
            content: settingsContent,
            positionKey: 'itdPlusSettingsPosition',
            defaultPosition: { left: '420px', top: '100px' },
            showSettings: false,
            onInit: (settingsWindow) => {
                // === Обработчики слайдеров снега ===
                const snowCountSlider = settingsWindow.querySelector('#itd-snow-count');
                const snowSpeedSlider = settingsWindow.querySelector('#itd-snow-speed');
                const snowWindSlider = settingsWindow.querySelector('#itd-snow-wind');
                const snowSizeMinSlider = settingsWindow.querySelector('#itd-snow-size-min');
                const snowSizeMaxSlider = settingsWindow.querySelector('#itd-snow-size-max');
                const snowOpacitySlider = settingsWindow.querySelector('#itd-snow-opacity');

                const snowCountVal = settingsWindow.querySelector('#itd-snow-count-val');
                const snowSpeedVal = settingsWindow.querySelector('#itd-snow-speed-val');
                const snowWindVal = settingsWindow.querySelector('#itd-snow-wind-val');
                const snowSizeMinVal = settingsWindow.querySelector('#itd-snow-size-min-val');
                const snowSizeMaxVal = settingsWindow.querySelector('#itd-snow-size-max-val');
                const snowOpacityValEl = settingsWindow.querySelector('#itd-snow-opacity-val');

                snowCountSlider.addEventListener('input', function() {
                    snowCountVal.textContent = this.value;
                    localStorage.setItem('itdPlusSnowCount', this.value);
                    if (window.__setSnowCount) window.__setSnowCount(parseInt(this.value));
                });

                snowSpeedSlider.addEventListener('input', function() {
                    snowSpeedVal.textContent = this.value;
                    localStorage.setItem('itdPlusSnowSpeed', this.value);
                    if (window.__setSnowSpeed) window.__setSnowSpeed(parseFloat(this.value));
                });

                snowWindSlider.addEventListener('input', function() {
                    snowWindVal.textContent = this.value;
                    localStorage.setItem('itdPlusSnowWind', this.value);
                    if (window.__setSnowWind) window.__setSnowWind(parseFloat(this.value));
                });

                snowSizeMinSlider.addEventListener('input', function() {
                    snowSizeMinVal.textContent = this.value;
                    localStorage.setItem('itdPlusSnowSizeMin', this.value);
                    const sizeMax = parseFloat(localStorage.getItem('itdPlusSnowSizeMax') || '4');
                    if (window.__setSnowSize) window.__setSnowSize(parseFloat(this.value), sizeMax);
                });

                snowSizeMaxSlider.addEventListener('input', function() {
                    snowSizeMaxVal.textContent = this.value;
                    localStorage.setItem('itdPlusSnowSizeMax', this.value);
                    const sizeMin = parseFloat(localStorage.getItem('itdPlusSnowSizeMin') || '1');
                    if (window.__setSnowSize) window.__setSnowSize(sizeMin, parseFloat(this.value));
                });

                snowOpacitySlider.addEventListener('input', function() {
                    snowOpacityValEl.textContent = this.value;
                    localStorage.setItem('itdPlusSnowOpacity', this.value);
                    if (window.__setSnowOpacity) window.__setSnowOpacity(parseFloat(this.value));
                });

                // Кнопка сброса
                const resetBtn = settingsWindow.querySelector('.itd-reset-btn');
                resetBtn.addEventListener('click', () => {
                    const confirmed = confirm('Вы уверены, что хотите сбросить все настройки EITD к заводским?');
                    if (!confirmed) return;

                    localStorage.removeItem('itdPlusMenuPosition');
                    localStorage.removeItem('itdPlusMenuPositionSize');
                    localStorage.removeItem('itdPlusSettingsPosition');
                    localStorage.removeItem('itdPlusSettingsPositionSize');
                    localStorage.removeItem('itdPlusWelcomeShown');
                    localStorage.removeItem('itdPlusSnowCount');
                    localStorage.removeItem('itdPlusSnowSpeed');
                    localStorage.removeItem('itdPlusSnowWind');
                    localStorage.removeItem('itdPlusSnowSizeMin');
                    localStorage.removeItem('itdPlusSnowSizeMax');
                    localStorage.removeItem('itdPlusSnowOpacity');
                    localStorage.setItem('itdPlusDownloadEnabled', 'true');
                    localStorage.setItem('itdPlusFullDateEnabled', 'true');
                    localStorage.setItem('itdPlusCopyButtonEnabled', 'true');
                    localStorage.setItem('itdPlusPremiumNickEnabled', 'true');
                    localStorage.setItem('itdPlusSnowEnabled', 'true');

                    const checkbox = document.getElementById('itd-download-toggle');
                    const fullDateCheckbox = document.getElementById('itd-full-date-toggle');
                    const copyCheckbox = document.getElementById('itd-copy-toggle');
                    const premiumNickCheckbox = document.getElementById('itd-premium-nick-toggle');
                    const snowCheckbox = document.getElementById('itd-snow-toggle');
                    if (checkbox) checkbox.checked = true;
                    if (fullDateCheckbox) fullDateCheckbox.checked = true;
                    if (copyCheckbox) copyCheckbox.checked = true;
                    if (premiumNickCheckbox) premiumNickCheckbox.checked = true;
                    if (snowCheckbox) snowCheckbox.checked = true;

                    // Сброс слайдеров снега к значениям по умолчанию
                    const sCount = settingsWindow.querySelector('#itd-snow-count');
                    const sSpeed = settingsWindow.querySelector('#itd-snow-speed');
                    const sWind = settingsWindow.querySelector('#itd-snow-wind');
                    const sSizeMin = settingsWindow.querySelector('#itd-snow-size-min');
                    const sSizeMax = settingsWindow.querySelector('#itd-snow-size-max');
                    const sOpacity = settingsWindow.querySelector('#itd-snow-opacity');
                    if (sCount) sCount.value = 150;
                    if (sSpeed) sSpeed.value = 1;
                    if (sWind) sWind.value = 0.5;
                    if (sSizeMin) sSizeMin.value = 1;
                    if (sSizeMax) sSizeMax.value = 4;
                    if (sOpacity) sOpacity.value = 0.8;

                    const sCountV = settingsWindow.querySelector('#itd-snow-count-val');
                    const sSpeedV = settingsWindow.querySelector('#itd-snow-speed-val');
                    const sWindV = settingsWindow.querySelector('#itd-snow-wind-val');
                    const sSizeMinV = settingsWindow.querySelector('#itd-snow-size-min-val');
                    const sSizeMaxV = settingsWindow.querySelector('#itd-snow-size-max-val');
                    const sOpacityV = settingsWindow.querySelector('#itd-snow-opacity-val');
                    if (sCountV) sCountV.textContent = '150';
                    if (sSpeedV) sSpeedV.textContent = '1';
                    if (sWindV) sWindV.textContent = '0.5';
                    if (sSizeMinV) sSizeMinV.textContent = '1';
                    if (sSizeMaxV) sSizeMaxV.textContent = '4';
                    if (sOpacityV) sOpacityV.textContent = '0.8';

                    menu.style.display = 'none';
                    settingsWindow.style.display = 'none';

                    console.log('[EITD] Настройки сброшены к заводским');
                    alert('Настройки EITD сброшены к заводским.');
                });
            }
        });
        document.body.appendChild(settingsMenu);

        // Кнопка открытия настроек из главного меню
        const settingsBtn = menu.querySelector('.itd-btn-settings');
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsMenu.style.display = settingsMenu.style.display === 'none' ? 'block' : 'none';
        });

        // Переключение главного меню
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        });

        // Запуск наблюдения за постами
        setTimeout(() => {
            processPosts();
            downloadObserver.observe(document.body, { childList: true, subtree: true });
            regDateObserver.observe(document.body, { childList: true, subtree: true });

            // Инициализация кнопки копирования
            const copyButtonEnabled = localStorage.getItem('itdPlusCopyButtonEnabled') !== 'false';
            isCopyButtonEnabled = copyButtonEnabled;
            if (isCopyButtonEnabled) {
                addCopyButton();
                copyButtonObserver.observe(document.body, { childList: true, subtree: true });
            }
        }, 500);

        console.log('[EITD] Меню успешно инициализировано');
    }

    // Запуск после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
