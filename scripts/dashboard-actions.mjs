import { build, lock, mutate } from './lib.mjs';

export function saveDashboardAction(root, payload) {
  return lock(root, () => {
    let result;
    if (payload.action === 'favorite') {
      result = mutate(root, 'favorite set', {favorite: payload.favorite}, payload.job_id);
    } else if (payload.action === 'brain-dump') {
      const {title, text, request_id} = payload;
      result = mutate(root, 'brain-dump add', {title, text, request_id});
    } else {
      throw new Error('Only favorites and personal notes can be saved here.');
    }
    return {result, built_at: build(root).built_at};
  });
}
