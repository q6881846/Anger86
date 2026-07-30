// ============================================
// IndexedDB 步骤输出存储
// Key 命名规则: project::${projectId}::step::${stepId}
// ============================================
import { get, set } from 'idb-keyval';

export type ContentType = 'json' | 'markdown' | 'stream';

export interface StepOutput {
  projectId: string;
  stepId: number;
  type: ContentType;
  content: string;        // 大文本本体
  summary?: string;      // 章节摘要（step16/17/19 正文用）
  updatedAt: number;
}

const buildKey = (pid: string, sid: number) => `project::${pid}::step::${sid}`;

/** 保存步骤输出 */
export async function saveStepOutput(
  pid: string,
  sid: number,
  data: Omit<StepOutput, 'projectId' | 'stepId'>
): Promise<void> {
  const record: StepOutput = {
    projectId: pid,
    stepId: sid,
    ...data,
  };
  await set(buildKey(pid, sid), record);
}

/** 获取步骤输出 */
export async function getStepOutput(
  pid: string,
  sid: number
): Promise<StepOutput | undefined> {
  return await get<StepOutput>(buildKey(pid, sid));
}

/** 获取步骤输出摘要 */
export async function getStepSummary(pid: string, sid: number): Promise<string | undefined> {
  const data = await get<StepOutput>(buildKey(pid, sid));
  return data?.summary;
}

/** 删除步骤输出 */
export async function removeStepOutput(pid: string, sid: number): Promise<void> {
  await set(buildKey(pid, sid), undefined);
}

/** 清空某步及之后的所有下游缓存（回退时触发） */
export async function clearDownstreamOutputs(pid: string, fromStepId: number): Promise<void> {
  const keys: string[] = [];
  for (let i = fromStepId; i <= 20; i++) {
    keys.push(buildKey(pid, i));
  }
  await Promise.all(keys.map((k) => set(k, undefined)));
}

/** 列出项目所有已保存的步骤输出 */
export async function listStepOutputs(pid: string): Promise<StepOutput[]> {
  // idb-keyval 没有列出所有 key 的 API，这里需要遍历或用 IndexedDB 原生 API
  // 简化：遍历 1-20 步
  const outputs: StepOutput[] = [];
  for (let i = 1; i <= 20; i++) {
    const data = await getStepOutput(pid, i);
    if (data) outputs.push(data);
  }
  return outputs;
}
