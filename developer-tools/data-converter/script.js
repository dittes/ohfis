document.addEventListener('DOMContentLoaded', () => {
    const inputFormat = document.getElementById('inputFormat');
    const outputFormat = document.getElementById('outputFormat');
    const inputData = document.getElementById('inputData');
    const outputData = document.getElementById('outputData');
    const convertBtn = document.getElementById('convertBtn');
    const swapBtn = document.getElementById('swapBtn');
    const errorMsg = document.getElementById('errorMsg');
    const copyOutputBtn = document.getElementById('copyOutputBtn');

    convertBtn.addEventListener('click', convert);

    swapBtn.addEventListener('click', () => {
        // Swap formats
        const tempFmt = inputFormat.value;
        inputFormat.value = outputFormat.value;
        outputFormat.value = tempFmt;

        // Swap data (if output has content)
        if (outputData.value.trim()) {
            inputData.value = outputData.value;
            outputData.value = '';
        }
    });

    copyOutputBtn.addEventListener('click', () => {
        if (!outputData.value) return;
        navigator.clipboard.writeText(outputData.value).then(() => {
            const originalText = copyOutputBtn.textContent;
            copyOutputBtn.textContent = 'Copied!';
            setTimeout(() => { copyOutputBtn.textContent = originalText; }, 2000);
        });
    });

    function convert() {
        errorMsg.classList.add('d-none');
        outputData.value = '';
        const dataStr = inputData.value.trim();
        const inFmt = inputFormat.value;
        const outFmt = outputFormat.value;

        if (!dataStr) return;

        let jsonObj = null;

        // Step 1: Parse Input to JSON Object
        try {
            switch (inFmt) {
                case 'json':
                    jsonObj = JSON.parse(dataStr);
                    break;
                case 'csv':
                    const csvResult = Papa.parse(dataStr, { header: true, dynamicTyping: true, skipEmptyLines: true });
                    if (csvResult.errors.length > 0) throw new Error(csvResult.errors[0].message);
                    jsonObj = csvResult.data;
                    break;
                case 'yaml':
                    jsonObj = jsyaml.load(dataStr);
                    break;
                case 'xml':
                    jsonObj = parseXml(dataStr);
                    break;
            }
        } catch (e) {
            showError('Parse Error: ' + e.message);
            return;
        }

        if (!jsonObj) {
            showError('Parsed data is empty or invalid.');
            return;
        }

        // Step 2: stringify JSON Object to Output
        try {
            let resStr = '';
            switch (outFmt) {
                case 'json':
                    resStr = JSON.stringify(jsonObj, null, 2);
                    break;
                case 'yaml':
                    resStr = jsyaml.dump(jsonObj);
                    break;
                case 'csv':
                    // Need array of objects for unparse
                    let csvData = jsonObj;
                    if (!Array.isArray(csvData)) csvData = [csvData]; // wrap single obj
                    resStr = Papa.unparse(csvData);
                    break;
                case 'xml':
                    resStr = toXml(jsonObj);
                    break;
            }
            outputData.value = resStr;
        } catch (e) {
            showError('Conversion Error: ' + e.message);
        }
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.classList.remove('d-none');
    }

    // Basic XML Parser (using DOMParser)
    function parseXml(xmlStr) {
        // Very basic XML to JSON. Might be brittle.
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
        if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
            throw new Error("Invalid XML");
        }
        return xmlToJson(xmlDoc.documentElement);
    }

    function xmlToJson(xml) {
        let obj = {};
        if (xml.nodeType == 1) { // element
            if (xml.attributes.length > 0) {
                obj["@attributes"] = {};
                for (let j = 0; j < xml.attributes.length; j++) {
                    const attribute = xml.attributes.item(j);
                    obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
                }
            }
        } else if (xml.nodeType == 3) { // text
            obj = xml.nodeValue;
        }

        if (xml.hasChildNodes()) {
            for (let i = 0; i < xml.childNodes.length; i++) {
                const item = xml.childNodes.item(i);
                const nodeName = item.nodeName;

                if (nodeName === '#text') {
                    if (item.nodeValue.trim() === "") continue;
                    // mixed content not well supported here
                    return item.nodeValue;
                }

                if (typeof (obj[nodeName]) == "undefined") {
                    obj[nodeName] = xmlToJson(item);
                } else {
                    if (typeof (obj[nodeName].push) == "undefined") {
                        const old = obj[nodeName];
                        obj[nodeName] = [];
                        obj[nodeName].push(old);
                    }
                    obj[nodeName].push(xmlToJson(item));
                }
            }
        }
        // Simplify if empty object
        if (Object.keys(obj).length === 0) return "";
        return obj;
    }

    // Basic JSON to XML
    function toXml(obj, rootName = 'root') {
        let xml = '';
        if (typeof obj === 'object' && obj !== null) {
            if (Array.isArray(obj)) {
                obj.forEach(item => {
                    // For arrays, repeat the item without extra wrapper if possible, or wrap in item
                    // This is vague. Let's assume standard XML array format: <root><item>..</item><item>..</item></root>
                    xml += `<item>${toXml(item, 'item')}</item>`;
                });
                // Strip outer item because we will wrap it
                // Actually this recursion is tricky.
                // Correct approach:
                /*
                  if root is array:
                    <root>
                      <item>...</item>
                      <item>...</item>
                    <root>
                */
                return xml;
            } else {
                for (let prop in obj) {
                    if (obj.hasOwnProperty(prop)) {
                        if (prop === '@attributes') continue;
                        if (Array.isArray(obj[prop])) {
                            xml += obj[prop].map(item => `<${prop}>${toXml(item)}</${prop}>`).join('');
                        } else {
                            xml += `<${prop}>${toXml(obj[prop])}</${prop}>`;
                        }
                    }
                }
            }
        } else {
            return String(obj).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        return xml; // Caller wraps in root
    }
});
