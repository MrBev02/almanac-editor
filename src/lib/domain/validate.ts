/**
 * Validation against the data repo's own JSON schemas, fetched at run time, so
 * the editor and `check-jsonschema` share one definition of a valid file.
 *
 * Uses @cfworker/json-schema, which interprets schemas rather than compiling
 * them to code, so it runs under a Content-Security-Policy without
 * 'unsafe-eval'. The schemas carry no `$id` and refer to each other by file
 * name (`lesson.schema.json#/$defs/differentiation`), so each one is given an
 * `$id` under a common base before it is registered.
 */

import { Validator, type Schema } from '@cfworker/json-schema';

const BASE = 'https://schemas.almanac.invalid/';

export interface Problem {
	/** Where in the document, as a dotted path: `sections[2].duration_minutes`. Empty for the whole file. */
	path: string;
	message: string;
}

export class Schemas {
	private readonly byName = new Map<string, Schema>();

	/** `schemas` maps a file name (`lesson.schema.json`) to its parsed content. */
	constructor(schemas: Record<string, Schema>) {
		for (const [name, schema] of Object.entries(schemas)) {
			this.byName.set(name, { ...structuredClone(schema), $id: BASE + name });
		}
	}

	has(name: string): boolean {
		return this.byName.has(name);
	}

	validate(name: string, instance: unknown): Problem[] {
		const root = this.byName.get(name);
		if (!root) throw new Error(`No schema named ${name}`);
		// The validator annotates the schemas it is given, so each run gets fresh copies.
		const validator = new Validator(structuredClone(root), '2020-12', false);
		for (const [other, schema] of this.byName) {
			if (other !== name) validator.addSchema(structuredClone(schema));
		}
		const result = validator.validate(instance);
		if (result.valid) return [];
		return leafErrors(result.errors);
	}
}

/** Keywords that only say a child failed; the child's own error says why. */
const WRAPPERS = new Set([
	'properties',
	'items',
	'prefixItems',
	'additionalProperties',
	'$ref',
	'allOf',
	'anyOf',
	'oneOf',
	'not',
	'patternProperties',
	'unevaluatedProperties',
	'unevaluatedItems',
	'dependentSchemas',
	'if',
	'then',
	'else',
	'contains'
]);

function leafErrors(
	errors: { keyword: string; instanceLocation: string; error: string }[]
): Problem[] {
	const seen = new Set<string>();
	const problems: Problem[] = [];
	const add = (path: string, message: string) => {
		const key = `${path}\n${message}`;
		if (seen.has(key)) return;
		seen.add(key);
		problems.push({ path, message });
	};
	for (const e of errors) {
		if (WRAPPERS.has(e.keyword) || e.keyword === 'false') continue;
		add(toPath(e.instanceLocation), e.error);
	}
	// `additionalProperties: false` also fails a known property whose value is
	// invalid, so "not allowed" is only reported where nothing else explains it.
	const explained = new Set(problems.map((p) => p.path));
	for (const e of errors) {
		if (e.keyword !== 'false') continue;
		const path = toPath(e.instanceLocation);
		if (!explained.has(path)) add(path, `${lastKey(e.instanceLocation)} is not an allowed field`);
	}
	// A `not` failure has no leaf beneath it; keep it rather than report nothing.
	if (problems.length === 0) {
		for (const e of errors) problems.push({ path: toPath(e.instanceLocation), message: e.error });
	}
	return problems;
}

function lastKey(pointer: string): string {
	const parts = pointer.split('/');
	return decodeURIComponent(parts[parts.length - 1] ?? '');
}

/** `#/sections/2/duration_minutes` -> `sections[2].duration_minutes` */
export function toPath(pointer: string): string {
	const parts = pointer.replace(/^#\/?/, '').split('/').filter(Boolean);
	let out = '';
	for (const raw of parts) {
		const part = decodeURIComponent(raw).replace(/~1/g, '/').replace(/~0/g, '~');
		out += /^\d+$/.test(part) ? `[${part}]` : out ? `.${part}` : part;
	}
	return out;
}
