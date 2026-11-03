import { useQuery } from '@tanstack/react-query';
import { settingsApi, type PipelineDef } from '../endpoints/settings';
import { queryKeys } from '../queryKeys';

export const DEFAULT_PIPELINE = 'default';

/** Same cache entry as the settings screens, so saving a pipeline there refreshes every picker. */
export function usePipelines(): { pipelines: PipelineDef[]; multi: boolean; loading: boolean } {
  const { data, isLoading } = useQuery({ queryKey: [...queryKeys.settings.all, 'view'], queryFn: () => settingsApi.get() });
  const pipelines = data?.pipelines ?? [];
  return { pipelines, multi: pipelines.length > 1, loading: isLoading };
}

/** The pipeline a job is on: its own, or the default when it has none (or that pipeline was removed). */
export const pipelineOf = (pipelines: readonly PipelineDef[], id?: string) => pipelines.find((p) => p.id === id) ?? pipelines[0];
