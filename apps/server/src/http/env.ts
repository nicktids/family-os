import type { Actor, TrustedDevice } from '@famos/sdk';

/** Per-request values set by middleware (who is calling, from which trusted device). */
export type AppEnv = {
	Variables: {
		actor: Actor | null;
		device: TrustedDevice | null;
		/** A route chose its own `cache-control` (text responses); the API default must not replace it. */
		ownCaching?: true;
	};
};
