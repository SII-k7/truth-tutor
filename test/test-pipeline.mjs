#!/usr/bin/env node

/**
 * Test script for AI annotation pipeline
 * Tests: PDF upload → analysis → annotation generation → database storage
 */

import { analyzePaper, getAnalysisResults } from '../src/services/analysis-pipeline.mjs';
import { listPapers, getPaper, getPaperStructure, getAnnotations } from '../src/database/db.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Test PDF path (use the test PDF from web-ui)
const TEST_PDF_PATH = join(__dirname, '../src/web-ui/test-paper.pdf');

async function runTests() {
  console.log('🧪 Starting AI Annotation Pipeline Tests\n');
  
  try {
    // Test 1: Analyze a paper
    console.log('📄 Test 1: Analyzing test PDF...');
    const result = await analyzePaper(TEST_PDF_PATH, {
      annotationTypes: ['translation', 'explanation', 'concept'],
      language: 'Chinese',
      batchSize: 3,
      maxParagraphs: 5, // Limit for faster testing
      timeoutMs: 120000
    }, (progress) => {
      // Progress callback
      console.log(`  ⏳ ${progress.stage}: ${progress.message}`);
      if (progress.annotation) {
        console.log(`    ✓ Generated ${progress.annotation.annotation_type} annotation`);
      }
    });
    
    console.log('\n✅ Test 1 Passed: Analysis completed');
    console.log(`   Paper ID: ${result.paperId}`);
    console.log(`   Stats:`, result.stats);
    
    // Test 2: Retrieve paper from database
    console.log('\n📚 Test 2: Retrieving paper from database...');
    const paper = await getPaper(result.paperId);
    
    if (!paper) {
      throw new Error('Paper not found in database');
    }
    
    console.log('✅ Test 2 Passed: Paper retrieved');
    console.log(`   Title: ${paper.title}`);
    console.log(`   Pages: ${paper.page_count}`);
    
    // Test 3: Retrieve structure
    console.log('\n🏗️  Test 3: Retrieving document structure...');
    const structure = await getPaperStructure(result.paperId);
    
    if (!structure) {
      throw new Error('Structure not found in database');
    }
    
    console.log('✅ Test 3 Passed: Structure retrieved');
    console.log(`   Sections: ${structure.sections.length}`);
    console.log(`   Paragraphs: ${structure.paragraphs.length}`);
    console.log(`   Figures: ${structure.figures.length}`);
    
    // Test 4: Retrieve annotations
    console.log('\n📝 Test 4: Retrieving annotations...');
    const annotations = await getAnnotations(result.paperId);
    
    if (annotations.length === 0) {
      throw new Error('No annotations found in database');
    }
    
    console.log('✅ Test 4 Passed: Annotations retrieved');
    console.log(`   Total annotations: ${annotations.length}`);
    
    // Count by type
    const byType = annotations.reduce((acc, ann) => {
      acc[ann.annotation_type] = (acc[ann.annotation_type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('   By type:', byType);
    
    // Test 5: Verify annotation content
    console.log('\n🔍 Test 5: Verifying annotation content...');
    const sampleAnnotation = annotations[0];
    
    if (!sampleAnnotation.content || sampleAnnotation.content.length === 0) {
      throw new Error('Annotation has no content');
    }
    
    if (!sampleAnnotation.position || !sampleAnnotation.position.page) {
      throw new Error('Annotation has no position data');
    }
    
    console.log('✅ Test 5 Passed: Annotation content verified');
    console.log(`   Sample annotation (${sampleAnnotation.annotation_type}):`);
    console.log(`   Target: ${sampleAnnotation.target_id}`);
    console.log(`   Page: ${sampleAnnotation.position.page}`);
    console.log(`   Content: ${sampleAnnotation.content.substring(0, 100)}...`);
    
    // Test 6: List all papers
    console.log('\n📋 Test 6: Listing all papers...');
    const papers = await listPapers();
    
    console.log('✅ Test 6 Passed: Papers listed');
    console.log(`   Total papers in database: ${papers.length}`);
    
    // Test 7: Get full analysis results
    console.log('\n📊 Test 7: Getting full analysis results...');
    const fullResults = await getAnalysisResults(result.paperId);
    
    if (!fullResults.paper || !fullResults.structure || !fullResults.annotations) {
      throw new Error('Incomplete analysis results');
    }
    
    console.log('✅ Test 7 Passed: Full results retrieved');
    console.log(`   Complete data package verified`);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n📈 Summary:');
    console.log(`   ✓ PDF parsed successfully`);
    console.log(`   ✓ Structure extracted (${structure.sections.length} sections, ${structure.paragraphs.length} paragraphs)`);
    console.log(`   ✓ Annotations generated (${annotations.length} total)`);
    console.log(`   ✓ Data stored in database`);
    console.log(`   ✓ API retrieval working`);
    console.log('\n💡 Next steps:');
    console.log('   1. Start web server: npm start');
    console.log('   2. Load a PDF in the UI');
    console.log('   3. Click "Analyze Paper" button');
    console.log('   4. Watch real-time progress via WebSocket');
    console.log('   5. View annotations overlaid on PDF\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
