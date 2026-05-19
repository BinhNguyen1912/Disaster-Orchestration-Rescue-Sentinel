const fs = require('fs');

let content = fs.readFileSync('d:/DoAn/DOAN/be/prisma/schema.prisma', 'utf-8');

// Remove all block-level @@map("...")
content = content.replace(/[\s\n]*@@map\("[^"]+"\)/g, '');

fs.writeFileSync('d:/DoAn/DOAN/be/prisma/schema.prisma', content, 'utf-8');
console.log('Removed all @@map from schema!');
