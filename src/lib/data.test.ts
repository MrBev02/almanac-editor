import { describe, expect, it } from 'vitest';
import { Data } from './data.ts';
import { dump } from './domain/format.ts';
import { blankLesson } from './domain/newLesson.ts';
import { blankUnit } from './domain/newUnit.ts';
import { ConflictError, NotFoundError, type Loaded } from './domain/repo.ts';
import type { Store } from './domain/store.ts';
import type { Lesson, Unit } from './domain/types.ts';

const UNIT = 'subjects/sorting/units/sorting_things';

/** The required fields of a plan, as a data repo's schema has them. */
const lessonSchema = {
	$schema: 'https://json-schema.org/draft/2020-12/schema',
	type: 'object',
	required: ['title', 'description', 'duration_minutes', 'sections'],
	properties: {
		sections: {
			type: 'array',
			minItems: 1,
			items: { type: 'object', properties: { section: { type: 'string', minLength: 1 } } }
		}
	}
};

/** Files in memory, versioned by their text. `beforeWrite` can change a file between read and write. */
class MemoryStore implements Store {
	writes: string[] = [];
	beforeWrite: ((path: string) => void) | null = null;
	constructor(readonly files: Map<string, string>) {}
	async paths() {
		return new Map([...this.files.keys()].map((p) => [p, this.files.get(p) ?? '']));
	}
	refresh() {}
	async has(path: string) {
		return this.files.has(path);
	}
	async readText(path: string): Promise<Loaded<string>> {
		const text = this.files.get(path);
		if (text === undefined) throw new NotFoundError(path);
		return { doc: text, sha: text };
	}
	async readJson<T>(path: string): Promise<Loaded<T>> {
		const { doc, sha } = await this.readText(path);
		return { doc: JSON.parse(doc) as T, sha };
	}
	async writeJson(path: string, doc: unknown, sha: string) {
		this.beforeWrite?.(path);
		if (this.files.get(path) !== sha) throw new ConflictError(`${path} changed`);
		this.files.set(path, dump(doc));
		this.writes.push(path);
		return dump(doc);
	}
	async createJson(path: string, doc: unknown) {
		if (this.files.has(path)) throw new ConflictError(`${path} already exists.`);
		this.files.set(path, dump(doc));
		this.writes.push(path);
		return dump(doc);
	}
	async head() {
		return null;
	}
}

const unit: Unit = {
	unit_title: 'Sorting things',
	syllabus_registry: [],
	lessons: ['lessons/01_socks.json']
};

const plan = (): Lesson => ({
	...blankLesson('Sorting hats', 50),
	sections: [{ section: 'Sort the hats.', duration_minutes: 50 }]
});

function setup(withSchema = true) {
	const files = new Map([[`${UNIT}/unit.json`, dump(unit)]]);
	if (withSchema) files.set('schemas/lesson.schema.json', JSON.stringify(lessonSchema));
	const store = new MemoryStore(files);
	return { store, data: new Data(store) };
}

describe('Data.createLesson', () => {
	it('writes the plan, then lists it in the unit', async () => {
		const { store, data } = setup();
		await data.createLesson(UNIT, 'lessons/02_sorting_hats.json', plan());
		expect(store.writes).toEqual([`${UNIT}/lessons/02_sorting_hats.json`, `${UNIT}/unit.json`]);
		const saved: Unit = JSON.parse(store.files.get(`${UNIT}/unit.json`) ?? '');
		expect(saved.lessons).toEqual(['lessons/01_socks.json', 'lessons/02_sorting_hats.json']);
	});

	it('writes nothing when the schema refuses the plan', async () => {
		const { store, data } = setup();
		const bad = blankLesson('Sorting hats', 50);
		await expect(data.createLesson(UNIT, 'lessons/02_x.json', bad)).rejects.toThrow(/section/);
		expect(store.writes).toEqual([]);
	});

	it('refuses a plan whose file exists, and leaves the unit alone', async () => {
		const { store, data } = setup();
		store.files.set(`${UNIT}/lessons/02_x.json`, '{}\n');
		await expect(data.createLesson(UNIT, 'lessons/02_x.json', plan())).rejects.toBeInstanceOf(
			ConflictError
		);
		expect(store.writes).toEqual([]);
	});

	it('adds the plan to a unit that changed meanwhile', async () => {
		const { store, data } = setup();
		store.beforeWrite = (path) => {
			store.beforeWrite = null;
			const changed = { ...unit, description: 'Changed elsewhere.' };
			store.files.set(path, dump(changed));
		};
		await data.createLesson(UNIT, 'lessons/02_x.json', plan());
		const saved: Unit = JSON.parse(store.files.get(`${UNIT}/unit.json`) ?? '');
		expect(saved.description).toBe('Changed elsewhere.');
		expect(saved.lessons).toEqual(['lessons/01_socks.json', 'lessons/02_x.json']);
	});

	it('says the plan is saved when the unit cannot be written', async () => {
		const { store, data } = setup();
		store.writeJson = async () => {
			throw new Error('Disk full.');
		};
		await expect(data.createLesson(UNIT, 'lessons/02_x.json', plan())).rejects.toThrow(
			/02_x is saved, but adding it to .*unit\.json failed: Disk full\./
		);
		expect(store.files.has(`${UNIT}/lessons/02_x.json`)).toBe(true);
	});
});

describe('Data.createUnit', () => {
	it('writes the unit, and the next listing includes it', async () => {
		const store = new MemoryStore(new Map());
		const data = new Data(store);
		expect(await data.units()).toEqual([]);
		await data.createUnit('subjects/dt/units/products', blankUnit('Products', 'D&T', ''));
		expect(store.writes).toEqual(['subjects/dt/units/products/unit.json']);
		expect((await data.units()).map((u) => u.dir)).toEqual(['subjects/dt/units/products']);
	});

	it('refuses a unit whose file exists', async () => {
		const { store, data } = setup();
		await expect(data.createUnit(UNIT, blankUnit('Again', 'S', ''))).rejects.toBeInstanceOf(
			ConflictError
		);
		expect(store.writes).toEqual([]);
	});
});
