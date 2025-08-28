// Content Script para XPath Capturer Universal
// Se ejecuta automáticamente en todas las páginas

(function() {
    'use strict';
    
    // Verificar si ya está cargado
    if (window.xpathCapturerLoaded) return;
    window.xpathCapturerLoaded = true;
    
    // Función para obtener el XPath de un elemento
    function getXPath(element) {
        if (element.id !== '') {
            return `//*[@id="${element.id}"]`;
        }
        
        if (element === document.body) {
            return '/html/body';
        }
        
        let ix = 0;
        let siblings = element.parentNode.childNodes;
        
        for (let i = 0; i < siblings.length; i++) {
            let sibling = siblings[i];
            if (sibling === element) {
                return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
            }
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                ix++;
            }
        }
    }
    
    // Función para obtener XPath alternativo más robusto
    function getRobustXPath(element) {
        // Intentar con ID primero
        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }
        
        // Intentar con clases únicas
        if (element.className) {
            let classes = element.className.split(' ').filter(c => c.trim());
            if (classes.length > 0) {
                let classSelector = classes.map(c => `contains(@class, "${c}")`).join(' and ');
                let tagName = element.tagName.toLowerCase();
                return `//${tagName}[${classSelector}]`;
            }
        }
        
        // Intentar con atributos data-*
        let dataAttrs = element.attributes;
        for (let i = 0; i < dataAttrs.length; i++) {
            let attr = dataAttrs[i];
            if (attr.name.startsWith('data-')) {
                return `//${element.tagName.toLowerCase()}[@${attr.name}="${attr.value}"]`;
            }
        }
        
        // Usar XPath relativo con texto si es posible
        if (element.textContent && element.textContent.trim()) {
            let text = element.textContent.trim().substring(0, 50);
            if (text.length > 0) {
                return `//${element.tagName.toLowerCase()}[contains(text(), "${text}")]`;
            }
        }
        
        // Fallback al XPath completo
        return getXPath(element);
    }
    
    // Función para manejar el clic
    function handleClick(event) {
        if (!window.xpathCapturer || !window.xpathCapturer.isActive) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        let element = event.target;
        let xpath = getRobustXPath(element);
        let fullXpath = getXPath(element);
        
        window.xpathCapturer.clickCount++;
        
        let elementInfo = {
            index: window.xpathCapturer.clickCount,
            tagName: element.tagName,
            text: element.textContent.trim().substring(0, 100),
            xpath: xpath,
            fullXpath: fullXpath,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            pageTitle: document.title,
            tabId: window.xpathCapturer.tabId
        };
        
        window.xpathCapturer.capturedXPaths.push(elementInfo);
        
        // Guardar en storage de la extensión
        saveToStorage(elementInfo);
        
        // Mostrar información en consola
        console.log(`%c[CLICK ${window.xpathCapturer.clickCount}] ${element.tagName}`, 'color: #00ff00; font-weight: bold;');
        console.log('Texto:', elementInfo.text);
        console.log('XPath recomendado:', xpath);
        console.log('XPath completo:', fullXpath);
        console.log('URL:', elementInfo.url);
        console.log('Timestamp:', elementInfo.timestamp);
        console.log('---');
        
        // Resaltar el elemento temporalmente
        element.style.outline = '3px solid #00ff00';
        element.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
        
        setTimeout(() => {
            element.style.outline = '';
            element.style.backgroundColor = '';
        }, 2000);
        
        return false;
    }
    
    // Función para guardar en storage de la extensión
    function saveToStorage(elementInfo) {
        if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['xpathResults'], function(result) {
                let allResults = result.xpathResults || [];
                allResults.push(elementInfo);
                chrome.storage.local.set({ xpathResults: allResults });
            });
        }
    }
    
    // Función para mostrar indicador visual de estado
    function showStatusIndicator() {
        hideStatusIndicator();
        
        let indicator = document.createElement('div');
        indicator.id = 'xpath-status-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #28a745;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
            font-size: 14px;
            cursor: pointer;
        `;
        indicator.innerHTML = '🎯 XPath ON';
        indicator.title = 'Haz clic para detener la captura';
        
        indicator.addEventListener('click', function() {
            if (window.xpathCapturer) {
                window.xpathCapturer.stop();
            }
        });
        
        document.body.appendChild(indicator);
    }
    
    // Función para ocultar indicador visual
    function hideStatusIndicator() {
        let indicator = document.getElementById('xpath-status-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    // Función para iniciar la captura
    function startCapturing() {
        if (window.xpathCapturer && window.xpathCapturer.isActive) {
            console.log('La captura ya está activa');
            return;
        }
        
        // Inicializar si no existe
        if (!window.xpathCapturer) {
            window.xpathCapturer = {
                isActive: false,
                clickCount: 0,
                capturedXPaths: [],
                tabId: Date.now() // ID único para esta pestaña
            };
        }
        
        window.xpathCapturer.isActive = true;
        window.xpathCapturer.clickCount = 0;
        window.xpathCapturer.capturedXPaths = [];
        
        document.addEventListener('click', handleClick, true);
        
        console.log('%c🚀 CAPTURA DE XPATH INICIADA', 'color: #00ff00; font-size: 16px; font-weight: bold;');
        console.log('Página:', document.title);
        console.log('URL:', window.location.href);
        console.log('Haz clic en cualquier elemento para capturar su XPath');
        console.log('---');
        
        // Cambiar el cursor para indicar que está activo
        document.body.style.cursor = 'crosshair';
        
        // Mostrar indicador visual
        showStatusIndicator();
        
        // Notificar al background script
        if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
                action: 'captureStarted',
                tabId: window.xpathCapturer.tabId,
                url: window.location.href,
                title: document.title
            });
        }
    }
    
    // Función para detener la captura
    function stopCapturing() {
        if (!window.xpathCapturer || !window.xpathCapturer.isActive) {
            console.log('La captura no está activa');
            return;
        }
        
        window.xpathCapturer.isActive = false;
        document.removeEventListener('click', handleClick, true);
        document.body.style.cursor = '';
        
        console.log('%c⏹️ CAPTURA DE XPATH DETENIDA', 'color: #ff0000; font-size: 16px; font-weight: bold;');
        console.log(`Total de elementos capturados: ${window.xpathCapturer.clickCount}`);
        console.log('---');
        
        // Ocultar indicador visual
        hideStatusIndicator();
        
        // Notificar al background script
        if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
                action: 'captureStopped',
                tabId: window.xpathCapturer.tabId,
                count: window.xpathCapturer.clickCount
            });
        }
    }
    
    // Función para mostrar resultados
    function showResults() {
        if (!window.xpathCapturer || window.xpathCapturer.capturedXPaths.length === 0) {
            console.log('No hay XPaths capturados en esta página');
            return;
        }
        
        console.log('%c📊 RESULTADOS DE LA CAPTURA', 'color: #0066ff; font-size: 16px; font-weight: bold;');
        console.log('---');
        
        window.xpathCapturer.capturedXPaths.forEach((info, index) => {
            console.log(`%c${info.index}. ${info.tagName}`, 'color: #0066ff; font-weight: bold;');
            console.log('   Texto:', info.text);
            console.log('   XPath:', info.xpath);
            console.log('   URL:', info.url);
            console.log('   Timestamp:', info.timestamp);
            console.log('---');
        });
        
        console.log(`%cTotal: ${window.xpathCapturer.capturedXPaths.length} elementos capturados`, 'color: #00aa00; font-weight: bold;');
    }
    
    // Función para exportar resultados
    function exportResults() {
        if (!window.xpathCapturer || window.xpathCapturer.capturedXPaths.length === 0) {
            console.log('No hay resultados para exportar');
            return;
        }
        
        let dataStr = JSON.stringify(window.xpathCapturer.capturedXPaths, null, 2);
        let dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        let link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `xpath-results-${document.title.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        link.click();
        
        console.log('Resultados exportados como JSON');
    }
    
    // Función para limpiar resultados
    function clearResults() {
        if (window.xpathCapturer) {
            window.xpathCapturer.capturedXPaths = [];
            window.xpathCapturer.clickCount = 0;
        }
        console.log('Resultados limpiados');
    }
    
    // Función para obtener XPath de un elemento específico
    function getElementXPath(selector) {
        let element = document.querySelector(selector);
        if (!element) {
            console.log('Elemento no encontrado');
            return null;
        }
        
        let xpath = getRobustXPath(element);
        let fullXpath = getXPath(element);
        
        console.log('Elemento encontrado:', element.tagName);
        console.log('XPath recomendado:', xpath);
        console.log('XPath completo:', fullXpath);
        
        return { xpath, fullXpath };
    }
    
    // Agregar funciones al objeto window
    if (!window.xpathCapturer) {
        window.xpathCapturer = {};
    }
    
    Object.assign(window.xpathCapturer, {
        start: startCapturing,
        stop: stopCapturing,
        show: showResults,
        export: exportResults,
        clear: clearResults,
        getElement: getElementXPath
    });
    
    // Agregar getters para compatibilidad
    Object.defineProperty(window.xpathCapturer, 'isActive', {
        get: function() { return this._isActive || false; },
        set: function(value) { this._isActive = value; }
    });
    
    Object.defineProperty(window.xpathCapturer, 'clickCount', {
        get: function() { return this._clickCount || 0; },
        set: function(value) { this._clickCount = value; }
    });
    
    Object.defineProperty(window.xpathCapturer, 'capturedXPaths', {
        get: function() { 
            if (!this._capturedXPaths) this._capturedXPaths = [];
            return this._capturedXPaths;
        },
        set: function(value) { this._capturedXPaths = value; }
    });
    
    // Escuchar mensajes del popup
    if (chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            switch (request.action) {
                case 'start':
                    startCapturing();
                    sendResponse({ success: true });
                    break;
                case 'stop':
                    stopCapturing();
                    sendResponse({ success: true });
                    break;
                case 'getStatus':
                    sendResponse({
                        isActive: window.xpathCapturer ? window.xpathCapturer.isActive : false,
                        count: window.xpathCapturer ? window.xpathCapturer.clickCount : 0
                    });
                    break;
                case 'getResults':
                    sendResponse({
                        results: window.xpathCapturer ? window.xpathCapturer.capturedXPaths : []
                    });
                    break;
            }
        });
    }
    
    // Mostrar instrucciones iniciales
    console.log('%c🎯 XPATH CAPTURER EXTENSION CARGADO', 'color: #ff6600; font-size: 18px; font-weight: bold;');
    console.log('Funciona automáticamente en todas las pestañas');
    console.log('Comandos disponibles:');
    console.log('  xpathCapturer.start()  - Iniciar captura');
    console.log('  xpathCapturer.stop()   - Detener captura');
    console.log('  xpathCapturer.show()   - Mostrar resultados');
    console.log('  xpathCapturer.export() - Exportar como JSON');
    console.log('  xpathCapturer.clear()  - Limpiar resultados');
    console.log('---');
    console.log('O usa el botón de la extensión en la barra de herramientas');
    
})(); 