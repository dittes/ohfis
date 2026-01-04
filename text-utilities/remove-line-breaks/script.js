document.getElementById('convert-btn').addEventListener('click', function () {
    const text = document.getElementById('input').value;
    const mode = document.querySelector('input[name="mode"]:checked').value;

    let result = "";

    if (mode === 'space') {
        result = text.replace(/(\r\n|\n|\r)/gm, " ");
    } else if (mode === 'comma') {
        result = text.replace(/(\r\n|\n|\r)/gm, ", ");
    } else if (mode === 'none') {
        result = text.replace(/(\r\n|\n|\r)/gm, "");
    } else if (mode === 'p') {
        // Wrap paragraphs
        const paragraphs = text.split(/\r\n|\r|\n/).filter(line => line.trim() !== "");
        result = paragraphs.map(p => `<p>${p}</p>`).join("\n");
    }

    // Cleanup double spaces if space mode
    if (mode === 'space') {
        result = result.replace(/\s+/g, ' ');
    }

    document.getElementById('output').value = result;
});
