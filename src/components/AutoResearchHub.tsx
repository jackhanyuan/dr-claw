import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  FlaskConical,
  Loader2,
  Package,
  Play,
  Settings,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import { AUTO_RESEARCH_PACKS, type LocaleKey, type PackDef } from '../constants/autoResearchPacks';

function resolveLocaleKey(lang: string): LocaleKey {
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('ko')) return 'ko';
  return 'en';
}

const PACKS = AUTO_RESEARCH_PACKS;

const TEXT: Record<LocaleKey, Record<string, string>> = {
  zh: {
    title: 'Auto Research Hub',
    subtitle: '端到端自动研究工具。选择工具包，配置环境，一键开始研究。',
    useInChat: '在 Chat 中使用',
    workflows: '工作流',
    config: '环境配置',
    configMcp: '① MCP 审稿服务',
    configMcpDesc: '选择外部 LLM 进行跨模型审稿（必填）',
    configGpu: '② GPU 环境',
    configGpuDesc: '添加到项目 CLAUDE.md（跑实验需要）',
    configSetup: '③ 一键安装',
    configApply: '一键配置',
    configApplying: '配置中...',
    configSuccess: '配置完成！重启 Claude Code 会话后生效。',
    install: '安装',
    register: '注册 MCP',
    envVar: '环境变量',
    claudeMd: '添加到 CLAUDE.md',
    copied: '已复制!',
    noDeps: '零依赖，无需配置，直接使用。',
    existingServer: '已有服务器',
    detectGpu: '检测 GPU',
    quickStart: '快速开始',
    selectWorkflow: '选择研究工作流',
    inputPlaceholder: '输入你的研究方向或主题...',
    startResearch: '开始研究',
  },
  en: {
    title: 'Auto Research Hub',
    subtitle: 'End-to-end autonomous research tools. Pick a pack, configure, start researching.',
    useInChat: 'Use in Chat',
    workflows: 'Workflows',
    config: 'Configuration',
    configMcp: '① MCP Reviewer',
    configMcpDesc: 'Choose an external LLM for cross-model review (required)',
    configGpu: '② GPU Environment',
    configGpuDesc: 'Add to your project CLAUDE.md (for experiments)',
    configSetup: '③ Setup Script',
    configApply: 'Auto Configure',
    configApplying: 'Configuring...',
    configSuccess: 'Configured! Restart Claude Code session to activate.',
    install: 'Install',
    register: 'Register MCP',
    envVar: 'Env Variable',
    claudeMd: 'Add to CLAUDE.md',
    copied: 'Copied!',
    noDeps: 'Zero dependencies. No setup needed — use directly.',
    existingServer: 'Existing Server',
    detectGpu: 'Detect GPU',
    quickStart: 'Quick Start',
    selectWorkflow: 'Select workflow',
    inputPlaceholder: 'Enter your research topic...',
    startResearch: 'Start Research',
  },
  ko: {
    title: 'Auto Research Hub',
    subtitle: 'End-to-end autonomous research tools.',
    useInChat: 'Use in Chat',
    workflows: 'Workflows',
    config: 'Configuration',
    configMcp: '① MCP Reviewer',
    configMcpDesc: 'Choose external LLM (required)',
    configGpu: '② GPU Environment',
    configGpuDesc: 'Add to CLAUDE.md',
    configSetup: '③ Setup Script',
    configApply: 'Auto Configure',
    configApplying: 'Configuring...',
    configSuccess: 'Configured!',
    install: 'Install',
    register: 'Register MCP',
    envVar: 'Env Variable',
    claudeMd: 'Add to CLAUDE.md',
    copied: 'Copied!',
    noDeps: 'Zero dependencies.',
    existingServer: 'Existing Server',
    detectGpu: 'Detect GPU',
    quickStart: 'Quick Start',
    selectWorkflow: 'Select workflow',
    inputPlaceholder: 'Enter your research topic...',
    startResearch: 'Start Research',
  },
};

export default function AutoResearchHub() {
  const { i18n } = useTranslation();
  const locale = useMemo(() => resolveLocaleKey(i18n.language || 'en'), [i18n.language]);
  const t = TEXT[locale];

  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [expandedConfig, setExpandedConfig] = useState<Set<string>>(new Set());
  const [selectedMcp, setSelectedMcp] = useState<Record<string, string>>({});
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [apiKeyVisible, setApiKeyVisible] = useState<Record<string, boolean>>({});
  const [configuring, setConfiguring] = useState(false);
  const [configResult, setConfigResult] = useState<{ success: boolean; message: string } | null>(null);

  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set());

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCommand(text);
      setTimeout(() => setCopiedCommand(null), 2000);
    });
  }, []);

  const handleConfigure = useCallback(async (pack: PackDef) => {
    const mcpKey = selectedMcp[pack.name] || pack.mcp[0]?.key;
    const mcpOpt = pack.mcp.find(m => m.key === mcpKey) || pack.mcp[0];

    const apiKeys: Record<string, string> = {};
    if (mcpOpt) {
      for (const ev of mcpOpt.envVars) {
        if (apiKeyInputs[ev.name]) apiKeys[ev.name] = apiKeyInputs[ev.name];
      }
    }

    setConfiguring(true);
    setConfigResult(null);
    try {
      const resp = await api.communityTools.configure(null, mcpKey, apiKeys, null);
      if (!resp.ok) {
        const text = await resp.text();
        setConfigResult({ success: false, message: `Server error (${resp.status}): ${text}` });
        return;
      }
      const data = await resp.json();
      setConfigResult({
        success: data.success,
        message: data.success ? t.configSuccess : (data.errors || []).map((e: { error: string }) => e.error).join('; '),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setConfigResult({ success: false, message: msg });
    } finally {
      setConfiguring(false);
    }
  }, [selectedMcp, apiKeyInputs, t.configSuccess]);

  // Distinct accent colors per pack index
  const PACK_ACCENTS = [
    { border: 'border-purple-200/60 dark:border-purple-800/30', bg: 'bg-purple-50/40 dark:bg-purple-950/10', icon: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
    { border: 'border-teal-200/60 dark:border-teal-800/30', bg: 'bg-teal-50/40 dark:bg-teal-950/10', icon: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200', badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
    { border: 'border-amber-200/60 dark:border-amber-800/30', bg: 'bg-amber-50/40 dark:bg-amber-950/10', icon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    { border: 'border-rose-200/60 dark:border-rose-800/30', bg: 'bg-rose-50/40 dark:bg-rose-950/10', icon: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
  ];

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        {/* Header */}
        <div className="relative mb-6 overflow-hidden rounded-[28px] border border-purple-200/60 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.15),_transparent_40%),linear-gradient(135deg,_rgba(248,250,252,0.95),_rgba(250,245,255,0.9))] p-6 shadow-sm dark:border-purple-800/30 dark:bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.12),_transparent_40%),linear-gradient(135deg,_rgba(2,6,23,0.96),_rgba(15,10,30,0.92))]">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-200/40 blur-3xl dark:bg-purple-500/15" />
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 shadow-sm dark:bg-purple-900/40 dark:text-purple-200">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {locale === 'zh' ? '配置 Auto Research 工具包。在 Chat 的 Auto Research 下拉框中使用。' : 'Configure Auto Research tool packs. Use them from the Auto Research dropdown in Chat.'}
              </p>
            </div>
          </div>
        </div>

        {/* Packs — config only */}
        <div className="space-y-5">
          {PACKS.map((pack, packIdx) => {
            const accent = PACK_ACCENTS[packIdx % PACK_ACCENTS.length];
            const mcpKey = selectedMcp[pack.name] || pack.mcp[0]?.key || '';
            const mcpOpt = pack.mcp.find(m => m.key === mcpKey);
            const wfExpanded = expandedWorkflows.has(pack.name);

            return (
              <div key={pack.name} className={`rounded-2xl border ${accent.border} bg-card shadow-sm`}>
                {/* Pack header */}
                <div className="p-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent.icon}`}>
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-foreground">{pack.name}</h2>
                        {pack.repoUrl && (
                          <a href={pack.repoUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors" title="GitHub">
                            ↗ GitHub
                          </a>
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${accent.badge}`}>
                          {pack.workflows.length} {locale === 'zh' ? '个工作流' : 'workflows'}
                        </span>
                        {pack.mcp.length === 0 && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            {locale === 'zh' ? '零依赖' : 'Zero deps'}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{pack.description[locale]}</p>
                    </div>
                  </div>

                  {/* Collapsible workflows list */}
                  <button
                    type="button"
                    onClick={() => setExpandedWorkflows(prev => { const n = new Set(prev); n.has(pack.name) ? n.delete(pack.name) : n.add(pack.name); return n; })}
                    className="mt-3 flex w-full items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-left transition-colors hover:bg-muted/60"
                  >
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Play className="h-3 w-3" />
                      {locale === 'zh' ? '包含的工作流' : 'Included workflows'}
                    </span>
                    {wfExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                  {wfExpanded && (
                    <div className="mt-2 space-y-1">
                      {pack.workflows.map((wf) => (
                        <div key={wf.command} className="flex items-center justify-between rounded-lg px-3 py-1.5 hover:bg-muted/30">
                          <div>
                            <span className="text-xs font-semibold text-foreground">{wf.name}</span>
                            <span className="ml-2 text-[10px] text-muted-foreground">{wf.description[locale]}</span>
                          </div>
                          <code className="text-[10px] text-muted-foreground/60 font-mono">{wf.command}</code>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Configuration — directly open for packs that need it */}
                {pack.mcp.length > 0 ? (
                  <div className="border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => setExpandedConfig(prev => { const n = new Set(prev); n.has(pack.name) ? n.delete(pack.name) : n.add(pack.name); return n; })}
                      className="flex w-full items-center justify-between px-5 py-3 transition-colors hover:bg-muted/30"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <AlertCircle className="h-4 w-4 text-sky-500" />
                        {t.config}
                      </span>
                      {expandedConfig.has(pack.name) ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>

                    {expandedConfig.has(pack.name) && (
                      <div className="space-y-4 px-5 pb-5">
                        {/* MCP */}
                        <div>
                          <h4 className="mb-1 text-sm font-semibold text-foreground">{t.configMcp}</h4>
                          <p className="mb-2 text-xs text-muted-foreground">{t.configMcpDesc}</p>
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {pack.mcp.map(opt => (
                              <button key={opt.key} type="button" onClick={() => setSelectedMcp(p => ({ ...p, [pack.name]: opt.key }))}
                                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${mcpKey === opt.key ? 'border-sky-400 bg-sky-100 text-sky-700 shadow-sm dark:border-sky-600 dark:bg-sky-900/40 dark:text-sky-200' : 'border-border/60 bg-background text-muted-foreground hover:bg-muted/60'}`}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          {mcpOpt && (
                            <div className="space-y-2 rounded-xl border border-sky-200/50 bg-sky-50/30 p-3 dark:border-sky-800/30 dark:bg-sky-950/10">
                              {mcpOpt.install && (
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="mb-0.5 text-xs font-medium text-muted-foreground">{t.install}</p>
                                    <code className="block truncate rounded bg-slate-100 px-2 py-1 text-xs text-foreground dark:bg-slate-800">{mcpOpt.install}</code>
                                  </div>
                                  <button type="button" onClick={() => copyToClipboard(mcpOpt.install!)} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-900/30">
                                    {copiedCommand === mcpOpt.install ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                              )}
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="mb-0.5 text-xs font-medium text-muted-foreground">{t.register}</p>
                                  <code className="block truncate rounded bg-slate-100 px-2 py-1 text-xs text-foreground dark:bg-slate-800">{mcpOpt.register}</code>
                                </div>
                                <button type="button" onClick={() => copyToClipboard(mcpOpt.register)} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-900/30">
                                  {copiedCommand === mcpOpt.register ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                              {mcpOpt.envVars.map(ev => (
                                <div key={ev.name}>
                                  <p className="mb-1 text-xs font-medium text-muted-foreground">{ev.name}</p>
                                  <div className="relative">
                                    <input type={apiKeyVisible[ev.name] ? 'text' : 'password'} placeholder={ev.example} value={apiKeyInputs[ev.name] || ''} onChange={e => setApiKeyInputs(p => ({ ...p, [ev.name]: e.target.value }))}
                                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 pr-9 text-xs font-mono text-foreground outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-300/50 dark:focus:border-sky-600" />
                                    <button type="button" onClick={() => setApiKeyVisible(p => ({ ...p, [ev.name]: !p[ev.name] }))} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground">
                                      {apiKeyVisible[ev.name] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* GPU — auto-configured from Compute Panel, just show a note */}
                        {pack.gpu.length > 0 && (
                          <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5">
                            <p className="text-xs text-muted-foreground">
                              <Cpu className="mr-1 inline h-3 w-3" />
                              {locale === 'zh'
                                ? 'GPU 环境会自动从 Compute Panel 中已连接的服务器读取，无需在此配置。'
                                : 'GPU environment is auto-detected from servers connected in the Compute Panel.'}
                            </p>
                          </div>
                        )}

                        {/* Configure button */}
                        <button type="button" disabled={configuring} onClick={() => handleConfigure(pack)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sky-700 active:scale-[0.98] disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-600">
                          {configuring ? <><Loader2 className="h-4 w-4 animate-spin" />{t.configApplying}</> : <><Settings className="h-4 w-4" />{t.configApply}</>}
                        </button>
                        {configResult && (
                          <p className={`text-center text-xs font-medium ${configResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {configResult.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-t border-border/40 px-5 py-3">
                    <p className="text-xs font-medium text-green-600 dark:text-green-400">✓ {t.noDeps}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
