import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILLS_DIR = path.join(__dirname, '../skills');

/**
 * Загружает skill из JSON файла
 */
export async function loadSkill(skillName) {
  try {
    const skillPath = path.join(SKILLS_DIR, `${skillName}.json`);
    if (!(await fs.pathExists(skillPath))) {
      throw new Error(`Skill "${skillName}" not found`);
    }
    return await fs.readJson(skillPath);
  } catch (error) {
    console.error(`Error loading skill ${skillName}:`, error);
    throw error;
  }
}

/**
 * Загружает несколько skills и объединяет их правила
 */
export async function loadSkills(skillNames) {
  const skills = await Promise.all(
    skillNames.map(name => loadSkill(name).catch(err => {
      console.warn(`Failed to load skill ${name}:`, err.message);
      return null;
    }))
  );
  
  return skills.filter(s => s !== null);
}

/**
 * Форматирует skills в текст для промпта
 */
export function formatSkillsForPrompt(skills) {
  if (!skills || skills.length === 0) return '';
  
  const sections = skills.map(skill => {
    let text = `\n### ${skill.name.toUpperCase().replace(/-/g, ' ')}\n`;
    text += `${skill.description}\n\n`;
    
    if (skill.rules && skill.rules.length > 0) {
      text += 'Правила:\n';
      skill.rules.forEach(rule => {
        text += `- ${rule}\n`;
      });
      text += '\n';
    }
    
    return text;
  }).join('\n');
  
  return `\n## НАВЫКИ И ПРАВИЛА\n${sections}`;
}

/**
 * Получает примеры из skills (для отладки)
 */
export function getSkillExamples(skills) {
  const examples = {};
  skills.forEach(skill => {
    if (skill.examples) {
      examples[skill.name] = skill.examples;
    }
  });
  return examples;
}

/**
 * Получает схему данных из skills (например, для data-extraction)
 */
export function getSkillSchema(skillName, skills) {
  const skill = skills.find(s => s.name === skillName);
  return skill?.schema || null;
}
