'use client';

// Import all icons from lucide-react to see what's available
import * as LucideIcons from 'lucide-react';

export default function TestIcons() {
  // Log all available icons
  console.log('Available Lucide Icons:', Object.keys(LucideIcons));
  
  return (
    <div>
      <h1>Testing Lucide Icons</h1>
      <p>Check the console to see all available icons</p>
    </div>
  );
}
