const DEFAULT_VOLUME_VALUE = 75;
// the volumes are kept in the browser, so a game muted stays muted when it is loaded again
const STORAGE_KEY = 'state-shared:volumes';

const storedVolumes = (() => {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
	} catch {
		return {};
	}
})();
const storedVolume = (value: unknown) =>
	typeof value === 'number' && value >= 0 && value <= 100 ? value : DEFAULT_VOLUME_VALUE;

export const stateSound = $state({
	volumeValueMaster: storedVolume(storedVolumes.volumeValueMaster),
	volumeValueMusic: storedVolume(storedVolumes.volumeValueMusic),
	volumeValueSoundEffect: storedVolume(storedVolumes.volumeValueSoundEffect),
});

$effect.root(() => {
	$effect(() => {
		const volumes = JSON.stringify(stateSound);
		try {
			localStorage.setItem(STORAGE_KEY, volumes);
		} catch {
			// no storage (a private window, or blocked): the volumes last until the game is closed
		}
	});
});

export const stateSoundDerived = {
	volumeMaster: () => stateSound.volumeValueMaster / 100,
	volumeMusic: () => (stateSound.volumeValueMusic / 100) * stateSoundDerived.volumeMaster(),
	volumeSoundEffect: () =>
		(stateSound.volumeValueSoundEffect / 100) * stateSoundDerived.volumeMaster(),
};
