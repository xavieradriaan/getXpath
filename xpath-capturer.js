// A.A XPath Capturer - Captura los selectores tipo XPath de elementos clickeados
// console
// xpathCapturer.start()    // Iniciar captura
// xpathCapturer.show()     // Ver resultados
// xpathCapturer.stop()     // Detener captura
// xpathCapturer.export()   // Descargar archivo

(function() {
    'use strict';
    
    let isCapturing = false;
    let clickCount = 0;
    let capturedXPaths = [];
    
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
        if (!isCapturing) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        let element = event.target;
        let xpath = getRobustXPath(element);
        let fullXpath = getXPath(element);
        
        clickCount++;
        
        let elementInfo = {
            index: clickCount,
            tagName: element.tagName,
            text: element.textContent.trim().substring(0, 100),
            xpath: xpath,
            fullXpath: fullXpath,
            timestamp: new Date().toLocaleTimeString()
        };
        
        capturedXPaths.push(elementInfo);
        
        // Mostrar información en consola
        console.log(`%c[CLICK ${clickCount}] ${element.tagName}`, 'color: #00ff00; font-weight: bold;');
        console.log('Texto:', elementInfo.text);
        console.log('XPath recomendado:', xpath);
        console.log('XPath completo:', fullXpath);
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
    
    // Función para iniciar la captura
    function startCapturing() {
        if (isCapturing) {
            console.log('La captura ya está activa');
            return;
        }
        
        isCapturing = true;
        clickCount = 0;
        capturedXPaths = [];
        
        document.addEventListener('click', handleClick, true);
        
        console.log('%cCAPTURA DE XPATH INICIADA', 'color: #00ff00; font-size: 16px; font-weight: bold;');
        console.log('Haz clic en cualquier elemento para capturar su XPath');
        console.log('Usa stopCapturing() para detener');
        console.log('Usa showResults() para ver todos los resultados');
        console.log('---');
        
        // Cambiar el cursor para indicar que está activo
        document.body.style.cursor = 'crosshair';
    }
    
    // Función para detener la captura
    function stopCapturing() {
        if (!isCapturing) {
            console.log('La captura no está activa');
            return;
        }
        
        isCapturing = false;
        document.removeEventListener('click', handleClick, true);
        document.body.style.cursor = '';
        
        console.log('%cCAPTURA DE XPATH DETENIDA', 'color: #ff0000; font-size: 16px; font-weight: bold;');
        console.log(`Total de elementos capturados: ${clickCount}`);
        console.log('---');
    }
    
    // Función para mostrar todos los resultados
    function showResults() {
        if (capturedXPaths.length === 0) {
            console.log('No hay XPaths capturados');
            return;
        }
        
        console.log('%cRESULTADOS DE LA CAPTURA', 'color: #0066ff; font-size: 16px; font-weight: bold;');
        console.log('---');
        
        capturedXPaths.forEach((info, index) => {
            console.log(`%c${info.index}. ${info.tagName}`, 'color: #0066ff; font-weight: bold;');
            console.log('   Texto:', info.text);
            console.log('   XPath:', info.xpath);
            console.log('   Timestamp:', info.timestamp);
            console.log('---');
        });
        
        // Mostrar resumen
        console.log(`%cTotal: ${capturedXPaths.length} elementos capturados`, 'color: #00aa00; font-weight: bold;');
    }
    
    // Función para exportar resultados como JSON
    function exportResults() {
        if (capturedXPaths.length === 0) {
            console.log('No hay resultados para exportar');
            return;
        }
        
        let dataStr = JSON.stringify(capturedXPaths, null, 2);
        let dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        let link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `xpath-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        link.click();
        
        console.log('Resultados exportados como JSON');
    }
    
    // Función para limpiar resultados
    function clearResults() {
        capturedXPaths = [];
        clickCount = 0;
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
    window.xpathCapturer = {
        start: startCapturing,
        stop: stopCapturing,
        show: showResults,
        export: exportResults,
        clear: clearResults,
        getElement: getElementXPath,
        isActive: () => isCapturing,
        getCount: () => clickCount,
        getResults: () => capturedXPaths
    };
    
    // Mostrar instrucciones iniciales
            console.log('%cXPATH CAPTURER CARGADO', 'color: #ff6600; font-size: 18px; font-weight: bold;');
    console.log('Comandos disponibles:');
    console.log('  xpathCapturer.start()  - Iniciar captura');
    console.log('  xpathCapturer.stop()   - Detener captura');
    console.log('  xpathCapturer.show()   - Mostrar resultados');
    console.log('  xpathCapturer.export() - Exportar como JSON');
    console.log('  xpathCapturer.clear()  - Limpiar resultados');
    console.log('  xpathCapturer.getElement("selector") - Obtener XPath de elemento específico');
    console.log('---');
    console.log('Para empezar: xpathCapturer.start()');
    
})(); 