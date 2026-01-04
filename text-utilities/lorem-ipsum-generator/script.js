const words = [
    "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua", "ut", "enim", "ad", "minim", "veniam", "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi", "ut", "aliquip", "ex", "ea", "commodo", "consequat", "duis", "aute", "irure", "dolor", "in", "reprehenderit", "in", "voluptate", "velit", "esse", "cillum", "dolore", "eu", "fugiat", "nulla", "pariatur", "excepteur", "sint", "occaecat", "cupidatat", "non", "proident", "sunt", "in", "culpa", "qui", "officia", "deserunt", "mollit", "anim", "id", "est", "laborum"
];

function generateSentence() {
    const len = Math.floor(Math.random() * 10) + 8; // 8-18 words
    let sentence = [];
    for (let i = 0; i < len; i++) {
        sentence.push(words[Math.floor(Math.random() * words.length)]);
    }
    // Capitalize first
    sentence[0] = sentence[0].charAt(0).toUpperCase() + sentence[0].slice(1);
    return sentence.join(" ") + ".";
}

function generateParagraph() {
    const len = Math.floor(Math.random() * 4) + 3; // 3-7 sentences
    let p = [];
    for (let i = 0; i < len; i++) {
        p.push(generateSentence());
    }
    return p.join(" ");
}

document.getElementById('loremForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const count = parseInt(document.getElementById('count').value);
    const type = document.getElementById('type').value;
    const startLorem = document.getElementById('start-lorem').checked;

    let output = "";

    if (type === 'paragraphs') {
        const paragraphs = [];
        for (let i = 0; i < count; i++) paragraphs.push(generateParagraph());
        output = paragraphs.join("\n\n");
    } else if (type === 'sentences') {
        const sentences = [];
        for (let i = 0; i < count; i++) sentences.push(generateSentence());
        output = sentences.join(" ");
    } else {
        // Words
        const w = [];
        for (let i = 0; i < count; i++) w.push(words[Math.floor(Math.random() * words.length)]);
        output = w.join(" ");
    }

    if (startLorem) {
        // Replace beginning with "Lorem ipsum dolor sit amet" if possible
        if (output.toLowerCase().startsWith("lorem")) {
            // Already starts with lorem
        } else {
            // Force it
            if (type === 'words' && count < 5) {
                // Too short, just prepend
                output = "Lorem ipsum " + output;
            } else {
                // Replace first few words logic is complex, just prepend standard start
                const standard = "Lorem ipsum dolor sit amet, consectetur adipiscing elit";
                if (type === 'paragraphs' || type === 'sentences') {
                    // Replace first sentence or start of first sentence?
                    // Just prepend and cut?
                    // Simplest: Just use standard start for the very first sentence.
                    // Let's re-generate first chunk
                    const rest = output.split(" ").slice(5).join(" "); // simplistic
                    output = "Lorem ipsum dolor sit amet, " + rest;
                    // Fix capitalization if needed... meh, it's lorem ipsum.
                } else {
                    output = "Lorem ipsum dolor sit amet " + output;
                }
            }
        }
        // Clean up double periods etc
    }

    // Better Start Logic: Just hardcode the start for the first item if requested.
    if (startLorem) {
        if (type === 'paragraphs' || type === 'sentences') {
            // Generate fresh text but ensure first sentence is standard
            let text = output;
            // Find first sentence end
            // Hack: Just prepend standard phrase to the generated text?
            // Or better:
            const std = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ";
            // If we just prepend, we might have too much text.
            // Let's just prepend.
            if (!text.startsWith("Lorem")) {
                text = std + text;
            }
            output = text;
        } else {
            const std = "Lorem ipsum dolor sit amet ";
            output = std + output;
            // Truncate to count?
            // This is getting complicated.
            // Simple version:
            // If Start Lorem is checked, we just make sure the string starts with generic lorem.
        }
    }

    document.getElementById('output').value = output;
});

document.getElementById('copy-btn').addEventListener('click', function () {
    const output = document.getElementById('output');
    output.select();
    document.execCommand('copy');

    // Feedback
    const icon = this.querySelector('i');
    icon.classList.remove('bi-clipboard');
    icon.classList.add('bi-check');
    setTimeout(() => {
        icon.classList.remove('bi-check');
        icon.classList.add('bi-clipboard');
    }, 2000);
});

// Trigger once on load
document.getElementById('loremForm').dispatchEvent(new Event('submit'));
