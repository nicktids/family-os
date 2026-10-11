import { defineWebExtension } from '@famos/ui/slots';

/**
 * Ambient UI: display content settings, the weather of Today (and of a display's Today) and
 * ambient mode of family displays. Ambient mode is a `display.ambient` contribution: the display page only offers the
 * place, this extension decides when to show itself.
 */
export default defineWebExtension({
	id: 'ambient',
	labelKey: 'ambient:feature_name',
	descriptionKey: 'ambient:feature_description',
	slots: [
		{
			slot: 'settings.display',
			id: 'ambient.content',
			order: 10,
			requires: 'ambient.manage',
			component: () => import('./DisplayContent.svelte'),
		},
		{
			slot: 'setup.step',
			id: 'ambient.place',
			order: 10,
			requires: 'ambient.manage',
			component: () => import('./SetupPlaceStep.svelte'),
		},
		{
			slot: 'today.atmosphere',
			id: 'ambient.atmosphere',
			order: 1,
			requires: 'ambient.weather',
			component: () => import('./AtmosphereLine.svelte'),
		},
		{
			slot: 'display.ambient',
			id: 'ambient.mode',
			requires: 'ambient.photos',
			component: () => import('./Ambient.svelte'),
		},
	],
});
