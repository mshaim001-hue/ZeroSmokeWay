/**
 * MCP (Model Context Protocol) сервер для базы знаний
 * Предоставляет доступ к векторной базе знаний через стандартный MCP интерфейс
 * 
 * Этот файл является основой для создания MCP сервера.
 * Для полной реализации нужно использовать @modelcontextprotocol/sdk
 */

// TODO: Установить зависимости:
// npm install @modelcontextprotocol/sdk

/**
 * MCP Tools для работы с базой знаний
 */
export const KNOWLEDGE_BASE_MCP_TOOLS = [
  {
    name: 'search_knowledge_base',
    description: 'Ищет релевантную информацию в базе знаний по семантическому поиску',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Поисковый запрос для семантического поиска'
        },
        agentType: {
          type: 'string',
          enum: ['anamnesis', 'myth_buster', 'support'],
          description: 'Тип агента для фильтрации релевантных чанков (опционально)'
        },
        topK: {
          type: 'number',
          description: 'Количество результатов (по умолчанию 5)',
          default: 5
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_knowledge_base_stats',
    description: 'Возвращает статистику базы знаний',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'index_knowledge_base',
    description: 'Индексирует PDF файлы и создает базу знаний (только для админов)',
    inputSchema: {
      type: 'object',
      properties: {
        force: {
          type: 'boolean',
          description: 'Переиндексировать даже если база уже существует',
          default: false
        }
      }
    }
  }
];

/**
 * Пример реализации MCP сервера (упрощенная версия)
 * Для полной реализации нужно использовать @modelcontextprotocol/sdk
 */

/**
 * Обработчик поиска в базе знаний
 */
export async function handleSearchKnowledgeBase(query, agentType = null, topK = 5) {
  // Динамический импорт, чтобы не ломать код без установленных зависимостей
  try {
    const { searchKnowledgeBase } = await import('../services/knowledgeBase.js');
    const results = await searchKnowledgeBase(query, topK, agentType);
    
    return {
      results: results.map(r => ({
        text: r.text,
        source: r.source,
        similarity: r.similarity,
        agentTypes: r.agentTypes
      })),
      count: results.length,
      query
    };
  } catch (error) {
    throw new Error(`Ошибка поиска в базе знаний: ${error.message}`);
  }
}

/**
 * Обработчик получения статистики
 */
export async function handleGetKnowledgeBaseStats() {
  try {
    const fs = await import('fs-extra');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const embeddingsFile = path.join(__dirname, '../knowledge-base/embeddings.json');
    
    if (!(await fs.pathExists(embeddingsFile))) {
      return {
        indexed: false,
        message: 'База знаний не индексирована'
      };
    }
    
    const data = await fs.readJson(embeddingsFile);
    const chunks = data.chunks || [];
    
    // Статистика по типам агентов
    const agentStats = {
      anamnesis: 0,
      myth_buster: 0,
      support: 0,
      multiple: 0
    };
    
    chunks.forEach(chunk => {
      const agentTypes = chunk.agentTypes || [];
      if (agentTypes.length > 1) {
        agentStats.multiple++;
      }
      agentTypes.forEach(agent => {
        if (agentStats.hasOwnProperty(agent)) {
          agentStats[agent]++;
        }
      });
    });
    
    return {
      indexed: true,
      totalChunks: chunks.length,
      indexedAt: data.indexedAt,
      agentStats,
      sources: [...new Set(chunks.map(c => c.source))]
    };
  } catch (error) {
    throw new Error(`Ошибка получения статистики: ${error.message}`);
  }
}

/**
 * Пример использования MCP сервера (когда будет установлен SDK)
 * 
 * import { Server } from '@modelcontextprotocol/sdk/server/index.js';
 * import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
 * 
 * const server = new Server({
 *   name: 'zerosmokeway-knowledge-base',
 *   version: '1.0.0'
 * }, {
 *   capabilities: {
 *     tools: {}
 *   }
 * });
 * 
 * server.setRequestHandler(ListToolsRequestSchema, async () => ({
 *   tools: KNOWLEDGE_BASE_MCP_TOOLS
 * }));
 * 
 * server.setRequestHandler(CallToolRequestSchema, async (request) => {
 *   const { name, arguments: args } = request.params;
 *   
 *   switch (name) {
 *     case 'search_knowledge_base':
 *       const results = await handleSearchKnowledgeBase(
 *         args.query,
 *         args.agentType,
 *         args.topK
 *       );
 *       return {
 *         content: [{
 *           type: 'text',
 *           text: JSON.stringify(results, null, 2)
 *         }]
 *       };
 *     
 *     case 'get_knowledge_base_stats':
 *       const stats = await handleGetKnowledgeBaseStats();
 *       return {
 *         content: [{
 *           type: 'text',
 *           text: JSON.stringify(stats, null, 2)
 *         }]
 *       };
 *     
 *     default:
 *       throw new Error(`Unknown tool: ${name}`);
 *   }
 * });
 * 
 * async function main() {
 *   const transport = new StdioServerTransport();
 *   await server.connect(transport);
 * }
 * 
 * main().catch(console.error);
 */
