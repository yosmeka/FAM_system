const fs = require('fs');
const path = require('path');

// Function to recursively find all TypeScript files
function findTypeScriptFiles(dir) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules')) {
      results = results.concat(findTypeScriptFiles(filePath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(filePath);
    }
  }
  
  return results;
}

// Function to add React import if needed
function addReactImport(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has React import
  if (content.includes('import React') || content.includes('import * as React')) {
    return;
  }
  
  // Add React import at the top
  const newContent = `import React from 'react';\n${content}`;
  fs.writeFileSync(filePath, newContent);
  console.log(`Added React import to ${filePath}`);
}

// Main function
function main() {
  const srcDir = path.join(__dirname, 'src');
  const files = findTypeScriptFiles(srcDir);
  
  for (const file of files) {
    addReactImport(file);
  }
  
  console.log('Done!');
}

main(); 