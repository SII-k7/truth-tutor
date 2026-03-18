// Quick integration test for Vibero components
// Run this in browser console after loading the app

console.log('🧪 Vibero Integration Test');
console.log('==========================\n');

// Test 1: Check if Vibero components are imported
console.log('✓ Test 1: Checking imports...');
if (typeof ViberoAnnotationLayer !== 'undefined') {
  console.log('  ✓ ViberoAnnotationLayer imported');
} else {
  console.log('  ✗ ViberoAnnotationLayer NOT imported');
}

if (typeof ViberoSectionNavigator !== 'undefined') {
  console.log('  ✓ ViberoSectionNavigator imported');
} else {
  console.log('  ✗ ViberoSectionNavigator NOT imported');
}

// Test 2: Check if state has Vibero properties
console.log('\n✓ Test 2: Checking state...');
if (window.state) {
  console.log('  ✓ state.viberoMode:', window.state.viberoMode);
  console.log('  ✓ state.viberoAnnotationLayer:', window.state.viberoAnnotationLayer ? 'initialized' : 'null');
  console.log('  ✓ state.viberoSectionNavigator:', window.state.viberoSectionNavigator ? 'initialized' : 'null');
} else {
  console.log('  ✗ state not accessible');
}

// Test 3: Check if toggle button exists
console.log('\n✓ Test 3: Checking UI elements...');
const toggleBtn = document.getElementById('vibero-mode-toggle');
if (toggleBtn) {
  console.log('  ✓ Vibero toggle button found');
  console.log('  ✓ Button text:', toggleBtn.textContent);
} else {
  console.log('  ✗ Vibero toggle button NOT found');
}

// Test 4: Check if Vibero navigator panels exist
console.log('\n✓ Test 4: Checking Vibero navigator panels...');
const leftPanel = document.querySelector('.vibero-outline-left');
const rightPanel = document.querySelector('.vibero-outline-right');
const floatingControls = document.querySelector('.vibero-floating-controls');

if (leftPanel) {
  console.log('  ✓ Left panel found (display:', leftPanel.style.display, ')');
} else {
  console.log('  ✗ Left panel NOT found');
}

if (rightPanel) {
  console.log('  ✓ Right panel found (display:', rightPanel.style.display, ')');
} else {
  console.log('  ✗ Right panel NOT found');
}

if (floatingControls) {
  console.log('  ✓ Floating controls found (display:', floatingControls.style.display, ')');
} else {
  console.log('  ✗ Floating controls NOT found');
}

// Test 5: Check if toggle function exists
console.log('\n✓ Test 5: Checking functions...');
if (typeof toggleViberoMode === 'function') {
  console.log('  ✓ toggleViberoMode function exists');
} else {
  console.log('  ✗ toggleViberoMode function NOT found');
}

console.log('\n==========================');
console.log('🎉 Integration test complete!');
console.log('\nTo test manually:');
console.log('1. Click the "✨ Vibero 沉浸模式" button');
console.log('2. Or press Ctrl+V (Cmd+V on Mac)');
console.log('3. Load a PDF to see Vibero components in action');
