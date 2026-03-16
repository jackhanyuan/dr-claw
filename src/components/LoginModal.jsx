import { X } from 'lucide-react';
import StandaloneShell from './StandaloneShell';
import { IS_PLATFORM } from '../constants/config';

/**
 * Reusable login modal component for Claude, Cursor, and Codex CLI authentication
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {'claude'|'cursor'|'codex'|'gemini'} props.provider - Which CLI provider to authenticate with
 * @param {Object} props.project - Project object containing name and path information
 * @param {Function} props.onComplete - Callback when login process completes (receives exitCode)
 * @param {string} props.customCommand - Optional custom command to override defaults
 * @param {boolean} props.isAuthenticated - Whether user is already authenticated (for re-auth flow)
 */
function LoginModal({
  isOpen,
  onClose,
  provider = 'claude',
  project,
  onComplete,
  customCommand,
  isAuthenticated = false,
  isOnboarding = false,
  cliAvailable = true,
  installHint = null
}) {
  if (!isOpen) return null;

  const getTitle = () => {
    switch (provider) {
      case 'claude':
        return 'Claude CLI Login';
      case 'cursor':
        return 'Cursor CLI Login';
      case 'codex':
        return 'Codex CLI Login';
      case 'gemini':
        return 'Gemini CLI Login';
      default:
        return 'CLI Login';
    }
  };

  if (!cliAvailable) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] max-md:items-stretch max-md:justify-stretch">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg flex flex-col md:rounded-lg md:m-4 max-md:max-w-none max-md:h-full max-md:rounded-none max-md:m-0">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getTitle()}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close login modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6 space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              {installHint || 'Required CLI is not installed. Install it first, then retry login.'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getCommand = () => {
    if (customCommand) return customCommand;

    switch (provider) {
      case 'claude':
        return isAuthenticated
          ? 'claude --dangerously-skip-permissions setup-token'
          : isOnboarding
            ? 'claude --dangerously-skip-permissions /exit'
            : 'claude --dangerously-skip-permissions /login';
      case 'cursor':
        return 'agent login';
      case 'codex':
        return IS_PLATFORM ? 'codex login --device-auth' : 'codex login';
      case 'gemini':
        return 'gemini /quit';
      default:
        return isAuthenticated
        ? 'claude --dangerously-skip-permissions setup-token'
        : isOnboarding
          ? 'claude --dangerously-skip-permissions /exit'
          : 'claude --dangerously-skip-permissions /login';
    }
  };

  const handleComplete = (exitCode) => {
    if (onComplete) {
      onComplete(exitCode);
    }

    // Automatically close modal on success (exit code 0)
    if (exitCode === 0) {
      setTimeout(() => {
        onClose();
      }, 1000); // Small delay so user sees "completed" message
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] max-md:items-stretch max-md:justify-stretch">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-3/4 flex flex-col md:max-w-4xl md:h-3/4 md:rounded-lg md:m-4 max-md:max-w-none max-md:h-full max-md:rounded-none max-md:m-0">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {getTitle()}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close login modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <StandaloneShell
            project={project}
            command={getCommand()}
            onComplete={handleComplete}
            minimal={true}
          />
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
