# MCP Server для базы знаний

Этот MCP (Model Context Protocol) сервер предоставляет доступ к векторной базе знаний ZeroSmokeWay через стандартный интерфейс MCP.

## Установка

```bash
cd backend/mcp-server
npm install @modelcontextprotocol/sdk
```

## Использование

### С Claude Code / Cursor

1. Добавьте MCP сервер в конфигурацию (например, `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "zerosmokeway-kb": {
      "command": "node",
      "args": ["backend/mcp-server/knowledgeBaseMCP.js"]
    }
  }
}
```

2. Перезапустите редактор

3. Теперь можно использовать инструменты:
   - `search_knowledge_base` - семантический поиск
   - `get_knowledge_base_stats` - статистика базы
   - `index_knowledge_base` - индексация PDF

## Доступные инструменты

### search_knowledge_base

Ищет релевантную информацию в базе знаний.

**Параметры:**
- `query` (required): Поисковый запрос
- `agentType` (optional): 'anamnesis' | 'myth_buster' | 'support'
- `topK` (optional): Количество результатов (default: 5)

**Пример:**
```javascript
{
  "query": "как бросить курить когда стресс",
  "agentType": "support",
  "topK": 3
}
```

### get_knowledge_base_stats

Возвращает статистику базы знаний: количество чанков, статистику по агентам, источники.

### index_knowledge_base

Индексирует PDF файлы и создает базу знаний.

**Параметры:**
- `force` (optional): Переиндексировать даже если база существует

## Интеграция

Сервер можно использовать в:
- Claude Code
- Cursor
- VS Code с MCP extension
- Любых MCP-совместимых инструментах

## Примечания

Это базовая реализация. Для production рекомендуется:
- Добавить аутентификацию
- Добавить rate limiting
- Добавить кэширование
- Добавить логирование
