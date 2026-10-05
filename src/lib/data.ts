/**
 * The data repo as the pages see it: units, offerings, lessons and schemas,
 * read through one `Repo`. Lists are fetched once per sign-in; individual
 * files come from the Repo's blob cache, so revisiting a page is free.
 */

import type { Schema } from '@cfworker/json-schema';
import { contentPath, offeringPaths, schemaPaths, unitDirs } from './domain/layout.ts';
import { basename, join } from './domain/paths.ts';
import { withColour } from './domain/offeringEdit.ts';
import type { Loaded, Repo } from './domain/repo.ts';
import type { Lesson, Offering, Unit } from './domain/types.ts';
import { Schemas } from './domain/validate.ts';

export interface UnitEntry {
	dir: string;
	unit: Unit;
}

export class Data {
	private unitsPromise: Promise<UnitEntry[]> | null = null;
	private offeringsPromise: Promise<[string, Offering][]> | null = null;
	private schemasPromise: Promise<Schemas> | null = null;

	constructor(readonly repo: Repo) {}

	units(): Promise<UnitEntry[]> {
		this.unitsPromise ??= this.repo.paths().then((paths) =>
			Promise.all(
				unitDirs(paths.keys()).map(async (dir) => ({
					dir,
					unit: (await this.repo.readJson<Unit>(join(dir, 'unit.json'))).doc
				}))
			)
		);
		return this.unitsPromise;
	}

	async unit(dir: string): Promise<Unit> {
		return (await this.repo.readJson<Unit>(join(dir, 'unit.json'))).doc;
	}

	offerings(): Promise<[string, Offering][]> {
		this.offeringsPromise ??= this.repo
			.paths()
			.then((paths) =>
				Promise.all(
					offeringPaths(paths.keys()).map(
						async (path) =>
							[path, (await this.repo.readJson<Offering>(path)).doc] as [string, Offering]
					)
				)
			);
		return this.offeringsPromise;
	}

	async offering(path: string): Promise<Offering> {
		return (await this.repo.readJson<Offering>(path)).doc;
	}

	/**
	 * Fixes a class's colour (or clears it, with null) and commits the offering.
	 * Throws the repo's ConflictError if the file changed on GitHub since it
	 * was read, and an Error listing the problems if the schema refuses it.
	 */
	async setColour(path: string, colour: string | null): Promise<void> {
		const { doc, sha } = await this.repo.readJson<Offering>(path);
		const next = withColour(doc, colour);
		const schemas = await this.schemas();
		if (schemas.has('offering.schema.json')) {
			const problems = schemas.validate('offering.schema.json', next);
			if (problems.length) {
				throw new Error(problems.map((p) => `${p.path || 'offering'}: ${p.message}`).join('; '));
			}
		}
		const message = colour ? `Set ${doc.id} colour to ${colour}` : `Clear ${doc.id} colour`;
		await this.repo.writeJson(path, next, sha, message);
		const list = await this.offerings();
		this.offeringsPromise = Promise.resolve(
			list.map(([p, o]) => [p, p === path ? next : o] as [string, Offering])
		);
	}

	lesson(path: string): Promise<Loaded<Lesson>> {
		return this.repo.readJson<Lesson>(path);
	}

	/** The plan's paired content file, or null where none is written yet. */
	async content(lessonPath: string): Promise<string | null> {
		const path = contentPath(lessonPath);
		if (!(await this.repo.has(path))) return null;
		return (await this.repo.readText(path)).doc;
	}

	schemas(): Promise<Schemas> {
		this.schemasPromise ??= this.repo.paths().then(async (paths) => {
			const entries = await Promise.all(
				schemaPaths(paths.keys()).map(
					async (path) => [basename(path), (await this.repo.readJson<Schema>(path)).doc] as const
				)
			);
			return new Schemas(Object.fromEntries(entries));
		});
		return this.schemasPromise;
	}
}
