import type { paths } from '@famos/api-client';

export type BackupsData =
	paths['/api/v1/backups']['get']['responses'][200]['content']['application/json'];
export type Target = BackupsData['targets'][number];
export type TargetKind = Target['kind'];
