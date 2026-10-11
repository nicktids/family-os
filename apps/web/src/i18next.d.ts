import type app from './messages/en.json';

/**
 * Typed translation keys. Each extension registers its own namespace the same way,
 * via `ResourceNamespaceMap`, so keys are checked without central coordination.
 */
declare module 'i18next' {
	interface CustomTypeOptions {
		defaultNS: 'app';
		returnNull: false;
	}
	interface ResourceNamespaceMap {
		app: typeof app;
	}
}
