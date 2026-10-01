export type DeadReportBlock = { warning: boolean; text: string };

const WARNING_PREFIX = 'Warning: ';
const TABLE_TITLES = new Set(['DEAD', 'TEST-ONLY', 'TEST-OF-DEAD', 'RETAINED', 'SUPPRESSED']);
const SUMMARY_PREFIX = 'Scanned ';

/**
 * Split core's dead-code report so the CLI keeps warnings on stderr (via `this.warn`).
 * Core emits every warning, each possibly multi-line, between the binding-source rows and
 * the first table or the summary line; everything else is one log line per report line.
 */
export const splitDeadReport = (report: string): DeadReportBlock[] => {
  const blocks: DeadReportBlock[] = [];
  let warning: string[] | undefined;
  let warningsDone = false;
  const flush = (): void => {
    if (warning) blocks.push({ warning: true, text: warning.join('\n') });
    warning = undefined;
  };
  for (const line of report.split('\n')) {
    if (!warningsDone && line.startsWith(WARNING_PREFIX)) {
      flush();
      warning = [line.slice(WARNING_PREFIX.length)];
    } else if (warning && !TABLE_TITLES.has(line) && !line.startsWith(SUMMARY_PREFIX)) {
      warning.push(line);
    } else {
      if (warning) warningsDone = true;
      flush();
      blocks.push({ warning: false, text: line });
    }
  }
  flush();
  return blocks;
};
