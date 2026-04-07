import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GUIDED_PROMPT_SCENARIOS,
  type GuidedPromptScenario,
} from '../../constants/guidedPromptScenarios';
import { api } from '../../../../utils/api';
import type { AttachedPrompt } from '../../types/types';

interface GuidedPromptStarterProps {
  projectName: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  setAttachedPrompt?: (prompt: AttachedPrompt | null) => void;
}

interface SkillTreeNode {
  name: string;
  type: 'directory' | 'file';
  children?: SkillTreeNode[];
}

function buildTemplate(
  t: (key: string, options?: Record<string, unknown>) => string,
  scenario: GuidedPromptScenario,
  skills: string[],
) {
  return t('guidedStarter.template.intro', {
    scenario: t(scenario.titleKey),
    skills: skills.join(', '),
  });
}

export default function GuidedPromptStarter({
  projectName: _projectName,
  setInput,
  textareaRef,
  setAttachedPrompt,
}: GuidedPromptStarterProps) {
  const { t } = useTranslation('chat');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [availableSkills, setAvailableSkills] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const normalize = (value: string) => value.trim().toLowerCase();
    const discovered = new Set<string>();

    const collect = (nodes: SkillTreeNode[]) => {
      for (const node of nodes) {
        if (node.type !== 'directory') {
          continue;
        }
        const hasSkillMd = (node.children || []).some(
          (child) => child.type === 'file' && child.name === 'SKILL.md',
        );
        if (hasSkillMd) {
          discovered.add(normalize(node.name));
        }
        if (Array.isArray(node.children) && node.children.length > 0) {
          collect(node.children);
        }
      }
    };

    const fetchSkills = async () => {
      try {
        const response = await api.getGlobalSkills();
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as SkillTreeNode[];
        collect(payload);
        if (!cancelled && discovered.size > 0) {
          setAvailableSkills(discovered);
        }
      } catch {
        // Keep static list as fallback.
      }
    };

    fetchSkills();
    return () => {
      cancelled = true;
    };
  }, []);

  const injectTemplate = (scenario: GuidedPromptScenario, skills: string[]) => {
    const nextValue = buildTemplate(t, scenario, skills);
    if (setAttachedPrompt) {
      setAttachedPrompt({
        scenarioId: scenario.id,
        scenarioIcon: scenario.icon,
        scenarioTitle: t(scenario.titleKey),
        promptText: nextValue,
      });
      setTimeout(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
      }, 100);
    } else {
      setInput(prev => prev ? `${nextValue}\n\n${prev}` : nextValue);
      setTimeout(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        const cursor = el.value.length;
        el.setSelectionRange(cursor, cursor);
      }, 100);
    }
  };

  const handleScenarioSelect = (scenario: GuidedPromptScenario) => {
    setSelectedScenarioId(scenario.id);
    const matchedSkills = availableSkills
      ? scenario.skills.filter((skill) => availableSkills.has(skill.toLowerCase()))
      : [];
    injectTemplate(scenario, matchedSkills.length > 0 ? matchedSkills : scenario.skills);
  };

  return (
    <div className="flex flex-wrap justify-center gap-2.5 max-w-3xl mx-auto px-4 mt-6">
      {GUIDED_PROMPT_SCENARIOS.map((scenario) => {
        const isActive = selectedScenarioId === scenario.id;
        return (
          <button
            key={scenario.id}
            type="button"
            onClick={() => handleScenarioSelect(scenario)}
            className={`rounded-full border px-3 py-2 text-left transition-colors ${
              isActive
                ? 'border-cyan-500/50 bg-cyan-500/12 text-foreground dark:border-cyan-400/70 dark:bg-cyan-400/14 dark:text-white'
                : 'border-border/70 bg-card/60 text-foreground/80 hover:bg-accent hover:text-foreground dark:border-white/8 dark:bg-white/[0.04] dark:text-white/78 dark:hover:bg-white/[0.08] dark:hover:text-white'
            }`}
          >
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <span className="text-sm leading-none">{scenario.icon}</span>
              {t(scenario.titleKey)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
