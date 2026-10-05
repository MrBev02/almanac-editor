/**
 * The lesson files as the pages see it: units, offerings, lessons and schemas,
 * read through one `Store` (a folder, or a GitHub repo). Lists are read once
 * per source; for GitHub, individual files come from the Repo's blob cache,
 * so revisiting a page is free.
 */

import type { Schema } from '@cfworker/json-schema';
import { contentPath, offeringPaths, schemaPaths, unitDirs } from './domain/layout.ts';
import { basename, join } from './domain/paths.ts';
import { withColour } from './domain/offeringEdit.ts';
import { offeringPath } from './domain/newOffering.ts';
import { byNumber } from './house.ts';
import type { Loaded } from './domain/repo.ts';
import type { Store } from './domain/store.ts';
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

	constructor(readonly store: Store) {}

	units(): Promise<UnitEntry[]> {
		this.unitsPromise ??= this.store.paths().then((paths) =>
			Promise.all(
				unitDirs(paths.keys()).map(async (dir) => ({
					dir,
					unit: (await this.store.readJson<Unit>(join(dir, 'unit.json'))).doc
				}))
			)
		);
		return this.unitsPromise;
	}

	async unit(dir: string): Promise<Unit> {
		return (await this.store.readJson<Unit>(join(dir, 'unit.json'))).doc;
	}

	offerings(): Promise<[string, Offering][]> {
		this.offeringsPromise ??= this.store.paths().then((paths) =>
			Promise.all(
				offeringPaths(paths.keys())
					.sort(byNumber)
					.map(
						async (path) =>
							[path, (await this.store.readJson<Offering>(path)).doc] as [string, Offering]
					)
			)
		);
		return this.offeringsPromise;
	}

	async offering(path: string): Promise<Offering> {
		return (await this.store.readJson<Offering>(path)).doc;
	}

	/**
	 * Saves a new class as `offerings/<id>.json` and returns its path. Throws
	 * ConflictError if that file exists, and an Error listing the problems if
	 * the schema refuses it.
	 */
	async createOffering(doc: Offering): Promise<string> {
		const path = offeringPath(doc.id);
		const schemas = await this.schemas();
		if (schemas.has('offering.schema.json')) {
			const problems = schemas.validate('offering.schema.json', doc);
			if (problems.length) {
				throw new Error(problems.map((p) => `${p.path || 'class'}: ${p.message}`).join('; '));
			}
		}
		await this.store.createJson(path, doc, `Add class ${doc.id}`);
		this.offeringsPromise = null;
		return path;
	}

	/**
	 * Fixes a class's colour (or clears it, with null) and saves the offering.
	 * Throws ConflictError if the file changed since it was read, and an Error listing the problems if the schema refuses it.
	 */
	async setColour(path: string, colour: string | null): Promise<void> {
		const { doc, sha } = await this.store.readJson<Offering>(path);
		const next = withColour(doc, colour);
		const schemas = await this.schemas();
		// A folder without schemas/ saves unchecked.
		if (schemas.has('offering.schema.json')) {
			const problems = schemas.validate('offering.schema.json', next);
			if (problems.length) {
				throw new Error(problems.map((p) => `${p.path || 'offering'}: ${p.message}`).join('; '));
			}
		}
		const message = colour ? `Set ${doc.id} colour to ${colour}` : `Clear ${doc.id} colour`;
		await this.store.writeJson(path, next, sha, message);
		const list = await this.offerings();
		this.offeringsPromise = Promise.resolve(
			list.map(([p, o]) => [p, p === path ? next : o] as [string, Offering])
		);
	}

	lesson(path: string): Promise<Loaded<Lesson>> {
		return this.store.readJson<Lesson>(path);
	}

	/** The plan's paired content file, or null where none is written yet. */
	async content(lessonPath: string): Promise<string | null> {
		const path = contentPath(lessonPath);
		if (!(await this.store.has(path))) return null;
		return (await this.store.readText(path)).doc;
	}

	schemas(): Promise<Schemas> {
		this.schemasPromise ??= this.store.paths().then(async (paths) => {
			const entries = await Promise.all(
				schemaPaths(paths.keys()).map(
					async (path) => [basename(path), (await this.store.readJson<Schema>(path)).doc] as const
				)
			);
			return new Schemas(Object.fromEntries(entries));
		});
		return this.schemasPromise;
	}
}
