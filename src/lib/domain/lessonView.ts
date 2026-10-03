/** Labels and timing for showing a lesson, as the data repo's view.py shows them. */

import type { Kind, Lesson } from './types.ts';

export const TALK_KINDS: ReadonlySet<string> = new Set(['instruction', 'discussion', 'review']);

export const KIND_LABELS: Record<Kind, string> = {
	instruction: 'Direct instruction',
	discussion: 'Discussion',
	review: 'Review',
	practice: 'Practice'
};

export const TIER_LABELS = { core: 'Core', practice: 'Practice', stretch: 'Stretch' } as const;

export const DIFFERENTIATION_LABELS = {
	support: 'Support',
	extension: 'Extension',
	eald: 'EAL/D',
	response_modes: 'Response modes',
	adhd: 'ADHD'
} as const;

export function kindClass(kind: string | undefined): string {
	return kind && TALK_KINDS.has(kind) ? 'talk' : kind === 'practice' ? 'activity' : '';
}

export function timing(lesson: Pick<Lesson, 'sections' | 'duration_minutes'>) {
	const sections = lesson.sections ?? [];
	const sum = (keep: (kind: string | undefined) => boolean) =>
		sections.filter((s) => keep(s.kind)).reduce((n, s) => n + (s.duration_minutes || 0), 0);
	const talk = sum((k) => !!k && TALK_KINDS.has(k));
	const activity = sum((k) => k === 'practice');
	const total = sum(() => true);
	return {
		talk,
		activity,
		other: total - talk - activity,
		total,
		nominal: lesson.duration_minutes
	};
}

/** Minutes elapsed before each section starts. */
export function startTimes(durations: (number | null)[]): number[] {
	let at = 0;
	return durations.map((d) => {
		const start = at;
		at += Number(d) || 0;
		return start;
	});
}
