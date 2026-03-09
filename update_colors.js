const fs = require('fs');
const path = require('path');

const replacements = {
    'FAF3EE': 'F8FAFC',
    'FDF0EB': 'F1F5F9',
    'F5D5C8': 'E2E8F0',
    '2D1F17': '0F172A',
    '3D2E24': '1E293B',
    '6B5D52': '475569',
    '8B7B6E': '64748B',
    'B8A99C': '94A3B8',
    'D97756': '475569',
    'C4623E': '334155',
    'E8B4A0': '94A3B8',
    'E8DDD4': 'E2E8F0',
    'F0E8E0': 'CBD5E1',
    'D4C4B8': 'CBD5E1',
    '5E7A4A': '449171',
    '6B8F5E': '449171',
    'E8EDE2': 'E6F3EE',

    // Pending
    'A67A52': 'B89254',
    'D97706': 'B89254',

    // Error / Delete
    'B85C4A': 'C85A6F',
    '944839': 'C85A6F',
    'E11D48': 'C85A6F',
    'FEE2E2': 'F9EAEF'
};

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const targetDirs = ['html', 'js/src'];

targetDirs.forEach(dir => {
    walkDir(dir, (filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
            let content = fs.readFileSync(filePath, 'utf8');
            let original = content;

            for (const [oldC, newC] of Object.entries(replacements)) {
                const regex = new RegExp(oldC, 'gi');
                content = content.replace(regex, newC);
            }

            if (content !== original) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Updated: ${filePath}`);
            }
        }
    });
});
