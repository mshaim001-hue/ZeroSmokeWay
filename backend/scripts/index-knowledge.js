#!/usr/bin/env node

/**
 * Скрипт для индексации PDF книг в базу знаний
 * Использование: node scripts/index-knowledge.js
 * 
 * Для больших PDF файлов рекомендуется запускать с увеличенным лимитом памяти:
 * node --max-old-space-size=8192 scripts/index-knowledge.js
 * 
 * Или используйте: npm run index-knowledge (уже настроено с увеличенным лимитом)
 */

import { indexKnowledgeBase } from '../services/knowledgeBase.js';

async function main() {
  try {
    const memUsage = process.memoryUsage();
    console.log('🚀 Начало индексации базы знаний из PDF файлов...');
    console.log(`📊 Используемая память: ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB\n`);
    
    await indexKnowledgeBase();
    
    const finalMemUsage = process.memoryUsage();
    console.log(`\n📊 Финальная память: ${Math.round(finalMemUsage.heapUsed / 1024 / 1024)} MB`);
    console.log('\n✅ Индексация завершена успешно!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка при индексации:', error);
    if (error.message && error.message.includes('heap')) {
      console.error('\n💡 Совет: Запустите с увеличенным лимитом памяти:');
      console.error('   npm run index-knowledge');
      console.error('   или');
      console.error('   node --max-old-space-size=8192 scripts/index-knowledge.js');
    }
    process.exit(1);
  }
}

main();

